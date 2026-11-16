/**
 * Money helpers.
 *
 * Rule for the whole codebase: monetary values are INTEGERS in minor units
 * (cents). They are produced by the database, multiplied by integer
 * quantities, and handed to Stripe as `unit_amount`. No value is ever parsed
 * into a float, because 0.1 + 0.2 !== 0.3 in IEEE-754 and a storefront that
 * rounds a cent the wrong way loses trust and money.
 */

export const isValidMinorUnits = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

/** Line total for a cart line. Integer in, integer out. */
export const lineSubtotalCents = (unitPriceCents: number, quantity: number): number => {
  if (!Number.isSafeInteger(unitPriceCents) || unitPriceCents < 0) {
    throw new Error(`Invalid unit price: ${unitPriceCents}`);
  }
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new Error(`Invalid quantity: ${quantity}`);
  }
  return unitPriceCents * quantity;
};

/** Sum of integer line totals. */
export const sumCents = (values: number[]): number =>
  values.reduce((total, value) => {
    if (!Number.isSafeInteger(value)) {
      throw new Error(`Invalid monetary value in sum: ${value}`);
    }
    return total + value;
  }, 0);

/** Display only — never feed the result of this back into a calculation. */
export const formatMoney = (amountCents: number, currency = 'usd'): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
