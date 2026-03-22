import type { Stage, Branch } from './proposal.js'

export interface ChecklistItemConfig {
  readonly itemKey: string
  readonly label: string
  readonly isRequired: boolean
  readonly documentType?: string
}

export interface ChecklistConfigProvider {
  getItems(stage: Stage, branch: Branch): readonly ChecklistItemConfig[]
}

const BASE_ITEMS: Partial<Record<Stage, readonly ChecklistItemConfig[]>> = {
  CAPTURE: [
    {
      itemKey: 'client_data',
      label: 'Dados do cliente preenchidos',
      isRequired: true,
    },
  ],
  QUOTE: [
    {
      itemKey: 'quote_sent',
      label: 'Cotacao enviada ao cliente',
      isRequired: true,
    },
    {
      itemKey: 'quote_approved',
      label: 'Cotacao aprovada pelo cliente',
      isRequired: true,
    },
  ],
  PROTOCOL: [
    {
      itemKey: 'protocol_registered',
      label: 'Proposta protocolada na seguradora',
      isRequired: true,
    },
  ],
  INSPECTION: [
    {
      itemKey: 'inspection_done',
      label: 'Inspecao/vistoria realizada',
      isRequired: true,
    },
  ],
  PAYMENT: [
    {
      itemKey: 'payment_confirmed',
      label: 'Pagamento confirmado',
      isRequired: true,
    },
  ],
}

const BRANCH_EXTRAS: Partial<
  Record<Branch, Partial<Record<Stage, readonly ChecklistItemConfig[]>>>
> = {
  AUTO: {
    CAPTURE: [
      {
        itemKey: 'driver_license',
        label: 'CNH do condutor',
        isRequired: true,
        documentType: 'DRIVER_LICENSE',
      },
      {
        itemKey: 'vehicle_registration',
        label: 'CRLV do veiculo',
        isRequired: true,
        documentType: 'VEHICLE_REGISTRATION',
      },
      {
        itemKey: 'vehicle_photos',
        label: 'Fotos do veiculo',
        isRequired: false,
      },
    ],
    INSPECTION: [
      {
        itemKey: 'inspection_report',
        label: 'Laudo de vistoria',
        isRequired: true,
        documentType: 'INSPECTION_REPORT',
      },
    ],
  },
  LIFE: {
    CAPTURE: [
      {
        itemKey: 'health_declaration',
        label: 'Declaracao de saude',
        isRequired: true,
        documentType: 'HEALTH_DECLARATION',
      },
    ],
  },
  RESIDENTIAL: {
    CAPTURE: [
      {
        itemKey: 'proof_of_address',
        label: 'Comprovante de residencia',
        isRequired: true,
        documentType: 'PROOF_OF_ADDRESS',
      },
    ],
  },
  BUSINESS: {
    CAPTURE: [
      {
        itemKey: 'social_contract',
        label: 'Contrato social',
        isRequired: true,
        documentType: 'SOCIAL_CONTRACT',
      },
      {
        itemKey: 'cnpj_card',
        label: 'Cartao CNPJ',
        isRequired: true,
        documentType: 'CNPJ_CARD',
      },
    ],
  },
}

export class StaticChecklistConfig implements ChecklistConfigProvider {
  getItems(stage: Stage, branch: Branch): readonly ChecklistItemConfig[] {
    const base = BASE_ITEMS[stage] ?? []
    const extras = BRANCH_EXTRAS[branch]?.[stage] ?? []
    return [...base, ...extras]
  }
}
