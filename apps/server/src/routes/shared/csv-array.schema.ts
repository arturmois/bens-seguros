import { z } from 'zod'

export function csvStringArray() {
  return z.string().transform((value, ctx) => {
    const parts = value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
    if (parts.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Lista CSV vazia',
      })
      return z.NEVER
    }
    return parts
  })
}

export function csvEnumArray<T extends z.ZodTypeAny>(member: T) {
  return z.string().transform((value, ctx) => {
    const parts = value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
    if (parts.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Lista CSV vazia',
      })
      return z.NEVER
    }
    const validated: z.infer<T>[] = []
    for (const part of parts) {
      const result = member.safeParse(part)
      if (!result.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Valor inválido: ${part}`,
        })
        return z.NEVER
      }
      validated.push(result.data)
    }
    return validated
  })
}
