import { container } from '@repo/core';
import { prisma } from '@repo/db';
import {
  PrismaClientRepository,
  PrismaProposalRepository,
  PrismaPolicyRepository,
  CreateClient,
  ListClients,
  GetClient,
  UpdateClient,
  DeleteClient,
  CreateProposal,
  AdvanceProposalStage,
  RevertProposalStage,
  MarkProposalLost,
  ListProposals,
  GetProposal,
  IssuePolicy,
  ListPolicies,
  GetPolicy,
  CancelPolicy,
} from '@repo/core';

export function registerDependencies() {
  const clientRepo = new PrismaClientRepository(prisma);
  const proposalRepo = new PrismaProposalRepository(prisma);
  const policyRepo = new PrismaPolicyRepository(prisma);

  container.register('PrismaClient', { useValue: prisma });
  container.register('ClientRepository', { useValue: clientRepo });
  container.register('ProposalRepository', { useValue: proposalRepo });
  container.register('PolicyRepository', { useValue: policyRepo });

  container.register(CreateClient, { useFactory: () => new CreateClient(clientRepo) });
  container.register(ListClients, { useFactory: () => new ListClients(clientRepo) });
  container.register(GetClient, { useFactory: () => new GetClient(clientRepo) });
  container.register(UpdateClient, { useFactory: () => new UpdateClient(clientRepo) });
  container.register(DeleteClient, { useFactory: () => new DeleteClient(clientRepo) });

  container.register(CreateProposal, { useFactory: () => new CreateProposal(proposalRepo) });
  container.register(AdvanceProposalStage, {
    useFactory: () => new AdvanceProposalStage(proposalRepo),
  });
  container.register(RevertProposalStage, {
    useFactory: () => new RevertProposalStage(proposalRepo),
  });
  container.register(MarkProposalLost, {
    useFactory: () => new MarkProposalLost(proposalRepo),
  });
  container.register(ListProposals, { useFactory: () => new ListProposals(proposalRepo) });
  container.register(GetProposal, { useFactory: () => new GetProposal(proposalRepo) });

  container.register(IssuePolicy, {
    useFactory: () => new IssuePolicy(policyRepo, proposalRepo),
  });
  container.register(ListPolicies, { useFactory: () => new ListPolicies(policyRepo) });
  container.register(GetPolicy, { useFactory: () => new GetPolicy(policyRepo) });
  container.register(CancelPolicy, { useFactory: () => new CancelPolicy(policyRepo) });
}
