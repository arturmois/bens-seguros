import type { ClientConfig } from './types/common.js'
import { EnumRegistry } from './mappings/enum-registry.js'
import { AutoPayloadBuilder } from './builders/auto-payload-builder.js'
import { AutoQuoteService } from './branches/auto.js'
import { FipeClient } from './fipe/fipe-client.js'

const DEFAULT_BASE_URL = 'https://api.aggilizador.com.br'
const DEFAULT_FIPE_BASE_URL = 'https://fipe.agger.com.br'

export class AggilizadorClient {
  readonly auto: AutoQuoteService
  readonly fipe: FipeClient

  constructor(config?: ClientConfig) {
    const baseUrl = config?.baseUrl ?? DEFAULT_BASE_URL
    const fipeBaseUrl = config?.fipeBaseUrl ?? DEFAULT_FIPE_BASE_URL

    const registry = new EnumRegistry(baseUrl)
    const builder = new AutoPayloadBuilder(registry)

    this.auto = new AutoQuoteService(baseUrl, builder, registry)
    this.fipe = new FipeClient(fipeBaseUrl)
  }
}
