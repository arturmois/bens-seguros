import { inject, injectable } from 'tsyringe'
import { Contact } from '../domain/contact.js'
import { ContactErrors } from '../domain/contact-errors.js'
import type {
  ContactRepository,
  ContactData,
} from '../domain/contact-repository.js'

export interface UpdateContactInput {
  id: string
  organizationId: string
  name?: string
  phone?: string
  email?: string | null
  tags?: string[]
  notes?: string | null
  socialMedia?: Record<string, unknown> | null
  birthDate?: Date | null
  salespersonId?: string
}

@injectable()
export class UpdateContact {
  constructor(
    @inject('ContactRepository') private readonly repo: ContactRepository
  ) {}

  async execute(input: UpdateContactInput): Promise<ContactData> {
    const found = await this.repo.findById(input.id, input.organizationId)
    if (!found) throw ContactErrors.notFound(input.id)
    const restored = Contact.restore(found)
    restored.updateBasic({
      name: input.name,
      phone: input.phone,
      email: input.email === null ? null : (input.email ?? undefined),
      tags: input.tags,
      notes: input.notes ?? undefined,
      socialMedia: input.socialMedia ?? undefined,
      birthDate: input.birthDate ?? undefined,
      salespersonId: input.salespersonId,
    })
    const json = restored.toJSON()
    return this.repo.update(input.id, input.organizationId, {
      name: json.name,
      phone: json.phone,
      email: json.email,
      tags: json.tags,
      notes: json.notes,
      socialMedia: json.socialMedia,
      birthDate: json.birthDate,
      salespersonId: json.salespersonId,
    })
  }
}
