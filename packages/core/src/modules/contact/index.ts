export { Contact } from './domain/contact.js'
export type {
  ContactProps,
  ContactSource,
  CreateContactInput,
} from './domain/contact.js'
export {
  ContactErrors,
  ContactInvalidError,
  ContactNotFoundError,
  DocumentMismatchError,
} from './domain/contact-errors.js'
export type {
  ContactData,
  ContactFilters,
  ContactRepository,
  ContactSortField,
  ContactStage,
  ContactWithStage,
  CreateContactPersistence,
  UpdateContactPersistence,
} from './domain/contact-repository.js'

export { CreateContact } from './application/create-contact.js'
export { GetContact } from './application/get-contact.js'
export { ListContacts } from './application/list-contacts.js'
export type { ListContactsInput } from './application/list-contacts.js'
export { PromoteContact } from './application/promote-contact.js'
export type { PromoteContactInput } from './application/promote-contact.js'
export { SoftDeleteContact } from './application/soft-delete-contact.js'
export { UpdateContact } from './application/update-contact.js'
export type { UpdateContactInput } from './application/update-contact.js'

export { ContactMapper } from './infrastructure/contact-mapper.js'
export { PrismaContactRepository } from './infrastructure/prisma-contact-repository.js'
