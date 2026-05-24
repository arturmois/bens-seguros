export type UsageUnitType = 'TOKEN' | 'CHARACTER' | 'IMAGE'

export interface CostInput {
  readonly provider: string
  readonly model: string
  readonly inputTokens: number
  readonly outputTokens: number
}

export interface CostSnapshot {
  readonly inputCostMicrocents: number
  readonly outputCostMicrocents: number
  readonly unitType: UsageUnitType
}

interface ModelPricing {
  readonly inputUsdPerMTok: number
  readonly outputUsdPerMTok: number
  readonly unitType: UsageUnitType
}

const USD_TO_BRL = 5.0
const MICROCENTS_PER_BRL = 10_000
const TOKENS_PER_MILLION = 1_000_000

const PRICING_TABLE: Record<string, ModelPricing> = {
  'anthropic:claude-sonnet-4-20250514': {
    inputUsdPerMTok: 3,
    outputUsdPerMTok: 15,
    unitType: 'TOKEN',
  },
  'openai:gpt-4o-mini': {
    inputUsdPerMTok: 0.15,
    outputUsdPerMTok: 0.6,
    unitType: 'TOKEN',
  },
}

const FALLBACK_PRICING: ModelPricing = {
  inputUsdPerMTok: 3,
  outputUsdPerMTok: 15,
  unitType: 'TOKEN',
}

function lookupPricing(provider: string, model: string): ModelPricing {
  return PRICING_TABLE[`${provider}:${model}`] ?? FALLBACK_PRICING
}

function tokensToMicrocents(tokens: number, usdPerMTok: number): number {
  if (tokens <= 0) return 0
  return Math.ceil(
    (tokens / TOKENS_PER_MILLION) * usdPerMTok * USD_TO_BRL * MICROCENTS_PER_BRL
  )
}

export function calculateCostMicrocents(input: CostInput): CostSnapshot {
  const pricing = lookupPricing(input.provider, input.model)
  return {
    inputCostMicrocents: tokensToMicrocents(
      input.inputTokens,
      pricing.inputUsdPerMTok
    ),
    outputCostMicrocents: tokensToMicrocents(
      input.outputTokens,
      pricing.outputUsdPerMTok
    ),
    unitType: pricing.unitType,
  }
}
