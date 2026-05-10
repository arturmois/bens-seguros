import { InsuranceBranch, type PrismaClient } from '@repo/db'
import { hashDocument, stripNonDigits } from '@repo/shared'
import { inject, injectable } from 'tsyringe'
import type { SearchRepository } from '../domain/search-repository.js'
import type { GlobalSearchResult } from '../domain/search-result.js'

const DOCUMENT_MIN_DIGITS = 11

function isInsuranceBranch(value: string): value is InsuranceBranch {
  return Object.values<string>(InsuranceBranch).includes(value)
}

function toInsuranceBranch(value: string): InsuranceBranch | null {
  const upper = value.toUpperCase()
  return isInsuranceBranch(upper) ? upper : null
}

@injectable()
export class PrismaSearchRepository implements SearchRepository {
  constructor(@inject('PrismaClient') private readonly prisma: PrismaClient) {}

  async globalSearch(
    organizationId: string,
    query: string,
    perEntityLimit: number
  ): Promise<GlobalSearchResult> {
    const documentDigits = stripNonDigits(query)
    const hasDocumentMatch = documentDigits.length >= DOCUMENT_MIN_DIGITS
    const numericQuery = Number.parseInt(query, 10)
    const isNumeric = !Number.isNaN(numericQuery)
    const branchMatch = toInsuranceBranch(query)
    const [clients, proposals, policies, claims] = await Promise.all([
      this.searchClients(
        organizationId,
        query,
        documentDigits,
        hasDocumentMatch,
        perEntityLimit
      ),
      this.searchProposals(organizationId, query, branchMatch, perEntityLimit),
      this.searchPolicies(organizationId, query, perEntityLimit),
      this.searchClaims(
        organizationId,
        query,
        isNumeric ? numericQuery : null,
        perEntityLimit
      ),
    ])
    return { clients, proposals, policies, claims }
  }

  private async searchClients(
    organizationId: string,
    query: string,
    documentDigits: string,
    hasDocumentMatch: boolean,
    limit: number
  ) {
    const rows = await this.prisma.client.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: [
          { legalName: { contains: query, mode: 'insensitive' } },
          {
            contacts: {
              some: {
                OR: [
                  { name: { contains: query, mode: 'insensitive' } },
                  { email: { contains: query, mode: 'insensitive' } },
                ],
                deletedAt: null,
              },
            },
          },
          ...(hasDocumentMatch
            ? [{ documentHash: hashDocument(documentDigits) }]
            : []),
        ],
      },
      select: { id: true, legalName: true, document: true },
      take: limit,
      orderBy: { legalName: 'asc' },
    })
    return rows.map((row) => ({
      id: row.id,
      name: row.legalName,
      document: row.document,
    }))
  }

  private async searchProposals(
    organizationId: string,
    query: string,
    branchMatch: InsuranceBranch | null,
    limit: number
  ) {
    const rows = await this.prisma.proposal.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: [
          {
            contact: {
              name: { contains: query, mode: 'insensitive' },
              deletedAt: null,
            },
          },
          ...(branchMatch ? [{ branch: { equals: branchMatch } }] : []),
        ],
      },
      select: {
        id: true,
        stage: true,
        branch: true,
        contact: { select: { name: true } },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((row) => ({
      id: row.id,
      stage: row.stage,
      branch: row.branch,
      clientName: row.contact.name,
    }))
  }

  private async searchPolicies(
    organizationId: string,
    query: string,
    limit: number
  ) {
    const rows = await this.prisma.policy.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: [
          { policyNumber: { contains: query, mode: 'insensitive' } },
          {
            client: {
              legalName: { contains: query, mode: 'insensitive' },
              deletedAt: null,
            },
          },
        ],
      },
      select: {
        id: true,
        policyNumber: true,
        branch: true,
        client: { select: { legalName: true } },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((row) => ({
      id: row.id,
      policyNumber: row.policyNumber,
      branch: row.branch,
      clientName: row.client.legalName,
    }))
  }

  private async searchClaims(
    organizationId: string,
    query: string,
    numericMatch: number | null,
    limit: number
  ) {
    const rows = await this.prisma.claim.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: [
          ...(numericMatch !== null ? [{ claimNumber: numericMatch }] : []),
          {
            client: {
              legalName: { contains: query, mode: 'insensitive' },
              deletedAt: null,
            },
          },
          {
            policy: {
              policyNumber: { contains: query, mode: 'insensitive' },
              deletedAt: null,
            },
          },
        ],
      },
      select: {
        id: true,
        claimNumber: true,
        status: true,
        client: { select: { legalName: true } },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((row) => ({
      id: row.id,
      claimNumber: row.claimNumber,
      status: row.status,
      clientName: row.client.legalName,
    }))
  }
}
