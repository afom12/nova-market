import { Router } from 'express';
import { getStats } from '../controllers/admin.controller';
import { adminGetOrder, adminGetOrders } from '../controllers/order.controller';
import {
  adminCreateProduct,
  adminDeleteProduct,
  adminGetProduct,
  adminGetProducts,
  adminUpdateProduct,
} from '../controllers/product.controller';
import { requireAdmin, requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  adminProductListQuerySchema,
  createProductSchema,
  productIdParamSchema,
  updateProductSchema,
} from '../schemas/product.schema';
import { adminOrderListQuerySchema, orderIdParamSchema } from '../schemas/order.schema';

const router = Router();

// Authorization is enforced on the SERVER for the whole admin surface.
// Hiding the admin links in the UI is a convenience, never a control.
router.use(requireAuth, requireAdmin);

router.get('/stats', getStats);

router.get('/products', validate({ query: adminProductListQuerySchema }), adminGetProducts);
router.post('/products', validate({ body: createProductSchema }), adminCreateProduct);
router.get('/products/:id', validate({ params: productIdParamSchema }), adminGetProduct);
router.put(
  '/products/:id',
  validate({ params: productIdParamSchema, body: updateProductSchema }),
  adminUpdateProduct,
);
router.delete('/products/:id', validate({ params: productIdParamSchema }), adminDeleteProduct);

router.get('/orders', validate({ query: adminOrderListQuerySchema }), adminGetOrders);
router.get('/orders/:id', validate({ params: orderIdParamSchema }), adminGetOrder);

export default router;
