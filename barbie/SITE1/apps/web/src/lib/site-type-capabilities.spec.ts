/**
 * Spec for site-type-capabilities — pure-logic tests, no React / no fetch.
 *
 * Runs via `node --test` (Node 22+ built-in, TypeScript stripping native to
 * Node 24). No jest dep added to apps/web for this single helper.
 *
 * Run: `node --test --experimental-strip-types src/lib/site-type-capabilities.spec.ts`
 *      from apps/web/ (wired into `npm test -w @barbie-site1/web`).
 *
 * The matrix mirrors MIGRATION_PLAN §3.3. If the matrix changes, both the
 * production code AND this spec MUST update — drift here would silently
 * break tenant admin UI.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CAPABILITIES,
  UNIVERSAL_MODULES,
  tenantCan,
  modulesFor,
  type AdminModule,
} from './site-type-capabilities.ts';

// ── Universal modules present for every site type ──────────────────────────

test('every site type can access every universal module', () => {
  for (const [siteType, modules] of Object.entries(CAPABILITIES)) {
    for (const universal of UNIVERSAL_MODULES) {
      assert.ok(
        modules.has(universal),
        `${siteType} is missing universal module ${universal}`,
      );
    }
  }
});

// ── wfy-city-dir — exact capability set per MIGRATION_PLAN §3.3 ────────────

test('wfy-city-dir capability set matches MIGRATION_PLAN §3.3', () => {
  const expected = new Set<AdminModule>([
    'settings',
    'domains',
    'media',
    'pages',
    'leads',
    'city-pages',
    'partner-salons',
    'vacancies',
    'advantages',
  ]);
  assert.deepEqual(new Set(CAPABILITIES['wfy-city-dir']), expected);
});

test('wfy-city-dir CANNOT access salon-detail modules', () => {
  assert.equal(tenantCan('wfy-city-dir', 'salons'), false);
  assert.equal(tenantCan('wfy-city-dir', 'services'), false);
  assert.equal(tenantCan('wfy-city-dir', 'rooms'), false);
  assert.equal(tenantCan('wfy-city-dir', 'bookings'), false);
});

// ── salon-detail — exact capability set ────────────────────────────────────

test('salon-detail capability set matches MIGRATION_PLAN §3.3', () => {
  const expected = new Set<AdminModule>([
    'settings',
    'domains',
    'media',
    'pages',
    'leads',
    'salons',
    'staff',
    'services',
    'rooms',
    'bookings',
  ]);
  assert.deepEqual(new Set(CAPABILITIES['salon-detail']), expected);
});

test('salon-detail CANNOT access wfy modules', () => {
  assert.equal(tenantCan('salon-detail', 'city-pages'), false);
  assert.equal(tenantCan('salon-detail', 'partner-salons'), false);
  assert.equal(tenantCan('salon-detail', 'vacancies'), false);
  assert.equal(tenantCan('salon-detail', 'advantages'), false);
});

// ── multi-salon-network has the same vertical set as salon-detail ──────────

test('multi-salon-network matches salon-detail vertical', () => {
  assert.deepEqual(
    new Set(CAPABILITIES['multi-salon-network']),
    new Set(CAPABILITIES['salon-detail']),
  );
});

// ── escort-catalog has only staff added ────────────────────────────────────

test('escort-catalog adds only staff above the universal set', () => {
  const extras = [...CAPABILITIES['escort-catalog']].filter(
    (m) => !UNIVERSAL_MODULES.includes(m),
  );
  assert.deepEqual(new Set(extras), new Set(['staff']));
});

// ── generic-cms is exactly the universal set ───────────────────────────────

test('generic-cms is exactly the universal set', () => {
  assert.deepEqual(
    new Set(CAPABILITIES['generic-cms']),
    new Set(UNIVERSAL_MODULES),
  );
});

// ── modulesFor stable ordering ─────────────────────────────────────────────

test('modulesFor lists universals first, then verticals', () => {
  const wfy = modulesFor('wfy-city-dir');
  // First 5 elements must be the universals in declared order.
  assert.deepEqual(wfy.slice(0, UNIVERSAL_MODULES.length), [
    ...UNIVERSAL_MODULES,
  ]);
  // Remainder is the vertical set.
  assert.deepEqual(wfy.slice(UNIVERSAL_MODULES.length), [
    'city-pages',
    'partner-salons',
    'vacancies',
    'advantages',
  ]);
});

// ── tenantCan equivalence with the underlying Set ──────────────────────────

test('tenantCan agrees with the underlying CAPABILITIES set', () => {
  for (const siteType of Object.keys(CAPABILITIES) as Array<
    keyof typeof CAPABILITIES
  >) {
    for (const module of CAPABILITIES[siteType]) {
      assert.ok(tenantCan(siteType, module));
    }
  }
});

// ── CAPABILITIES frozen — defence-in-depth ─────────────────────────────────

test('CAPABILITIES is frozen', () => {
  assert.ok(Object.isFrozen(CAPABILITIES));
});
