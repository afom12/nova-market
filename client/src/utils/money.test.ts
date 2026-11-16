import { describe, expect, it } from 'vitest';
import { centsToDollarString, dollarsToCents } from './money';
import { formatMoney } from './format';

describe('dollarsToCents', () => {
  it('converts whole and fractional amounts exactly', () => {
    expect(dollarsToCents('249')).toBe(24_900);
    expect(dollarsToCents('249.99')).toBe(24_999);
    expect(dollarsToCents('0.07')).toBe(7);
    expect(dollarsToCents('1.5')).toBe(150);
  });

  it('avoids the floating-point error that parseFloat would introduce', () => {
    // parseFloat('19.99') * 100 === 1998.9999999999998
    expect(dollarsToCents('19.99')).toBe(1_999);
    expect(dollarsToCents('1.1')).toBe(110);
    expect(dollarsToCents('8.21')).toBe(821);
  });

  it('strips thousands separators', () => {
    expect(dollarsToCents('1,299.00')).toBe(129_900);
  });

  it('rejects malformed input instead of guessing', () => {
    expect(() => dollarsToCents('12.345')).toThrow();
    expect(() => dollarsToCents('abc')).toThrow();
    expect(() => dollarsToCents('')).toThrow();
    expect(() => dollarsToCents('-5.00')).toThrow();
  });
});

describe('centsToDollarString', () => {
  it('round-trips with dollarsToCents', () => {
    for (const cents of [0, 7, 150, 1_999, 24_999, 129_900]) {
      expect(dollarsToCents(centsToDollarString(cents))).toBe(cents);
    }
  });

  it('pads the minor units', () => {
    expect(centsToDollarString(5)).toBe('0.05');
    expect(centsToDollarString(100)).toBe('1.00');
  });
});

describe('formatMoney', () => {
  it('renders minor units as a currency string', () => {
    expect(formatMoney(34_900, 'usd')).toBe('$349.00');
    expect(formatMoney(0, 'usd')).toBe('$0.00');
  });
});
