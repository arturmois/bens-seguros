'use client'

import type { ReactNode } from 'react'

import { useEntitlements } from '../hooks/use-entitlements'
import type { BooleanEntitlementKey } from '../lib/constants'

interface PlanGateProps {
  readonly feature: BooleanEntitlementKey
  readonly fallback?: ReactNode
  readonly loadingFallback?: ReactNode
  readonly children: ReactNode
}

/**
 * Esconde children quando entitlement boolean é falso.
 *
 * IMPORTANTE: PlanGate é apenas decoração UX (esconder CTAs).
 * Backend SEMPRE valida via CASL. Não confiar como controle de segurança.
 */
export function PlanGate({
  feature,
  fallback = null,
  loadingFallback = null,
  children,
}: PlanGateProps) {
  const { data: entitlements, isLoading, isError } = useEntitlements()

  if (isLoading) return <>{loadingFallback}</>
  if (isError || entitlements === undefined) return <>{fallback}</>
  if (entitlements[feature] === true) return <>{children}</>
  return <>{fallback}</>
}
