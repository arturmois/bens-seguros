import type { PolicyData } from './policy-repository.js'

export interface PolicyPdfClientFull {
  readonly name: string
  readonly document: string
  readonly email: string | null
  readonly phone: string | null
  readonly address: Record<string, string> | null
}

export interface PolicyPdfRenderInput {
  readonly policy: PolicyData
  readonly organization: {
    readonly id: string
    readonly name: string
    readonly logo: string | null
  }
  readonly clientFull?: PolicyPdfClientFull
}

export interface PolicyPdfRenderer {
  render(input: PolicyPdfRenderInput): Promise<Buffer>
}
