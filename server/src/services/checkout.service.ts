import type Stripe from 'stripe';
import { OrderStatus, PaymentStatus, type Product } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { stripe } from '../lib/stripe';
import { logger } from '../lib/logger';
import { AppError } from '../utils/AppError';
import { lineSubtotalCents, sumCents } from '../utils/money';
import { generateOrderNumber } from '../utils/orderNumber';
import type { CheckoutItemInput } from '../schemas/checkout.schema';
import type { AuthenticatedUser } from '../types/express';

export interface ValidatedCartLine {
  product: Product;
  quantity: number;
  unitPriceCents: number;
  subtotalCents: number;
}

export interface ValidatedCart {
  lines: ValidatedCartLine[];
  subtotalCents: number;
  totalAmountCents: number;
  currency: string;
}

/**
 * Turns an untrusted cart payload into a server-authoritative cart.
 *
 * Every figure here originates from the `products` table. The request only
 * ever contributes product ids and quantities.
 */
export const validateCart = async (items: CheckoutItemInput[]): Promise<ValidatedCart> => {
  const productIds = items.map((item) => item.productId);

  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productsById = new Map(products.map((product) => [product.id, product]));

  const lines: ValidatedCartLine[] = [];
  const problems: Array<{ productId: string; reason: string }> = [];

  for (const item of items) {
    const product = productsById.get(item.productId);

    if (!product) {
      problems.push({ productId: item.productId, reason: 'Product no longer exists' });
      continue;
    }
    if (!product.isActive) {
      problems.push({ productId: item.productId, reason: `"${product.name}" is no longer available` });
      continue;
    }
    if (product.stock < item.quantity) {
      problems.push({
        productId: item.productId,
        reason:
          product.stock === 0
            ? `"${product.name}" is out of stock`
            : `Only ${product.stock} left of "${product.name}"`,
      });
      continue;
    }

    const unitPriceCents = product.priceCents; // trusted source
    lines.push({
      product,
      quantity: item.quantity,
      unitPriceCents,
      subtotalCents: lineSubtotalCents(unitPriceCents, item.quantity),
    });
  }

  if (problems.length > 0) {
    throw AppError.conflict('Some items in your cart are unavailable', problems);
  }

  // Mixed currencies cannot be charged in a single Stripe Checkout Session.
  const currencies = new Set(lines.map((line) => line.product.currency.toLowerCase()));
  if (currencies.size > 1) {
    throw AppError.badRequest('All items in an order must share the same currency');
  }

  const currency = [...currencies][0] ?? env.STRIPE_CURRENCY;
  const subtotalCents = sumCents(lines.map((line) => line.subtotalCents));

  if (subtotalCents <= 0) {
    throw AppError.badRequest('Order total must be greater than zero');
  }

  return {
    lines,
    subtotalCents,
    // Shipping/tax would be added here; they are intentionally out of scope
    // and the fields are kept distinct so adding them does not change callers.
    totalAmountCents: subtotalCents,
    currency,
  };
};

const buildLineItems = (cart: ValidatedCart): Stripe.Checkout.SessionCreateParams.LineItem[] =>
  cart.lines.map((line) => ({
    quantity: line.quantity,
    price_data: {
      currency: cart.currency,
      // Integer minor units, straight from the database row.
      unit_amount: line.unitPriceCents,
      product_data: {
        name: line.product.name,
        description: line.product.description.slice(0, 500),
        metadata: { productId: line.product.id },
        ...(line.product.imageUrl.startsWith('http') ? { images: [line.product.imageUrl] } : {}),
      },
    },
  }));

export interface CheckoutSessionResult {
  checkoutUrl: string;
  sessionId: string;
  orderId: string;
  orderNumber: string;
  totalAmountCents: number;
  currency: string;
}

/**
 * Full checkout flow.
 *
 * Ordering matters: the pending order is committed BEFORE Stripe is called,
 * so a session can never exist without a local order to attach the eventual
 * webhook to. The external API call is kept outside the transaction so a
 * slow network never holds database locks open.
 */
export const createCheckoutSession = async (
  user: AuthenticatedUser,
  items: CheckoutItemInput[],
): Promise<CheckoutSessionResult> => {
  const cart = await validateCart(items);

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        userId: user.id,
        orderNumber: generateOrderNumber(),
        status: OrderStatus.PENDING,
        subtotalCents: cart.subtotalCents,
        totalAmountCents: cart.totalAmountCents,
        currency: cart.currency,
        items: {
          create: cart.lines.map((line) => ({
            productId: line.product.id,
            // Snapshot: order history survives later catalogue edits.
            productName: line.product.name,
            productImage: line.product.imageUrl,
            quantity: line.quantity,
            unitPriceCents: line.unitPriceCents,
            subtotalCents: line.subtotalCents,
          })),
        },
        payment: {
          create: {
            provider: 'stripe',
            amountCents: cart.totalAmountCents,
            currency: cart.currency,
            status: PaymentStatus.PENDING,
          },
        },
      },
      include: { items: true },
    });

    return created;
  });

  let session: Stripe.Checkout.Session;

  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        line_items: buildLineItems(cart),
        customer_email: user.email,
        // Two independent correlation handles back to our order.
        client_reference_id: order.id,
        metadata: { orderId: order.id, orderNumber: order.orderNumber, userId: user.id },
        payment_intent_data: {
          metadata: { orderId: order.id, orderNumber: order.orderNumber, userId: user.id },
        },
        success_url: `${env.CLIENT_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${env.CLIENT_URL}/checkout/cancel?orderNumber=${order.orderNumber}`,
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
      },
      {
        // If the client retries, Stripe returns the SAME session instead of
        // creating a second one for the same order.
        idempotencyKey: `checkout_session_${order.id}`,
      },
    );
  } catch (error) {
    logger.error({ err: error, orderId: order.id }, 'Stripe Checkout Session creation failed');
    // Leave no orphaned PENDING order the customer can never complete.
    await prisma.$transaction([
      prisma.order.update({ where: { id: order.id }, data: { status: OrderStatus.FAILED } }),
      prisma.payment.updateMany({
        where: { orderId: order.id },
        data: { status: PaymentStatus.FAILED, failureReason: 'Could not create Stripe session' },
      }),
    ]);
    throw new AppError(502, 'STRIPE_ERROR', 'Could not start checkout, please try again');
  }

  if (!session.url) {
    throw new AppError(502, 'STRIPE_ERROR', 'Stripe did not return a checkout URL');
  }

  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: {
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
      },
    }),
    prisma.payment.update({
      where: { orderId: order.id },
      data: {
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
      },
    }),
  ]);

  logger.info(
    { orderId: order.id, orderNumber: order.orderNumber, sessionId: session.id },
    'Checkout session created',
  );

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
    orderId: order.id,
    orderNumber: order.orderNumber,
    totalAmountCents: order.totalAmountCents,
    currency: order.currency,
  };
};
