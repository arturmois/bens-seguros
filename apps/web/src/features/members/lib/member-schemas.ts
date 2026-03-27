import { ROLE_HIERARCHY } from '@repo/auth/roles'
import { z } from 'zod'

export const inviteMemberSchema = z.object({
  email: z.string().email('Email inválido'),
  role: z.enum(['ADMIN', 'MANAGER', 'COMMERCIAL', 'VIEWER'], {
    required_error: 'Selecione um cargo',
  }),
})

export type InviteMemberFormValues = z.infer<typeof inviteMemberSchema>

export const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Proprietário',
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  COMMERCIAL: 'Comercial',
  VIEWER: 'Visualizador',
}

export const ASSIGNABLE_ROLES = [
  'ADMIN',
  'MANAGER',
  'COMMERCIAL',
  'VIEWER',
] as const

export { ROLE_HIERARCHY } from '@repo/auth/roles'

export function getRoleLevel(role: string): number {
  if (role in ROLE_HIERARCHY) {
    return ROLE_HIERARCHY[role as keyof typeof ROLE_HIERARCHY]
  }
  return 0
}
