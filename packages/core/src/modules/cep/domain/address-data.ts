export interface AddressData {
  readonly zipCode: string // 8 digits, no hyphen
  readonly street: string
  readonly neighborhood: string
  readonly city: string
  readonly state: string // 2-letter UF (e.g., "SP")
  readonly complement: string | null
}
