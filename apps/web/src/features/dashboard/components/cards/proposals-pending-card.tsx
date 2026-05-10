'use client'

import { Clock } from 'lucide-react'
import Link from 'next/link'

import { Card, CardPanel } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface ProposalsPendingData {
  readonly total: number
  readonly inDay: number
  readonly warning: number
  readonly critical: number
}

interface ProposalsPendingCardProps {
  readonly data: ProposalsPendingData | undefined
  readonly isLoading: boolean
}

const PENDING_STAGES = 'CAPTURE,QUOTE,PROTOCOL,INSPECTION,PAYMENT'
const MS_PER_DAY = 24 * 60 * 60 * 1000

function buildInDayHref(): string {
  const from = new Date(Date.now() - 3 * MS_PER_DAY).toISOString()
  return `/proposals?stages=${PENDING_STAGES}&updatedAtFrom=${encodeURIComponent(from)}`
}

function buildWarningHref(): string {
  const from = new Date(Date.now() - 7 * MS_PER_DAY).toISOString()
  const to = new Date(Date.now() - 3 * MS_PER_DAY).toISOString()
  return `/proposals?stages=${PENDING_STAGES}&updatedAtFrom=${encodeURIComponent(from)}&updatedAtTo=${encodeURIComponent(to)}`
}

function buildCriticalHref(): string {
  const to = new Date(Date.now() - 7 * MS_PER_DAY).toISOString()
  return `/proposals?stages=${PENDING_STAGES}&updatedAtTo=${encodeURIComponent(to)}`
}

type ChipVariant = 'success' | 'warning' | 'destructive'

interface ChipProps {
  readonly href: string
  readonly label: string
  readonly count: number
  readonly variant: ChipVariant
  readonly ariaLabel: string
}

const CHIP_STYLES: Record<ChipVariant, string> = {
  success:
    'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300',
  warning:
    'bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-300',
  destructive:
    'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-500/20 dark:text-red-300',
}

function Chip({ href, label, count, variant, ariaLabel }: ChipProps) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors',
        CHIP_STYLES[variant]
      )}
    >
      {count} {label}
    </Link>
  )
}

export function ProposalsPendingCard({
  data,
  isLoading,
}: ProposalsPendingCardProps) {
  if (isLoading) {
    return (
      <Card data-testid="proposals-pending-card-loading">
        <CardPanel className="flex items-start gap-4">
          <Skeleton className="size-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-7 w-12" />
            <Skeleton className="h-5 w-40" />
          </div>
        </CardPanel>
      </Card>
    )
  }
  const safe = data ?? { total: 0, inDay: 0, warning: 0, critical: 0 }
  return (
    <Card>
      <CardPanel className="flex items-start gap-4">
        <div className="bg-primary/8 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
          <Clock className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground truncate text-sm">
            Propostas Pendentes
          </p>
          <p className="truncate text-2xl font-semibold tracking-tight">
            {safe.total}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {safe.total === 0 ? (
              <span className="text-muted-foreground text-xs">
                Nenhuma pendente
              </span>
            ) : (
              <>
                {safe.inDay > 0 ? (
                  <Chip
                    href={buildInDayHref()}
                    label="em dia"
                    count={safe.inDay}
                    variant="success"
                    ariaLabel={`${safe.inDay} propostas em dia, ver lista`}
                  />
                ) : null}
                {safe.warning > 0 ? (
                  <Chip
                    href={buildWarningHref()}
                    label="atenção"
                    count={safe.warning}
                    variant="warning"
                    ariaLabel={`${safe.warning} propostas em atenção, ver lista`}
                  />
                ) : null}
                {safe.critical > 0 ? (
                  <Chip
                    href={buildCriticalHref()}
                    label="crítico"
                    count={safe.critical}
                    variant="destructive"
                    ariaLabel={`${safe.critical} propostas críticas, ver lista`}
                  />
                ) : null}
              </>
            )}
          </div>
        </div>
      </CardPanel>
    </Card>
  )
}
