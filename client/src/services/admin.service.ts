import { api, unwrap } from './api';
import type { AdminStats } from '@/types';

export const adminService = {
  stats: async (days = 14): Promise<AdminStats> => {
    const { data } = await api.get<{ data: { stats: AdminStats } }>('/admin/stats', {
      params: { days },
    });
    return unwrap(data).stats;
  },
};
