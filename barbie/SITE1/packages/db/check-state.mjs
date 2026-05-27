/**
 * ADR-002 IMPL-A — Drizzle migration journal coherence check (Mode A, no DB).
 *
 * Detects D-5 (migration-state drift) at the cheap level: ensures the on-disk
 * artifacts in `drizzle/` agree with `drizzle/meta/_journal.json`. Mode B
 * (`--with-db`) is deferred per ADR-002 §Implementation plan IMPL-C.
 *
 * Assertions:
 *   A1. Every entry in `_journal.json` has a matching `drizzle/<tag>.sql`.
 *   A2. Every `drizzle/0NNN_*.sql` has a matching `_journal.json` entry (by tag).
 *   A3. Every journal entry that is NOT in `hand-written-migrations.json`
 *       has a matching `drizzle/meta/000N_snapshot.json`.
 *   A4. Every snapshot `meta/000N_snapshot.json` has a matching journal entry
 *       at idx N.
 *
 * Hand-written migrations (e.g. 0002_chat) intentionally lack snapshots — see
 * `hand-written-migrations.json` for the allow-list + per-tag reason.
 *
 * Exit codes (per ADR-002 §Decision):
 *   0 — coherent
 *   1 — journal incoherent (any of A1..A4 failed)
 *
 * Run: `npm run db:check-state` (chained into `lint`).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_PATHS = {
  drizzleDir: path.join(__dirname, 'drizzle'),
  journalPath: path.join(__dirname, 'drizzle', 'meta', '_journal.json'),
  metaDir: path.join(__dirname, 'drizzle', 'meta'),
  handWrittenPath: path.join(__dirname, 'hand-written-migrations.json'),
};

/**
 * Read & parse a JSON file with an actionable error on parse failure.
 */
function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`failed to parse JSON at ${filePath}: ${err.message}`);
  }
}

/**
 * List file names in a directory matching a regex.
 * Returns [] if the directory does not exist.
 */
function listDirMatching(dir, regex) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) => regex.test(name));
}

/**
 * Format a journal idx as a 4-digit zero-padded string (matches snapshot file
 * naming: `0000_snapshot.json`, `0014_snapshot.json`).
 */
function pad4(n) {
  return String(n).padStart(4, '0');
}

/**
 * Pure function — no I/O. Takes already-loaded data, returns an array of
 * failure messages. Empty array == coherent.
 *
 * @param {object} input
 * @param {{idx: number, tag: string}[]} input.journalEntries
 * @param {string[]} input.sqlFiles            e.g. ["0000_deep.sql", ...]
 * @param {string[]} input.snapshotFiles       e.g. ["0000_snapshot.json", ...]
 * @param {string[]} input.handWrittenTags     allow-listed tags (no snapshot required)
 * @returns {string[]}
 */
export function diagnose({ journalEntries, sqlFiles, snapshotFiles, handWrittenTags }) {
  const failures = [];

  const handWritten = new Set(handWrittenTags);

  // Index SQL files by tag (filename stem without .sql)
  const sqlByTag = new Map();
  for (const fname of sqlFiles) {
    const m = fname.match(/^(\d{4}_[^.]+)\.sql$/);
    if (!m) {
      failures.push(`A2: orphan SQL file with non-standard name: drizzle/${fname}`);
      continue;
    }
    sqlByTag.set(m[1], fname);
  }

  // Index snapshot files by idx (parsed from "0042_snapshot.json")
  const snapshotByIdx = new Map();
  for (const fname of snapshotFiles) {
    const m = fname.match(/^(\d{4})_snapshot\.json$/);
    if (!m) {
      failures.push(`A4: orphan snapshot file with non-standard name: drizzle/meta/${fname}`);
      continue;
    }
    snapshotByIdx.set(Number(m[1]), fname);
  }

  const journalByTag = new Map(journalEntries.map((e) => [e.tag, e]));
  const journalByIdx = new Map(journalEntries.map((e) => [e.idx, e]));

  // A1 — every journal entry has a matching SQL
  for (const entry of journalEntries) {
    if (!sqlByTag.has(entry.tag)) {
      failures.push(
        `A1: journal entry idx=${entry.idx} tag="${entry.tag}" has no matching drizzle/${entry.tag}.sql (suggestion: either restore the SQL or delete the journal entry)`,
      );
    }
  }

  // A2 — every SQL has a matching journal entry
  for (const tag of sqlByTag.keys()) {
    if (!journalByTag.has(tag)) {
      failures.push(
        `A2: SQL file drizzle/${tag}.sql has no matching journal entry (suggestion: add to meta/_journal.json or delete the file)`,
      );
    }
  }

  // A3 — every journal entry NOT in hand-written allow-list has a snapshot
  for (const entry of journalEntries) {
    if (handWritten.has(entry.tag)) continue;
    const expected = `${pad4(entry.idx)}_snapshot.json`;
    if (!snapshotByIdx.has(entry.idx)) {
      failures.push(
        `A3: drizzle-kit-generated migration idx=${entry.idx} tag="${entry.tag}" is missing meta/${expected} (suggestion: regenerate with drizzle-kit, or add tag to hand-written-migrations.json with a reason)`,
      );
    }
  }

  // A4 — every snapshot file has a matching journal entry at that idx
  for (const [idx, fname] of snapshotByIdx) {
    if (!journalByIdx.has(idx)) {
      failures.push(
        `A4: snapshot meta/${fname} has no matching journal entry at idx=${idx} (suggestion: delete the snapshot or restore the journal entry)`,
      );
    }
  }

  return failures;
}

/**
 * I/O wrapper. Loads from disk + delegates to `diagnose`.
 */
export function check(paths = DEFAULT_PATHS) {
  const { drizzleDir, journalPath, metaDir, handWrittenPath } = paths;

  if (!fs.existsSync(journalPath)) {
    return [`A1: meta/_journal.json not found at ${journalPath}`];
  }
  const journal = readJson(journalPath);
  const journalEntries = Array.isArray(journal.entries) ? journal.entries : [];

  let handWrittenTags = [];
  if (fs.existsSync(handWrittenPath)) {
    const hw = readJson(handWrittenPath);
    handWrittenTags = Array.isArray(hw.tags) ? hw.tags : [];
  }

  const sqlFiles = listDirMatching(drizzleDir, /^\d{4}_.+\.sql$/);
  const snapshotFiles = listDirMatching(metaDir, /^\d{4}_snapshot\.json$/);

  return diagnose({ journalEntries, sqlFiles, snapshotFiles, handWrittenTags });
}

// CLI entry. Only run when invoked directly (not when imported by spec).
// `pathToFileURL` produces a properly normalised file:// URL across platforms
// (Windows: `file:///F:/...`, POSIX: `file:///home/...`).
const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  const failures = check();
  if (failures.length === 0) {
    console.log('[db:check-state] coherent — 0 failures (Mode A)');
    process.exit(0);
  }
  console.error(`[db:check-state] D-5 trip — ${failures.length} failure(s):`);
  for (const msg of failures) console.error(`  - ${msg}`);
  process.exit(1);
}
