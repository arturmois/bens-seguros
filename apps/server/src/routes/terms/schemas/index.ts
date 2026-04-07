import { z } from 'zod'

import { successResponse } from '../../shared/response.schema.js'

export const acceptTermsSchema = z.object({
  termsVersion: z.string(),
  privacyVersion: z.string(),
})

// --- Response schemas ---

export const termsStatusResponse = successResponse(
  z.object({
    needsReAccept: z.boolean(),
    currentTermsVersion: z.string(),
    currentPrivacyVersion: z.string(),
    userTermsVersion: z.string().nullable(),
    userPrivacyVersion: z.string().nullable(),
  })
)

export const acceptTermsResponse = successResponse(
  z.object({
    termsVersion: z.string(),
    privacyVersion: z.string(),
    acceptedAt: z.string(),
  })
)
