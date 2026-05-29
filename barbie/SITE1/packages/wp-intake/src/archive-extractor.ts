import { promises as fs, createWriteStream } from 'node:fs';
import * as path from 'node:path';
import sanitize from 'sanitize-filename';
import yauzl, { type ZipFile, type Entry } from 'yauzl';
import { pipeline } from 'node:stream/promises';

/**
 * Safe streaming zip extractor for Duplicator archives. Harvested from the
 * Replikant migrator.
 *
 * Defence-in-depth against archive-class attacks:
 *   - **Zip bomb (total)**: running uncompressed-bytes counter; reject when
 *     it exceeds `maxUncompressedBytes` (default 10 GB).
 *   - **Zip bomb (ratio)**: per-entry compressed:uncompressed ratio cap;
 *     reject any entry whose ratio exceeds `maxRatio` (default 100×).
 *   - **Path traversal**: every entry name passed through `sanitize-filename`
 *     per segment; any path containing `..` or absolute prefix rejected.
 *   - **Symlinks**: detected via Unix mode in external file attributes;
 *     silently skipped (never followed).
 *   - **File-count DoS**: cap on total entries (default 50K).
 *
 * Do not replace with `unzipper`, `adm-zip`, or any extractor that bypasses
 * these guards on user-controlled archives.
 */

export interface ExtractorLimits {
  /** Hard cap on total uncompressed bytes across all entries. */
  maxUncompressedBytes: number;
  /** Per-entry max ratio of uncompressed÷compressed. */
  maxRatio: number;
  /** Total entry count cap (prevents 1M-tiny-file DoS). */
  maxFileCount: number;
  /** Per-entry max uncompressed size (sanity bound). */
  maxEntrySize: number;
}

export const DEFAULT_EXTRACTOR_LIMITS: ExtractorLimits = {
  maxUncompressedBytes: 10_737_418_240, // 10 GB
  maxRatio: 100,
  maxFileCount: 50_000,
  maxEntrySize: 5_368_709_120, // 5 GB single-file ceiling
};

export class ArchiveExtractError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'ZIP_BOMB_TOTAL'
      | 'ZIP_BOMB_RATIO'
      | 'ENTRY_TOO_LARGE'
      | 'TOO_MANY_ENTRIES'
      | 'PATH_TRAVERSAL'
      | 'SYMLINK_REJECTED'
      | 'MALFORMED_ZIP'
      | 'IO',
    public readonly entryName?: string,
  ) {
    super(message);
  }
}

export interface ExtractionResult {
  /** Files actually written to disk (relative to extractDir). */
  extractedFiles: string[];
  /** Files skipped (symlinks, empty, etc) with reason. */
  skipped: Array<{ entryName: string; reason: string }>;
  /** Total uncompressed bytes. */
  totalBytes: number;
  /** Total entries processed (incl. skipped). */
  totalEntries: number;
}

/**
 * Extract a zip archive into `extractDir`. Streaming; bounded; safe.
 * The caller is responsible for ensuring `extractDir` exists and is empty.
 */
export async function extractArchive(
  zipPath: string,
  extractDir: string,
  limits: Partial<ExtractorLimits> = {},
): Promise<ExtractionResult> {
  const lim = { ...DEFAULT_EXTRACTOR_LIMITS, ...limits };
  const extractDirAbs = path.resolve(extractDir);

  return new Promise<ExtractionResult>((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        reject(new ArchiveExtractError(`Failed to open zip: ${err.message}`, 'MALFORMED_ZIP'));
        return;
      }
      runExtraction(zipfile, extractDirAbs, lim, resolve, reject);
    });
  });
}

