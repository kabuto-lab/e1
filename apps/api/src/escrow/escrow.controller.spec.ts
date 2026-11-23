import { Test } from '@nestjs/testing';
import { ForbiddenException, type INestApplication } from '@nestjs/common';
import request = require('supertest');
import { EscrowController } from './escrow.controller';
import { EscrowService } from './escrow.service';
import { TonEscrowService } from './ton-escrow.service';
import { TbankEscrowService } from './tbank-escrow.service';
import { BookingsService } from '../bookings/bookings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TonEscrowDepositGuard } from './guards/ton-escrow-deposit.guard';

describe('T-Bank notification HTTP acknowledgement', () => {
  let app: INestApplication;
  let handleWebhook: jest.Mock;

  beforeEach(async () => {
    handleWebhook = jest.fn().mockResolvedValue(undefined);
    const builder = Test.createTestingModule({
      controllers: [EscrowController],
      providers: [
        { provide: EscrowService, useValue: {} },
        { provide: TonEscrowService, useValue: {} },
        { provide: TbankEscrowService, useValue: { handleWebhook } },
        { provide: BookingsService, useValue: {} },
      ],
    });
    for (const guard of [JwtAuthGuard, RolesGuard, TonEscrowDepositGuard]) {
      builder.overrideGuard(guard).useValue({ canActivate: () => true });
    }
    app = (await builder.compile()).createNestApplication();
    await app.init();
  });

  afterEach(async () => { await app.close(); });

  it('returns exactly HTTP200 and plain OK after successful processing', async () => {
    const payload = { fixture: 'only-the-stub-processes-this' };
    const response = await request(app.getHttpServer()).post('/escrow/tbank/webhook').send(payload);
    expect(response.status).toBe(200);
    expect(response.text).toBe('OK');
    expect(response.headers['content-type']).toMatch(/^text\/plain/);
    expect(handleWebhook).toHaveBeenCalledWith(payload);
  });

  it('does not acknowledge before processing finishes', async () => {
    let finish!: () => void;
    let entered!: () => void;
    const processing = new Promise<void>(resolve => { finish = resolve; });
    const started = new Promise<void>(resolve => { entered = resolve; });
    handleWebhook.mockImplementation(async () => { entered(); await processing; });
    let responded = false;
    const response = request(app.getHttpServer()).post('/escrow/tbank/webhook').send({})
      .then(value => { responded = true; return value; });
    await started;
    expect(responded).toBe(false);
    finish();
    expect((await response).text).toBe('OK');
  });

  it('preserves a signature rejection instead of acknowledging it', async () => {
    handleWebhook.mockRejectedValue(new ForbiddenException('Invalid signature'));
    const response = await request(app.getHttpServer()).post('/escrow/tbank/webhook').send({ Token: 'invalid' });
    expect(response.status).toBe(403);
    expect(response.text).not.toBe('OK');
  });
});
