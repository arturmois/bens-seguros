'use client'

import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { DocumentList } from '@/features/documents/components/document-list'
import { DocumentUpload } from '@/features/documents/components/document-upload'

import { useClaim, useDeleteClaim } from '../hooks/use-claims'
import { formatClaimNumber } from '../lib/constants'
import { ClaimDetailHeader } from './claim-detail-header'
import { ClaimDetailSkeleton } from './claim-detail-skeleton'
import { ClaimInfoGrid } from './claim-info-grid'
import { ClaimStatusActions } from './claim-status-actions'
import { ClaimTabs } from './claim-tabs'
import { OccurrenceList } from './occurrence-list'

interface ClaimDetailProps {
  readonly claimId: string
}

export function ClaimDetail({ claimId }: ClaimDetailProps) {
  const router = useRouter()
  const { data, isLoading, isError, refetch } = useClaim(claimId)
  const deleteClaim = useDeleteClaim()
  const [deleteOpen, setDeleteOpen] = useState(false)
  function handleConfirmDelete() {
    deleteClaim.mutate(claimId, {
      onSuccess: () => {
        setDeleteOpen(false)
        router.push('/claims')
      },
    })
  }
  if (isLoading) {
    return <ClaimDetailSkeleton />
  }
  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <p className="text-destructive text-sm">Erro ao carregar sinistro.</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/claims')}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-1 h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }
  const claim = data
  const formattedNumber = formatClaimNumber(claim.claimNumber, claim.createdAt)
  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/claims')}
          className="gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Sinistros
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">{formattedNumber}</span>
      </nav>
      <ClaimDetailHeader
        formattedNumber={formattedNumber}
        status={claim.status}
        priority={claim.priority}
        onDelete={() => setDeleteOpen(true)}
      />
      <Separator />
      <ClaimInfoGrid claim={claim} />
      {claim.description && (
        <>
          <Separator />
          <div>
            <p className="text-muted-foreground text-xs">Descrição</p>
            <p className="mt-1 text-sm">{claim.description}</p>
          </div>
        </>
      )}
      <Separator />
      <ClaimStatusActions claimId={claimId} currentStatus={claim.status} />
      <Separator />
      <ClaimTabs
        claimId={claimId}
        occurrencesSlot={<OccurrenceList claimId={claimId} />}
        documentsSlot={
          <>
            <DocumentUpload entityType="CLAIM" entityId={claimId} />
            <DocumentList entityType="CLAIM" entityId={claimId} />
          </>
        }
      />
      <ConfirmDeleteDialog
        entityLabel="sinistro"
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleConfirmDelete}
        isPending={deleteClaim.isPending}
      />
    </div>
  )
}
