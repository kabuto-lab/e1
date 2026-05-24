/**
 * CmsService — tenant-isolation invariant tests (ENTITY §2.2).
 *
 * Дополнительный риск vs других CRUD: `getPublishedBySlug()` — публичный
 * рендер по slug+locale. Если бы он не фильтровал по tenantId, любой
 * запрос к /api/cms/pages/published/<slug> с произвольным X-Tenant-Slug
 * мог бы вернуть страницу другого тенанта. Проверяем явно.
 */
import { cmsPages } from '@barbie-site1/db';

import { CmsService } from './cms.service';
import { createMockDb, whereArgsOf, type MockDb } from '../test-utils/mock-db';
import { expectTenantFilter, mockTenantContext } from '../test-utils/sql-helpers';

const TENANT_A = '00000000-0000-0000-0000-00000000000a';

function makeService(db: MockDb, tenantId: string | null = TENANT_A): CmsService {
  const ctx = mockTenantContext(tenantId);
  return new CmsService(ctx, db.asDatabase());
}

function mockPageRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'pg-1',
    tenantId: TENANT_A,
    slug: 'home',
    locale: 'ru' as const,
    title: 'Home',
    body: [{ type: 'text', data: { html: '<p>x</p>' } }],
    status: 'draft' as const,
    metaTitle: null,
    metaDescription: null,
    coverImageKey: null,
    authorUserId: 'user-1',
    publishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('CmsService · tenant isolation', () => {
  it('listPages — rows + count оба tenant-filtered', async () => {
    const db = createMockDb();
    db.queueResult([]); // rows
    db.queueResult([{ value: 0 }]); // count
    const service = makeService(db);

    await service.listPages({});

    const wheres = whereArgsOf(db);
    expect(wheres.length).toBeGreaterThanOrEqual(2);
    expectTenantFilter(wheres, cmsPages.tenantId, TENANT_A);
  });

  it('getPage — tenant-filtered', async () => {
    const db = createMockDb();
    db.queueResult([mockPageRow()]);
    const service = makeService(db);

    await service.getPage('pg-1');

    expectTenantFilter(whereArgsOf(db), cmsPages.tenantId, TENANT_A);
  });

  it('getPublishedBySlug — публичный рендер тенант-filtered (по slug + locale + status)', async () => {
    const db = createMockDb();
    db.queueResult([mockPageRow({ status: 'published' })]);
    const service = makeService(db);

    await service.getPublishedBySlug('home', 'ru');

    expectTenantFilter(whereArgsOf(db), cmsPages.tenantId, TENANT_A);
  });

  it('updatePage — update tenant-filtered', async () => {
    const db = createMockDb();
    db.queueResult([mockPageRow({ title: 'New' })]); // returning
    const service = makeService(db);

    await service.updatePage('pg-1', { title: 'New' });

    expectTenantFilter(whereArgsOf(db), cmsPages.tenantId, TENANT_A);
  });

  it('publishPage / unpublishPage / archivePage — все три tenant-filtered', async () => {
    const db = createMockDb();
    db.queueResult([mockPageRow({ status: 'published' })]); // publish
    db.queueResult([mockPageRow({ status: 'draft' })]); // unpublish
    db.queueResult([mockPageRow({ status: 'archived' })]); // archive
    const service = makeService(db);

    await service.publishPage('pg-1');
    await service.unpublishPage('pg-1');
    await service.archivePage('pg-1');

    const wheres = whereArgsOf(db);
    expect(wheres.length).toBe(3);
    for (const w of wheres) {
      expectTenantFilter([w], cmsPages.tenantId, TENANT_A);
    }
  });

  it('бросает при отсутствии tenant context', async () => {
    const db = createMockDb();
    const service = makeService(db, /* tenantId */ null);

    await expect(service.listPages({})).rejects.toThrow(/TenantContext is missing/);
    await expect(service.getPage('pg-1')).rejects.toThrow(/TenantContext is missing/);
    await expect(service.getPublishedBySlug('home')).rejects.toThrow(/TenantContext is missing/);
  });
});
