import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/http';
import { getAdminStats } from '../services/admin.service';

export const getStats = asyncHandler(async (req: Request, res: Response) => {
  const days = Math.min(Math.max(Number(req.query.days ?? 14), 1), 90);
  const stats = await getAdminStats(days);
  return sendSuccess(res, { stats });
});
