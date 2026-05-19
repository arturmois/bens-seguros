'use client'

import { Pencil, Plus } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'

import { formatCurrency } from '@/lib/formatters'

import type { InsuredObjectDetails, ProposalData } from '../../../lib/constants'
import { VehicleBanner } from '../cards/vehicle-banner'
import { EditInsuredObjectDialog } from '../dialogs/edit-insured-object-dialog'

interface InsuredObjectTabProps {
  readonly proposal: ProposalData
}

interface ReadModePair {
  label: string
  value: string | null
}

function pairsFor(details: InsuredObjectDetails | null): ReadModePair[] {
  if (!details) return []
  switch (details.branch) {
    case 'AUTO':
      return [
        { label: 'Veículo', value: details.vehicle ?? null },
        {
          label: 'Ano Fabricação',
          value: details.manufacturingYear?.toString() ?? null,
        },
        { label: 'Ano Modelo', value: details.modelYear?.toString() ?? null },
        { label: 'Placa', value: details.licensePlate ?? null },
        { label: 'Chassi', value: details.vin ?? null },
        { label: 'Cor', value: details.color ?? null },
        { label: 'Combustível', value: details.fuelType ?? null },
        { label: 'Uso', value: details.vehicleUsage ?? null },
      ]
    case 'RESIDENTIAL':
      return [
        { label: 'Tipo do Imóvel', value: details.propertyType ?? null },
        { label: 'Uso', value: details.propertyUsage ?? null },
        { label: 'CEP', value: details.cep ?? null },
        {
          label: 'Endereço',
          value:
            [details.street, details.number, details.complement]
              .filter(Boolean)
              .join(', ') || null,
        },
        { label: 'Bairro', value: details.neighborhood ?? null },
        {
          label: 'Cidade/UF',
          value:
            details.city && details.state
              ? `${details.city}/${details.state}`
              : (details.city ?? null),
        },
        { label: 'Construção', value: details.construction ?? null },
        { label: 'Área (m²)', value: details.areaM2?.toString() ?? null },
      ]
    case 'CONDOMINIUM':
      return [
        { label: 'Condomínio', value: details.condominiumName ?? null },
        { label: 'Unidades', value: details.unitCount?.toString() ?? null },
        { label: 'CEP', value: details.cep ?? null },
        { label: 'Andares', value: details.floorCount?.toString() ?? null },
        { label: 'Blocos', value: details.blockCount?.toString() ?? null },
        {
          label: 'Elevadores',
          value: details.elevatorCount?.toString() ?? null,
        },
      ]
    case 'BUSINESS':
      return [
        { label: 'Razão Social', value: details.legalName ?? null },
        { label: 'CNPJ', value: details.cnpj ?? null },
        { label: 'Atividade', value: details.businessActivity ?? null },
        {
          label: 'Endereço',
          value:
            [details.street, details.number].filter(Boolean).join(', ') || null,
        },
        {
          label: 'Cidade/UF',
          value:
            details.city && details.state
              ? `${details.city}/${details.state}`
              : (details.city ?? null),
        },
        { label: 'Área (m²)', value: details.areaM2?.toString() ?? null },
      ]
    case 'LIFE':
      return [
        { label: 'Ocupação', value: details.occupation ?? null },
        {
          label: 'Renda mensal',
          value: details.monthlyIncomeCents
            ? formatCurrency(details.monthlyIncomeCents)
            : null,
        },
        {
          label: 'Fumante',
          value:
            details.isSmoker == null ? null : details.isSmoker ? 'Sim' : 'Não',
        },
        {
          label: 'Esportes radicais',
          value:
            details.extremeSports == null
              ? null
              : details.extremeSports
                ? 'Sim'
                : 'Não',
        },
        { label: 'Beneficiários', value: details.beneficiaries ?? null },
      ]
    case 'OTHER':
      return [{ label: 'Descrição', value: details.description ?? null }]
    default:
      return []
  }
}

export function InsuredObjectTab({ proposal }: InsuredObjectTabProps) {
  const [editOpen, setEditOpen] = useState(false)
  const details = proposal.details
  const pairs = pairsFor(details)

  if (proposal.stage === 'CAPTURE' && !details) {
    return (
      <>
        <div className="bg-card flex flex-col items-center justify-center gap-3 rounded-xl border p-12 text-center shadow-sm">
          <p className="text-sm font-semibold">Bem segurado não preenchido</p>
          <p className="text-muted-foreground max-w-md text-sm">
            Adicione os dados do objeto segurado para avançar do estágio
            Captação.
          </p>
          <Button onClick={() => setEditOpen(true)}>
            <Plus className="mr-1.5 size-4" /> Adicionar dados
          </Button>
        </div>
        <EditInsuredObjectDialog
          proposal={proposal}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      </>
    )
  }

  return (
    <div className="space-y-4">
      {details?.branch === 'AUTO' && <VehicleBanner details={details} />}
      <div className="bg-card rounded-xl border p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
            Especificações
          </p>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-1.5 size-3.5" /> Editar
          </Button>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pairs.map((pair) => (
            <div key={pair.label}>
              <dt className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                {pair.label}
              </dt>
              <dd
                className={
                  pair.value ? 'font-medium' : 'text-muted-foreground italic'
                }
              >
                {pair.value ?? '— não informada'}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <EditInsuredObjectDialog
        proposal={proposal}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  )
}
