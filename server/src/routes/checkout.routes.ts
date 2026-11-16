import { Router } from 'express';
import { createCheckout, validateCheckout } from '../controllers/checkout.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { checkoutLimiter } from '../middleware/rateLimit';
import { createCheckoutSessionSchema } from '../schemas/checkout.schema';

const router = Router();

router.post(
  '/',
  requireAuth,
  checkoutLimiter,
  validate({ body: createCheckoutSessionSchema }),
  createCheckout,
);

router.post(
  '/validate',
  requireAuth,
  validate({ body: createCheckoutSessionSchema }),
  validateCheckout,
);

export default router;
