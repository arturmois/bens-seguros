import type { ContactData } from '../types.js';

export interface ContactRepository {
  findById(id: string, tenantId: string): Promise<ContactData | null>;

  findByPhone(tenantId: string, whatsappPhone: string): Promise<ContactData | null>;

  upsertByPhone(
    tenantId: string,
    whatsappPhone: string,
    pushName?: string,
    profilePicUrl?: string,
  ): Promise<ContactData>;
}
