/**
 * ADR-002 IMPL-B — Spec for check-state Mode A.
 *
 * Pure-function tests on `diagnose` (no fs / no DB), plus one fs-roundtrip
 * test for `check` against a tmp directory. Uses node:test (built into Node
 * 22 LTS — no jest dep added to packages/db).
 *
 * Run: `npm test -w @barbie-site1/db` (chained from root `npm test`) or
 * directly `node --test check-state.spec.mjs`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { diagnose, check } from './check-state.mjs';

// ── diagnose — pure happy path ──────────────────────────────────────────────

test('diagnose: coherent — kit-only migrations', () => {
  const failures = diagnose({
    journalEntries: [
      { idx: 0, tag: '0000_a' },
      { idx: 1, tag: '0001_b' },
    ],
    sqlFiles: ['0000_a.sql', '0001_b.sql'],
    snapshotFiles: ['0000_snapshot.json', '0001_snapshot.json'],
    handWrittenTags: [],
  });
  assert.deepEqual(failures, []);
});

test('diagnose: coherent — mixed kit + hand-written (current SITE1 shape)', () => {
  const failures = diagnose({
    journalEntries: [
      { idx: 0, tag: '0000_deep_gamma_corps' },
      { idx: 1, tag: '0001_greedy_molten_man' },
      { idx: 2, tag: '0002_chat' },
      { idx: 3, tag: '0003_tenant_bootstrap' },
      { idx: 4, tag: '0004_cool_next_avengers' },
    ],
    sqlFiles: [
      '0000_deep_gamma_corps.sql',
      '0001_greedy_molten_man.sql',
      '0002_chat.sql',
      '0003_tenant_bootstrap.sql',
      '0004_cool_next_avengers.sql',
    ],
    snapshotFiles: [
      '0000_snapshot.json',
      '0001_snapshot.json',
      '0004_snapshot.json',
    ],
    handWrittenTags: ['0002_chat', '0003_tenant_bootstrap'],
  });
  assert.deepEqual(failures, []);
});

// ── A1 · journal entry missing SQL ──────────────────────────────────────────

test('A1: journal entry without matching SQL file is flagged', () => {
  const failures = diagnose({
    journalEntries: [
      { idx: 0, tag: '0000_a' },
      { idx: 1, tag: '0001_missing' },
    ],
    sqlFiles: ['0000_a.sql'],
    snapshotFiles: ['0000_snapshot.json', '0001_snapshot.json'],
    handWrittenTags: [],
  });
  assert.equal(failures.length, 1);
  assert.match(failures[0], /^A1:/);
  assert.match(failures[0], /0001_missing/);
});

// ── A2 · SQL without journal entry ──────────────────────────────────────────

test('A2: orphan SQL file is flagged', () => {
  const failures = diagnose({
    journalEntries: [{ idx: 0, tag: '0000_a' }],
    sqlFiles: ['0000_a.sql', '0099_orphan.sql'],
    snapshotFiles: ['0000_snapshot.json'],
    handWrittenTags: [],
  });
  assert.equal(failures.length, 1);
  assert.match(failures[0], /^A2:/);
  assert.match(failures[0], /0099_orphan/);
});

test('A2: malformed SQL filename is flagged', () => {
  const failures = diagnose({
    journalEntries: [{ idx: 0, tag: '0000_a' }],
    sqlFiles: ['0000_a.sql', 'README.sql'],
    snapshotFiles: ['0000_snapshot.json'],
    handWrittenTags: [],
  });
  assert.equal(failures.length, 1);
  assert.match(failures[0], /^A2:/);
  assert.match(failures[0], /README\.sql/);
});

// ── A3 · kit-generated migration missing snapshot ───────────────────────────

test('A3: kit-generated migration without snapshot is flagged', () => {
  const failures = diagnose({
    journalEntries: [
      { idx: 0, tag: '0000_a' },
      { idx: 1, tag: '0001_b' },
    ],
    sqlFiles: ['0000_a.sql', '0001_b.sql'],
    snapshotFiles: ['0000_snapshot.json'], // 0001 snapshot missing
    handWrittenTags: [],
  });
  assert.equal(failures.length, 1);
  assert.match(failures[0], /^A3:/);
  assert.match(failures[0], /idx=1/);
  assert.match(failures[0], /0001_b/);
});

test('A3: hand-written allow-listed migration without snapshot is NOT flagged', () => {
  const failures = diagnose({
    journalEntries: [
      { idx: 0, tag: '0000_a' },
      { idx: 1, tag: '0001_chat' },
    ],
    sqlFiles: ['0000_a.sql', '0001_chat.sql'],
    snapshotFiles: ['0000_snapshot.json'],
    handWrittenTags: ['0001_chat'],
  });
  assert.deepEqual(failures, []);
});

// ── A4 · orphan snapshot ────────────────────────────────────────────────────

test('A4: snapshot without matching journal entry is flagged', () => {
  const failures = diagnose({
    journalEntries: [{ idx: 0, tag: '0000_a' }],
    sqlFiles: ['0000_a.sql'],
    snapshotFiles: ['0000_snapshot.json', '0099_snapshot.json'],
    handWrittenTags: [],
  });
  assert.equal(failures.length, 1);
  assert.match(failures[0], /^A4:/);
  assert.match(failures[0], /idx=99/);
});

test('A4: snapshot file with malformed name is flagged', () => {
  const failures = diagnose({
    journalEntries: [{ idx: 0, tag: '0000_a' }],
    sqlFiles: ['0000_a.sql'],
    snapshotFiles: ['0000_snapshot.json', 'snapshot.json'],
    handWrittenTags: [],
  });
  assert.equal(failures.length, 1);
  assert.match(failures[0], /^A4:/);
  assert.match(failures[0], /snapshot\.json/);
});

// ── multiple failures accumulate ────────────────────────────────────────────

test('diagnose: multiple drift types accumulate without short-circuit', () => {
  const failures = diagnose({
    journalEntries: [
      { idx: 0, tag: '0000_a' },
      { idx: 1, tag: '0001_missing_sql' },
    ],
    sqlFiles: ['0000_a.sql', '0099_orphan.sql'],
    snapshotFiles: ['0000_snapshot.json'],
    handWrittenTags: [],
  });
  // Expect: A1 for missing SQL of 0001, A2 for orphan 0099, A3 for missing
  // snapshot of 0001 (the missing-sql entry still triggers snapshot check).
  assert.equal(failures.length, 3);
  assert.ok(failures.some((f) => f.startsWith('A1:')));
  assert.ok(failures.some((f) => f.startsWith('A2:')));
  assert.ok(failures.some((f) => f.startsWith('A3:')));
});

// ── check (I/O wrapper) — happy path against tmp dir ────────────────────────

function makeTmpRepo({ journalEntries, sqlNames, snapshotNames, handWrittenTags }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-state-spec-'));
  const drizzleDir = path.join(root, 'drizzle');
  const metaDir = path.join(drizzleDir, 'meta');
  fs.mkdirSync(metaDir, { recursive: true });

  fs.writeFileSync(
    path.join(metaDir, '_journal.json'),
    JSON.stringify({ version: '7', dialect: 'postgresql', entries: journalEntries }),
  );

  for (const name of sqlNames) {
    fs.writeFileSync(path.join(drizzleDir, name), '-- noop --\n');
  }
  for (const name of snapshotNames) {
    fs.writeFileSync(path.join(metaDir, name), '{}');
  }

  const handWrittenPath = path.join(root, 'hand-written-migrations.json');
  fs.writeFileSync(handWrittenPath, JSON.stringify({ tags: handWrittenTags }));

  return {
    root,
    paths: {
      drizzleDir,
      metaDir,
      journalPath: path.join(metaDir, '_journal.json'),
      handWrittenPath,
    },
  };
}

test('check: returns [] on a coherent tmp repo', () => {
  const { paths } = makeTmpRepo({
    journalEntries: [
      { idx: 0, tag: '0000_init', breakpoints: true, version: '7', when: 1 },
    ],
    sqlNames: ['0000_init.sql'],
    snapshotNames: ['0000_snapshot.json'],
    handWrittenTags: [],
  });
  assert.deepEqual(check(paths), []);
});

test('check: returns failure list when snapshot is missing', () => {
  const { paths } = makeTmpRepo({
    journalEntries: [
      { idx: 0, tag: '0000_init', breakpoints: true, version: '7', when: 1 },
      { idx: 1, tag: '0001_more', breakpoints: true, version: '7', when: 2 },
    ],
    sqlNames: ['0000_init.sql', '0001_more.sql'],
    snapshotNames: ['0000_snapshot.json'],
    handWrittenTags: [],
  });
  const failures = check(paths);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /^A3:.*0001_more/);
});

test('check: returns failure when journal is missing entirely', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-state-spec-'));
  const failures = check({
    drizzleDir: path.join(root, 'drizzle'),
    metaDir: path.join(root, 'drizzle', 'meta'),
    journalPath: path.join(root, 'drizzle', 'meta', '_journal.json'),
    handWrittenPath: path.join(root, 'hand-written-migrations.json'),
  });
  assert.equal(failures.length, 1);
  assert.match(failures[0], /^A1: meta\/_journal\.json not found/);
});

test('check: SITE1 live state is coherent', () => {
  // Sanity: the real packages/db/ shape passes. Locks behaviour against
  // accidental future drift (i.e. this test fails the next time someone
  // hand-edits a migration without updating hand-written-migrations.json).
  const failures = check();
  assert.deepEqual(failures, []);
});
