'use client'

import { AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useOrgs } from '@/features/org/hooks/use-orgs'

import { useOrganization } from '../hooks/use-organization'
import { LogoUpload } from './logo-upload'
import { OrganizationForm } from './organization-form'

function OrganizationSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    </div>
  )
}

export function OrganizationPage() {
  const { data: organization, isLoading, isError, refetch } = useOrganization()
  const { activeOrg } = useOrgs()
  const isReadOnly = activeOrg?.role !== 'OWNER'
  if (isLoading) return <OrganizationSkeleton />
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <AlertCircle className="text-destructive size-8" />
        <p className="text-muted-foreground text-sm">
          Erro ao carregar dados da organização.
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }
  if (!organization) return null
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Organização</h2>
        <p className="text-muted-foreground text-sm">
          {isReadOnly
            ? 'Visualize as informações da sua organização.'
            : 'Gerencie as informações da sua organização.'}
        </p>
      </div>
      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <OrganizationForm organization={organization} isReadOnly={isReadOnly} />
        <LogoUpload organization={organization} isReadOnly={isReadOnly} />
      </div>
    </div>
  )
}
