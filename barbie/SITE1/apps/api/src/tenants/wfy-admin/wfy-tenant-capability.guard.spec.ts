/**
 * WfyTenantCapabilityGuard — site-type capability gate tests (Track D.7).
 *
 * These cover the behaviour that used to live as `requireWfyTenant()` inside
 * each wfy-admin service (cities / partner-salons / opportunities). The single
 * lookup now lives here:
 *   - tenant row missing         → 404 TENANT_NOT_FOUND
 *   - site_type ≠ 'wfy-city-dir' → 409 TENANT_SITE_TYPE_MISMATCH
 *   - site_type = 'wfy-city-dir' → allow (canActivate → true)
 *   - the lookup is scoped to tenants.id === current tenant id
 *
 * Mock-DB unit spec (per memory: project_nas_test_approach).
 */
import { ConflictException, ExecutionContext, NotFoundException } from '@nestjs/common';

import { tenants } from '@barbie-site1/db';

import { WfyTenantCapabilityGuard } from './wfy-tenant-capability.guard';
import { createMockDb, whereArgsOf } from '../../test-utils/mock-db';
import type { MockDb } from '../../test-utils/mock-db';
import { expectTenantFilter, mockTenantContext } from '../../test-utils/sql-helpers';

const TENANT_A = '00000000-0000-0000-0000-00000000000a';

function makeGuard(db: MockDb, tenantId: string | null = TENANT_A): WfyTenantCapabilityGuard {
  return new WfyTenantCapabilityGuard(db.asDatabase(), mockTenantContext(tenantId));
}

/** Queue the single tenant-lookup row the guard reads. */
function queueSiteType(db: MockDb, siteType: string | null): void {
  db.queueResult(siteType === null ? [] : [{ siteType }]);
}

const ctx = {} as ExecutionContext;

describe('WfyTenantCapabilityGuard', () => {
  it('allows a wfy-city-dir tenant through (returns true)', async () => {
    const db = createMockDb();
    queueSiteType(db, 'wfy-city-dir');
    const guard = makeGuard(db);

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('refuses with 409 ConflictException when site_type differs', async () => {
    const db = createMockDb();
    queueSiteType(db, 'salon-detail');
    const guard = makeGuard(db);

    await expect(guard.canActivate(ctx)).rejects.toThrow(ConflictException);
  });

  it('409 carries code TENANT_SITE_TYPE_MISMATCH', async () => {
    const db = createMockDb();
    queueSiteType(db, 'salon-detail');
    const guard = makeGuard(db);

    await expect(guard.canActivate(ctx)).rejects.toMatchObject({
      response: { code: 'TENANT_SITE_TYPE_MISMATCH' },
    });
  });

  it('refuses with 404 TENANT_NOT_FOUND when tenant row is missing', async () => {
    const db = createMockDb();
    queueSiteType(db, null);
    const guard = makeGuard(db);

    await expect(guard.canActivate(ctx)).rejects.toThrow(NotFoundException);
  });

  it('scopes the lookup to tenants.id === current tenant id', async () => {
    const db = createMockDb();
    queueSiteType(db, 'wfy-city-dir');
    const guard = makeGuard(db);

    await guard.canActivate(ctx);

    expectTenantFilter(whereArgsOf(db), tenants.id, TENANT_A);
  });

  it('throws when there is no tenant context', async () => {
    const db = createMockDb();
    const guard = makeGuard(db, null);

    await expect(guard.canActivate(ctx)).rejects.toThrow();
  });
});
