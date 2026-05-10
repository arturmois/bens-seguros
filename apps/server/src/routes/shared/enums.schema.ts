import { z } from 'zod'

export const BRANCH_VALUES = [
  'AUTO',
  'RESIDENTIAL',
  'CONDOMINIUM',
  'BUSINESS',
  'LIFE',
  'OTHER',
] as const

export const branchEnum = z.enum(BRANCH_VALUES)

export const roleEnum = z.enum(['ADMIN', 'MANAGER', 'COMMERCIAL', 'VIEWER'])

export const fullRoleEnum = z.enum([
  'OWNER',
  'ADMIN',
  'MANAGER',
  'COMMERCIAL',
  'VIEWER',
])

export const maritalStatusEnum = z.enum([
  'SINGLE',
  'MARRIED',
  'DIVORCED',
  'WIDOWED',
  'OTHER',
])

export const priorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
