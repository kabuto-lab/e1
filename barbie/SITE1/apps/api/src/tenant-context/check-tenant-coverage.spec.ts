/**
 * check-tenant-coverage.spec.ts — ADR-001 IMPL-B · regression test for the detector.
 *
 * Strategy:
 *   1. Run the detector against the actual `apps/api/src/` tree — expect 0 failures
 *      (allow-list covers known skips; everything else uses TenantGuard).
 *   2. Run the detector against in-memory fixtures (synthesized files via tmpdir)
 *      to assert it CATCHES a missing-guard controller, ALLOWS an explicit
 *      @SkipTenant() controller, and HONORS the allow-list.
 *
 * If this spec ever fails after Phase D adds new controllers, the new controller
 * either: (a) needs TenantGuard added, (b) needs @SkipTenant() added with rationale,
 * or (c) needs allow-list entry with explicit reason (Sentinel cosign per Council §F-14).
 */

import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkFile, runDetector } from '../../scripts/check-tenant-coverage';

const ALLOW: any = { skipTenantControllers: [], rawQueryAllow: [] };

describe('check-tenant-coverage · ADR-001 L1 detector', () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'tenant-cov-'));
  });

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  function writeController(rel: string, body: string): string {
    const fullPath = join(tmpRoot, rel);
    mkdirSync(join(fullPath, '..'), { recursive: true });
    writeFileSync(fullPath, body, 'utf-8');
    return fullPath;
  }

  it('FAILS controller with HTTP routes but no TenantGuard and no @SkipTenant', () => {
    const fixture = writeController(
      'foo/foo.controller.ts',
      `
import { Controller, Get } from '@nestjs/common';

@Controller('foo')
export class FooController {
  @Get()
  list() { return []; }
}
`,
    );
    const verdict = checkFile(fixture, 'foo/foo.controller.ts', ALLOW);
    expect(verdict.status).toBe('fail');
    expect(verdict.reason).toMatch(/lacks TenantGuard/);
  });

  it('PASSES controller with TenantGuard in @UseGuards', () => {
    const fixture = writeController(
      'bar/bar.controller.ts',
      `
import { Controller, Get, UseGuards } from '@nestjs/common';
import { TenantGuard } from '../tenant-context/tenant.guard';

@Controller('bar')
@UseGuards(TenantGuard)
export class BarController {
  @Get()
  list() { return []; }
}
`,
    );
    const verdict = checkFile(fixture, 'bar/bar.controller.ts', ALLOW);
    expect(verdict.status).toBe('ok');
    expect(verdict.reason).toMatch(/TenantGuard in @UseGuards/);
  });

  it('PASSES controller with method-level @SkipTenant()', () => {
    const fixture = writeController(
      'baz/baz.controller.ts',
      `
import { Controller, Get } from '@nestjs/common';
import { SkipTenant } from '../tenant-context/tenant.decorator';

@Controller('baz')
export class BazController {
  @Get()
  @SkipTenant()
  pub() { return 'public'; }
}
`,
    );
    const verdict = checkFile(fixture, 'baz/baz.controller.ts', ALLOW);
    expect(verdict.status).toBe('ok');
    expect(verdict.reason).toMatch(/@SkipTenant/);
  });

  it('ALLOWS via allow-list match', () => {
    const fixture = writeController(
      'qux/qux.controller.ts',
      `
import { Controller, Get } from '@nestjs/common';

@Controller('qux')
export class QuxController {
  @Get()
  list() { return []; }
}
`,
    );
    const allow = {
      skipTenantControllers: [
        { file: 'qux/qux.controller.ts', reason: 'test allow' },
      ],
      rawQueryAllow: [],
    } as any;
    const verdict = checkFile(fixture, 'qux/qux.controller.ts', allow);
    expect(verdict.status).toBe('allowed');
    expect(verdict.reason).toMatch(/test allow/);
  });

  it('IGNORES file with no @Controller decorator', () => {
    const fixture = writeController(
      'tools/util.controller.ts',
      `
// Not actually a controller — just .controller.ts suffix on a util file.
export function helper() {}
`,
    );
    const verdict = checkFile(fixture, 'tools/util.controller.ts', ALLOW);
    expect(verdict.status).toBe('ok');
    expect(verdict.reason).toMatch(/non-controller file/);
  });

  it('IGNORES @Controller with no HTTP route methods', () => {
    const fixture = writeController(
      'empty/empty.controller.ts',
      `
import { Controller } from '@nestjs/common';

@Controller('empty')
export class EmptyController {
  // No @Get/@Post/etc — no surface.
}
`,
    );
    const verdict = checkFile(fixture, 'empty/empty.controller.ts', ALLOW);
    expect(verdict.status).toBe('ok');
    expect(verdict.reason).toMatch(/no HTTP route methods/);
  });

  // ── Smoke: run against actual repo state ─────────────────────────────────

  it('SMOKE — actual apps/api/src passes detector with current allow-list', async () => {
    const { failures, verdicts } = await runDetector();
    if (failures > 0) {
      const failed = verdicts.filter((v) => v.status === 'fail');
      // eslint-disable-next-line no-console
      console.error('Detector found failures:', failed);
    }
    expect(failures).toBe(0);
    // Sanity: detector scanned some controllers, not zero.
    expect(verdicts.length).toBeGreaterThan(5);
  });
});
