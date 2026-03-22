import { z } from 'zod';

export const dashboardStatsQuerySchema = z.object({
  months: z.coerce.number().min(1).max(12).default(6),
});
