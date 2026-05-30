/**
 * WfyVacanciesService — tenant-isolation tests.
 *
 * Mock-DB unit spec. Verifies:
 *   - every read/write path includes `eq(wfyVacancies.tenantId, ctx.tenantId)`
 *   - update with empty patch falls back to get() (no .set() call)
 *   - delete returning empty → 404 (cross-tenant pretends not-found)
 *   - create reads tenantId from context (not DTO)
 *   - requirements/conditions arrays persisted; default to [] when omitted
 *   - 23505 (uniq tenant_id,code) → 409 WFY_VACANCY_CODE_TAKEN
 *
 * Site-type capability (site_type='wfy-city-dir') is enforced by
 * WfyTenantCapabilityGuard — its tests live in
 * wfy-tenant-capability.guard.spec.ts (Track D.7).
 */
import { ConflictException, NotFoundException } from '@nestjs/common';

import { wfyVacancies } from '@barbie-site1/db';

import { WfyVacanciesService } from './wfy-vacancies.service';
import { createMockDb, whereArgsOf } from '../../test-utils/mock-db';
import type { MockDb } from '../../test-utils/mock-db';
import { expectTenantFilter, mockTenantContext } from '../../test-utils/sql-helpers';

const TENANT_A = '00000000-0000-0000-0000-00000000000a';
const VAC_ROW = {
  id: 'vac-1',
  tenantId: TENANT_A,
  code: 'massazhistka',
  title: 'Массажистка',
  summary: null,
  requirements: [] as string[],
  conditions: [] as string[],
  ord: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeService(db: MockDb, tenantId: string | null = TENANT_A): WfyVacanciesService {
  return new WfyVacanciesService(db.asDatabase(), mockTenantContext(tenantId));
}

describe('WfyVacanciesService · tenant isolation', () => {
  it('list — both queries filter by tenant_id', async () => {
    const db = createMockDb();
    db.queueResult([]);
    db.queueResult([{ value: 0 }]);
    const service = makeService(db);

    await service.list({});

    const wheres = whereArgsOf(db);
    expect(wheres.length).toBeGreaterThanOrEqual(2);
    expectTenantFilter(wheres, wfyVacancies.tenantId, TENANT_A);
  });

  it('get — select filters by tenant_id', async () => {
    const db = createMockDb();
    db.queueResult([VAC_ROW]);
    const service = makeService(db);

    await service.get('vac-1');

    expectTenantFilter(whereArgsOf(db), wfyVacancies.tenantId, TENANT_A);
  });

  it('get — 404 when row not in this tenant', async () => {
    const db = createMockDb();
    db.queueResult([]);
    const service = makeService(db);

    await expect(service.get('vac-x')).rejects.toThrow(NotFoundException);
  });

  it('update — .where() filters by tenant_id', async () => {
    const db = createMockDb();
    db.queueResult([{ ...VAC_ROW, title: 'Updated' }]);
    const service = makeService(db);

    await service.update('vac-1', { title: 'Updated' });

    expectTenantFilter(whereArgsOf(db), wfyVacancies.tenantId, TENANT_A);
  });

  it('delete — .where() filters by tenant_id', async () => {
    const db = createMockDb();
    db.queueResult([{ id: 'vac-1' }]);
    const service = makeService(db);

    await service.remove('vac-1');

    expectTenantFilter(whereArgsOf(db), wfyVacancies.tenantId, TENANT_A);
  });

  it('delete — 404 when row not in this tenant', async () => {
    const db = createMockDb();
    db.queueResult([]);
    const service = makeService(db);

    await expect(service.remove('vac-x')).rejects.toThrow(NotFoundException);
  });
});

describe('WfyVacanciesService · create', () => {
  it('inserts with tenantId from context (not from DTO)', async () => {
    const db = createMockDb();
    db.queueResult([VAC_ROW]);
    const service = makeService(db);

    await service.create({ code: 'massazhistka', title: 'Массажистка' });

    const valuesCalls = db.calls.filter((c) => c.method === 'values');
    expect(valuesCalls.length).toBe(1);
    const [vals] = valuesCalls[0].args as [{ tenantId: string; code: string }];
    expect(vals.tenantId).toBe(TENANT_A);
    expect(vals.code).toBe('massazhistka');
  });

  it('defaults requirements/conditions to [] when omitted', async () => {
    const db = createMockDb();
    db.queueResult([VAC_ROW]);
    const service = makeService(db);

    await service.create({ code: 'admin', title: 'Администратор' });

    const [vals] = db.calls.find((c) => c.method === 'values')!.args as [
      { requirements: string[]; conditions: string[] },
    ];
    expect(vals.requirements).toEqual([]);
    expect(vals.conditions).toEqual([]);
  });

  it('persists requirements/conditions arrays when provided', async () => {
    const db = createMockDb();
    const reqs = ['18+', 'опыт от 1 года'];
    const conds = ['график 2/2', 'премии'];
    db.queueResult([{ ...VAC_ROW, requirements: reqs, conditions: conds }]);
    const service = makeService(db);

    const out = await service.create({
      code: 'hostess',
      title: 'Хостес',
      requirements: reqs,
      conditions: conds,
    });

    expect(out.requirements).toEqual(reqs);
    expect(out.conditions).toEqual(conds);
    const [vals] = db.calls.find((c) => c.method === 'values')!.args as [
      { requirements: string[]; conditions: string[] },
    ];
    expect(vals.requirements).toEqual(reqs);
    expect(vals.conditions).toEqual(conds);
  });

  it('maps 23505 to 409 WFY_VACANCY_CODE_TAKEN', async () => {
    const db = createMockDb();
    // Inject 23505 by making `.values()` throw synchronously — the service's
    // try/catch wraps the whole insert chain (mirror cities spec idiom).
    db.values.mockImplementationOnce(() => {
      const err: Error & { code?: string } = new Error('duplicate key');
      err.code = '23505';
      throw err;
    });
    const service = makeService(db);

    await expect(
      service.create({ code: 'massazhistka', title: 'Массажистка' }),
    ).rejects.toMatchObject({ response: { code: 'WFY_VACANCY_CODE_TAKEN' } });
  });
});

describe('WfyVacanciesService · update edge cases', () => {
  it('empty patch falls back to get() (no .set() call)', async () => {
    const db = createMockDb();
    db.queueResult([VAC_ROW]); // the eventual get()
    const service = makeService(db);

    await service.update('vac-1', {});

    const sets = db.calls.filter((c) => c.method === 'set');
    expect(sets.length).toBe(0);
  });

  it('throws 404 when update returning is empty', async () => {
    const db = createMockDb();
    db.queueResult([]);
    const service = makeService(db);

    await expect(service.update('vac-x', { title: 'X' })).rejects.toThrow(NotFoundException);
  });

  it('summary=null clears the field', async () => {
    const db = createMockDb();
    db.queueResult([{ ...VAC_ROW, summary: null }]);
    const service = makeService(db);

    await service.update('vac-1', { summary: null });

    const sets = db.calls.filter((c) => c.method === 'set');
    expect(sets.length).toBe(1);
    const [patch] = sets[0].args as [{ summary?: string | null }];
    expect(patch.summary).toBeNull();
  });

  it('replaces requirements array wholesale when provided', async () => {
    const db = createMockDb();
    const next = ['новое требование'];
    db.queueResult([{ ...VAC_ROW, requirements: next }]);
    const service = makeService(db);

    await service.update('vac-1', { requirements: next });

    const sets = db.calls.filter((c) => c.method === 'set');
    expect(sets.length).toBe(1);
    const [patch] = sets[0].args as [{ requirements?: string[] }];
    expect(patch.requirements).toEqual(next);
  });

  it('maps 23505 to 409 on code collision during update', async () => {
    const db = createMockDb();
    // update chain is .update().set().where().returning(); throw from .set().
    db.set.mockImplementationOnce(() => {
      const err: Error & { code?: string } = new Error('duplicate key');
      err.code = '23505';
      throw err;
    });
    const service = makeService(db);

    await expect(
      service.update('vac-1', { code: 'massazhistka' }),
    ).rejects.toThrow(ConflictException);
  });
});
