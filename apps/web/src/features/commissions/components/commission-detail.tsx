'use client'

import { ArrowLeft, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate } from '@/lib/formatters'

import type { CommissionData } from '../lib/types'
import { useCommission } from '../hooks/use-commissions'
import { CommissionStatusBadge } from './commission-status-badge'
import { CommissionActions } from './commission-actions'

interface CommissionDetailProps {
  readonly commissionId: string
}

export function CommissionDetail({ commissionId }: CommissionDetailProps) {
  const router = useRouter()
  const { data, isLoading, isError } = useCommission(commissionId)

  if (isLoading) {
    return <DetailSkeleton />
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <p className="text-destructive text-sm">Erro ao carregar comissão.</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/commissions')}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="mr-1 h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/commissions')}
          className="gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Comissões
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">Detalhes</span>
      </nav>

      <DetailHeader commission={data} />
      <Separator />
      <DetailInfoGrid commission={data} />

      {data.isReversal && data.originalCommissionId && (
        <>
          <Separator />
          <ReversalInfo originalCommissionId={data.originalCommissionId} />
        </>
      )}

      {data.rejectionReason && (
        <>
          <Separator />
          <RejectionInfo commission={data} />
        </>
      )}

      <Separator />
      <CommissionActions
        commissionId={commissionId}
        currentStatus={data.status}
      />
    </div>
  )
}

function DetailHeader({ commission }: { readonly commission: CommissionData }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <h2 className="text-xl font-semibold">
        {formatCurrency(commission.commissionValueInCents)}
      </h2>
      <CommissionStatusBadge status={commission.status} />
      {commission.isReversal && (
        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          Estorno
        </span>
      )}
    </div>
  )
}

function DetailInfoGrid({
  commission,
}: {
  readonly commission: CommissionData
}) {
  const percentageDisplay = `${(commission.percentageInBasisPoints / 100).toFixed(1)}%`

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <InfoItem
        label="Vendedor"
        value={commission.salespersonName ?? commission.salespersonId}
      />
      <InfoItem
        label="Apólice"
        value={commission.policyNumber ?? commission.policyId}
      />
      <InfoItem label="Cliente" value={commission.clientName ?? '-'} />
      <InfoItem
        label="Prêmio"
        value={formatCurrency(commission.premiumValueInCents)}
      />
      <InfoItem label="Percentual" value={percentageDisplay} />
      <InfoItem
        label="Valor da Comissão"
        value={formatCurrency(commission.commissionValueInCents)}
      />
      {commission.splitPercentage !== null && (
        <InfoItem
          label="Split"
          value={`${(commission.splitPercentage / 100).toFixed(1)}%`}
        />
      )}
      <InfoItem label="Criada em" value={formatDate(commission.createdAt)} />
      <InfoItem
        label="Aprovada em"
        value={commission.approvedAt ? formatDate(commission.approvedAt) : '-'}
      />
      <InfoItem
        label="Paga em"
        value={commission.paidAt ? formatDate(commission.paidAt) : '-'}
      />
    </div>
  )
}

function ReversalInfo({
  originalCommissionId,
}: {
  readonly originalCommissionId: string
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-sm font-medium">Esta comissão é um estorno</p>
      <p className="text-muted-foreground mt-1 text-sm">
        Comissão original:{' '}
        <Link
          href={`/commissions/${originalCommissionId}`}
          className="text-primary underline underline-offset-4"
        >
          Ver comissão original
        </Link>
      </p>
    </div>
  )
}

function RejectionInfo({
  commission,
}: {
  readonly commission: CommissionData
}) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
      <p className="text-sm font-medium text-red-700 dark:text-red-300">
        Comissão rejeitada
      </p>
      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
        Motivo: {commission.rejectionReason}
      </p>
      {commission.rejectedAt && (
        <p className="text-muted-foreground mt-1 text-xs">
          Rejeitada em {formatDate(commission.rejectedAt)}
        </p>
      )}
    </div>
  )
}

function InfoItem({
  label,
  value,
}: {
  readonly label: string
  readonly value: string
}) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-20" />
      </div>
      <Skeleton className="h-px w-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={`detail-skel-${String(i)}`} className="space-y-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-32" />
          </div>
        ))}
      </div>
    </div>
  )
}
