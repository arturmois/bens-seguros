import type { Role } from '@repo/auth/roles';

const PERMISSION_MATRIX: Record<string, Role[]> = {
  'clients:read': ['OWNER', 'ADMIN', 'MANAGER', 'COMMERCIAL', 'VIEWER'],
  'clients:create': ['OWNER', 'ADMIN', 'MANAGER', 'COMMERCIAL'],
  'clients:update': ['OWNER', 'ADMIN', 'MANAGER', 'COMMERCIAL'],
  'clients:delete': ['OWNER', 'ADMIN', 'MANAGER'],
  'proposals:read': ['OWNER', 'ADMIN', 'MANAGER', 'COMMERCIAL', 'VIEWER'],
  'proposals:create': ['OWNER', 'ADMIN', 'MANAGER', 'COMMERCIAL'],
  'proposals:update': ['OWNER', 'ADMIN', 'MANAGER', 'COMMERCIAL'],
  'proposals:delete': ['OWNER', 'ADMIN', 'MANAGER'],
  'policies:read': ['OWNER', 'ADMIN', 'MANAGER', 'COMMERCIAL', 'VIEWER'],
  'policies:create': ['OWNER', 'ADMIN', 'MANAGER'],
  'commissions:read': ['OWNER', 'ADMIN', 'MANAGER', 'COMMERCIAL', 'VIEWER'],
  'commissions:approve': ['OWNER', 'ADMIN', 'MANAGER'],
  'claims:read': ['OWNER', 'ADMIN', 'MANAGER', 'COMMERCIAL', 'VIEWER'],
  'claims:create': ['OWNER', 'ADMIN', 'MANAGER'],
  'users:read': ['OWNER', 'ADMIN'],
  'users:manage': ['OWNER', 'ADMIN'],
  'settings:read': ['OWNER', 'ADMIN'],
  'settings:manage': ['OWNER'],
  'audit:read': ['OWNER', 'ADMIN', 'MANAGER'],
};

export function hasPermission(role: Role, permission: string): boolean {
  return PERMISSION_MATRIX[permission]?.includes(role) ?? false;
}

export function hasAnyPermission(role: Role, permissions: string[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(role: Role, permissions: string[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}
