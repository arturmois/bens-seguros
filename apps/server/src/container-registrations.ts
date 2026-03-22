import {
  AdvanceProposalStage,
  ApproveCommissionAdmin,
  ApproveCommissionCommercial,
  CancelPolicy,
  CompleteChecklistByAttachment,
  container,
  CountUnreadNotifications,
  CreateAssistance,
  CreateClaim,
  CreateClient,
  CreateCommission,
  CreateEndorsement,
  CreateInsurer,
  CreateOccurrence,
  CreateProposal,
  DeleteClaim,
  DeleteClient,
  DeleteDocument,
  ExportCommissionsCsv,
  GetAssistance,
  GetClaim,
  GetClient,
  GetCommission,
  GetDocumentUrl,
  GetEndorsement,
  GetPolicy,
  GetProposal,
  IssuePolicy,
  ListAssistances,
  ListChecklistItems,
  ListClaims,
  ListClients,
  ListCommissions,
  ListDocuments,
  ListEndorsements,
  ListInsurers,
  ListNotifications,
  ListOccurrences,
  ListPolicies,
  ListProposals,
  LocalStorageProvider,
  MarkAllNotificationsAsRead,
  MarkNotificationAsRead,
  MarkProposalLost,
  OnPolicyIssued,
  PayCommission,
  PrismaAssistanceRepository,
  PrismaChecklistRepository,
  PrismaClaimRepository,
  PrismaClientRepository,
  PrismaCommissionRepository,
  PrismaDocumentRepository,
  PrismaEndorsementRepository,
  PrismaInsurerRepository,
  PrismaNotificationRepository,
  PrismaOccurrenceRepository,
  PrismaPolicyRepository,
  PrismaProposalRepository,
  R2StorageProvider,
  RejectCommission,
  ReverseCommission,
  StaticChecklistConfig,
  UpdateAssistanceStatus,
  UpdateClaimStatus,
  UpdateClient,
  UpdateProposalDetails,
  UploadDocument,
} from '@repo/core'
import { prisma } from '@repo/db'
import { env } from '@repo/env'

