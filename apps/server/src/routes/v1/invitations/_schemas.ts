import { z } from 'zod'

import { idParam } from '../../_shared/params.schema.js'
import { roleEnum } from '../../_shared/enums.schema.js'

export const createInvitationBodySchema = z.object({
  email: z.string().email(),
  role: roleEnum,
})

export const listInvitationsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
})

export { idParam as idParamSchema }
