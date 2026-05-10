import { z } from 'zod'

import { successResponse } from '../../shared/response.schema.js'

const tenantItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logo: z.string().nullable(),
  role: z.string(),
})

export const tenantListResponse = successResponse(z.array(tenantItemSchema))
