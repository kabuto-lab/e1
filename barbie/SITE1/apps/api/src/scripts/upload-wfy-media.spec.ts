/**
 * upload-wfy-media.spec.ts — Phase B.2 unit invariants.
 *
 * Mock-DB + mock fetcher + mock S3 client. Covers:
 *  - buildMediaKey: respects nas.media key prefix CHECK constraint
 *    (`tenant/{tenantId}/{module}/...`) per packages/db/src/schema/media.ts
 *  - uploadOneAttachment: idempotent (existing media row → 'skipped' without
 *    fetch/upload); fetch error → 'failed' status, error captured, NOT thrown;
 *    success → 'inserted' with returned id; bad content-type → failed
 *  - backfillPartnerSalonLogos: WHERE clause is tenant-scoped (no cross-tenant
 *    leak); skipped salons with no logoWpId; skipped when media missing
 *  - backfillOpportunityCovers: same invariants, but writes media KEY (string)
 *    not media id
 *
 * What this spec does NOT cover (integration concern):
 *  - real S3 PUT semantics
 *  - real Postgres CHECK constraint enforcement
 *  - end-to-end safeFetch behaviour (covered by wp-import/safe-fetch.spec.ts)
 *  - DB-level FK ON DELETE SET NULL for logo_media_id
 */
import {
  partnerSalons,
  wfyOpportunities,
  media,
  type Database,
} from '@barbie-site1/db';
import { createMockDb, whereArgsOf } from '../test-utils/mock-db';
import { expectTenantFilter } from '../test-utils/sql-helpers';

import {
  buildMediaKey,
  uploadOneAttachment,
  backfillPartnerSalonLogos,
  backfillOpportunityCovers,
  type ParsedAttachment,
  type AcfSalon,
  type AcfOpportunity,
} from './upload-wfy-media';
import { SafeFetchError } from '../wp-import/safe-fetch';

const TEST_TENANT_ID = '11111111-2222-3333-4444-555555555555';

// ── Minimal S3-client mock ──────────────────────────────────────────────────

function createMockS3(): { send: jest.Mock } {
  return { send: jest.fn().mockResolvedValue({}) };
}

// ── buildMediaKey ───────────────────────────────────────────────────────────

describe('upload-wfy-media · buildMediaKey', () => {
  it('builds tenant-prefixed key matching DB CHECK constraint', () => {
    const key = buildMediaKey(TEST_TENANT_ID, 42, 'photo.jpg');
    expect(key).toBe(`tenant/${TEST_TENANT_ID}/wfy-import/42-photo.jpg`);
  });

  it('normalises filename: lowercase + non-safe chars → dash', () => {
    const key = buildMediaKey(TEST_TENANT_ID, 7, 'Файл Картинка(1).PNG');
    // NFKD normalize keeps Cyrillic; non-ASCII letters drop to dashes.
    expect(key.startsWith(`tenant/${TEST_TENANT_ID}/wfy-import/7-`)).toBe(true);
    expect(key.endsWith('.png')).toBe(true);
    expect(key).not.toMatch(/[А-Яа-яёЁ]/);
    expect(key).not.toMatch(/[()]/);
  });

  it('collapses repeated dashes and trims leading/trailing dashes-or-dots', () => {
    const key = buildMediaKey(TEST_TENANT_ID, 1, '...---multi---dash---.jpg');
    expect(key.endsWith('multi-dash-.jpg')).toBe(true);
  });
});

// ── uploadOneAttachment ─────────────────────────────────────────────────────

