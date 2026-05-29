import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

/**
 * SQL-dump parser for Duplicator archives. Harvested from the Replikant migrator.
 *
 * Design choice: **text-only parse — never execute SQL**.
 *
 *   - Streams the SQL dump line-by-line (handles GB files).
 *   - Recognises `INSERT INTO `<prefix>posts` ... VALUES (...);` statements
 *     for an allow-list of known WP tables.
 *   - Extracts tuple values as JS primitives (string, number, null) using a
 *     SQL-aware literal lexer (handles quoted strings, escaped quotes,
 *     backslash escapes, NULL).
 *   - **Ignores DDL** (`CREATE EXTENSION`, `COPY FROM PROGRAM`, etc.) —
 *     it never reaches an executor.
 *   - **Ignores INSERTs into non-WP tables** — only allow-list passes through.
 *
 * No SQL executor exists in this path by construction — code-execution from a
 * malicious dump is impossible here.
 */

const KNOWN_WP_TABLES = [
  'posts',
  'postmeta',
  'users',
  'options',
  'terms',
  'term_taxonomy',
  'term_relationships',
  'comments',
  'commentmeta',
] as const;
export type KnownWpTable = (typeof KNOWN_WP_TABLES)[number];

export class SqlDumpParseError extends Error {
  constructor(
    message: string,
    public readonly code: 'MALFORMED' | 'TOO_LARGE' | 'IO',
  ) {
    super(message);
  }
}

export interface SqlDumpParseLimits {
  maxLineBytes: number;
  maxTotalRows: number;
}

export const DEFAULT_SQL_DUMP_LIMITS: SqlDumpParseLimits = {
  maxLineBytes: 50_000_000, // 50 MB per logical SQL statement
  maxTotalRows: 500_000,
};

export interface ParsedRow {
  table: KnownWpTable;
  values: Array<string | number | null>;
}

export interface SqlDumpParseResult {
  rows: ParsedRow[];
  /** Counts per table (incl. tables we extracted). */
  countsByTable: Partial<Record<KnownWpTable, number>>;
  /** Total lines scanned. */
  linesScanned: number;
  /** Bytes scanned. */
  bytesScanned: number;
}

/**
 * Parse a Duplicator SQL dump file. Streams line-by-line.
 *
 * NOTE: We assume INSERT statements are on contiguous lines (typical for
 * mysqldump output). Multi-line statements that span dozens of lines with
 * embedded newlines inside quoted strings need a more sophisticated lexer.
 */
export async function parseSqlDump(
  filePath: string,
  limits: Partial<SqlDumpParseLimits> = {},
): Promise<SqlDumpParseResult> {
  const lim = { ...DEFAULT_SQL_DUMP_LIMITS, ...limits };

  const rows: ParsedRow[] = [];
  const countsByTable: Partial<Record<KnownWpTable, number>> = {};
  let linesScanned = 0;
  let bytesScanned = 0;

  const stream = createReadStream(filePath, { encoding: 'utf8' });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  // We buffer logical INSERT statements that span multiple lines (until `;`).
  let buffer = '';
  let bufferTable: KnownWpTable | null = null;
  let bufferBytes = 0;

  for await (const line of rl) {
    linesScanned += 1;
    bytesScanned += line.length;

    // Hard cap on any single line — single-line gigantic INSERT is rejected
    // even before buffering kicks in.
    if (line.length > lim.maxLineBytes) {
      throw new SqlDumpParseError(
        `SQL line ${linesScanned} length ${line.length} exceeds cap ${lim.maxLineBytes}`,
        'TOO_LARGE',
      );
    }

    if (bufferTable !== null) {
      // Continuing a multi-line INSERT
      buffer += '\n' + line;
      bufferBytes += line.length + 1;
      if (bufferBytes > lim.maxLineBytes) {
        throw new SqlDumpParseError(
          `INSERT statement for table "${bufferTable}" exceeds ${lim.maxLineBytes} bytes`,
          'TOO_LARGE',
        );
      }
      if (line.trimEnd().endsWith(';')) {
        extractInsertValues(buffer, bufferTable, rows, countsByTable);
        buffer = '';
        bufferTable = null;
        bufferBytes = 0;
        if (rows.length > lim.maxTotalRows) {
          throw new SqlDumpParseError(
            `Total rows exceeded cap ${lim.maxTotalRows}`,
            'TOO_LARGE',
          );
        }
      }
      continue;
    }

    // Look for new INSERT [LOW_PRIORITY|DELAYED|HIGH_PRIORITY] [IGNORE] INTO
    // `<prefix>tablename` VALUES ... — Duplicator Pro emits `INSERT IGNORE INTO`,
    // others use plain `INSERT INTO`. MySQL also supports priority modifiers.
    const m = line.match(
      /^INSERT(?:\s+(?:LOW_PRIORITY|DELAYED|HIGH_PRIORITY))?(?:\s+IGNORE)?\s+INTO\s+`?([a-zA-Z0-9_]+)`?\s+(?:\([^)]+\)\s+)?VALUES\s*/i,
    );
    if (!m) continue;
    const fullName = m[1] ?? '';
    const tableHint = matchKnownWpTable(fullName);
    if (!tableHint) continue;

    bufferTable = tableHint;
    buffer = line;
    bufferBytes = line.length;
    if (line.trimEnd().endsWith(';')) {
      extractInsertValues(buffer, bufferTable, rows, countsByTable);
      buffer = '';
      bufferTable = null;
      bufferBytes = 0;
      if (rows.length > lim.maxTotalRows) {
        throw new SqlDumpParseError(
          `Total rows exceeded cap ${lim.maxTotalRows}`,
          'TOO_LARGE',
        );
      }
    }
  }

  return { rows, countsByTable, linesScanned, bytesScanned };
}

