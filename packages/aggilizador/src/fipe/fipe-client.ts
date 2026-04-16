import type { FipeModel, FipeSearchInput } from '../types/auto.js'

interface ApiFipeModel {
  modelo: string
  marca: string
  codigo: string
  tipoVeiculo: number
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

    // fetch().json() returns unknown — cast is standard for untyped HTTP responses
    const models = (await response.json()) as ApiFipeModel[]
    return models.map((m) => ({
      model: m.modelo,
      manufacturer: m.marca,
      fipeCode: m.codigo,
      vehicleType: m.tipoVeiculo,
    }))
  }

  private async ensureAuthenticated(): Promise<void> {
    if (this.authToken) return

    const today = new Date().toLocaleDateString('pt-BR')
    const credentials = Buffer.from(
      `2|1bc3fd5a-59ab-4ab5-97a1-7b1709eb9475|${today}`
    ).toString('base64')

    const response = await fetch(`${this.baseUrl}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    })

    if (response.ok) {
      const body = (await response.json()) as unknown
      if (typeof body === 'object' && body !== null && 'token' in body) {
        const { token } = body as { token: string }
        this.authToken = token
      } else if (typeof body === 'string') {
        this.authToken = body
      }
    }
  }
}
