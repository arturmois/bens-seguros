'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CreateOrgForm } from '@/features/org/components/create-org-form'
import { useOrgs } from '@/features/org/hooks/use-orgs'

export function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { orgs, isLoading } = useOrgs()
  const isNewOrg = searchParams.get('new') === 'true'
  useEffect(() => {
    if (!isLoading && orgs.length > 0 && !isNewOrg) {
      router.replace('/')
    }
  }, [isLoading, orgs.length, isNewOrg, router])
  if (isLoading) return null
  return <CreateOrgForm />
}
