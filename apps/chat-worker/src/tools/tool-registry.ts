export const MANDATORY_TOOLS = ['escalateToHuman'] as const

export interface ToolRegistryEntry {
  readonly name: string
  readonly label: string
  readonly description: string
}

export const TOOL_REGISTRY: readonly ToolRegistryEntry[] = [
  {
    name: 'listProducts',
    label: 'Listar produtos',
    description: 'Lista os tipos de seguro disponíveis',
  },
  {
    name: 'captureLead',
    label: 'Capturar lead',
    description: 'Cria proposta e registra lead no sistema',
  },
  {
    name: 'searchClient',
    label: 'Buscar cliente',
    description: 'Encontra cliente por telefone ou CPF/CNPJ',
  },
  {
    name: 'updateClientData',
    label: 'Atualizar dados do cliente',
    description: 'Atualiza informações cadastrais do cliente',
  },
  {
    name: 'reportClaim',
    label: 'Registrar sinistro',
    description: 'Registra ocorrência de sinistro ou emergência',
  },
  {
    name: 'registerFinancialInquiry',
    label: 'Consulta financeira',
    description: 'Registra dúvida financeira e escala para atendente',
  },
  {
    name: 'collectInsuredAssetData',
    label: 'Coletar dados do bem',
    description: 'Salva detalhes do bem segurado para cotação',
  },
  {
    name: 'searchProposal',
    label: 'Buscar proposta',
    description: 'Encontra propostas existentes no sistema',
  },
  {
    name: 'searchPolicy',
    label: 'Buscar apólice',
    description: 'Consulta apólices ativas por cliente ou ramo',
  },
] as const

export const CONFIGURABLE_TOOL_NAMES = TOOL_REGISTRY.map((t) => t.name)
