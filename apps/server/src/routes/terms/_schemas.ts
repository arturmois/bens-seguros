import { z } from 'zod'

export const acceptTermsSchema = z.object({
  termsVersion: z.string(),
  privacyVersion: z.string(),
})
