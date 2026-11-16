import type { Response } from 'express';

/**
 * One response envelope for the whole API so the frontend never has to guess
 * the shape: success responses carry `data`, failures carry `error`.
 */
export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: Record<string, unknown>,
): Response<ApiSuccess<T>> => {
  const payload: ApiSuccess<T> = { success: true, data };
  if (meta) payload.meta = meta;
  return res.status(statusCode).json(payload);
};

export const sendFailure = (
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown,
): Response<ApiFailure> => {
  const payload: ApiFailure = { success: false, error: { code, message } };
  if (details !== undefined) payload.error.details = details;
  return res.status(statusCode).json(payload);
};

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export const buildPaginationMeta = (page: number, limit: number, total: number): PaginationMeta => {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1 && total > 0,
  };
};
