import type { OrderStatus, PaymentStatus } from '@/types';

/**
 * Formats integer minor units for display.
 * Division happens at the very last moment, for rendering only — no computed
 * value is ever fed back into arithmetic.
 */
export const formatMoney = (amountCents: number, currency = 'usd'): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amountCents / 100);

export const formatDate = (value: string | Date): string =>
  new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));

export const formatDateTime = (value: string | Date): string =>
  new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export const orderStatusLabel: Record<OrderStatus, string> = {
  PENDING: 'Awaiting payment',
  PAID: 'Paid',
  FAILED: 'Payment failed',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
  REFUNDED: 'Refunded',
};

export const orderStatusTone: Record<OrderStatus, Tone> = {
  PENDING: 'warning',
  PAID: 'success',
  FAILED: 'danger',
  CANCELLED: 'neutral',
  EXPIRED: 'neutral',
  REFUNDED: 'info',
};

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  SUCCEEDED: 'Succeeded',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
  REFUNDED: 'Refunded',
};

export const paymentStatusTone: Record<PaymentStatus, Tone> = {
  PENDING: 'warning',
  PROCESSING: 'info',
  SUCCEEDED: 'success',
  FAILED: 'danger',
  CANCELLED: 'neutral',
  EXPIRED: 'neutral',
  REFUNDED: 'info',
};
