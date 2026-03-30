import { z } from 'zod'

import { idParam } from '../../_shared/params.schema.js'
import { roleEnum } from '../../_shared/enums.schema.js'

export const changeMemberRoleBodySchema = z.object({
  role: roleEnum,
})

export const listMembersQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
})

export { idParam as idParamSchema }
