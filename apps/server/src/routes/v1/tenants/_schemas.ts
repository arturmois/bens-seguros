import { z } from 'zod'

import { successResponse } from '../../_shared/response.schema.js'

// --- Response schemas ---

const tenantItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logo: z.string().nullable(),
  role: z.string(),
})

export const tenantListResponse = successResponse(z.array(tenantItemSchema))
