import {
  AutoCompleteChecklistItems,
  CaptureLead,
  composeClients,
  CreateContact,
  CreateProposal,
  ListActivePoliciesForClient,
  ListProposalsForClient,
  PrismaChecklistRepository,
  PrismaClientRepository,
  PrismaContactRepository,
  PrismaDocumentRepository,
  PrismaPolicyRepository,
  PrismaProposalRepository,
  StaticChecklistConfig,
  UpdateClientFiscal,
  type ClientRepository,
  type ClientsApi,
} from '@repo/core'
import { PrismaMemberRepository } from '@repo/core/workspace/infrastructure'
import { createTenantClient } from '@repo/db/tenant'

export interface ServerClientsGraph {
  clients: ClientsApi
}

export function composeServerClients(
  repo: ClientRepository
): ServerClientsGraph {
  return { clients: composeClients(repo) }
}

export interface HmacTenantApi {
  captureLead: CaptureLead
  listProposalsForClient: ListProposalsForClient
  listActivePoliciesForClient: ListActivePoliciesForClient
  updateClientFiscal: UpdateClientFiscal
}

export function forTenant(organizationId: string): HmacTenantApi {
  const prisma = createTenantClient(organizationId)
  const contactRepo = new PrismaContactRepository(prisma)
  const memberRepo = new PrismaMemberRepository(prisma)
  const proposalRepo = new PrismaProposalRepository(prisma)
  const checklistRepo = new PrismaChecklistRepository(prisma)
  const policyRepo = new PrismaPolicyRepository(prisma)
  const documentRepo = new PrismaDocumentRepository(prisma)
  const clientRepo = new PrismaClientRepository(prisma)
  const autoComplete = new AutoCompleteChecklistItems(
    checklistRepo,
    proposalRepo,
    contactRepo,
    documentRepo
  )
  return {
    captureLead: new CaptureLead(
      contactRepo,
      memberRepo,
      new CreateContact(contactRepo),
      new CreateProposal(
        proposalRepo,
        checklistRepo,
        new StaticChecklistConfig(),
        policyRepo,
        contactRepo,
        autoComplete
      )
    ),
    listProposalsForClient: new ListProposalsForClient(
      contactRepo,
      proposalRepo
    ),
    listActivePoliciesForClient: new ListActivePoliciesForClient(
      contactRepo,
      policyRepo
    ),
    updateClientFiscal: new UpdateClientFiscal(clientRepo),
  }
}