/**
 * Match `wp_posts`, `wpxy_posts`, `wp_xy_posts`, etc. against the known
 * suffix list. WP prefixes are user-defined; we extract the trailing
 * known-table token from the column-separated name.
 */
function matchKnownWpTable(fullName: string): KnownWpTable | null {
  const lower = fullName.toLowerCase();
  // Must start with `wp` — default WP table-prefix convention. Plugins / non-WP
  // tables like `auth_users` are intentionally skipped.
  if (!lower.startsWith('wp')) return null;
  for (const known of KNOWN_WP_TABLES) {
    if (lower === `wp_${known}` || lower.endsWith(`_${known}`)) {
      return known;
    }
  }
  return null;
}

/**
 * Given the full text of an INSERT statement, extract tuple values.
 *
 * Assumes the form:
 *   INSERT INTO `t` [(cols)] VALUES (v,v,v),(v,v,v),...;
 */
function extractInsertValues(
  sql: string,
  table: KnownWpTable,
  rows: ParsedRow[],
  countsByTable: Partial<Record<KnownWpTable, number>>,
): void {
  // Find the VALUES keyword (case-insensitive) and parse what follows.
  const valuesIdx = sql.search(/\bVALUES\b/i);
  if (valuesIdx < 0) return;
  let i = valuesIdx + 'VALUES'.length;

  // Skip whitespace
  while (i < sql.length && /\s/.test(sql[i] ?? '')) i += 1;

  while (i < sql.length) {
    // Expect `(`
    if (sql[i] !== '(') {
      // End of statement or unexpected — stop.
      return;
    }
    i += 1;

    const tuple: Array<string | number | null> = [];
    let inString = false;
    let stringQuote: "'" | '"' | null = null;
    let stringBuf = '';
    let valueBuf = '';

    while (i < sql.length) {
      const ch = sql[i] ?? '';

      if (inString) {
        // SQL string parsing — handle backslash-escape AND doubled-quote.
        if (ch === '\\' && i + 1 < sql.length) {
          const next = sql[i + 1] ?? '';
          if (next === 'n') stringBuf += '\n';
          else if (next === 'r') stringBuf += '\r';
          else if (next === 't') stringBuf += '\t';
          else if (next === '0') stringBuf += '\0';
          else stringBuf += next;
          i += 2;
          continue;
        }
        if (ch === stringQuote) {
          if (sql[i + 1] === stringQuote) {
            // doubled quote → literal quote
            stringBuf += ch;
            i += 2;
            continue;
          }
          // End of string
          inString = false;
          stringQuote = null;
          tuple.push(stringBuf);
          stringBuf = '';
          valueBuf = '';
          i += 1;
          // Skip past separator
          while (i < sql.length && /\s/.test(sql[i] ?? '')) i += 1;
          if (sql[i] === ',') {
            i += 1;
            while (i < sql.length && /\s/.test(sql[i] ?? '')) i += 1;
            continue;
          }
          if (sql[i] === ')') {
            i += 1;
            // tuple complete
            rows.push({ table, values: tuple });
            countsByTable[table] = (countsByTable[table] ?? 0) + 1;
            // Skip trailing whitespace + comma/semicolon
            while (i < sql.length && /[\s,]/.test(sql[i] ?? '')) i += 1;
            if (sql[i] === ';') return;
            break;
          }
          break;
        }
        stringBuf += ch;
        i += 1;
        continue;
      }

      // Not in string
      if (ch === "'" || ch === '"') {
        inString = true;
        stringQuote = ch;
        stringBuf = '';
        i += 1;
        continue;
      }
      if (ch === ',') {
        // commit numeric/null value
        commitNonStringValue(valueBuf, tuple);
        valueBuf = '';
        i += 1;
        while (i < sql.length && /\s/.test(sql[i] ?? '')) i += 1;
        continue;
      }
      if (ch === ')') {
        commitNonStringValue(valueBuf, tuple);
        valueBuf = '';
        i += 1;
        rows.push({ table, values: tuple });
        countsByTable[table] = (countsByTable[table] ?? 0) + 1;
        while (i < sql.length && /[\s,]/.test(sql[i] ?? '')) i += 1;
        if (sql[i] === ';') return;
        break;
      }
      valueBuf += ch;
      i += 1;
    }
  }
}

