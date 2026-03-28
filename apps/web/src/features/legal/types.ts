export interface LegalSection {
  id: string
  title: string
  content: string
}

export interface LegalDocument {
  title: string
  version: string
  updatedAt: string
  sections: LegalSection[]
}