function runExtraction(
  zipfile: ZipFile,
  extractDirAbs: string,
  lim: ExtractorLimits,
  resolve: (r: ExtractionResult) => void,
  reject: (err: ArchiveExtractError) => void,
): void {
  const extractedFiles: string[] = [];
  const skipped: Array<{ entryName: string; reason: string }> = [];
  let totalBytes = 0;
  let totalEntries = 0;
  let aborted = false;

  const fail = (err: ArchiveExtractError): void => {
    if (aborted) return;
    aborted = true;
    try {
      zipfile.close();
    } catch {
      /* ignore */
    }
    reject(err);
  };

  zipfile.on('error', (err) => fail(new ArchiveExtractError(err.message, 'MALFORMED_ZIP')));

  zipfile.on('entry', (entry: Entry) => {
    if (aborted) return;

    totalEntries += 1;
    if (totalEntries > lim.maxFileCount) {
      return fail(
        new ArchiveExtractError(
          `Archive contains > ${lim.maxFileCount} entries — refused`,
          'TOO_MANY_ENTRIES',
        ),
      );
    }

    // ────────── Symlink detection ──────────
    // Unix mode is in the high 16 bits of externalFileAttributes.
    // File type bits: 0xA000 == symlink.
    const unixMode = (entry.externalFileAttributes >>> 16) & 0xffff;
    const isSymlink = (unixMode & 0xf000) === 0xa000;
    if (isSymlink) {
      skipped.push({ entryName: entry.fileName, reason: 'symlink' });
      zipfile.readEntry();
      return;
    }

    // ────────── Path traversal check ──────────
    const sanitized = sanitizeZipPath(entry.fileName);
    if (sanitized === null) {
      return fail(
        new ArchiveExtractError(
          `Rejected path-traversal entry: "${entry.fileName}"`,
          'PATH_TRAVERSAL',
          entry.fileName,
        ),
      );
    }

    const isDir = entry.fileName.endsWith('/');
    if (isDir) {
      const dirPath = path.join(extractDirAbs, sanitized);
      // Final containment check.
      if (!dirPath.startsWith(extractDirAbs + path.sep) && dirPath !== extractDirAbs) {
        return fail(
          new ArchiveExtractError(
            `Sanitized path escapes extract dir: "${entry.fileName}" → "${dirPath}"`,
            'PATH_TRAVERSAL',
            entry.fileName,
          ),
        );
      }
      fs.mkdir(dirPath, { recursive: true })
        .then(() => zipfile.readEntry())
        .catch((mkdirErr: Error) =>
          fail(new ArchiveExtractError(`mkdir failed: ${mkdirErr.message}`, 'IO', entry.fileName)),
        );
      return;
    }

    // ────────── Per-entry size + ratio guards ──────────
    if (entry.uncompressedSize > lim.maxEntrySize) {
      return fail(
        new ArchiveExtractError(
          `Entry "${entry.fileName}" uncompressed size ${entry.uncompressedSize} > ${lim.maxEntrySize}`,
          'ENTRY_TOO_LARGE',
          entry.fileName,
        ),
      );
    }
    if (
      entry.compressedSize > 0 &&
      entry.uncompressedSize > entry.compressedSize * lim.maxRatio
    ) {
      return fail(
        new ArchiveExtractError(
          `Entry "${entry.fileName}" compression ratio ${
            entry.uncompressedSize / entry.compressedSize
          }× exceeds cap ${lim.maxRatio}×`,
          'ZIP_BOMB_RATIO',
          entry.fileName,
        ),
      );
    }
    if (totalBytes + entry.uncompressedSize > lim.maxUncompressedBytes) {
      return fail(
        new ArchiveExtractError(
          `Total uncompressed bytes would exceed cap ${lim.maxUncompressedBytes}`,
          'ZIP_BOMB_TOTAL',
          entry.fileName,
        ),
      );
    }

    const outPath = path.join(extractDirAbs, sanitized);
    if (!outPath.startsWith(extractDirAbs + path.sep)) {
      return fail(
        new ArchiveExtractError(
          `Sanitized path escapes extract dir: "${entry.fileName}" → "${outPath}"`,
          'PATH_TRAVERSAL',
          entry.fileName,
        ),
      );
    }

    fs.mkdir(path.dirname(outPath), { recursive: true })
      .then(
        () =>
          new Promise<void>((resolveEntry, rejectEntry) => {
            zipfile.openReadStream(entry, (streamErr, readStream) => {
              if (streamErr) {
                rejectEntry(streamErr);
                return;
              }

              // Streaming uncompressed-byte counter as a safety net even
              // though we already checked uncompressedSize above (defends
              // against header-lying archives).
              let writtenBytes = 0;
              readStream.on('data', (chunk: Buffer) => {
                writtenBytes += chunk.byteLength;
                if (writtenBytes > entry.uncompressedSize + 1024) {
                  // Allow 1 KB slop, then assume header lied.
                  readStream.destroy(
                    new ArchiveExtractError(
                      `Entry "${entry.fileName}" wrote more bytes than header claimed`,
                      'ZIP_BOMB_RATIO',
                      entry.fileName,
                    ),
                  );
                }
              });

              const writeStream = createWriteStream(outPath);
              pipeline(readStream, writeStream)
                .then(() => {
                  totalBytes += writtenBytes;
                  extractedFiles.push(sanitized);
                  resolveEntry();
                })
                .catch(rejectEntry);
            });
          }),
      )
      .then(() => zipfile.readEntry())
      .catch((entryErr: unknown) => {
        if (entryErr instanceof ArchiveExtractError) {
          fail(entryErr);
        } else {
          const msg = entryErr instanceof Error ? entryErr.message : String(entryErr);
          fail(new ArchiveExtractError(`Entry extraction failed: ${msg}`, 'IO', entry.fileName));
        }
      });
  });

  zipfile.on('end', () => {
    if (aborted) return;
    resolve({ extractedFiles, skipped, totalBytes, totalEntries });
  });

  zipfile.readEntry();
}

/**
 * Sanitise a zip entry name. Returns null if the name is non-recoverable
 * (path traversal, empty after sanitization, absolute path).
 */
export function sanitizeZipPath(fileName: string): string | null {
  // Normalise separators to forward slash.
  const normalized = fileName.replace(/\\/g, '/');

  // Absolute paths are rejected outright.
  if (normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized)) {
    return null;
  }

  // Split on forward slash, sanitise each segment, reject any `..`.
  const segments = normalized.split('/').filter(Boolean);
  const cleaned: string[] = [];
  for (const seg of segments) {
    if (seg === '..' || seg === '.') {
      return null;
    }
    const safe = sanitize(seg);
    if (!safe) {
      // sanitize-filename returned empty for this segment — refuse.
      return null;
    }
    cleaned.push(safe);
  }

  if (cleaned.length === 0) {
    return null;
  }

  return cleaned.join(path.sep);
}
