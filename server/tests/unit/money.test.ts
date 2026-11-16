import { describe, expect, it } from 'vitest';
import { formatMoney, isValidMinorUnits, lineSubtotalCents, sumCents } from '../../src/utils/money';

describe('lineSubtotalCents', () => {
  it('multiplies integer minor units by an integer quantity', () => {
    expect(lineSubtotalCents(24_999, 2)).toBe(49_998);
    expect(lineSubtotalCents(1_999, 3)).toBe(5_997);
    expect(lineSubtotalCents(7, 3)).toBe(21);
  });

  it('always returns an integer', () => {
    for (const [price, quantity] of [
      [1_999, 7],
      [333, 3],
      [1, 20],
    ] as const) {
      const result = lineSubtotalCents(price, quantity);
      expect(Number.isInteger(result)).toBe(true);
    }
  });

  it('refuses a fractional price rather than silently rounding', () => {
    expect(() => lineSubtotalCents(199.99, 1)).toThrow(/Invalid unit price/);
  });

  it('refuses a non-positive or fractional quantity', () => {
    expect(() => lineSubtotalCents(1_000, 0)).toThrow(/Invalid quantity/);
    expect(() => lineSubtotalCents(1_000, -2)).toThrow(/Invalid quantity/);
    expect(() => lineSubtotalCents(1_000, 1.5)).toThrow(/Invalid quantity/);
  });
});

describe('sumCents', () => {
  it('sums line totals exactly', () => {
    expect(sumCents([1_999, 2_499, 7])).toBe(4_505);
    expect(sumCents([])).toBe(0);
  });

  it('is exact where float arithmetic would not be', () => {
    // 0.1 + 0.2 !== 0.3 in IEEE-754; in minor units the equivalent is exact.
    expect(sumCents([10, 20])).toBe(30);
    // Ten 19.99 line items.
    expect(sumCents(Array.from({ length: 10 }, () => 1_999))).toBe(19_990);
  });

  it('rejects a non-integer value in the list', () => {
    expect(() => sumCents([100, 10.5])).toThrow(/Invalid monetary value/);
  });
});

describe('isValidMinorUnits', () => {
  it('accepts non-negative safe integers', () => {
    expect(isValidMinorUnits(0)).toBe(true);
    expect(isValidMinorUnits(24_999)).toBe(true);
  });

  it('rejects floats, negatives and non-numbers', () => {
    expect(isValidMinorUnits(19.99)).toBe(false);
    expect(isValidMinorUnits(-100)).toBe(false);
    expect(isValidMinorUnits('1000')).toBe(false);
    expect(isValidMinorUnits(Number.NaN)).toBe(false);
    expect(isValidMinorUnits(Number.MAX_SAFE_INTEGER + 2)).toBe(false);
  });
});

describe('formatMoney', () => {
  it('renders minor units for display', () => {
    expect(formatMoney(24_999, 'usd')).toBe('$249.99');
    expect(formatMoney(7, 'usd')).toBe('$0.07');
    expect(formatMoney(0, 'usd')).toBe('$0.00');
  });
});
