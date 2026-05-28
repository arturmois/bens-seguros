import { z } from 'zod'

export const completeOnboardingBody = z.object({
  orgName: z
    .string()
    .trim()
    .min(2, 'Nome da corretora deve ter no mínimo 2 caracteres')
    .max(120, 'Nome da corretora deve ter no máximo 120 caracteres'),
  planSlug: z
    .string()
    .trim()
    .min(1, 'Plano é obrigatório')
    .max(60, 'Plano inválido'),
})

export type CompleteOnboardingBody = z.infer<typeof completeOnboardingBody>

export const completeOnboardingResponse = z.object({
  success: z.literal(true),
  data: z.object({
    organizationId: z.string(),
    subscriptionId: z.string(),
    redirectTo: z.literal('/dashboard'),
  }),
})

export const errorResponse = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
})
