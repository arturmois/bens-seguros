import { maskDocument } from '@repo/shared'
import type {
  ClientData,
  ClientSocialMedia,
} from '../domain/client-repository.js'

/** Mirrors Role from @repo/auth/roles — duplicated to avoid cross-package dependency */
type Role = 'OWNER' | 'ADMIN' | 'MANAGER' | 'COMMERCIAL' | 'VIEWER'

interface PresenterContext {
  role: Role
  userId: string
}

interface ClientListItem {
  id: string
  name: string
  type: ClientData['type']
  tags: string[]
  document: string
  email?: string | null
  phone?: string | null
  createdAt: Date
  socialMedia?: ClientSocialMedia | null
}

interface ClientDetail {
  id: string
  name: string
  type: ClientData['type']
  tags: string[]
  document: string
  consentLgpd: boolean
  createdAt: Date
  updatedAt: Date
  email?: string | null
  phone?: string | null
  birthDate?: Date | null
  profession?: string | null
  maritalStatus?: ClientData['maritalStatus']
  address?: ClientData['address']
  socialMedia?: ClientSocialMedia | null
}

function canSeeFullPii(client: ClientData, ctx: PresenterContext): boolean {
  if (ctx.role === 'OWNER' || ctx.role === 'ADMIN' || ctx.role === 'MANAGER') {
    return true
  }
  if (ctx.role === 'COMMERCIAL' && client.salespersonId === ctx.userId) {
    return true
  }
  return false
}

export const ClientPresenter = {
  toList(client: ClientData): ClientListItem {
    return {
      id: client.id,
      name: client.name,
      type: client.type,
      tags: client.tags,
      document: maskDocument(client.document),
      email: client.email,
      phone: client.phone,
      createdAt: client.createdAt,
      socialMedia: client.socialMedia,
    }
  },

  toDetail(client: ClientData, ctx: PresenterContext): ClientDetail {
    const full = canSeeFullPii(client, ctx)

    const base: ClientDetail = {
      id: client.id,
      name: client.name,
      type: client.type,
      tags: client.tags,
      document: full ? client.document : maskDocument(client.document),
      consentLgpd: client.consentLgpd,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    }

    if (full) {
      base.email = client.email
      base.phone = client.phone
      base.birthDate = client.birthDate
      base.profession = client.profession
      base.maritalStatus = client.maritalStatus
      base.address = client.address
      base.socialMedia = client.socialMedia
    }

    return base
  },
}

export type { ClientListItem, ClientDetail, PresenterContext }
