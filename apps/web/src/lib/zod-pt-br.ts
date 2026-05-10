import type { ZodErrorMap } from 'zod'
import { z } from 'zod'

const ptBrErrorMap: ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === 'undefined')
        return { message: 'Campo obrigatório' }
      return {
        message: `Esperado ${issue.expected}, recebido ${issue.received}`,
      }
    case z.ZodIssueCode.too_small:
      if (issue.type === 'string')
        return { message: `Mínimo de ${String(issue.minimum)} caracteres` }
      if (issue.type === 'number')
        return { message: `Valor mínimo: ${String(issue.minimum)}` }
      return { message: `Mínimo de ${String(issue.minimum)} itens` }
    case z.ZodIssueCode.too_big:
      if (issue.type === 'string')
        return { message: `Máximo de ${String(issue.maximum)} caracteres` }
      if (issue.type === 'number')
        return { message: `Valor máximo: ${String(issue.maximum)}` }
      return { message: `Máximo de ${String(issue.maximum)} itens` }
    case z.ZodIssueCode.invalid_string:
      if (issue.validation === 'email') return { message: 'E-mail inválido' }
      if (issue.validation === 'url') return { message: 'URL inválida' }
      return { message: 'Formato inválido' }
    case z.ZodIssueCode.invalid_enum_value:
      return { message: 'Valor não permitido' }
    case z.ZodIssueCode.invalid_date:
      return { message: 'Data inválida' }
    case z.ZodIssueCode.custom:
      return { message: issue.message ?? 'Valor inválido' }
    default:
      return { message: ctx.defaultError }
  }
}

z.setErrorMap(ptBrErrorMap)
