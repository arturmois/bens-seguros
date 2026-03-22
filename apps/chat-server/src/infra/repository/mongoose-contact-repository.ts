import { Contact } from '@repo/db-chat'

import type { ContactRepository } from '../../domain/ports/contact-repository.js'
import type { ContactData } from '../../domain/types.js'

interface MongooseContactDoc {
  _id: unknown
  tenantId: string
  whatsappPhone: string
  pushName?: string | null
  profilePicUrl?: string | null
  clientId?: string | null
  createdAt: Date
  updatedAt: Date
}

function toContactData(doc: MongooseContactDoc): ContactData {
  return {
    id: String(doc._id),
    tenantId: doc.tenantId,
    whatsappPhone: doc.whatsappPhone,
    pushName: doc.pushName ?? null,
    profilePicUrl: doc.profilePicUrl ?? null,
    clientId: doc.clientId ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export class MongooseContactRepository implements ContactRepository {
  async findById(id: string, tenantId: string): Promise<ContactData | null> {
    const doc = await Contact.findOne({ _id: id, tenantId }).lean()
    if (!doc) return null
    return toContactData(doc as unknown as MongooseContactDoc)
  }

  async findByPhone(
    tenantId: string,
    whatsappPhone: string
  ): Promise<ContactData | null> {
    const doc = await Contact.findOne({ tenantId, whatsappPhone }).lean()
    if (!doc) return null
    return toContactData(doc as unknown as MongooseContactDoc)
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
    ).lean()

    return toContactData(doc as unknown as MongooseContactDoc)
  }
}
