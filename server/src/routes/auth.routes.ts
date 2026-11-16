import { Router } from 'express';
import { login, logout, me, register } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { authLimiter } from '../middleware/rateLimit';
import { loginSchema, registerSchema } from '../schemas/auth.schema';

const router = Router();

router.post('/register', authLimiter, validate({ body: registerSchema }), register);
router.post('/login', authLimiter, validate({ body: loginSchema }), login);
router.post('/logout', logout);
router.get('/me', requireAuth, me);

export default router;
