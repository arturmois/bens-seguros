import {
  AutoCompleteChecklistItems,
  CaptureLead,
  composeClients,
  CreateClaim,
  CreateContact,
  CreateProposal,
  ListActivePoliciesForClient,
  ListProposalsForClient,
  PrismaChecklistRepository,
  PrismaClaimRepository,
  PrismaClientRepository,
  PrismaContactRepository,
  PrismaDocumentRepository,
  PrismaPolicyRepository,
  PrismaProposalRepository,
  RegisterClaimFromChat,
  StaticChecklistConfig,
  UpdateClientFiscal,
  type ClientRepository,
  type ClientsApi,
  type NotificationDispatcher,
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
  registerClaimFromChat: RegisterClaimFromChat
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
  const claimRepo = new PrismaClaimRepository(prisma)
  const autoComplete = new AutoCompleteChecklistItems(
    checklistRepo,
    proposalRepo,
    contactRepo,
    documentRepo
  )
  const notificationDispatcher: NotificationDispatcher = {
    dispatch: async () => {},
  }
  const createClaim = new CreateClaim(
    claimRepo,
    memberRepo,
    notificationDispatcher
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
    registerClaimFromChat: new RegisterClaimFromChat(
      clientRepo,
      contactRepo,
      policyRepo,
      createClaim
    ),
  }
}
