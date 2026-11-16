import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { AppError } from '../utils/AppError';

interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

const formatZodError = (error: ZodError) =>
  error.issues.map((issue) => ({
    field: issue.path.join('.') || '(root)',
    message: issue.message,
  }));

/**
 * Validates and REPLACES the request segment with the parsed result, so
 * downstream handlers receive coerced, stripped, typed data. Unknown keys
 * are dropped by Zod objects, which means a client cannot smuggle extra
 * fields (`role`, `priceCents`, ...) into a write path.
 */
export const validate =
  (schemas: ValidationSchemas) => (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.params) req.params = schemas.params.parse(req.params);
      if (schemas.query) {
        const parsedQuery = schemas.query.parse(req.query);
        Object.defineProperty(req, 'query', { value: parsedQuery, writable: true });
      }
      if (schemas.body) req.body = schemas.body.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(AppError.validation('Request validation failed', formatZodError(error)));
      }
      next(error);
    }
  };
