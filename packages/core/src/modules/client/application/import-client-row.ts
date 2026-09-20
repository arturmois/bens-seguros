import { randomUUID } from 'node:crypto'
import { hashDocument, stripNonDigits } from '@repo/shared'
import type {
  ClientRepository,
  MaritalStatus,
  PersonType,
} from '../domain/client-repository.js'
import type { ContactRepository } from '../../sales/leads/domain/contact-repository.js'

const MARITAL_STATUSES = [
  'SINGLE',
  'MARRIED',
  'DIVORCED',
  'WIDOWED',
  'OTHER',
] as const

function isMaritalStatus(value: string): value is MaritalStatus {
  return (MARITAL_STATUSES as readonly string[]).includes(value)
}

export type ImportClientRowResult =
  | { status: 'created' }
  | { status: 'skipped' }
  | { status: 'failed'; message: string }

export interface ImportClientRowInput {
  organizationId: string
  userId: string
  raw: Record<string, unknown>
}

export class ImportClientRow {
  constructor(
    private readonly clientRepo: Pick<
      ClientRepository,
      'findByDocumentHash' | 'save'
    >,
    private readonly contactRepo: Pick<ContactRepository, 'save'> & {
      findOldestByClientId: (
        clientId: string,
        organizationId: string
      ) => Promise<{ id: string } | null>
    }
  ) {}

  async execute(input: ImportClientRowInput): Promise<ImportClientRowResult> {
    const nome = String(input.raw['Nome'] ?? '')
    const cpfCnpj = String(input.raw['CPF/CNPJ'] ?? '')
    const email = input.raw['Email'] ? String(input.raw['Email']) : null
    const telefone = input.raw['Telefone']
      ? String(input.raw['Telefone'])
      : null
    const birthDateRaw = input.raw['Data Nascimento']
    const parsedBirth = birthDateRaw ? new Date(String(birthDateRaw)) : null
    const birthDate =
      parsedBirth && !Number.isNaN(parsedBirth.getTime()) ? parsedBirth : null
    const profissao = input.raw['Profissão']
      ? String(input.raw['Profissão'])
      : null
    const estadoCivilRaw = input.raw['Estado Civil']
      ? String(input.raw['Estado Civil'])
      : null
    const estadoCivil =
      estadoCivilRaw && isMaritalStatus(estadoCivilRaw) ? estadoCivilRaw : null
    const tags = input.raw['Tags']
      ? String(input.raw['Tags']).split(';').filter(Boolean)
      : []
    const hash = hashDocument(cpfCnpj)
    const personType: PersonType =
      stripNonDigits(cpfCnpj).length > 11 ? 'COMPANY' : 'INDIVIDUAL'
    try {
      const existing = await this.clientRepo.findByDocumentHash(
        hash,
        input.organizationId
      )
      const client =
        existing ??
        (await this.clientRepo.save({
          organizationId: input.organizationId,
          legalName: nome,
          document: cpfCnpj,
          personType,
          profession: profissao,
          maritalStatus: estadoCivil,
          address: null,
          fiscalBirthDate: birthDate,
        }))
      const contactExists =
        existing &&
        (await this.contactRepo.findOldestByClientId(
          client.id,
          input.organizationId
        ))
      if (!contactExists) {
        await this.contactRepo.save({
          id: randomUUID(),
          organizationId: input.organizationId,
          name: nome,
          phone: telefone,
          email,
          source: 'IMPORT',
          salespersonId: input.userId,
          clientId: client.id,
          tags,
          socialMedia: null,
          notes: null,
          consentLgpd: true,
          birthDate,
        })
      }
      return existing ? { status: 'skipped' } : { status: 'created' }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      return { status: 'failed', message }
    }
  }
}
