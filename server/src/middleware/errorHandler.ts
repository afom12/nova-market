import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { AppError } from '../utils/AppError';
import { sendFailure } from '../utils/http';

/** Maps Prisma's error codes onto meaningful HTTP semantics. */
const mapPrismaError = (error: Prisma.PrismaClientKnownRequestError): AppError => {
  switch (error.code) {
    case 'P2002': {
      const target = (error.meta?.target as string[] | undefined)?.join(', ') ?? 'field';
      return AppError.conflict(`A record with this ${target} already exists`);
    }
    case 'P2025':
      return AppError.notFound('The requested record was not found');
    case 'P2003':
      return AppError.badRequest('Related record constraint failed');
    default:
      return AppError.internal('A database error occurred');
  }
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): Response => {
  let appError: AppError;

  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof ZodError) {
    appError = AppError.validation('Request validation failed', error.issues);
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    appError = mapPrismaError(error);
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    appError = AppError.badRequest('Invalid database query');
  } else if (error instanceof SyntaxError && 'body' in error) {
    appError = AppError.badRequest('Malformed JSON payload');
  } else {
    appError = AppError.internal();
  }

  const isServerError = appError.statusCode >= 500;

  const logPayload = {
    err: error,
    method: req.method,
    path: req.originalUrl,
    statusCode: appError.statusCode,
    code: appError.code,
    userId: req.user?.id,
  };

  if (isServerError) {
    logger.error(logPayload, appError.message);
  } else {
    logger.warn(logPayload, appError.message);
  }

  // Unexpected failures never leak internals (stack traces, SQL, file paths)
  // to the client in production.
  const message =
    isServerError && env.isProduction ? 'Something went wrong on our side' : appError.message;

  return sendFailure(res, appError.statusCode, appError.code, message, appError.details);
};

export const notFoundHandler = (req: Request, res: Response): Response =>
  sendFailure(res, 404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} does not exist`);
