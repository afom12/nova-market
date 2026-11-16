/**
 * Converts a user-typed price such as "249.99" into integer minor units.
 *
 * Deliberately avoids `parseFloat(value) * 100`: that routes the value
 * through a binary float, where 19.99 * 100 === 1998.9999999999998. Parsing
 * the string into whole numbers keeps the arithmetic exact.
 */
export const dollarsToCents = (value: string): number => {
  const trimmed = value.trim().replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new Error('Price must be a number with at most two decimal places');
  }

  const [whole = '0', fraction = ''] = trimmed.split('.');
  const paddedFraction = fraction.padEnd(2, '0');

  return Number(whole) * 100 + Number(paddedFraction);
};

/** Inverse of the above, for pre-filling an edit form. */
export const centsToDollarString = (cents: number): string => {
  const sign = cents < 0 ? '-' : '';
  const absolute = Math.abs(cents);
  const whole = Math.floor(absolute / 100);
  const remainder = absolute % 100;
  return `${sign}${whole}.${String(remainder).padStart(2, '0')}`;
};
