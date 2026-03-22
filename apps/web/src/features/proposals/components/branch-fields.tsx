'use client'

import type { FieldValues } from 'react-hook-form'
import { useForm } from 'react-hook-form'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import type { InsuranceBranch, InsuredObjectDetails } from '../types'
import {
  AutoFields,
  FieldWrapper,
  LifeFields,
  OtherFields,
} from './branch-field-sets'
import type { FieldHelperProps } from './branch-field-sets'
import {
  BusinessFields,
  CondominiumFields,
  ResidentialFields,
} from './branch-field-sets-property'

interface BranchFieldsProps {
  readonly branch: InsuranceBranch
  readonly defaultValues?: InsuredObjectDetails | null
  readonly defaultPremium?: number
  readonly defaultCommission?: number
  readonly onSubmit: (data: {
    details: InsuredObjectDetails
    premiumValueInCents: number
    commissionBasisPoints: number
  }) => void
  readonly isLoading?: boolean
}

const BRANCH_FIELD_MAP: Record<InsuranceBranch, React.FC<FieldHelperProps>> = {
  AUTO: AutoFields,
  RESIDENTIAL: ResidentialFields,
  CONDOMINIUM: CondominiumFields,
  BUSINESS: BusinessFields,
  LIFE: LifeFields,
  OTHER: OtherFields,
}

function buildDetails(
  branch: InsuranceBranch,
  fields: Record<string, unknown>
): InsuredObjectDetails {
  switch (branch) {
    case 'AUTO':
      return {
        branch,
        marca: String(fields.marca ?? ''),
        modelo: String(fields.modelo ?? ''),
        anoFabricacao: Number(fields.anoFabricacao) || 0,
        anoModelo: Number(fields.anoModelo) || 0,
        placa: fields.placa ? String(fields.placa) : undefined,
        chassi: fields.chassi ? String(fields.chassi) : undefined,
        cor: fields.cor ? String(fields.cor) : undefined,
        combustivel: fields.combustivel
          ? String(fields.combustivel)
          : undefined,
        usoVeiculo: fields.usoVeiculo ? String(fields.usoVeiculo) : undefined,
      }
    case 'RESIDENTIAL':
      return {
        branch,
        tipoImovel: String(fields.tipoImovel ?? ''),
        usoImovel: String(fields.usoImovel ?? ''),
        cep: String(fields.cep ?? ''),
        endereco: fields.endereco ? String(fields.endereco) : undefined,
        construcao: fields.construcao ? String(fields.construcao) : undefined,
        areaM2: fields.areaM2 ? Number(fields.areaM2) : undefined,
      }
    case 'CONDOMINIUM':
      return {
        branch,
        nomeCondominio: String(fields.nomeCondominio ?? ''),
        numeroUnidades: Number(fields.numeroUnidades) || 0,
        cep: String(fields.cep ?? ''),
        endereco: fields.endereco ? String(fields.endereco) : undefined,
        anoConstrucao: fields.anoConstrucao
          ? Number(fields.anoConstrucao)
          : undefined,
        numeroAndares: fields.numeroAndares
          ? Number(fields.numeroAndares)
          : undefined,
      }
    case 'BUSINESS':
      return {
        branch,
        razaoSocial: String(fields.razaoSocial ?? ''),
        cnpj: String(fields.cnpj ?? ''),
        atividade: String(fields.atividade ?? ''),
        cep: fields.cep ? String(fields.cep) : undefined,
        endereco: fields.endereco ? String(fields.endereco) : undefined,
        areaM2: fields.areaM2 ? Number(fields.areaM2) : undefined,
      }
    case 'LIFE':
      return {
        branch,
        profissao: String(fields.profissao ?? ''),
        rendaMensalCentavos: fields.rendaMensalCentavos
          ? Number(fields.rendaMensalCentavos)
          : undefined,
        fumante: fields.fumante === true ? true : undefined,
        esportesRadicais: fields.esportesRadicais === true ? true : undefined,
        beneficiarios: fields.beneficiarios
          ? String(fields.beneficiarios)
          : undefined,
      }
    case 'OTHER':
      return { branch, descricao: String(fields.descricao ?? '') }
  }
}

export function BranchFields({
  branch,
  defaultValues,
  defaultPremium,
  defaultCommission,
  onSubmit,
  isLoading,
}: BranchFieldsProps) {
  const form = useForm<FieldValues>({
    defaultValues: {
      ...(defaultValues ?? {}),
      premiumValueInCents: defaultPremium ?? 0,
      commissionBasisPoints: defaultCommission ?? 0,
    },
  })

  function handleFormSubmit(values: FieldValues) {
    const { premiumValueInCents, commissionBasisPoints, ...rest } = values
    const details: InsuredObjectDetails = buildDetails(branch, rest)
    onSubmit({
      details,
      premiumValueInCents: Number(premiumValueInCents) || 0,
      commissionBasisPoints: Number(commissionBasisPoints) || 0,
    })
  }

  const BranchComponent = BRANCH_FIELD_MAP[branch]

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <BranchComponent register={form.register} control={form.control} />
      </div>

      <div className="border-border border-t pt-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldWrapper
            label="Valor do Prêmio"
            required
            hint="Em centavos (ex: 150000 = R$ 1.500,00)"
          >
            <Input
              type="number"
              placeholder="150000"
              {...form.register('premiumValueInCents', { valueAsNumber: true })}
            />
          </FieldWrapper>
          <FieldWrapper
            label="Comissão (%)"
            required
            hint="Em pontos base (ex: 1500 = 15%)"
          >
            <Input
              type="number"
              placeholder="1500"
              {...form.register('commissionBasisPoints', {
                valueAsNumber: true,
              })}
            />
          </FieldWrapper>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar dados do objeto segurado
        </Button>
      </div>
    </form>
  )
}
