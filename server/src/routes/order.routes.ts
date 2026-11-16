import { Router } from 'express';
import { getMyOrder, getMyOrderBySession, getMyOrders } from '../controllers/order.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  orderBySessionQuerySchema,
  orderIdParamSchema,
  orderListQuerySchema,
} from '../schemas/order.schema';

const router = Router();

// Every route here is scoped to the authenticated user inside the service.
router.get('/', requireAuth, validate({ query: orderListQuerySchema }), getMyOrders);
router.get(
  '/by-session',
  requireAuth,
  validate({ query: orderBySessionQuerySchema }),
  getMyOrderBySession,
);
router.get('/:id', requireAuth, validate({ params: orderIdParamSchema }), getMyOrder);

export default router;
