import { z } from 'zod'

/**
 * Insurance branch — used in Proposal, Policy, and PDF templates.
 */
export const BRANCH_VALUES = [
  'AUTO',
  'RESIDENTIAL',
  'CONDOMINIUM',
  'BUSINESS',
  'LIFE',
  'OTHER',
] as const

export const branchEnum = z.enum(BRANCH_VALUES)

/**
 * Role enum (excludes OWNER — used for invitations and member role changes).
 */
export const roleEnum = z.enum(['ADMIN', 'MANAGER', 'COMMERCIAL', 'VIEWER'])

/**
 * Full role enum (includes OWNER — used for display and authorization checks).
 */
export const fullRoleEnum = z.enum([
  'OWNER',
  'ADMIN',
  'MANAGER',
  'COMMERCIAL',
  'VIEWER',
])

/**
 * Marital status — used in Client entity.
 */
export const maritalStatusEnum = z.enum([
  'SINGLE',
  'MARRIED',
  'DIVORCED',
  'WIDOWED',
  'OTHER',
])

/**
 * Priority levels — used across multiple domains.
 */
export const priorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
