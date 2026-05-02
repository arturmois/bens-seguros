import { inject, injectable } from 'tsyringe'
import { Contact, type CreateContactInput } from '../domain/contact.js'
import type {
  ContactRepository,
  ContactData,
} from '../domain/contact-repository.js'

@injectable()
export class CreateContact {
  constructor(
    @inject('ContactRepository')
    private readonly contactRepo: ContactRepository
  ) {}

  async execute(input: CreateContactInput): Promise<ContactData> {
    const contact = Contact.create(input)
    const json = contact.toJSON()
    return this.contactRepo.save({
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
  }
}