export function registerDependencies() {
  const clientRepo = new PrismaClientRepository(prisma)
  const proposalRepo = new PrismaProposalRepository(prisma)
  const checklistRepo = new PrismaChecklistRepository(prisma)
  const checklistConfig = new StaticChecklistConfig()
  const policyRepo = new PrismaPolicyRepository(prisma)
  const claimRepo = new PrismaClaimRepository(prisma)
  const occurrenceRepo = new PrismaOccurrenceRepository(prisma)
  const endorsementRepo = new PrismaEndorsementRepository(prisma)
  const assistanceRepo = new PrismaAssistanceRepository(prisma)
  const documentRepo = new PrismaDocumentRepository(prisma)
  const insurerRepo = new PrismaInsurerRepository(prisma)
  const commissionRepo = new PrismaCommissionRepository(prisma)

  const storageProvider =
    env.STORAGE_PROVIDER === 'r2'
      ? new R2StorageProvider()
      : new LocalStorageProvider()

  container.register('PrismaClient', { useValue: prisma })
  container.register('ClientRepository', { useValue: clientRepo })
  container.register('ProposalRepository', { useValue: proposalRepo })
  container.register('ChecklistRepository', { useValue: checklistRepo })
  container.register('ChecklistConfigProvider', { useValue: checklistConfig })
  container.register('PolicyRepository', { useValue: policyRepo })
  container.register('ClaimRepository', { useValue: claimRepo })
  container.register('OccurrenceRepository', { useValue: occurrenceRepo })
  container.register('EndorsementRepository', { useValue: endorsementRepo })
  container.register('AssistanceRepository', { useValue: assistanceRepo })
  container.register('DocumentRepository', { useValue: documentRepo })
  container.register('InsurerRepository', { useValue: insurerRepo })
  container.register('CommissionRepository', { useValue: commissionRepo })
  container.register('StorageProvider', { useValue: storageProvider })

  // Client use cases
  container.register(CreateClient, {
    useFactory: () => new CreateClient(clientRepo),
  })
  container.register(ListClients, {
    useFactory: () => new ListClients(clientRepo),
  })
  container.register(GetClient, { useFactory: () => new GetClient(clientRepo) })
  container.register(UpdateClient, {
    useFactory: () => new UpdateClient(clientRepo),
  })
  container.register(DeleteClient, {
    useFactory: () => new DeleteClient(clientRepo),
  })

  // Proposal use cases
  container.register(CreateProposal, {
    useFactory: () =>
      new CreateProposal(proposalRepo, checklistRepo, checklistConfig),
  })
  container.register(AdvanceProposalStage, {
    useFactory: () =>
      new AdvanceProposalStage(proposalRepo, checklistRepo, checklistConfig),
  })
  container.register(MarkProposalLost, {
    useFactory: () => new MarkProposalLost(proposalRepo),
  })
  container.register(ListProposals, {
    useFactory: () => new ListProposals(proposalRepo),
  })
  container.register(GetProposal, {
    useFactory: () => new GetProposal(proposalRepo),
  })
  container.register(UpdateProposalDetails, {
    useFactory: () => new UpdateProposalDetails(proposalRepo),
  })
  container.register(ListChecklistItems, {
    useFactory: () => new ListChecklistItems(checklistRepo, proposalRepo),
  })
  container.register(CompleteChecklistByAttachment, {
    useFactory: () =>
      new CompleteChecklistByAttachment(checklistRepo, proposalRepo),
  })

  // Policy use cases
  container.register(OnPolicyIssued, {
    useFactory: () => new OnPolicyIssued(commissionRepo),
  })
  container.register(IssuePolicy, {
    useFactory: () =>
      new IssuePolicy(
        policyRepo,
        proposalRepo,
        container.resolve(OnPolicyIssued)
      ),
  })
  container.register(ListPolicies, {
    useFactory: () => new ListPolicies(policyRepo),
  })
  container.register(GetPolicy, { useFactory: () => new GetPolicy(policyRepo) })
  container.register(CancelPolicy, {
    useFactory: () => new CancelPolicy(policyRepo),
  })

  // Claim use cases
  container.register(CreateClaim, {
    useFactory: () => new CreateClaim(claimRepo),
  })
  container.register(ListClaims, {
    useFactory: () => new ListClaims(claimRepo),
  })
  container.register(GetClaim, { useFactory: () => new GetClaim(claimRepo) })
  container.register(UpdateClaimStatus, {
    useFactory: () => new UpdateClaimStatus(claimRepo),
  })
  container.register(DeleteClaim, {
    useFactory: () => new DeleteClaim(claimRepo),
  })

  // Occurrence use cases
  container.register(CreateOccurrence, {
    useFactory: () => new CreateOccurrence(occurrenceRepo),
  })
  container.register(ListOccurrences, {
    useFactory: () => new ListOccurrences(occurrenceRepo),
  })

  // Endorsement use cases
  container.register(CreateEndorsement, {
    useFactory: () => new CreateEndorsement(endorsementRepo),
  })
  container.register(ListEndorsements, {
    useFactory: () => new ListEndorsements(endorsementRepo),
  })
  container.register(GetEndorsement, {
    useFactory: () => new GetEndorsement(endorsementRepo),
  })

  // Assistance use cases
  container.register(CreateAssistance, {
    useFactory: () => new CreateAssistance(assistanceRepo),
  })
  container.register(ListAssistances, {
    useFactory: () => new ListAssistances(assistanceRepo),
  })
  container.register(GetAssistance, {
    useFactory: () => new GetAssistance(assistanceRepo),
  })
  container.register(UpdateAssistanceStatus, {
    useFactory: () => new UpdateAssistanceStatus(assistanceRepo),
  })

  // Document use cases
  container.register(UploadDocument, {
    useFactory: () => new UploadDocument(storageProvider, documentRepo),
  })
  container.register(ListDocuments, {
    useFactory: () => new ListDocuments(documentRepo),
  })
  container.register(GetDocumentUrl, {
    useFactory: () => new GetDocumentUrl(documentRepo, storageProvider),
  })
  container.register(DeleteDocument, {
    useFactory: () => new DeleteDocument(documentRepo, storageProvider),
  })

  // Insurer use cases
  container.register(CreateInsurer, {
    useFactory: () => new CreateInsurer(insurerRepo),
  })
  container.register(ListInsurers, {
    useFactory: () => new ListInsurers(insurerRepo),
  })

  // Commission use cases
  container.register(CreateCommission, {
    useFactory: () => new CreateCommission(commissionRepo),
  })
  container.register(ApproveCommissionCommercial, {
    useFactory: () => new ApproveCommissionCommercial(commissionRepo),
  })
  container.register(ApproveCommissionAdmin, {
    useFactory: () => new ApproveCommissionAdmin(commissionRepo),
  })
  container.register(RejectCommission, {
    useFactory: () => new RejectCommission(commissionRepo),
  })
  container.register(PayCommission, {
    useFactory: () => new PayCommission(commissionRepo),
  })
  container.register(ReverseCommission, {
    useFactory: () => new ReverseCommission(commissionRepo),
  })
  container.register(ListCommissions, {
    useFactory: () => new ListCommissions(commissionRepo),
  })
  container.register(GetCommission, {
    useFactory: () => new GetCommission(commissionRepo),
  })
  container.register(ExportCommissionsCsv, {
    useFactory: () => new ExportCommissionsCsv(commissionRepo),
  })

  // Notification use cases
  const notificationRepo = new PrismaNotificationRepository(prisma)
  container.register('NotificationRepository', { useValue: notificationRepo })
  container.register(ListNotifications, {
    useFactory: () => new ListNotifications(notificationRepo),
  })
  container.register(MarkNotificationAsRead, {
    useFactory: () => new MarkNotificationAsRead(notificationRepo),
  })
  container.register(MarkAllNotificationsAsRead, {
    useFactory: () => new MarkAllNotificationsAsRead(notificationRepo),
  })
  container.register(CountUnreadNotifications, {
    useFactory: () => new CountUnreadNotifications(notificationRepo),
  })
}