function commitNonStringValue(buf: string, tuple: Array<string | number | null>): void {
  const trimmed = buf.trim();
  if (trimmed === '') return;
  if (trimmed.toUpperCase() === 'NULL') {
    tuple.push(null);
    return;
  }
  if (/^-?\d+$/.test(trimmed)) {
    const n = Number(trimmed);
    tuple.push(Number.isSafeInteger(n) ? n : trimmed);
    return;
  }
  if (/^-?\d*\.\d+$/.test(trimmed)) {
    tuple.push(Number(trimmed));
    return;
  }
  // Bare identifier or unrecognised — treat as string for safety.
  tuple.push(trimmed);
}

// ────────────────────────────────────────────────────────────────────────────
// Canonical mappers — convert raw rows into typed shapes for downstream phases
// ────────────────────────────────────────────────────────────────────────────

/**
 * WP `posts` table column order (mysqldump default):
 *   ID, post_author, post_date, post_date_gmt, post_content, post_title,
 *   post_excerpt, post_status, comment_status, ping_status, post_password,
 *   post_name, to_ping, pinged, post_modified, post_modified_gmt,
 *   post_content_filtered, post_parent, guid, menu_order, post_type,
 *   post_mime_type, comment_count
 */
export interface WpPostRow {
  ID: number;
  post_author: number;
  post_date_gmt: string | null;
  post_content: string;
  post_title: string;
  post_excerpt: string;
  post_status: string;
  post_name: string;
  post_modified_gmt: string | null;
  post_parent: number;
  post_type: string;
  guid: string;
}

export function mapPostRow(values: Array<string | number | null>): WpPostRow | null {
  if (values.length < 23) return null;
  const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v) || 0);
  const str = (v: unknown): string => (typeof v === 'string' ? v : v === null ? '' : String(v));
  return {
    ID: num(values[0]),
    post_author: num(values[1]),
    post_date_gmt: typeof values[3] === 'string' ? values[3] : null,
    post_content: str(values[4]),
    post_title: str(values[5]),
    post_excerpt: str(values[6]),
    post_status: str(values[7]),
    post_name: str(values[11]),
    post_modified_gmt: typeof values[15] === 'string' ? values[15] : null,
    post_parent: num(values[17]),
    post_type: str(values[20]),
    guid: str(values[18]),
  };
}

export function mapOptionRow(values: Array<string | number | null>): { name: string; value: string } | null {
  // wp_options: option_id, option_name, option_value, autoload
  if (values.length < 3) return null;
  return {
    name: String(values[1] ?? ''),
    value: String(values[2] ?? ''),
  };
}

export function mapUserRow(
  values: Array<string | number | null>,
): { ID: number; login: string; email: string; displayName: string } | null {
  // wp_users: ID, user_login, user_pass, user_nicename, user_email, ...
  if (values.length < 10) return null;
  return {
    ID: Number(values[0]) || 0,
    login: String(values[1] ?? ''),
    email: String(values[4] ?? ''),
    displayName: String(values[9] ?? ''),
  };
}
