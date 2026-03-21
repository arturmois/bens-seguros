import type { Client as PrismaClientRecord } from '@repo/db';
import type { ClientData, ClientAddress } from '../domain/client-repository.js';

function isAddressObject(value: unknown): value is ClientAddress {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export class ClientMapper {
  static toDomain(row: PrismaClientRecord): ClientData {
    return {
      id: row.id,
      organizationId: row.organizationId,
      name: row.name,
      document: row.document,
      type: row.type,
      email: row.email,
      phone: row.phone,
      birthDate: row.birthDate,
      profession: row.profession,
      maritalStatus: row.maritalStatus,
      address: isAddressObject(row.address) ? row.address : null,
      tags: row.tags,
      consentLgpd: row.consentLgpd,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
