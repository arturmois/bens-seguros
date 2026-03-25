export interface ClientSearchResult {
  readonly id: string
  readonly name: string
  readonly document: string
  readonly type: 'PF' | 'PJ' | 'LEAD'
}

export interface ProposalSearchResult {
  readonly id: string
  readonly stage: string
  readonly branch: string
  readonly clientName: string
}

export interface PolicySearchResult {
  readonly id: string
  readonly policyNumber: string
  readonly branch: string
  readonly clientName: string
}

export interface ClaimSearchResult {
  readonly id: string
  readonly claimNumber: number
  readonly status: string
  readonly clientName: string
}

export interface GlobalSearchResults {
  readonly clients: readonly ClientSearchResult[]
  readonly proposals: readonly ProposalSearchResult[]
  readonly policies: readonly PolicySearchResult[]
  readonly claims: readonly ClaimSearchResult[]
}

export interface GlobalSearchMeta {
  readonly query: string
  readonly totalResults: number
}

export interface GlobalSearchResponse {
  readonly success: true
  readonly data: GlobalSearchResults
  readonly meta: GlobalSearchMeta
}