describe('upload-wfy-media · uploadOneAttachment', () => {
  let db: ReturnType<typeof createMockDb>;
  let s3: ReturnType<typeof createMockS3>;
  const att: ParsedAttachment = {
    wpId: 100,
    url: 'https://example.com/logo.png',
    title: 'Salon Logo',
    filename: 'logo.png',
  };

  beforeEach(() => {
    db = createMockDb();
    s3 = createMockS3();
  });

  it('idempotent: returns "skipped" without fetching or uploading when media row exists', async () => {
    db.queueResult([{ id: 'existing-media-uuid' }]);
    const fetcher = jest.fn();

    const outcome = await uploadOneAttachment(
      { db: db.asDatabase<Database>(), s3: s3 as never, bucket: 'b', fetcher },
      TEST_TENANT_ID,
      att,
    );

    expect(outcome.status).toBe('skipped');
    expect(outcome.mediaId).toBe('existing-media-uuid');
    expect(fetcher).not.toHaveBeenCalled();
    expect(s3.send).not.toHaveBeenCalled();
  });

  it('check-existing query is tenant-scoped (no cross-tenant leak)', async () => {
    db.queueResult([{ id: 'foo' }]);
    await uploadOneAttachment(
      { db: db.asDatabase<Database>(), s3: s3 as never, bucket: 'b' },
      TEST_TENANT_ID,
      att,
    );
    expectTenantFilter(whereArgsOf(db), media.tenantId, TEST_TENANT_ID);
  });

  it('happy path: fetches, uploads to S3, inserts media row, returns "inserted"', async () => {
    db.queueResult([]); // existing check: not found
    db.queueResult([{ id: 'new-media-uuid' }]); // insert .returning() result
    const fetcher = jest.fn().mockResolvedValue({
      status: 200,
      headers: { 'content-type': 'image/png' },
      body: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      finalUrl: att.url,
    });

    const outcome = await uploadOneAttachment(
      { db: db.asDatabase<Database>(), s3: s3 as never, bucket: 'test-bucket', fetcher },
      TEST_TENANT_ID,
      att,
    );

    expect(outcome.status).toBe('inserted');
    expect(outcome.mediaId).toBe('new-media-uuid');
    expect(outcome.key).toBe(`tenant/${TEST_TENANT_ID}/wfy-import/100-logo.png`);
    expect(fetcher).toHaveBeenCalledWith(att.url, { method: 'GET' });
    expect(s3.send).toHaveBeenCalledTimes(1);
    // Verify S3 PutObjectCommand received the expected key + content-type.
    const putCmd = s3.send.mock.calls[0][0];
    expect(putCmd.input.Bucket).toBe('test-bucket');
    expect(putCmd.input.Key).toBe(outcome.key);
    expect(putCmd.input.ContentType).toBe('image/png');
    // Insert call's values payload contains module + status + size as BigInt.
    const valuesCall = db.calls.find((c) => c.method === 'values');
    const inserted = valuesCall!.args[0] as Record<string, unknown>;
    expect(inserted.module).toBe('wfy-import');
    expect(inserted.status).toBe('ready');
    expect(inserted.mime).toBe('image/png');
    expect(typeof inserted.size).toBe('bigint');
  });

  it('non-2xx HTTP response → failed (does not throw, captures error)', async () => {
    db.queueResult([]);
    const fetcher = jest.fn().mockResolvedValue({
      status: 404,
      headers: { 'content-type': 'text/html' },
      body: Buffer.from('not found'),
      finalUrl: att.url,
    });

    const outcome = await uploadOneAttachment(
      { db: db.asDatabase<Database>(), s3: s3 as never, bucket: 'b', fetcher },
      TEST_TENANT_ID,
      att,
    );

    expect(outcome.status).toBe('failed');
    expect(outcome.error).toMatch(/HTTP 404/);
    expect(s3.send).not.toHaveBeenCalled();
  });

  it('wrong Content-Type (not image/*) → failed, captures explanatory error', async () => {
    db.queueResult([]);
    const fetcher = jest.fn().mockResolvedValue({
      status: 200,
      headers: { 'content-type': 'text/html' },
      body: Buffer.from('<html>'),
      finalUrl: att.url,
    });

    const outcome = await uploadOneAttachment(
      { db: db.asDatabase<Database>(), s3: s3 as never, bucket: 'b', fetcher },
      TEST_TENANT_ID,
      att,
    );

    expect(outcome.status).toBe('failed');
    expect(outcome.error).toMatch(/Content-Type/i);
    expect(s3.send).not.toHaveBeenCalled();
  });

  it('SafeFetchError surfaces with stable code in error string (partial-failure tolerance)', async () => {
    db.queueResult([]);
    const fetcher = jest.fn().mockRejectedValue(
      new SafeFetchError('BLOCKED_IP', 'IP literal blocked: 127.0.0.1', att.url),
    );

    const outcome = await uploadOneAttachment(
      { db: db.asDatabase<Database>(), s3: s3 as never, bucket: 'b', fetcher },
      TEST_TENANT_ID,
      att,
    );

    expect(outcome.status).toBe('failed');
    expect(outcome.error).toMatch(/BLOCKED_IP/);
  });
});

// ── backfillPartnerSalonLogos ───────────────────────────────────────────────

