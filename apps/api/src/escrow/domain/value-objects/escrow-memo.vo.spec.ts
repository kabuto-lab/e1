import { BadRequestException } from '@nestjs/common';
import { EscrowMemo, ESCROW_MEMO_MAX_LENGTH } from './escrow-memo.vo';

describe('EscrowMemo.parse', () => {
  it('accepts valid memo', () => {
    const m = EscrowMemo.parse('E1abc-123_XYZ');
    expect(m.toString()).toBe('E1abc-123_XYZ');
  });

  it('trims surrounding whitespace', () => {
    expect(EscrowMemo.parse('  hello  ').toString()).toBe('hello');
  });

  it('rejects empty string', () => {
    expect(() => EscrowMemo.parse('')).toThrow(BadRequestException);
    expect(() => EscrowMemo.parse('   ')).toThrow(BadRequestException);
  });

  it('rejects memo exceeding max length', () => {
    const long = 'A'.repeat(ESCROW_MEMO_MAX_LENGTH + 1);
    expect(() => EscrowMemo.parse(long)).toThrow(BadRequestException);
  });

  it('accepts memo exactly at max length', () => {
    const exact = 'A'.repeat(ESCROW_MEMO_MAX_LENGTH);
    expect(() => EscrowMemo.parse(exact)).not.toThrow();
  });

  it('rejects spaces inside memo', () => {
    expect(() => EscrowMemo.parse('has space')).toThrow(BadRequestException);
  });

  it('rejects special chars', () => {
    expect(() => EscrowMemo.parse('bad!memo')).toThrow(BadRequestException);
    expect(() => EscrowMemo.parse('bad/memo')).toThrow(BadRequestException);
  });
});

describe('EscrowMemo.fromEscrowUuid', () => {
  const VALID_UUID = '11111111-1111-4111-8111-111111111111';

  it('generates E1 + compact uuid', () => {
    const m = EscrowMemo.fromEscrowUuid(VALID_UUID);
    expect(m.toString()).toBe('E1' + VALID_UUID.replace(/-/g, ''));
  });

  it('rejects non-uuid string', () => {
    expect(() => EscrowMemo.fromEscrowUuid('not-a-uuid')).toThrow(BadRequestException);
    expect(() => EscrowMemo.fromEscrowUuid('')).toThrow(BadRequestException);
  });

  it('equals another memo generated from same uuid', () => {
    const a = EscrowMemo.fromEscrowUuid(VALID_UUID);
    const b = EscrowMemo.fromEscrowUuid(VALID_UUID);
    expect(a.equals(b)).toBe(true);
  });
});

describe('EscrowMemo.matchesChainMemo', () => {
  const memo = EscrowMemo.parse('E1test');

  it('matches exact string', () => {
    expect(memo.matchesChainMemo('E1test')).toBe(true);
  });

  it('matches after trim', () => {
    expect(memo.matchesChainMemo('  E1test  ')).toBe(true);
  });

  it('returns false for null/undefined', () => {
    expect(memo.matchesChainMemo(null)).toBe(false);
    expect(memo.matchesChainMemo(undefined)).toBe(false);
  });

  it('returns false for different value', () => {
    expect(memo.matchesChainMemo('E1other')).toBe(false);
  });
});
