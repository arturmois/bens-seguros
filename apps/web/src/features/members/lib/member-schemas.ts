import { ROLE_HIERARCHY } from '@repo/auth/roles'

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
