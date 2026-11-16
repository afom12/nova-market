import { Router } from 'express';
import { getCategories, getProduct, getProducts } from '../controllers/product.controller';
import { validate } from '../middleware/validate';
import { productListQuerySchema } from '../schemas/product.schema';

const router = Router();

// Public catalogue — no authentication, active products only.
router.get('/', validate({ query: productListQuerySchema }), getProducts);
router.get('/categories', getCategories);
router.get('/:id', getProduct);

export default router;
