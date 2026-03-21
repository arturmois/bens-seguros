import { z } from 'zod';

export const apiSuccessSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    meta: z
      .object({
        total: z.number().optional(),
        nextCursor: z.string().optional(),
      })
      .optional(),
  });

export const apiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta?: { total?: number; nextCursor?: string };
};

export type ApiError = {
  success: false;
  error: { code: string; message: string };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
