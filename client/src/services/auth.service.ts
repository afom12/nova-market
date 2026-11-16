import { api, unwrap } from './api';
import type { User } from '@/types';

export interface Credentials {
  email: string;
  password: string;
}

export interface RegisterPayload extends Credentials {
  name: string;
}

export const authService = {
  register: async (payload: RegisterPayload): Promise<User> => {
    const { data } = await api.post<{ data: { user: User } }>('/auth/register', payload);
    return unwrap(data).user;
  },

  login: async (payload: Credentials): Promise<User> => {
    const { data } = await api.post<{ data: { user: User } }>('/auth/login', payload);
    return unwrap(data).user;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  me: async (): Promise<User> => {
    const { data } = await api.get<{ data: { user: User } }>('/auth/me');
    return unwrap(data).user;
  },
};
