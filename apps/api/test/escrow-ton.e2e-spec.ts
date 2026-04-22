/**
 * TON USDT escrow — e2e (CLAUDE.md §5.12, главная дыра CI).
 *
 * Покрывает HTTP-слой и интеграцию между модулями, которых нет в unit-спеках:
 *   • Global ValidationPipe (whitelist + transform)
 *   • JwtAuthGuard + RolesGuard
 *   • TonEscrowDepositGuard (x-ton-escrow-ingest)
 *   • Auto-transition брони: draft → pending_payment → escrow_funded → confirmed
 *   • Реальная Drizzle-транзакция в Postgres (setup-e2e.ts подтягивает dev .env)
 *
 * Префлайт:
 *   1. docker compose -f docker-compose.dev.yml up -d postgres
 *   2. npm run db:migrate --workspace=@escort/db
 *   3. npm run db:bootstrap  (сидит admin + модели; админ нужен для /auth/login)
 *   4. cd apps/api && npm run test:e2e
 *
 * ОГРАНИЧЕНИЯ (следующая итерация):
 *   • Тест пишет в ту же БД, что и dev API — параллельные прогоны будут конфликтовать
 *     по уникальным memo/txHash. Уникальность через Date.now() + randomUUID().
 *   • После прогона остаются: новый client user, booking, escrow row, audit-записи.
 *     Для чистой изоляции — testcontainers (отдельный Postgres на тест-ран).
 */

import { randomUUID } from 'crypto';
import type { INestApplication } from '@nestjs/common';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

const ADMIN_EMAIL = 'admin@lovnge.local';
const ADMIN_PASSWORD = 'Admin123!';

