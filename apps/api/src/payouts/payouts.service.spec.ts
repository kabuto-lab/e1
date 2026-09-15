import { Test } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { EmployeesService } from '../employees/employees.service';
import { TonHotWalletService } from '../escrow/ton/ton-hot-wallet.service';
import { TonExchangeRateService } from '../escrow/ton/ton-exchange-rate.service';

const USER_ID = '22222222-2222-4222-8222-222222222222';
const MODEL_PROFILE_ID = '33333333-3333-4333-8333-333333333333';
const VALID_TON_ADDRESS = 'UQ' + 'A'.repeat(46);
const REQUEST_ID = '44444444-4444-4444-8444-444444444444';

/** Fluent Drizzle-ish query builder mock: chain any of these methods, resolves to `rows`. */
function makeQueryable(rows: unknown[]) {
  const thenable: any = Promise.resolve(rows);
  for (const key of ['select', 'from', 'where', 'leftJoin', 'limit', 'orderBy']) {
    thenable[key] = jest.fn().mockReturnValue(thenable);
  }
  return thenable;
}

describe('PayoutsService.getBalance', () => {
  let service: PayoutsService;
  let db: { select: jest.Mock };
  let bookingRows: unknown[];
  let modelProfileRows: unknown[];
  let payoutRequestRows: unknown[];

  beforeEach(async () => {
    bookingRows = [];
    modelProfileRows = [{ id: MODEL_PROFILE_ID }];
    payoutRequestRows = [];

    // getBalance issues 3 selects in order: model-profile lookup, bookings (joined), payout_requests.
    let call = 0;
    db = {
      select: jest.fn().mockImplementation(() => {
        call += 1;
        if (call === 1) return makeQueryable(modelProfileRows);
        if (call === 2) return makeQueryable(bookingRows);
        return makeQueryable(payoutRequestRows);
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PayoutsService,
        { provide: 'DRIZZLE', useValue: db },
        { provide: EmployeesService, useValue: {} },
        { provide: TonHotWalletService, useValue: {} },
        { provide: TonExchangeRateService, useValue: { getUsdtRubRate: jest.fn().mockResolvedValue(100) } },
      ],
    }).compile();
    service = moduleRef.get(PayoutsService);
  });

  it('throws Forbidden for roles without a balance', async () => {
    await expect(service.getBalance(USER_ID, 'client')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('counts a completed RUB (non-crypto) booking toward earned', async () => {
    bookingRows = [{ modelPayout: '1000.00', paymentProvider: null, releaseTrigger: null }];
    const balance = await service.getBalance(USER_ID, 'model');
    expect(balance.earned).toBe('1000.00');
    expect(balance.available).toBe('1000.00');
  });

  it('counts a pooled TON booking (settleWithoutPayout) toward earned', async () => {
    bookingRows = [{ modelPayout: '500.00', paymentProvider: 'ton_usdt', releaseTrigger: 'pooled_no_payout' }];
    const balance = await service.getBalance(USER_ID, 'model');
    expect(balance.earned).toBe('500.00');
  });

  it('excludes a TON booking already paid out directly (broadcastRelease)', async () => {
    bookingRows = [{ modelPayout: '500.00', paymentProvider: 'ton_usdt', releaseTrigger: 'hot_wallet_broadcast' }];
    const balance = await service.getBalance(USER_ID, 'model');
    expect(balance.earned).toBe('0.00');
  });
});

describe('PayoutsService.createRequest', () => {
  let service: PayoutsService;
  let db: { select: jest.Mock; insert: jest.Mock };

  beforeEach(async () => {
    db = {
      select: jest.fn().mockReturnValue(makeQueryable([])),
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: REQUEST_ID }]),
        }),
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PayoutsService,
        { provide: 'DRIZZLE', useValue: db },
        { provide: EmployeesService, useValue: {} },
        { provide: TonHotWalletService, useValue: {} },
        { provide: TonExchangeRateService, useValue: { getUsdtRubRate: jest.fn().mockResolvedValue(100) } },
      ],
    }).compile();
    service = moduleRef.get(PayoutsService);
    // available balance = 0 in all these tests (no bookings mocked) unless overridden below.
    jest.spyOn(service, 'getBalance').mockResolvedValue({ earned: '10000.00', paid: '0.00', pending: '0.00', available: '10000.00' });
  });

  it('throws BadRequest when method=bank and requisites are missing', async () => {
    await expect(
      service.createRequest(USER_ID, 'model', '100.00', 'bank'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequest when method=ton_wallet and tonWalletAddress is missing', async () => {
    await expect(
      service.createRequest(USER_ID, 'model', '100.00', 'ton_wallet'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequest for a malformed tonWalletAddress', async () => {
    await expect(
      service.createRequest(USER_ID, 'model', '100.00', 'ton_wallet', undefined, 'not-a-ton-address'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('stores a normalized tonWalletAddress and null requisites for method=ton_wallet', async () => {
    await service.createRequest(USER_ID, 'model', '100.00', 'ton_wallet', undefined, VALID_TON_ADDRESS);
    const valuesCall = db.insert.mock.results[0].value.values.mock.calls[0][0];
    expect(valuesCall.method).toBe('ton_wallet');
    expect(valuesCall.tonWalletAddress).toBe(VALID_TON_ADDRESS);
    expect(valuesCall.requisites).toBeNull();
  });

  it('stores requisites and null tonWalletAddress for method=bank', async () => {
    await service.createRequest(USER_ID, 'model', '100.00', 'bank', 'Т-Банк, 2200 xxxx, Иванов И.И.');
    const valuesCall = db.insert.mock.results[0].value.values.mock.calls[0][0];
    expect(valuesCall.method).toBe('bank');
    expect(valuesCall.tonWalletAddress).toBeNull();
    expect(valuesCall.requisites).toBe('Т-Банк, 2200 xxxx, Иванов И.И.');
  });
});

describe('PayoutsService.transitionRequest', () => {
  let service: PayoutsService;
  let db: { select: jest.Mock; update: jest.Mock };
  let hotWallet: { transferJettonToOwner: jest.Mock };
  let exchangeRate: { getUsdtRubRate: jest.Mock };
  let current: Record<string, unknown>;

  beforeEach(async () => {
    current = {
      id: REQUEST_ID,
      userId: USER_ID,
      amount: '1000.00',
      status: 'pending',
      method: 'ton_wallet',
      tonWalletAddress: VALID_TON_ADDRESS,
      usdtAmountAtomic: null,
      note: null,
    };
    hotWallet = { transferJettonToOwner: jest.fn().mockResolvedValue('ton-tx-hash-abc') };
    exchangeRate = { getUsdtRubRate: jest.fn().mockResolvedValue(100) };

    db = {
      select: jest.fn().mockReturnValue(makeQueryable([current])),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockImplementation(() => Promise.resolve([{ ...current }])),
          }),
        }),
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PayoutsService,
        { provide: 'DRIZZLE', useValue: db },
        { provide: EmployeesService, useValue: {} },
        { provide: TonHotWalletService, useValue: hotWallet },
        { provide: TonExchangeRateService, useValue: exchangeRate },
      ],
    }).compile();
    service = moduleRef.get(PayoutsService);
  });

  it('snapshots the USDT/RUB rate and computes usdtAmountAtomic on approve (1000 RUB / 100 = 10 USDT)', async () => {
    await service.transitionRequest(USER_ID, 'admin', REQUEST_ID, 'approved');
    const setArg = db.update.mock.results[0].value.set.mock.calls[0][0];
    expect(setArg.usdtRubRateAtApproval).toBe('100.0000');
    expect(setArg.usdtAmountAtomic).toBe(10_000_000n);
    expect(hotWallet.transferJettonToOwner).not.toHaveBeenCalled();
  });

  it('does not touch the rate for method=bank', async () => {
    current.method = 'bank';
    current.tonWalletAddress = null;
    await service.transitionRequest(USER_ID, 'admin', REQUEST_ID, 'approved');
    const setArg = db.update.mock.results[0].value.set.mock.calls[0][0];
    expect(setArg.usdtRubRateAtApproval).toBeUndefined();
    expect(exchangeRate.getUsdtRubRate).not.toHaveBeenCalled();
  });

  it('sends USDT via the hot wallet when marking a ton_wallet request paid', async () => {
    current.status = 'approved';
    current.usdtAmountAtomic = 10_000_000n;
    await service.transitionRequest(USER_ID, 'admin', REQUEST_ID, 'paid');
    expect(hotWallet.transferJettonToOwner).toHaveBeenCalledWith(
      expect.objectContaining({ recipientOwnerAddress: VALID_TON_ADDRESS, jettonAmountAtomic: 10_000_000n }),
    );
    const setArg = db.update.mock.results[0].value.set.mock.calls[0][0];
    expect(setArg.tonTxHash).toBe('ton-tx-hash-abc');
  });

  it('throws BadRequest when marking paid before it was approved (no usdtAmountAtomic yet)', async () => {
    current.status = 'approved'; // allowed transition target-wise, but never went through approve's rate snapshot
    current.usdtAmountAtomic = null;
    await expect(
      service.transitionRequest(USER_ID, 'admin', REQUEST_ID, 'paid'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(hotWallet.transferJettonToOwner).not.toHaveBeenCalled();
  });

  it('does not call the hot wallet when marking a bank request paid', async () => {
    current.status = 'approved';
    current.method = 'bank';
    current.tonWalletAddress = null;
    await service.transitionRequest(USER_ID, 'admin', REQUEST_ID, 'paid');
    expect(hotWallet.transferJettonToOwner).not.toHaveBeenCalled();
  });
});
