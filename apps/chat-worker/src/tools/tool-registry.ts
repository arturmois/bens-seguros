export const MANDATORY_TOOLS = ['escalateToHuman'] as const

export const CAPTURE_LEAD_TOOL_NAME = 'captureLead' as const

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
    name: 'collectInsuredAssetData',
    label: 'Coletar dados do bem',
    description: 'Salva detalhes do bem segurado para cotação',
  },
] as const

export const CONFIGURABLE_TOOL_NAMES = TOOL_REGISTRY.map((t) => t.name)
