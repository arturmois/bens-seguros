import { inject, injectable } from 'tsyringe'
import { Contact, type CreateContactInput } from '../domain/contact.js'
import type {
  ContactRepository,
  ContactWithStage,
} from '../domain/contact-repository.js'

@injectable()
export class CreateContact {
  constructor(
    @inject('ContactRepository')
    private readonly contactRepo: ContactRepository
  ) {}

  async execute(input: CreateContactInput): Promise<ContactWithStage> {
    const contact = Contact.create(input)
    const json = contact.toJSON()
    const saved = await this.contactRepo.save({
      id: json.id,
      organizationId: json.organizationId,
      name: json.name,
      phone: json.phone,
      email: json.email,
      source: json.source,
      salespersonId: json.salespersonId,
      clientId: null,
      tags: json.tags,
      socialMedia: json.socialMedia,
      notes: json.notes,
      consentLgpd: json.consentLgpd,
      birthDate: json.birthDate,
    })
    return { ...saved, stage: 'LEAD', activePolicyCount: 0 }
  }
}
