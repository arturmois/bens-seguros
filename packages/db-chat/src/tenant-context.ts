import { AsyncLocalStorage } from 'node:async_hooks'

interface TenantContext {
  tenantId: string
}

export const tenantStorage = new AsyncLocalStorage<TenantContext>()

export function getCurrentTenantId(): string | undefined {
  return tenantStorage.getStore()?.tenantId
}

export function runWithTenant<TResult>(
  tenantId: string,
  fn: () => TResult
): TResult {
  return tenantStorage.run({ tenantId }, fn)
}
