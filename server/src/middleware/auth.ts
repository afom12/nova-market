import type { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { verifyAuthToken } from '../services/token.service';

const extractToken = (req: Request): string | undefined => {
  const cookieToken = req.cookies?.[env.COOKIE_NAME] as string | undefined;
  if (cookieToken) return cookieToken;

  // Bearer support exists for API clients and tests. Cookies remain the
  // browser path because they cannot be read by JavaScript.
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);

  return undefined;
};

/**
 * Verifies the JWT and then RE-READS the user from the database.
 *
 * The database read is not redundant: a token issued before a role change or
 * account deletion would otherwise keep working until it expired. The role
 * used for authorization always comes from the database row, never from the
 * token and never from the request body.
 */
export const requireAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);
    if (!token) throw AppError.unauthorized('Authentication required');

    const payload = verifyAuthToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, name: true },
    });

    if (!user) throw AppError.unauthorized('Account no longer exists');

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/** Attaches the user when a valid session exists, but never rejects. */
export const optionalAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);
    if (!token) return next();

    const payload = verifyAuthToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, name: true },
    });
    if (user) req.user = user;
    next();
  } catch {
    next();
  }
};

/** Must run after `requireAuth`. */
export const requireAdmin = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) return next(AppError.unauthorized('Authentication required'));
  if (req.user.role !== Role.ADMIN) {
    return next(AppError.forbidden('Administrator access required'));
  }
  next();
};
