import { z } from 'zod'

export const updateOrganizationSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no maximo 100 caracteres'),
  slug: z
    .string()
    .min(2, 'Slug deve ter pelo menos 2 caracteres')
    .max(50, 'Slug deve ter no maximo 50 caracteres')
    .regex(
      /^[a-z0-9-]+$/,
      'Slug deve conter apenas letras minusculas, numeros e hifens'
    ),
})

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>
