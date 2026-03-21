import { container } from '@repo/core';
import { prisma } from '@repo/db';
import { PrismaClientRepository } from '@repo/core';
import { PrismaProposalRepository } from '@repo/core';
import { PrismaPolicyRepository } from '@repo/core';

export function registerDependencies() {
  container.register('PrismaClient', { useValue: prisma });
  container.register('ClientRepository', { useClass: PrismaClientRepository });
  container.register('ProposalRepository', { useClass: PrismaProposalRepository });
  container.register('PolicyRepository', { useClass: PrismaPolicyRepository });
}
