'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { useBillingCurrent } from '../hooks/use-billing-current'

const ALLOWED_EXACT_PATHS: readonly string[] = ['/billing/expired']
const ALLOWED_PATH_PREFIXES: readonly string[] = ['/settings']

function isAllowedPath(pathname: string): boolean {
  if (ALLOWED_EXACT_PATHS.includes(pathname)) return true
  return ALLOWED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export function BillingExpiredGuard() {
  const router = useRouter()
  const pathname = usePathname()
  const { data } = useBillingCurrent()

  useEffect(() => {
    const subscription = data?.subscription
    if (!subscription) return
    if (subscription.billingManagedExternally) return
    if (subscription.status !== 'EXPIRED') return
    if (isAllowedPath(pathname)) return
    router.replace('/billing/expired')
  }, [data, pathname, router])

  return null
}
