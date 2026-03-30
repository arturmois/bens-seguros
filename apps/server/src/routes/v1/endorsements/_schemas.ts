import { z } from 'zod'

import { idParam } from '../../_shared/params.schema.js'

const jsonLiteralSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
])

type JsonLiteral = z.infer<typeof jsonLiteralSchema>
type JsonValue = JsonLiteral | JsonValue[] | { [key: string]: JsonValue }

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    jsonLiteralSchema,
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ])
)

const jsonObjectSchema: z.ZodType<{ [key: string]: JsonValue }> =
  z.record(jsonValueSchema)

export const createEndorsementBodySchema = z.object({
  policyId: z.string().min(1),
  type: z.string().min(1),
  description: z.string().min(1),
  effectiveDate: z.coerce.date(),
  previousVersionSnapshot: jsonObjectSchema,
  changes: jsonObjectSchema,
})

export const listEndorsementsQuerySchema = z.object({
  policyId: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
})

export { idParam as idParamSchema }
