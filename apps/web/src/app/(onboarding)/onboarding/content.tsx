'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { OnboardingOrgForm } from '@/features/billing/components/onboarding-org-form'
import { CreateOrgForm } from '@/features/org/components/create-org-form'
import { useOrgs } from '@/features/org/hooks/use-orgs'

export function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { orgs, isLoading } = useOrgs()
  const planSlug = searchParams.get('plan')
  const isNewOrg = searchParams.get('new') === 'true'

  useEffect(() => {
    if (isLoading || planSlug) return
    if (orgs.length === 0) {
      router.replace('/select-plan')
      return
    }
    if (!isNewOrg) router.replace('/')
  }, [isLoading, planSlug, orgs.length, isNewOrg, router])

  if (isLoading) return null
  if (planSlug) return <OnboardingOrgForm planSlug={planSlug} />
  if (isNewOrg && orgs.length > 0) return <CreateOrgForm />
  return null
}
