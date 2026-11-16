import { describe, expect, it } from 'vitest';
import { generateOrderNumber } from '../../src/utils/orderNumber';
import { slugify } from '../../src/utils/slug';

describe('generateOrderNumber', () => {
  it('uses the NM-YYYYMMDD-XXXXXX format', () => {
    expect(generateOrderNumber(new Date('2026-11-16T10:00:00Z'))).toMatch(/^NM-20261116-[A-Z0-9]{6}$/);
  });

  it('omits characters that are ambiguous when read aloud', () => {
    for (let i = 0; i < 200; i += 1) {
      const suffix = generateOrderNumber().split('-')[2]!;
      // No 0/O or 1/I confusion in a reference a customer may dictate.
      expect(suffix).not.toMatch(/[01OI]/);
    }
  });

  it('does not collide across many generations', () => {
    const generated = new Set(Array.from({ length: 5_000 }, () => generateOrderNumber()));
    expect(generated.size).toBe(5_000);
  });
});

describe('slugify', () => {
  it('builds a URL-safe slug', () => {
    expect(slugify('Aurora Wireless Headphones')).toBe('aurora-wireless-headphones');
    expect(slugify('Nimbus  Ceramic   Pour-Over')).toBe('nimbus-ceramic-pour-over');
  });

  it('strips accents and punctuation', () => {
    expect(slugify('Café Crème — Déluxe!')).toBe('cafe-creme-deluxe');
  });

  it('trims leading and trailing separators', () => {
    expect(slugify('  --Hello World--  ')).toBe('hello-world');
  });
});
