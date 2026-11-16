import pino from 'pino';
import { env } from '../config/env';

/**
 * Structured logging with aggressive redaction.
 *
 * Secrets must never reach log storage: cookies carry the session JWT,
 * the Stripe signature header is a credential, and request bodies can carry
 * passwords. Everything below is replaced with [Redacted] by pino itself,
 * not by developer discipline at each call site.
 */
export const logger = pino({
  level: env.isTest ? 'silent' : env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      'req.headers["stripe-signature"]',
      'req.headers["x-csrf-token"]',
      'res.headers["set-cookie"]',
      'password',
      'passwordHash',
      '*.password',
      '*.passwordHash',
      'body.password',
    ],
    censor: '[Redacted]',
  },
  base: { service: 'nova-market-api' },
  transport: env.isDevelopment
    ? {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname,service' },
      }
    : undefined,
});

export type Logger = typeof logger;
