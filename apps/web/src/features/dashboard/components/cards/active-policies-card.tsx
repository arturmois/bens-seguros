'use client'

import { Shield } from 'lucide-react'
import Link from 'next/link'

import type { DashboardStats } from '../../lib/constants'
import { ComparisonStatCard } from '../comparison-stat-card'

interface ActivePoliciesCardProps {
  readonly data: DashboardStats | undefined
  readonly isLoading: boolean
}

export function ActivePoliciesCard({
  data,
  isLoading,
}: ActivePoliciesCardProps) {
  const count = data?.activePolicies ?? 0
  return (
    <Link
      href="/policies?status=ACTIVE"
      aria-label={`${count} apólices ativas, ver lista`}
      className="block rounded-xl focus-visible:outline-2 focus-visible:outline-primary"
    >
      <ComparisonStatCard
        title="Apólices ativas"
        value={count}
        icon={<Shield className="size-5" />}
        comparison={data?.comparison.policies}
        isLoading={isLoading}
      />
    </Link>
  )
}
