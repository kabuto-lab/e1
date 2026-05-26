/**
 * check-tenant-coverage.ts — ADR-001 IMPL-A · L1 detector.
 *
 * Scans `apps/api/src/**\/*.controller.ts` and FAILS if any controller file:
 *   (a) declares HTTP-route methods (@Get/@Post/@Put/@Patch/@Delete), AND
 *   (b) does NOT use `TenantGuard` in @UseGuards anywhere in the file, AND
 *   (c) does NOT use `@SkipTenant()` anywhere in the file, AND
 *   (d) is NOT in the allow-list `src/tenant-context/coverage.allow.json`.
 *
 * Why file-level (not method-level): NAS controllers in this repo are
 * conventionally either fully tenant-scoped (class-level @UseGuards) or fully
 * tenant-skipping (class-level @SkipTenant()). Method-level mixing is rare;
 * when it happens, the file passes detector and the missing-guard surface is
 * caught at code review + Council T5 Sentinel pass. Method-level detection is
 * deferred to ADR-001B (Phase L+ once L1 is stable in CI).
 *
 * Exit codes:
 *   0 — all controllers covered or explicitly allow-listed
 *   1 — at least one controller is unguarded with no allow-list entry
 *   2 — invalid allow-list JSON or other config error
 *
 * Run: `npm run check:tenant-coverage`
 */

import { readFileSync, statSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';

interface AllowList {
  /** Controller file basenames (relative to apps/api/src/) that legitimately skip tenant guard. */
  skipTenantControllers: Array<{ file: string; reason: string; addedBy?: string; reviewedAt?: string }>;
  /** Free-form notes for future L2 (raw-query) detector — not used yet. */
  rawQueryAllow?: Array<{ symbol: string; reason: string }>;
}

const API_SRC = resolve(__dirname, '..', 'src');
const ALLOW_LIST_PATH = resolve(API_SRC, 'tenant-context', 'coverage.allow.json');

const HTTP_DECORATOR_RE = /@(Get|Post|Put|Patch|Delete)\s*\(/;
const TENANT_GUARD_USE_RE = /@UseGuards\s*\([^)]*TenantGuard/m;
const SKIP_TENANT_RE = /@SkipTenant\s*\(\s*\)/;
const CONTROLLER_DECORATOR_RE = /@Controller\s*\(/;

async function walkControllers(dir: string, out: string[]): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      await walkControllers(fullPath, out);
    } else if (entry.isFile() && entry.name.endsWith('.controller.ts')) {
      // Skip test fixtures
      if (fullPath.includes(`${sep}fixtures${sep}`)) continue;
      // Skip spec files
      if (entry.name.endsWith('.spec.ts')) continue;
      out.push(fullPath);
    }
  }
}

function readAllowList(): AllowList {
  try {
    statSync(ALLOW_LIST_PATH);
  } catch {
    console.error(`✗ coverage.allow.json not found at ${ALLOW_LIST_PATH}`);
    console.error('  Create the file (see ADR-001 §Allow-list).');
    process.exit(2);
  }
  try {
    const raw = readFileSync(ALLOW_LIST_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as AllowList;
    if (!Array.isArray(parsed.skipTenantControllers)) {
      throw new Error('skipTenantControllers must be an array');
    }
    return parsed;
  } catch (e) {
    console.error(`✗ Invalid coverage.allow.json: ${(e as Error).message}`);
    process.exit(2);
  }
}

export interface Verdict {
  file: string;
  status: 'ok' | 'fail' | 'allowed';
  reason: string;
}

export function checkFile(filePath: string, relativeFile: string, allowList: AllowList): Verdict {
  const content = readFileSync(filePath, 'utf-8');

  // Sanity: it must actually be a controller (has @Controller(...)).
  if (!CONTROLLER_DECORATOR_RE.test(content)) {
    return { file: relativeFile, status: 'ok', reason: 'no @Controller — non-controller file with .controller.ts suffix' };
  }

  // Sanity: does it expose at least one HTTP route method?
  if (!HTTP_DECORATOR_RE.test(content)) {
    return { file: relativeFile, status: 'ok', reason: 'no HTTP route methods declared' };
  }

  // Allow-list match wins.
  const allowEntry = allowList.skipTenantControllers.find(
    (e) => e.file === relativeFile || relativeFile.endsWith(e.file),
  );
  if (allowEntry) {
    return { file: relativeFile, status: 'allowed', reason: `allow-list: ${allowEntry.reason}` };
  }

  // Pass if either guard or skip decorator is present.
  if (TENANT_GUARD_USE_RE.test(content)) {
    return { file: relativeFile, status: 'ok', reason: 'TenantGuard in @UseGuards' };
  }
  if (SKIP_TENANT_RE.test(content)) {
    return { file: relativeFile, status: 'ok', reason: '@SkipTenant() declared' };
  }

  return {
    file: relativeFile,
    status: 'fail',
    reason: 'controller declares HTTP routes but lacks TenantGuard and lacks @SkipTenant() — and is not allow-listed',
  };
}

export async function runDetector(srcRoot: string = API_SRC): Promise<{ verdicts: Verdict[]; failures: number }> {
  const allowList = readAllowList();
  const controllers: string[] = [];
  await walkControllers(srcRoot, controllers);
  controllers.sort();

  const verdicts: Verdict[] = [];
  let failures = 0;

  for (const controller of controllers) {
    const rel = relative(srcRoot, controller).replace(/\\/g, '/');
    const verdict = checkFile(controller, rel, allowList);
    verdicts.push(verdict);
    if (verdict.status === 'fail') failures += 1;
  }

  return { verdicts, failures };
}

async function main(): Promise<void> {
  console.log('check-tenant-coverage · ADR-001 L1 detector');
  console.log(`  scanning: ${API_SRC}`);
  const { verdicts, failures } = await runDetector();
  for (const v of verdicts) {
    const icon = v.status === 'ok' ? '✓' : v.status === 'allowed' ? '◯' : '✗';
    console.log(`  ${icon} ${v.file} — ${v.reason}`);
  }
  console.log('');
  console.log(`  scanned: ${verdicts.length} controller file(s)`);
  console.log(`  failures: ${failures}`);
  if (failures > 0) {
    console.error('');
    console.error('FAIL — at least one controller is unguarded with no allow-list entry.');
    console.error('Fix: add TenantGuard to @UseGuards OR @SkipTenant() decorator,');
    console.error('     OR add an allow-list entry in coverage.allow.json with explicit reason.');
    process.exit(1);
  }
  console.log('OK — all controllers covered.');
}

// Run only if invoked directly (not on import from spec).
if (require.main === module) {
  void main();
}
