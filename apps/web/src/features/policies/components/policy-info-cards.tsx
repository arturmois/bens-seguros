import Link from 'next/link'

import type { GetPolicy200Data } from '@/api/model'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { formatCurrency, formatDate } from '@/lib/formatters'

type ClientAddress = NonNullable<GetPolicy200Data['clientAddress']>

const NOT_INFORMED = 'Não informado'

function formatCep(cep: string): string {
  const digits = cep.replace(/\D/g, '')
  if (digits.length !== 8) return cep
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 13 && digits.startsWith('55')) {
    const ddd = digits.slice(2, 4)
    const head = digits.slice(4, 9)
    const tail = digits.slice(9, 13)
    return `+55 (${ddd}) ${head}-${tail}`
  }
  if (digits.length === 11) {
    const ddd = digits.slice(0, 2)
    const head = digits.slice(2, 7)
    const tail = digits.slice(7, 11)
    return `(${ddd}) ${head}-${tail}`
  }
  return raw
}

function formatAddress(address: ClientAddress): string {
  const numberPart = address.number ? `, ${address.number}` : ''
  const complementPart = address.complement ? ` — ${address.complement}` : ''
  return `${address.street}${numberPart}${complementPart} — ${address.neighborhood}, ${address.city}/${address.state} (${formatCep(address.cep)})`
}

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

interface PolicyContactCardProps {
  readonly clientEmail?: string | null
  readonly clientPhone?: string | null
  readonly clientAddress?: ClientAddress | null
}

export function PolicyContactCard({
  clientEmail,
  clientPhone,
  clientAddress,
}: PolicyContactCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contato e endereço do cliente</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoItem label="E-mail" value={clientEmail ?? NOT_INFORMED} />
          <InfoItem
            label="Telefone"
            value={clientPhone ? formatPhone(clientPhone) : NOT_INFORMED}
          />
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground text-sm">Endereço</dt>
            <dd className="mt-0.5 font-medium text-sm">
              {clientAddress ? formatAddress(clientAddress) : NOT_INFORMED}
            </dd>
          </div>
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
      <dd className="mt-0.5 font-medium text-sm">
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
