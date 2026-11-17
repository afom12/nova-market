import axios, { AxiosError, type AxiosInstance } from 'axios';
import type { ApiErrorShape } from '@/types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

const readCookie = (name: string): string | undefined => {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`));
  return match?.split('=')[1];
};

/*
 * CSRF token store.
 *
 * In production the client (Vercel) and API (Render) are on different
 * domains, so `document.cookie` cannot see the API's `nova_csrf` cookie. The
 * server therefore also returns the token in the login/register/me response
 * bodies, and we keep it here. sessionStorage lets it survive a refresh but
 * not outlive the tab. The server still compares cookie vs header exactly as
 * before — only how the client obtains the value has changed.
 */
const CSRF_STORAGE_KEY = 'nova_csrf';

const readStoredCsrfToken = (): string | null => {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(CSRF_STORAGE_KEY);
  } catch {
    return null; // storage can be blocked (privacy modes); fall back to the cookie
  }
};

let csrfToken: string | null = readStoredCsrfToken();

export const setCsrfToken = (token: string | null): void => {
  csrfToken = token;
  try {
    if (token) sessionStorage.setItem(CSRF_STORAGE_KEY, token);
    else sessionStorage.removeItem(CSRF_STORAGE_KEY);
  } catch {
    // Storage unavailable: the in-memory value still works for this page load.
  }
};

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  // Required so the httpOnly auth cookie travels with cross-origin requests.
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20_000,
});

// Echo the CSRF token back in a header on every state-changing request —
// the other half of the server's double-submit check. Prefer the stored token
// (works cross-origin); fall back to reading the cookie, which is all that
// same-origin local development needs.
api.interceptors.request.use((config) => {
  const method = config.method?.toUpperCase();
  if (method && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const token = csrfToken ?? readCookie('nova_csrf');
    if (token) config.headers.set('X-CSRF-Token', token);
  }
  return config;
});

export class ApiError extends Error implements ApiErrorShape {
  code: string;
  status: number;
  details?: ApiErrorShape['details'];

  constructor(shape: ApiErrorShape) {
    super(shape.message);
    this.name = 'ApiError';
    this.code = shape.code;
    this.status = shape.status;
    this.details = shape.details;
  }
}

/** Collapses every failure mode into one predictable error type for the UI. */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: { code: string; message: string; details?: unknown } }>) => {
    if (error.response) {
      const payload = error.response.data?.error;
      return Promise.reject(
        new ApiError({
          code: payload?.code ?? 'UNKNOWN_ERROR',
          message: payload?.message ?? 'Something went wrong. Please try again.',
          details: payload?.details as ApiErrorShape['details'],
          status: error.response.status,
        }),
      );
    }

    if (error.code === 'ECONNABORTED') {
      return Promise.reject(
        new ApiError({ code: 'TIMEOUT', message: 'The request timed out.', status: 0 }),
      );
    }

    return Promise.reject(
      new ApiError({
        code: 'NETWORK_ERROR',
        message: 'Could not reach the server. Check your connection and try again.',
        status: 0,
      }),
    );
  },
);

/** Unwraps the `{ success, data }` envelope the API always returns. */
export const unwrap = <T>(payload: { data: T }): T => payload.data;
