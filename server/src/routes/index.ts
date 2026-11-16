import { Router } from 'express';
import adminRoutes from './admin.routes';
import authRoutes from './auth.routes';
import checkoutRoutes from './checkout.routes';
import orderRoutes from './order.routes';
import productRoutes from './product.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/checkout', checkoutRoutes);
router.use('/orders', orderRoutes);
router.use('/admin', adminRoutes);

export default router;
