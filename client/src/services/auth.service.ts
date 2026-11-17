import { api, unwrap } from './api';
import type { User } from '@/types';

export interface Credentials {
  email: string;
  password: string;
}

export interface RegisterPayload extends Credentials {
  name: string;
}

/** The user plus the CSRF token the server issued for this session. */
export interface AuthSession {
  user: User;
  csrfToken: string | null;
}

type SessionResponse = { data: { user: User; csrfToken?: string } };

const toSession = (payload: SessionResponse): AuthSession => {
  const { user, csrfToken } = unwrap(payload);
  return { user, csrfToken: csrfToken ?? null };
};

export const authService = {
  register: async (payload: RegisterPayload): Promise<AuthSession> => {
    const { data } = await api.post<SessionResponse>('/auth/register', payload);
    return toSession(data);
  },

  login: async (payload: Credentials): Promise<AuthSession> => {
    const { data } = await api.post<SessionResponse>('/auth/login', payload);
    return toSession(data);
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  me: async (): Promise<AuthSession> => {
    const { data } = await api.get<SessionResponse>('/auth/me');
    return toSession(data);
  },
};
