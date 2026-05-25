export const SUBSCRIPTION_CACHE_TTL_SECONDS = 30

export const SUBSCRIPTION_CACHE_PREFIX = 'sub:'

export const SUBSCRIPTION_INVALIDATION_CHANNEL = 'subscription:invalidated'

export function subscriptionCacheKey(organizationId: string): string {
  return `${SUBSCRIPTION_CACHE_PREFIX}${organizationId}`
}
