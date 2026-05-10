import { maskDocument } from '@repo/shared'
import type { ClientData } from '../domain/client-repository.js'

type Role = 'OWNER' | 'ADMIN' | 'MANAGER' | 'COMMERCIAL' | 'VIEWER'

interface PresenterContext {
  role: Role
  userId: string
}

interface ClientListItem {
  id: string
  legalName: string
  personType: ClientData['personType']
  document: string
  createdAt: Date
}

interface ClientDetail {
  id: string
  legalName: string
  personType: ClientData['personType']
  document: string
  createdAt: Date
  updatedAt: Date
  profession?: string | null
  maritalStatus?: ClientData['maritalStatus']
  address?: ClientData['address']
  fiscalBirthDate?: Date | null
}

function canSeeFullPii(_client: ClientData, ctx: PresenterContext): boolean {
  return ctx.role === 'OWNER' || ctx.role === 'ADMIN' || ctx.role === 'MANAGER'
}

export const ClientPresenter = {
  toList(client: ClientData): ClientListItem {
    return {
      id: client.id,
      legalName: client.legalName,
      personType: client.personType,
      document: maskDocument(client.document),
      createdAt: client.createdAt,
    }
  },

  toDetail(client: ClientData, ctx: PresenterContext): ClientDetail {
    const full = canSeeFullPii(client, ctx)
    const base: ClientDetail = {
      id: client.id,
      legalName: client.legalName,
      personType: client.personType,
      document: full ? client.document : maskDocument(client.document),
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    }
    if (full) {
      base.profession = client.profession
      base.maritalStatus = client.maritalStatus
      base.address = client.address
      base.fiscalBirthDate = client.fiscalBirthDate
    }
    return base
  },
}

export type { ClientListItem, ClientDetail, PresenterContext }
