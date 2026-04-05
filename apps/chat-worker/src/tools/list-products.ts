import { tool } from 'ai'
import { z } from 'zod'

interface ProductInfo {
  readonly type: string
  readonly name: string
  readonly description: string
  readonly basicCoverages: readonly string[]
  readonly optionalCoverages: readonly string[]
  readonly requiredData: readonly string[]
  readonly note?: string
}

const PRODUCTS: readonly ProductInfo[] = [
  {
    type: 'AUTO',
    name: 'Seguro Auto',
    description:
      'Proteção completa para o seu veículo contra os principais riscos.',
    basicCoverages: [
      'Roubo e furto',
      'Colisão',
      'Incêndio',
      'Danos a terceiros',
    ],
    optionalCoverages: ['Vidros', 'Carro reserva', 'Assistência 24h'],
    requiredData: [
      'Placa',
      'Modelo e ano',
      'CPF do proprietário',
      'CEP de pernoite',
      'Uso do veículo',
    ],
  },
  {
    type: 'LIFE',
    name: 'Seguro de Vida',
    description:
      'Proteção financeira para você e sua família em casos de imprevistos graves.',
    basicCoverages: ['Morte', 'Invalidez permanente', 'Assistência funeral'],
    optionalCoverages: [
      'Doenças graves',
      'Diária de internação',
      'Renda por incapacidade temporária',
    ],
    requiredData: [
      'CPF',
      'Data de nascimento',
      'Profissão',
      'Renda mensal',
      'Capital segurado desejado',
    ],
  },
  {
    type: 'RESIDENTIAL',
    name: 'Seguro Residencial',
    description: 'Proteção para o seu lar contra danos e sinistros.',
    basicCoverages: [
      'Incêndio, raio e explosão',
      'Roubo de bens',
      'Danos elétricos',
      'Vendaval',
    ],
    optionalCoverages: [
      'Responsabilidade civil familiar',
      'Vidros',
      'Danos por água',
      'Assistência 24h',
    ],
    requiredData: [
      'CEP do imóvel',
      'Tipo do imóvel',
      'Uso (próprio/alugado)',
      'Material de construção',
      'Valor do imóvel',
    ],
  },
  {
    type: 'BUSINESS',
    name: 'Seguro Empresarial',
    description:
      'Proteção completa para o seu negócio e patrimônio empresarial.',
    basicCoverages: [
      'Incêndio',
      'Danos elétricos',
      'Roubo de bens',
      'Responsabilidade civil',
    ],
    optionalCoverages: [
      'Lucros cessantes',
      'Quebra de máquinas',
      'Vida em grupo',
      'Assistência',
    ],
    requiredData: [
      'CNPJ',
      'Ramo de atividade',
      'CEP',
      'Tipo do imóvel',
      'Número de funcionários',
    ],
  },
  {
    type: 'TRAVEL',
    name: 'Seguro Viagem',
    description:
      'Proteção para você durante viagens nacionais e internacionais.',
    basicCoverages: [
      'Despesas médicas no exterior',
      'Regresso sanitário',
      'Traslado',
      'Extravio de bagagem',
    ],
    optionalCoverages: [
      'Cancelamento de viagem',
      'Atraso de voo',
      'Esportes de aventura',
      'Gestante',
    ],
    requiredData: [
      'Destino',
      'Datas de viagem',
      'Número de viajantes',
      'Finalidade da viagem',
    ],
  },
  {
    type: 'CONDOMINIUM',
    name: 'Seguro Condomínio',
    description:
      'Proteção obrigatória por lei para condomínios residenciais e comerciais.',
    basicCoverages: [
      'Incêndio',
      'Danos elétricos nas áreas comuns',
      'Vendaval',
      'Responsabilidade civil do condomínio',
    ],
    optionalCoverages: [
      'Vidros das áreas comuns',
      'Portões e automação',
      'Equipamentos',
      'Vida dos funcionários',
    ],
    requiredData: [
      'CEP',
      'Tipo do condomínio',
      'Número de unidades e andares',
      'Ano de construção',
      'Sistema de combate a incêndio',
    ],
    note: 'Obrigatório por lei (Lei 4.591/64)',
  },
  {
    type: 'OTHER',
    name: 'Responsabilidade Civil e Outros',
    description:
      'Proteção contra danos causados a terceiros por atividades pessoais ou profissionais.',
    basicCoverages: [
      'Danos materiais a terceiros',
      'Danos corporais a terceiros',
      'Defesa judicial',
    ],
    optionalCoverages: [
      'RC profissional',
      'RC empregador',
      'RC produtos',
      'RC ambiental',
    ],
    requiredData: [
      'CPF ou CNPJ',
      'Atividade exercida',
      'Faturamento anual',
      'Capital segurado desejado',
    ],
  },
] as const

const INSURANCE_TYPE_ENUM = [
  'AUTO',
  'LIFE',
  'RESIDENTIAL',
  'BUSINESS',
  'TRAVEL',
  'CONDOMINIUM',
  'OTHER',
] as const

export function createListProductsTool() {
  return tool({
    description:
      'Lista tipos de seguro disponiveis com detalhes de coberturas e dados necessarios. Use para informar o cliente sobre opcoes de seguro.',
    parameters: z.object({
      insuranceType: z
        .enum(INSURANCE_TYPE_ENUM)
        .optional()
        .describe(
          'Tipo específico de seguro para consultar. Se não informado, retorna todos.'
        ),
    }),
    execute: async ({ insuranceType }) => {
      if (insuranceType) {
        const product = PRODUCTS.find((p) => p.type === insuranceType)
        return { products: product ? [product] : [] }
      }
      return { products: PRODUCTS }
    },
  })
}