describe('TON Escrow (e2e)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let adminJwt: string;
  let clientJwt: string;
  let modelId: string;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
        exceptionFactory: (errors) => {
          const formatted = errors.map((e) => ({
            field: e.property,
            errors: Object.values(e.constraints || {}),
          }));
          return new BadRequestException({ message: 'Validation failed', errors: formatted });
        },
      }),
    );
    await app.init();

    // Admin login (seeded by apps/api/src/scripts/create-admin.ts).
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    if (adminLogin.status !== 200 || !adminLogin.body?.accessToken) {
      throw new Error(
        `Admin login failed (${adminLogin.status}). Run create-admin.ts or db:bootstrap.`,
      );
    }
    adminJwt = adminLogin.body.accessToken;

    // Fresh client per test run to avoid email-hash collisions.
    const clientEmail = `e2e-client-${Date.now()}-${randomUUID().slice(0, 8)}@test.local`;
    const clientPassword = 'E2eClient123!';
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: clientEmail, password: clientPassword, role: 'client' })
      .expect(201);

    const clientLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: clientEmail, password: clientPassword })
      .expect(200);
    clientJwt = clientLogin.body.accessToken;

    // Use first seeded model (seed-models-simple.ts создаёт 13 шт при db:bootstrap).
    const models = await request(app.getHttpServer())
      .get('/models?limit=1')
      .expect(200);
    modelId = models.body?.[0]?.id;
    if (!modelId) {
      throw new Error('No seeded models found. Run `npm run db:bootstrap`.');
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('smoke — NestJS bootstraps', () => {
    it('AppModule is defined and initialized', () => {
      expect(app).toBeDefined();
      expect(moduleFixture.get(AppModule)).toBeDefined();
    });
  });

  describe('happy path: client funds escrow → booking auto-advances → release', () => {
    it('booking → intent → deposit → confirm-release', async () => {
      // 1. Create booking as client (starts in 'draft').
      const bookingRes = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${clientJwt}`)
        .send({
          modelId,
          startTime: new Date(Date.now() + 3600_000).toISOString(),
          durationHours: 2,
          totalAmount: '100',
          currency: 'USD',
        })
        .expect(201);
      const bookingId = bookingRes.body.id;
      expect(bookingRes.body.status).toBe('draft');

      // 2. Create TON intent — returns escrow row with memo, treasury, jetton master.
      const expectedAmountAtomic = '10000000'; // 10 USDT at 6 decimals
      const intentRes = await request(app.getHttpServer())
        .post('/escrow/ton/intent')
        .set('Authorization', `Bearer ${clientJwt}`)
        .send({ bookingId, expectedAmountAtomic, assetDecimals: 6 })
        .expect(201);
      expect(intentRes.body.status).toBe('pending_funding');
      expect(intentRes.body.expectedMemo).toBeTruthy();

      const escrowId = intentRes.body.id as string;
      const expectedMemo = intentRes.body.expectedMemo as string;
      const treasuryAddress = intentRes.body.treasuryAddress as string;
      const jettonMasterAddress = intentRes.body.jettonMasterAddress as string;

      // 3. Record deposit via indexer-style ingest (x-ton-escrow-ingest header).
      const depositRes = await request(app.getHttpServer())
        .post('/escrow/ton/deposit')
        .set('x-ton-escrow-ingest', process.env.TON_ESCROW_INGEST_SECRET!)
        .send({
          memo: expectedMemo,
          txHash: `e2e-tx-${Date.now()}-${randomUUID().slice(0, 8)}`,
          fromAddressRaw: '0:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
          treasuryAddressRaw: treasuryAddress,
          jettonMasterRaw: jettonMasterAddress,
          amountAtomic: expectedAmountAtomic,
          network: 'ton_testnet',
          confirmationCount: 3,
        })
        .expect(201);
      expect(depositRes.body.fullyFunded).toBe(true);
      expect(depositRes.body.escrow.status).toBe('funded');

      // 4. Booking auto-transitioned: draft → pending_payment → escrow_funded.
      const fundedBooking = await request(app.getHttpServer())
        .get(`/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${clientJwt}`)
        .expect(200);
      expect(fundedBooking.body.status).toBe('escrow_funded');

      // 5. Admin confirms on-chain release (фиксирует tx hash, не шлёт в сеть).
      const recipientRaw =
        '0:1111111111111111111111111111111111111111111111111111111111111111';
      const releaseRes = await request(app.getHttpServer())
        .post(`/escrow/ton/${escrowId}/confirm-release`)
        .set('Authorization', `Bearer ${adminJwt}`)
        .send({
          releaseTxHash: `e2e-release-${Date.now()}-${randomUUID().slice(0, 8)}`,
          recipientAddress: recipientRaw,
          note: 'e2e happy path',
        })
        .expect(201);
      expect(releaseRes.body.status).toBe('released');
      expect(releaseRes.body.releaseTxHash).toBeTruthy();
      expect(releaseRes.body.releaseTrigger).toBe('manual_confirm');

      // 6. Booking transitions escrow_funded → confirmed.
      const confirmedBooking = await request(app.getHttpServer())
        .get(`/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${clientJwt}`)
        .expect(200);
      expect(confirmedBooking.body.status).toBe('confirmed');
    });
  });

  describe('guards and validation', () => {
    it('POST /escrow/ton/deposit without x-ton-escrow-ingest returns 401', async () => {
      await request(app.getHttpServer())
        .post('/escrow/ton/deposit')
        .send({
          memo: 'dummy',
          txHash: 'dummy',
          fromAddressRaw: '0:0000000000000000000000000000000000000000000000000000000000000000',
          treasuryAddressRaw: '0:0000000000000000000000000000000000000000000000000000000000000000',
          jettonMasterRaw: '0:0000000000000000000000000000000000000000000000000000000000000000',
          amountAtomic: '1',
        })
        .expect(401);
    });

    it('POST /escrow/ton/deposit with wrong secret returns 401', async () => {
      await request(app.getHttpServer())
        .post('/escrow/ton/deposit')
        .set('x-ton-escrow-ingest', 'wrong-secret-0123456789abcdef')
        .send({
          memo: 'dummy',
          txHash: 'dummy',
          fromAddressRaw: '0:0000000000000000000000000000000000000000000000000000000000000000',
          treasuryAddressRaw: '0:0000000000000000000000000000000000000000000000000000000000000000',
          jettonMasterRaw: '0:0000000000000000000000000000000000000000000000000000000000000000',
          amountAtomic: '1',
        })
        .expect(401);
    });
  });

  describe('refund path: cancellation before completion', () => {
    it('POST /bookings/:id/cancel after funded → escrow confirm-refund → refunded', async () => {
      // 1. Create booking + intent + deposit (funded fixture).
      const bookingRes = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${clientJwt}`)
        .send({
          modelId,
          startTime: new Date(Date.now() + 3_600_000 * 3).toISOString(),
          durationHours: 1,
          totalAmount: '80',
          currency: 'USD',
        })
        .expect(201);
      const bookingId = bookingRes.body.id;

      const intentRes = await request(app.getHttpServer())
        .post('/escrow/ton/intent')
        .set('Authorization', `Bearer ${clientJwt}`)
        .send({ bookingId, expectedAmountAtomic: '8000000', assetDecimals: 6 })
        .expect(201);
      const escrowId = intentRes.body.id as string;
      const { expectedMemo, treasuryAddress, jettonMasterAddress } = intentRes.body;

      await request(app.getHttpServer())
        .post('/escrow/ton/deposit')
        .set('x-ton-escrow-ingest', process.env.TON_ESCROW_INGEST_SECRET!)
        .send({
          memo: expectedMemo,
          txHash: `e2e-refund-${Date.now()}-${randomUUID().slice(0, 8)}`,
          fromAddressRaw:
            '0:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
          treasuryAddressRaw: treasuryAddress,
          jettonMasterRaw: jettonMasterAddress,
          amountAtomic: '8000000',
          network: 'ton_testnet' as const,
          confirmationCount: 3,
        })
        .expect(201);

      // 2. Client cancels booking.
      const cancelRes = await request(app.getHttpServer())
        .post(`/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${clientJwt}`)
        .send({ reason: 'e2e refund test' })
        .expect(201);
      expect(cancelRes.body.status).toBe('cancelled');

      // 3. Admin confirms on-chain refund.
      const refundRes = await request(app.getHttpServer())
        .post(`/escrow/ton/${escrowId}/confirm-refund`)
        .set('Authorization', `Bearer ${adminJwt}`)
        .send({
          refundTxHash: `e2e-refund-tx-${Date.now()}-${randomUUID().slice(0, 8)}`,
          recipientAddress:
            '0:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
          cancellationReason: 'e2e refund test',
        })
        .expect(201);
      expect(refundRes.body.status).toBe('refunded');
      expect(refundRes.body.refundTxHash).toBeTruthy();
    });
  });

  describe('dispute path: staff manual release', () => {
    it('POST /bookings/:id/dispute moves booking to disputed, escrow remains funded', async () => {
      // 1. Create booking + intent + deposit (funded fixture).
      const bookingRes = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${clientJwt}`)
        .send({
          modelId,
          startTime: new Date(Date.now() + 3_600_000 * 5).toISOString(),
          durationHours: 2,
          totalAmount: '120',
          currency: 'USD',
        })
        .expect(201);
      const bookingId = bookingRes.body.id;

      const intentRes = await request(app.getHttpServer())
        .post('/escrow/ton/intent')
        .set('Authorization', `Bearer ${clientJwt}`)
        .send({ bookingId, expectedAmountAtomic: '12000000', assetDecimals: 6 })
        .expect(201);
      const escrowId = intentRes.body.id as string;
      const { expectedMemo, treasuryAddress, jettonMasterAddress } = intentRes.body;

      await request(app.getHttpServer())
        .post('/escrow/ton/deposit')
        .set('x-ton-escrow-ingest', process.env.TON_ESCROW_INGEST_SECRET!)
        .send({
          memo: expectedMemo,
          txHash: `e2e-dispute-${Date.now()}-${randomUUID().slice(0, 8)}`,
          fromAddressRaw:
            '0:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
          treasuryAddressRaw: treasuryAddress,
          jettonMasterRaw: jettonMasterAddress,
          amountAtomic: '12000000',
          network: 'ton_testnet' as const,
          confirmationCount: 3,
        })
        .expect(201);

      // 2. Client opens dispute on booking.
      const disputeRes = await request(app.getHttpServer())
        .post(`/bookings/${bookingId}/dispute`)
        .set('Authorization', `Bearer ${clientJwt}`)
        .expect(201);
      expect(disputeRes.body.status).toBe('disputed');

      // 3. Escrow stays funded — admin can still release or refund it.
      const escrowCheck = await request(app.getHttpServer())
        .get(`/escrow/${escrowId}`)
        .set('Authorization', `Bearer ${adminJwt}`)
        .expect(200);
      expect(escrowCheck.body.status).toBe('funded');
    });
  });

  describe('idempotency', () => {
    it('duplicate deposit with same txHash returns idempotent=true, no second insert', async () => {
      // Отдельная фикстура: новый booking + intent, депозит шлём ДВАЖДЫ.
      const bookingRes = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${clientJwt}`)
        .send({
          modelId,
          startTime: new Date(Date.now() + 7200_000).toISOString(),
          durationHours: 1,
          totalAmount: '50',
          currency: 'USD',
        })
        .expect(201);
      const bookingId = bookingRes.body.id;

      const intentRes = await request(app.getHttpServer())
        .post('/escrow/ton/intent')
        .set('Authorization', `Bearer ${clientJwt}`)
        .send({ bookingId, expectedAmountAtomic: '5000000', assetDecimals: 6 })
        .expect(201);
      const { expectedMemo, treasuryAddress, jettonMasterAddress } = intentRes.body;

      const txHash = `e2e-idem-${Date.now()}-${randomUUID().slice(0, 8)}`;
      const payload = {
        memo: expectedMemo,
        txHash,
        fromAddressRaw:
          '0:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
        treasuryAddressRaw: treasuryAddress,
        jettonMasterRaw: jettonMasterAddress,
        amountAtomic: '5000000',
        network: 'ton_testnet' as const,
        confirmationCount: 3,
      };

      // First deposit — должен funded=true.
      const first = await request(app.getHttpServer())
        .post('/escrow/ton/deposit')
        .set('x-ton-escrow-ingest', process.env.TON_ESCROW_INGEST_SECRET!)
        .send(payload)
        .expect(201);
      expect(first.body.idempotent).toBe(false);
      expect(first.body.fullyFunded).toBe(true);
      expect(first.body.escrow.status).toBe('funded');

      // Second deposit — тот же tx_hash → idempotent=true, без второго insert.
      const second = await request(app.getHttpServer())
        .post('/escrow/ton/deposit')
        .set('x-ton-escrow-ingest', process.env.TON_ESCROW_INGEST_SECRET!)
        .send(payload)
        .expect(201);
      expect(second.body.idempotent).toBe(true);
      // Escrow уже funded, receivedAmount не должен удвоиться.
      expect(second.body.escrow.status).toBe('funded');
      expect(second.body.escrow.receivedAmountAtomic).toBe('5000000');
    });
  });
});
