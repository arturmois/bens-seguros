import {
  AcceptInvitation,
  AdvanceProposalStage,
  ApproveCommissionAdmin,
  ApproveCommissionCommercial,
  CancelPolicy,
  CompleteChecklistByAttachment,
  container,
  CountAlertsByEntityType,
  CountUnreadNotifications,
  CreateAssistance,
  CreateClaim,
  CreateCommission,
  CreateContact,
  CreateEndorsement,
  CreateInsurer,
  CreateOccurrence,
  CreateProposal,
  DeactivateMember,
  DeleteClaim,
  DeleteClient,
  DeleteDocument,
  ExportClientsCsv,
  ExportCommissionsCsv,
  ExportPoliciesCsv,
  ExportProposalsCsv,
  GetAssistance,
  GetClaim,
  GetClient,
  GetCommission,
  GetContact,
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
  ListContacts,
  ListDocuments,
  ListEndorsements,
  ListInsurers,
  ListNotifications,
  ListOccurrences,
  ListPolicies,
  ListProposals,
  LocalStorageProvider,
  LookupCep,
  MarkAllNotificationsAsRead,
  MarkNotificationAsRead,
  MarkProposalLost,
  OnPolicyIssued,
  ParseClientImport,
  ParsePolicyImport,
  PayCommission,
  PrismaAssistanceRepository,
  PrismaChecklistRepository,
  PrismaClaimRepository,
  PrismaClientRepository,
  PrismaCommissionRepository,
  PrismaContactRepository,
  PrismaDocumentRepository,
  PrismaEndorsementRepository,
  PrismaInsurerRepository,
  PrismaInvitationRepository,
  PrismaMemberRepository,
  PrismaNotificationRepository,
  PrismaOccurrenceRepository,
  PrismaPolicyRepository,
  PrismaProposalRepository,
  PromoteContact,
  R2StorageProvider,
  NoopCacheService,
  RedisCacheService,
  RejectCommission,
  ReopenProposal,
  ReverseCommission,
  SoftDeleteContact,
  StaticChecklistConfig,
  UpdateAssistanceStatus,
  UpdateClaimStatus,
  UpdateClient,
  UpdateContact,
  UpdateInsurer,
  UpdateMemberRole,
  UpdateProposalDetails,
  UploadDocument,
  ViaCepProvider,
} from '@repo/core'
import { prismaAdmin } from '@repo/db'
import { env } from '@repo/env'
import type { Redis } from 'ioredis'

export function registerDependencies(redis: Redis | null = null) {
  if (redis) {
    const cacheService = new RedisCacheService(redis)
    container.register('CacheService', { useValue: cacheService })
  }

  // CepCacheService is always registered so LookupCep can resolve it even
  // when Redis is unavailable (tests, degraded boot). NoopCacheService makes
  // every lookup a cache miss, which is safe — ViaCEP is called every time.
  const cepCache = redis ? new RedisCacheService(redis) : new NoopCacheService()
  container.register('CepCacheService', { useValue: cepCache })

  container.register('CepLookupProvider', { useClass: ViaCepProvider })
  container.register(LookupCep, {
    useFactory: (c) =>
      new LookupCep(
        c.resolve('CepLookupProvider'),
        c.resolve('CepCacheService')
      ),
  })

  const clientRepo = new PrismaClientRepository(prismaAdmin)
  const contactRepo = new PrismaContactRepository(prismaAdmin)
  const proposalRepo = new PrismaProposalRepository(prismaAdmin)
  const checklistRepo = new PrismaChecklistRepository(prismaAdmin)
  const checklistConfig = new StaticChecklistConfig()
  const policyRepo = new PrismaPolicyRepository(prismaAdmin)
  const claimRepo = new PrismaClaimRepository(prismaAdmin, redis)
  const occurrenceRepo = new PrismaOccurrenceRepository(prismaAdmin)
  const endorsementRepo = new PrismaEndorsementRepository(prismaAdmin)
  const assistanceRepo = new PrismaAssistanceRepository(prismaAdmin)
  const documentRepo = new PrismaDocumentRepository(prismaAdmin)
  const insurerRepo = new PrismaInsurerRepository(prismaAdmin)
  const commissionRepo = new PrismaCommissionRepository(prismaAdmin)

  const storageProvider =
    env.STORAGE_PROVIDER === 'r2'
      ? new R2StorageProvider()
      : new LocalStorageProvider()

  container.register('PrismaClient', { useValue: prismaAdmin })
  container.register('ClientRepository', { useValue: clientRepo })
  container.register('ContactRepository', { useValue: contactRepo })
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
  container.register(ExportClientsCsv, {
    useFactory: () => new ExportClientsCsv(clientRepo),
  })
  container.register(ParseClientImport, {
    useFactory: () => new ParseClientImport(clientRepo),
  })

  // Contact use cases
  container.register(CreateContact, {
    useFactory: () => new CreateContact(contactRepo),
  })
  container.register(PromoteContact, {
    useFactory: () => new PromoteContact(contactRepo, clientRepo),
  })
  container.register(GetContact, {
    useFactory: () => new GetContact(contactRepo),
  })
  container.register(ListContacts, {
    useFactory: () => new ListContacts(contactRepo),
  })
  container.register(UpdateContact, {
    useFactory: () => new UpdateContact(contactRepo),
  })
  container.register(SoftDeleteContact, {
    useFactory: () => new SoftDeleteContact(contactRepo),
  })

  // Proposal use cases
  container.register(CreateProposal, {
    useFactory: () =>
      new CreateProposal(
        proposalRepo,
        checklistRepo,
        checklistConfig,
        policyRepo,
        contactRepo
      ),
  })
  container.register(AdvanceProposalStage, {
    useFactory: () =>
      new AdvanceProposalStage(
        proposalRepo,
        checklistRepo,
        checklistConfig,
        contactRepo
      ),
  })
  container.register(MarkProposalLost, {
    useFactory: () => new MarkProposalLost(proposalRepo),
  })
  container.register(ReopenProposal, {
    useFactory: () => new ReopenProposal(proposalRepo),
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
  container.register(ExportProposalsCsv, {
    useFactory: () => new ExportProposalsCsv(proposalRepo),
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
        contactRepo,
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
  container.register(ExportPoliciesCsv, {
    useFactory: () => new ExportPoliciesCsv(policyRepo),
  })
  container.register(ParsePolicyImport, {
    useFactory: () => new ParsePolicyImport(policyRepo),
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
    useFactory: () => new CreateOccurrence(occurrenceRepo, claimRepo),
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
  container.register(UpdateInsurer, {
    useFactory: () => new UpdateInsurer(insurerRepo),
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

  // Member use cases
  const memberRepo = new PrismaMemberRepository(prismaAdmin)
  container.register('MemberRepository', { useValue: memberRepo })
  container.register(UpdateMemberRole, {
    useFactory: () => new UpdateMemberRole(memberRepo),
  })
  container.register(DeactivateMember, {
    useFactory: () => new DeactivateMember(memberRepo),
  })

  // Invitation use cases
  const invitationRepo = new PrismaInvitationRepository(prismaAdmin)
  container.register('InvitationRepository', { useValue: invitationRepo })
  container.register(AcceptInvitation, {
    useFactory: () => new AcceptInvitation(invitationRepo),
  })

  // Notification use cases
  const notificationRepo = new PrismaNotificationRepository(prismaAdmin)
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
  container.register(CountAlertsByEntityType, {
    useFactory: () => new CountAlertsByEntityType(notificationRepo),
  })
}
