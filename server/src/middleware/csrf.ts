import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const timingSafeEqual = (a: string, b: string): boolean => {
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
};

/**
 * Double-submit cookie CSRF defence.
 *
 * Because authentication rides on a cookie, the browser attaches it to
 * cross-site requests automatically. SameSite=Lax blocks cross-site POSTs,
 * but it is a single control and it is relaxed by design for top-level
 * navigations — so we also require the caller to echo the CSRF cookie back
 * in a header. An attacker's page can cause a request to be sent, but it
 * cannot read our cookie to populate that header.
 *
 * Requests authenticated by an Authorization header are exempt: they are not
 * sent ambiently by the browser, so CSRF does not apply to them.
 */
export const csrfProtection = (req: Request, _res: Response, next: NextFunction) => {
  if (SAFE_METHODS.has(req.method)) return next();
  if (req.headers.authorization?.startsWith('Bearer ')) return next();

  const cookieToken = req.cookies?.[env.CSRF_COOKIE_NAME] as string | undefined;
  if (!cookieToken) return next(); // no session cookie issued yet (e.g. login)

  const headerToken = req.get('x-csrf-token');
  if (!headerToken || !timingSafeEqual(cookieToken, headerToken)) {
    return next(new AppError(403, 'CSRF_TOKEN_INVALID', 'Invalid or missing CSRF token'));
  }

  next();
};
