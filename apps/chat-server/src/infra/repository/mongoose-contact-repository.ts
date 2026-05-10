import { Contact, type ContactDocument } from '@repo/db-chat'

import type { ContactRepository } from '../../domain/ports/contact-repository.js'
import type { ContactData } from '../../domain/types.js'

function toContactData(doc: ContactDocument): ContactData {
  return {
    id: String(doc._id),
    tenantId: doc.tenantId,
    whatsappPhone: doc.whatsappPhone ?? '',
    pushName: doc.pushName ?? null,
    profilePicUrl: doc.profilePicUrl ?? null,
    clientId: doc.clientId ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export class MongooseContactRepository implements ContactRepository {
  async findById(id: string, tenantId: string): Promise<ContactData | null> {
    const doc = await Contact.findOne({
      _id: id,
      tenantId,
    }).lean<ContactDocument>()
    if (!doc) return null
    return toContactData(doc)
  }

  async findByPhone(
    tenantId: string,
    whatsappPhone: string
  ): Promise<ContactData | null> {
    const doc = await Contact.findOne({
      tenantId,
      whatsappPhone,
    }).lean<ContactDocument>()
    if (!doc) return null
    return toContactData(doc)
  }

  async upsertByPhone(
    tenantId: string,
    whatsappPhone: string,
    pushName?: string,
    profilePicUrl?: string
  ): Promise<ContactData> {
    const updateFields: Record<string, unknown> = {}
    if (pushName !== undefined) updateFields['pushName'] = pushName
    if (profilePicUrl !== undefined)
      updateFields['profilePicUrl'] = profilePicUrl
    const doc = await Contact.findOneAndUpdate(
      { tenantId, whatsappPhone },
      {
        $set: updateFields,
        $setOnInsert: { tenantId, whatsappPhone },
      },
      { upsert: true, returnDocument: 'after' }
    ).lean<ContactDocument>()
    if (!doc) throw new Error('Upsert failed to return document')
    return toContactData(doc)
  }
}
