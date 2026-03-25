import { z } from 'zod'

export const importJobIdParamSchema = z.object({
  jobId: z.string().uuid(),
})
