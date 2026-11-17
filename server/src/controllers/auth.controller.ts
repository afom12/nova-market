import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/http';
import { AppError } from '../utils/AppError';
import { authenticateUser, getUserById, registerUser } from '../services/auth.service';
import { clearAuthCookies, setAuthCookies } from '../services/token.service';
import { logger } from '../lib/logger';
import { env } from '../config/env';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const user = await registerUser(req.body);
  const csrfToken = setAuthCookies(res, { sub: user.id, email: user.email, role: user.role });

  logger.info({ userId: user.id }, 'User registered');
  return sendSuccess(res, { user, csrfToken }, 201);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const user = await authenticateUser(req.body);
  const csrfToken = setAuthCookies(res, { sub: user.id, email: user.email, role: user.role });

  logger.info({ userId: user.id }, 'User logged in');
  return sendSuccess(res, { user, csrfToken });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  clearAuthCookies(res);
  return sendSuccess(res, { message: 'Logged out successfully' });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const user = await getUserById(req.user.id);

  // When the client and API live on different domains (Vercel + Render) the
  // browser will not let client JS read our CSRF cookie. Returning the token
  // here lets the client recover it after a page refresh. This is safe: CORS
  // only lets allow-listed origins read this response, so an attacker's page
  // still cannot learn the token. The double-submit check itself is unchanged.
  const csrfToken = req.cookies?.[env.CSRF_COOKIE_NAME] as string | undefined;
  return sendSuccess(res, { user, csrfToken });
});