describe('upload-wfy-media · backfillPartnerSalonLogos', () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it('updates each salon with a known logoWpId; skips those without; skips when media missing', async () => {
    const salons: AcfSalon[] = [
      { ord: 0, name: 'A', logoWpId: 100 },
      { ord: 1, name: 'B' },               // no logoWpId → skip
      { ord: 2, name: 'C', logoWpId: 999 }, // not in mediaMap → skip
      { ord: 3, name: 'D', logoWpId: 200 },
    ];
    const mediaMap = new Map<number, { id: string; key: string }>([
      [100, { id: 'media-100', key: 'tenant/x/wfy-import/100-a.png' }],
      [200, { id: 'media-200', key: 'tenant/x/wfy-import/200-d.png' }],
    ]);

    const updated = await backfillPartnerSalonLogos(
      db.asDatabase<Database>(),
      TEST_TENANT_ID,
      salons,
      mediaMap,
    );

    expect(updated).toBe(2);
    const updateCalls = db.calls.filter((c) => c.method === 'update');
    expect(updateCalls).toHaveLength(2);
  });

  it('every WHERE filters by tenant_id (no cross-tenant update)', async () => {
    const salons: AcfSalon[] = [{ ord: 0, name: 'A', logoWpId: 1 }];
    const mediaMap = new Map([[1, { id: 'm', key: 'k' }]]);
    await backfillPartnerSalonLogos(
      db.asDatabase<Database>(),
      TEST_TENANT_ID,
      salons,
      mediaMap,
    );
    expectTenantFilter(whereArgsOf(db), partnerSalons.tenantId, TEST_TENANT_ID);
  });

  it('updates partner_salons.logoMediaId (FK), not a key', async () => {
    const salons: AcfSalon[] = [{ ord: 0, name: 'A', logoWpId: 1 }];
    const mediaMap = new Map([[1, { id: 'media-id-123', key: 'some/key' }]]);
    await backfillPartnerSalonLogos(
      db.asDatabase<Database>(),
      TEST_TENANT_ID,
      salons,
      mediaMap,
    );
    const setCall = db.calls.find((c) => c.method === 'set');
    expect(setCall).toBeDefined();
    const setPayload = setCall!.args[0] as Record<string, unknown>;
    expect(setPayload.logoMediaId).toBe('media-id-123');
    expect(setPayload.coverImageKey).toBeUndefined();
  });
});

// ── backfillOpportunityCovers ───────────────────────────────────────────────

describe('upload-wfy-media · backfillOpportunityCovers', () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it('updates wfy_opportunities.coverImageKey (string), not a media id', async () => {
    const opps: AcfOpportunity[] = [{ ord: 0, title: 'Car', imageWpId: 50 }];
    const mediaMap = new Map([
      [50, { id: 'media-50', key: 'tenant/x/wfy-import/50-car.jpg' }],
    ]);

    const updated = await backfillOpportunityCovers(
      db.asDatabase<Database>(),
      TEST_TENANT_ID,
      opps,
      mediaMap,
    );

    expect(updated).toBe(1);
    const setCall = db.calls.find((c) => c.method === 'set');
    expect(setCall).toBeDefined();
    const setPayload = setCall!.args[0] as Record<string, unknown>;
    expect(setPayload.coverImageKey).toBe('tenant/x/wfy-import/50-car.jpg');
    expect(setPayload.logoMediaId).toBeUndefined();
  });

  it('tenant-scoped WHERE on every update', async () => {
    const opps: AcfOpportunity[] = [
      { ord: 0, title: 'Car', imageWpId: 1 },
      { ord: 1, title: 'House', imageWpId: 2 },
    ];
    const mediaMap = new Map([
      [1, { id: 'm1', key: 'k1' }],
      [2, { id: 'm2', key: 'k2' }],
    ]);
    await backfillOpportunityCovers(
      db.asDatabase<Database>(),
      TEST_TENANT_ID,
      opps,
      mediaMap,
    );
    expectTenantFilter(whereArgsOf(db), wfyOpportunities.tenantId, TEST_TENANT_ID);
  });

  it('skips opportunities without imageWpId', async () => {
    const opps: AcfOpportunity[] = [
      { ord: 0, title: 'Car' }, // no imageWpId
      { ord: 1, title: 'House', imageWpId: 2 },
    ];
    const mediaMap = new Map([[2, { id: 'm2', key: 'k2' }]]);
    const updated = await backfillOpportunityCovers(
      db.asDatabase<Database>(),
      TEST_TENANT_ID,
      opps,
      mediaMap,
    );
    expect(updated).toBe(1);
  });
});
