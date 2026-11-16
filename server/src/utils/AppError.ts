/**
 * Operational errors — ones we anticipated and can describe safely to a
 * client. Anything that is NOT an AppError is treated as a programmer error
 * by the central handler and its details are never leaked to the response.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational = true;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(400, 'BAD_REQUEST', message, details);
  }

  static validation(message = 'Validation failed', details?: unknown) {
    return new AppError(422, 'VALIDATION_ERROR', message, details);
  }

  static unauthorized(message = 'Authentication required') {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'You do not have permission to perform this action') {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Resource not found') {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static conflict(message: string, details?: unknown) {
    return new AppError(409, 'CONFLICT', message, details);
  }

  static tooManyRequests(message = 'Too many requests') {
    return new AppError(429, 'RATE_LIMITED', message);
  }

  static internal(message = 'Something went wrong') {
    return new AppError(500, 'INTERNAL_ERROR', message);
  }
}
