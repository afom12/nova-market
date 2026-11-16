import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { CookieOptions, Response } from 'express';
import type { Role } from '@prisma/client';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

export const signAuthToken = (payload: JwtPayload): string =>
  jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    issuer: 'nova-market',
    audience: 'nova-market-client',
  } as SignOptions);

export const verifyAuthToken = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      issuer: 'nova-market',
      audience: 'nova-market-client',
    });
    if (typeof decoded === 'string' || !decoded.sub) {
      throw AppError.unauthorized('Invalid session token');
    }
    return {
      sub: String(decoded.sub),
      email: String((decoded as Record<string, unknown>).email ?? ''),
      role: (decoded as Record<string, unknown>).role as Role,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw AppError.unauthorized('Your session has expired, please sign in again');
    }
    throw AppError.unauthorized('Invalid session token');
  }
};

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const baseCookieOptions = (): CookieOptions => ({
  // Secure in production only, so local http://localhost development works.
  secure: env.isProduction,
  sameSite: env.COOKIE_SAME_SITE,
  domain: env.COOKIE_DOMAIN,
  path: '/',
  maxAge: MAX_AGE_MS,
});

/**
 * Sets two cookies:
 *  1. the auth JWT — httpOnly, so no script (including an XSS payload) can
 *     read it;
 *  2. a CSRF token — deliberately readable by JS, because the client has to
 *     echo it back in a header. That echo is what proves the request came
 *     from our own origin's code rather than from a cross-site form post.
 */
export const setAuthCookies = (res: Response, payload: JwtPayload): string => {
  const token = signAuthToken(payload);
  const csrfToken = crypto.randomBytes(32).toString('hex');

  res.cookie(env.COOKIE_NAME, token, { ...baseCookieOptions(), httpOnly: true });
  res.cookie(env.CSRF_COOKIE_NAME, csrfToken, { ...baseCookieOptions(), httpOnly: false });

  return csrfToken;
};

export const clearAuthCookies = (res: Response): void => {
  const { maxAge: _maxAge, ...options } = baseCookieOptions();
  res.clearCookie(env.COOKIE_NAME, { ...options, httpOnly: true });
  res.clearCookie(env.CSRF_COOKIE_NAME, { ...options, httpOnly: false });
};
