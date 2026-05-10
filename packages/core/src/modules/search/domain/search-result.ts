export interface ClientSearchHit {
  id: string
  name: string
  document: string
}

export interface ProposalSearchHit {
  id: string
  stage: string
  branch: string
  clientName: string
}

export interface PolicySearchHit {
  id: string
  policyNumber: string
  branch: string
  clientName: string
}

export interface ClaimSearchHit {
  id: string
  claimNumber: number
  status: string
  clientName: string
}

export interface GlobalSearchResult {
  clients: ClientSearchHit[]
  proposals: ProposalSearchHit[]
  policies: PolicySearchHit[]
  claims: ClaimSearchHit[]
}
