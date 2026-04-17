import { BadRequestException } from '@nestjs/common';
import { TonAddress } from './ton-address.vo';

describe('TonAddress.parse', () => {
  describe('friendly format', () => {
    it('accepts EQ… address', () => {
      const addr = 'EQ' + 'A'.repeat(46);
      expect(TonAddress.parse(addr).toString()).toBe(addr);
    });

    it('accepts UQ… address', () => {
      const addr = 'UQ' + 'B'.repeat(46);
      expect(TonAddress.parse(addr).toString()).toBe(addr);
    });

    it('accepts kQ… address', () => {
      const addr = 'kQ' + 'C'.repeat(46);
      expect(TonAddress.parse(addr).toString()).toBe(addr);
    });

    it('trims whitespace', () => {
      const addr = 'EQ' + 'A'.repeat(46);
      expect(TonAddress.parse('  ' + addr + '  ').toString()).toBe(addr);
    });

    it('rejects too short friendly address', () => {
      expect(() => TonAddress.parse('EQ' + 'A'.repeat(45))).toThrow(BadRequestException);
    });

    it('rejects too long friendly address', () => {
      expect(() => TonAddress.parse('EQ' + 'A'.repeat(47))).toThrow(BadRequestException);
    });

    it('rejects unknown prefix', () => {
      expect(() => TonAddress.parse('AB' + 'A'.repeat(46))).toThrow(BadRequestException);
    });
  });

  describe('raw format', () => {
    const hexPart = 'a'.repeat(64);

    it('accepts 0:hex', () => {
      const addr = TonAddress.parse(`0:${hexPart}`);
      expect(addr.toString()).toBe(`0:${hexPart}`);
    });

    it('accepts -1:hex (masterchain)', () => {
      const addr = TonAddress.parse(`-1:${hexPart.toUpperCase()}`);
      expect(addr.toString()).toBe(`-1:${hexPart}`);
    });

    it('normalizes hex to lowercase', () => {
      const upper = 'A'.repeat(64);
      const addr = TonAddress.parse(`0:${upper}`);
      expect(addr.toString()).toBe(`0:${'a'.repeat(64)}`);
    });

    it('rejects hex that is too short', () => {
      expect(() => TonAddress.parse(`0:${'a'.repeat(63)}`)).toThrow(BadRequestException);
    });

    it('rejects hex that is too long', () => {
      expect(() => TonAddress.parse(`0:${'a'.repeat(65)}`)).toThrow(BadRequestException);
    });

    it('rejects hex with invalid chars', () => {
      expect(() => TonAddress.parse(`0:${'g'.repeat(64)}`)).toThrow(BadRequestException);
    });
  });

  it('rejects empty string', () => {
    expect(() => TonAddress.parse('')).toThrow(BadRequestException);
    expect(() => TonAddress.parse('   ')).toThrow(BadRequestException);
  });

  it('equals another parsed from same string', () => {
    const a = TonAddress.parse('EQ' + 'A'.repeat(46));
    const b = TonAddress.parse('EQ' + 'A'.repeat(46));
    expect(a.equals(b)).toBe(true);
  });

  it('does not equal different address', () => {
    const a = TonAddress.parse('EQ' + 'A'.repeat(46));
    const b = TonAddress.parse('UQ' + 'A'.repeat(46));
    expect(a.equals(b)).toBe(false);
  });
});
