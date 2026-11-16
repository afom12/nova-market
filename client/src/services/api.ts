import axios, { AxiosError, type AxiosInstance } from 'axios';
import type { ApiErrorShape } from '@/types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

const readCookie = (name: string): string | undefined => {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`));
  return match?.split('=')[1];
};

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  // Required so the httpOnly auth cookie travels with cross-origin requests.
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20_000,
});

// Echo the CSRF cookie back in a header on every state-changing request —
// the other half of the server's double-submit check.
api.interceptors.request.use((config) => {
  const method = config.method?.toUpperCase();
  if (method && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrfToken = readCookie('nova_csrf');
    if (csrfToken) config.headers.set('X-CSRF-Token', csrfToken);
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
