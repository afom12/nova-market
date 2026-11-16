import { randomBytes } from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I — readable over the phone

/**
 * Human-facing order reference, e.g. NM-20261116-K7Q4M2.
 * The database still owns uniqueness via a UNIQUE constraint; this only has
 * to make collisions vanishingly unlikely (32^6 ≈ 1.07e9 per day).
 */
export const generateOrderNumber = (date = new Date()): string => {
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
  const bytes = randomBytes(6);
  let suffix = '';
  for (let i = 0; i < 6; i += 1) {
    suffix += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return `NM-${datePart}-${suffix}`;
};
