import type { FipeModel, FipeSearchInput } from '../types/auto.js'

interface ApiFipeModel {
  Modelo: string
  Marca: string
  Codigo: string
  TipoVeiculo: number
}

export class FipeClient {
  private readonly baseUrl: string
  private authToken: string | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async searchModels(input: FipeSearchInput): Promise<FipeModel[]> {
    await this.ensureAuthenticated()

    const url = `${this.baseUrl}/v1/fipe/modeloeano?modelo=${encodeURIComponent(input.model)}&ano=${input.year}`
    const response = await fetch(url, {
      headers: this.authToken
        ? { Authorization: `Bearer ${this.authToken}` }
        : {},
    })

    if (!response.ok) return []

    const models = (await response.json()) as ApiFipeModel[]
    return models.map((m) => ({
      model: m.Modelo,
      manufacturer: m.Marca,
      fipeCode: m.Codigo,
      vehicleType: m.TipoVeiculo,
    }))
  }

  private async ensureAuthenticated(): Promise<void> {
    if (this.authToken) return

    const today = new Date().toLocaleDateString('pt-BR')
    const credentials = Buffer.from(
      `2|bc3fd5a-59ab-4ab5-97a1-7b1709eb9475|${today}`
    ).toString('base64')

    const response = await fetch(`${this.baseUrl}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    })

    if (response.ok) {
      const token = (await response.json()) as unknown
      this.authToken = typeof token === 'string' ? token : null
    }
  }
}
