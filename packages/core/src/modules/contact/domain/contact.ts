import { randomUUID } from 'node:crypto'
import type { ContactSource } from '@repo/db'
import { ContactErrors } from './contact-errors.js'

export type { ContactSource }

export interface ContactProps {
  readonly id: string
  readonly organizationId: string
  name: string
  phone: string | null
  email: string | null
  readonly source: ContactSource
  salespersonId: string
  clientId: string | null
  tags: string[]
  socialMedia: Record<string, unknown> | null
  notes: string | null
  consentLgpd: boolean
  birthDate: Date | null
  readonly createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export interface CreateContactInput {
  organizationId: string
  name: string
  phone?: string
  email?: string
  source: ContactSource
  salespersonId: string
  tags?: string[]
  notes?: string
  consentLgpd: boolean
  birthDate?: Date
  socialMedia?: Record<string, unknown>
}

export class Contact {
  private constructor(private props: ContactProps) {}

  static create(input: CreateContactInput): Contact {
    if (!input.name || input.name.trim().length === 0) {
      throw ContactErrors.invalid('Nome do contato é obrigatório')
    }
    if (!input.phone && !input.email) {
      throw ContactErrors.invalid('Informe telefone ou email do contato')
    }
    const now = new Date()
    return new Contact({
      id: randomUUID(),
      organizationId: input.organizationId,
      name: input.name.trim(),
      phone: input.phone ?? null,
      email: input.email ?? null,
      source: input.source,
      salespersonId: input.salespersonId,
      clientId: null,
      tags: input.tags ?? [],
      socialMedia: input.socialMedia ?? null,
      notes: input.notes ?? null,
      consentLgpd: input.consentLgpd,
      birthDate: input.birthDate ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
  }

  static restore(props: ContactProps): Contact {
    return new Contact(props)
  }

  get id(): string {
    return this.props.id
  }
  get organizationId(): string {
    return this.props.organizationId
  }
  get name(): string {
    return this.props.name
  }
  get phone(): string | null {
    return this.props.phone
  }
  get email(): string | null {
    return this.props.email
  }
  get source(): ContactSource {
    return this.props.source
  }
  get salespersonId(): string {
    return this.props.salespersonId
  }
  get clientId(): string | null {
    return this.props.clientId
  }
  get tags(): string[] {
    return [...this.props.tags]
  }
  get socialMedia(): Record<string, unknown> | null {
    return this.props.socialMedia
  }
  get notes(): string | null {
    return this.props.notes
  }
  get consentLgpd(): boolean {
    return this.props.consentLgpd
  }
  get birthDate(): Date | null {
    return this.props.birthDate
  }
  get createdAt(): Date {
    return this.props.createdAt
  }
  get updatedAt(): Date {
    return this.props.updatedAt
  }
  get deletedAt(): Date | null {
    return this.props.deletedAt
  }

  linkToClient(clientId: string): void {
    if (this.props.clientId && this.props.clientId !== clientId) {
      throw ContactErrors.invalid('Contato já está vinculado a outro cliente')
    }
    this.props.clientId = clientId
    this.props.updatedAt = new Date()
  }

  updateBasic(
    input: Partial<
      Pick<
        ContactProps,
        | 'name'
        | 'phone'
        | 'email'
        | 'tags'
        | 'notes'
        | 'socialMedia'
        | 'birthDate'
        | 'salespersonId'
      >
    >
  ): void {
    if (input.name !== undefined) {
      if (input.name.trim().length === 0) {
        throw ContactErrors.invalid('Nome do contato é obrigatório')
      }
      this.props.name = input.name.trim()
    }
    if (input.phone !== undefined) this.props.phone = input.phone || null
    if (input.email !== undefined) this.props.email = input.email || null
    if (this.props.phone === null && this.props.email === null) {
      throw ContactErrors.invalid('Informe telefone ou email do contato')
    }
    if (input.tags !== undefined) this.props.tags = input.tags
    if (input.notes !== undefined) this.props.notes = input.notes
    if (input.socialMedia !== undefined)
      this.props.socialMedia = input.socialMedia
    if (input.birthDate !== undefined) this.props.birthDate = input.birthDate
    if (input.salespersonId !== undefined) {
      this.props.salespersonId = input.salespersonId
    }
    this.props.updatedAt = new Date()
  }

  softDelete(): void {
    this.props.deletedAt = new Date()
    this.props.updatedAt = new Date()
  }

  toJSON(): ContactProps {
    return { ...this.props, tags: [...this.props.tags] }
  }
}
