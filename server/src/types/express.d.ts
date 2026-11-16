import type { Role } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  name: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Populated by `requireAuth` / `optionalAuth` only. Never from client input. */
      user?: AuthenticatedUser;
      /** Raw body buffer, captured only for the Stripe webhook route. */
      rawBody?: Buffer;
    }
  }
}

export {};
