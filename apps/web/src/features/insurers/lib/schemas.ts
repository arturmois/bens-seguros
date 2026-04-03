import { z } from 'zod'

import { CreateInsurerBody } from '@/api/endpoints/insurers/insurers.zod'

export const insurerFormSchema = CreateInsurerBody.extend({
  active: z.boolean().default(true),
})

export type InsurerFormValues = z.infer<typeof insurerFormSchema>

export const DEFAULT_INSURER_FORM: InsurerFormValues = {
  name: '',
  code: '',
  active: true,
}
