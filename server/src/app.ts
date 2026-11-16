import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './lib/logger';
import { csrfProtection } from './middleware/csrf';
import { apiLimiter } from './middleware/rateLimit';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import apiRoutes from './routes';
import webhookRoutes from './routes/webhook.routes';

export const createApp = (): Express => {
  const app = express();

  // Required for correct client IPs (and therefore correct rate limiting)
  // when running behind a reverse proxy or container ingress.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // ---------------------------------------------------------------------
  // Security headers
  // ---------------------------------------------------------------------
  app.use(
    helmet({
      contentSecurityPolicy: env.isProduction ? undefined : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // ---------------------------------------------------------------------
  // CORS — explicit allow-list. `credentials: true` is required for the
  // httpOnly auth cookie, and a wildcard origin is illegal in that mode.
  // ---------------------------------------------------------------------
  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin/server-to-server requests send no Origin header.
        if (!origin) return callback(null, true);
        if (env.corsOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
      maxAge: 86_400,
    }),
  );

  if (!env.isTest) {
    app.use(
      pinoHttp({
        logger,
        autoLogging: { ignore: (req) => req.url === '/api/health' },
        customLogLevel: (_req, res, err) => {
          if (err || res.statusCode >= 500) return 'error';
          if (res.statusCode >= 400) return 'warn';
          return 'info';
        },
      }),
    );
  }

  app.use(cookieParser());

  // =====================================================================
  // STRIPE WEBHOOK — MOUNTED BEFORE express.json()
  //
  // This ordering is load-bearing. Stripe signs the raw request bytes, so
  // the webhook route must receive a Buffer. Mounting it above the JSON
  // parser (the route itself applies express.raw()) guarantees nothing has
  // re-serialised the payload before verification runs.
  //
  // It also sits above the CSRF middleware: Stripe is a third party and
  // cannot send our CSRF token. The HMAC signature IS its authentication.
  // =====================================================================
  app.use('/api/webhooks', webhookRoutes);

  // ---------------------------------------------------------------------
  // Body parsing for every other route
  // ---------------------------------------------------------------------
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  app.use('/api', apiLimiter);
  app.use('/api', csrfProtection);
  app.use('/api', apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
