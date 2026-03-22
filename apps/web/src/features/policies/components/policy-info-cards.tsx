import Link from 'next/link'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { formatCurrency, formatDate } from '@/lib/formatters'

interface PolicyInfoProps {
  readonly clientId: string
  readonly clientName?: string
  readonly proposalId: string
  readonly salespersonId: string
  readonly salespersonName?: string
  readonly premiumValueInCents: number
  readonly startDate: string
  readonly endDate: string
  readonly createdAt: string
}

export function PolicyInfoCard({
  clientId,
  clientName,
  proposalId,
  salespersonId,
  salespersonName,
  premiumValueInCents,
  startDate,
  endDate,
  createdAt,
}: PolicyInfoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações gerais</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem label="Cliente" value={clientName ?? clientId} />
          <InfoItem
            label="Proposta"
            value="Ver proposta"
            href={`/proposals/${proposalId}`}
          />
          <InfoItem label="Vendedor" value={salespersonName ?? salespersonId} />
          <InfoItem
            label="Prêmio"
            value={formatCurrency(premiumValueInCents)}
          />
          <InfoItem
            label="Vigência"
            value={`${formatDate(startDate)} → ${formatDate(endDate)}`}
          />
          <InfoItem label="Criado em" value={formatDate(createdAt)} />
        </dl>
      </CardContent>
    </Card>
  )
}

interface PolicyCancellationProps {
  readonly cancelledAt: string | null
  readonly cancelReason: string | null
}

export function PolicyCancellationCard({
  cancelledAt,
  cancelReason,
}: PolicyCancellationProps) {
  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-destructive">Cancelamento</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoItem
            label="Cancelado em"
            value={cancelledAt ? formatDate(cancelledAt) : '—'}
          />
          <InfoItem label="Motivo" value={cancelReason ?? '—'} />
        </dl>
      </CardContent>
    </Card>
  )
}

function InfoItem({
  label,
  value,
  href,
}: {
  readonly label: string
  readonly value: string
  readonly href?: string
}) {
  return (
    <div>
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">
        {href ? (
          <Link
            href={href}
            className="text-primary underline-offset-4 hover:underline"
          >
            {value}
          </Link>
        ) : (
          value
        )}
      </dd>
    </div>
  )
}
