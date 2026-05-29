import {
  AcceptInvitation,
  AdvanceProposalStage,
  ApproveCommissionAdmin,
  ApproveCommissionCommercial,
  AutoCompleteChecklistItems,
  BuildDashboardSnapshot,
  CancelInvitation,
  CancelPolicy,
  CompleteChecklistByAttachment,
  UncompleteChecklistItem,
  container,
  CountAlertsByEntityType,
  CountUnreadNotifications,
  CreateAssistance,
  CreateClaim,
  CreateClient,
  CreateCommission,
  CreateContact,
  CreateEndorsement,
  CreateInsurer,
  CreateInvitation,
  CreateOccurrence,
  CreateOrgWithTrial,
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
  GetEntitlementsForOrg,
  GetGoalsProgressByYear,
  GetOrganization,
  EnsurePolicyPdf,
  GetPolicy,
  GetProposal,
  GlobalSearch,
  type InvitationEmailNotifier,
  IssuePolicy,
  ListAiUsageRecords,
  ListAssistances,
  ListAuditLogs,
  ListChecklistItems,
  ListClaims,
  ListClients,
  ListCommissions,
  ListContacts,
  ListDocuments,
  ListEndorsements,
  ListInsurers,
  ListMembers,
  ListNotifications,
  ListOccurrences,
  ListPendingInvitations,
  ListPolicies,
  ListProposals,
  ListUserTenants,
  LocalStorageProvider,
  LookupCep,
  LookupProviderConsultarPlaca,
  LookupVehicleByPlate,
  MarkAllNotificationsAsRead,
  MarkNotificationAsRead,
  MarkProposalLost,
  NoopCacheService,
  NoopInvitationEmailNotifier,
  OnPolicyIssued,
  ParseClientImport,
  ParsePolicyImport,
  PayCommission,
  PrismaAssistanceRepository,
  PrismaAuditLogRepository,
  PrismaChecklistRepository,
  PrismaClaimRepository,
  PrismaClientRepository,
  PrismaCommissionRepository,
  PrismaContactRepository,
  PrismaDashboardRepository,
  PrismaDocumentRepository,
  PrismaEndorsementRepository,
  PrismaAiUsageRepository,
  PrismaGoalRepository,
  PrismaInsurerRepository,
  PrismaInvitationRepository,
  PrismaMemberRepository,
  PrismaNotificationRepository,
  PrismaOccurrenceRepository,
  PrismaOrganizationRepository,
  PrismaPolicyRepository,
  PrismaProposalRepository,
  PrismaSearchRepository,
  PrismaSubscriptionRepository,
  ProcessBillingWebhookEvent,
  PromoteContact,
  R2StorageProvider,
  RedisCacheService,
  RejectCommission,
  ReopenProposal,
  ResendInvitationEmailNotifier,
  ReverseCommission,
  SoftDeleteContact,
  StaticChecklistConfig,
  UpdateAssistanceStatus,
  UpdateClaimStatus,
  UpdateClient,
  UpdateContact,
  UpdateInsurer,
  UpdateMemberRole,
  UpdateOrganization,
  UpdateProposalDetails,
  UpsertGoalsByYear,
  UploadDocument,
  UploadOrganizationLogo,
  ViaCepProvider,
} from '@repo/core'
import { prismaAdmin } from '@repo/db'
import { env } from '@repo/env'
import type { Redis } from 'ioredis'
import { BullmqNotificationDispatcher } from './services/bullmq-notification-dispatcher.js'
import { ReactPolicyPdfRenderer } from './services/react-policy-pdf-renderer.js'

export function registerDependencies(redis: Redis | null = null) {
  const cacheService = redis
    ? new RedisCacheService(redis)
    : new NoopCacheService()
  container.register('CacheService', { useValue: cacheService })
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
  const vehicleLookupCache = redis
    ? new RedisCacheService(redis)
    : new NoopCacheService()
  container.register('VehicleLookupCacheService', {
    useValue: vehicleLookupCache,
  })
  container.register('VehicleLookupProvider', {
    useClass: LookupProviderConsultarPlaca,
  })
  container.register(LookupVehicleByPlate, {
    useFactory: (c) =>
      new LookupVehicleByPlate(
        c.resolve('VehicleLookupProvider'),
        c.resolve('VehicleLookupCacheService')
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
  const auditLogRepo = new PrismaAuditLogRepository(prismaAdmin)
  const searchRepo = new PrismaSearchRepository(prismaAdmin)
  const organizationRepo = new PrismaOrganizationRepository(prismaAdmin)
  const dashboardRepo = new PrismaDashboardRepository(prismaAdmin)
  const insurerRepo = new PrismaInsurerRepository(prismaAdmin)
  const commissionRepo = new PrismaCommissionRepository(prismaAdmin)
  const goalRepo = new PrismaGoalRepository(prismaAdmin)
  const aiUsageRepo = new PrismaAiUsageRepository(prismaAdmin)
  const subscriptionRepo = new PrismaSubscriptionRepository(prismaAdmin)
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
  container.register('AuditLogRepository', { useValue: auditLogRepo })
  container.register('SearchRepository', { useValue: searchRepo })
  container.register('OrganizationRepository', { useValue: organizationRepo })
  container.register('DashboardRepository', { useValue: dashboardRepo })
  container.register('InsurerRepository', { useValue: insurerRepo })
  container.register('CommissionRepository', { useValue: commissionRepo })
  container.register('GoalRepository', { useValue: goalRepo })
  container.register('AiUsageRepository', { useValue: aiUsageRepo })
  container.register('SubscriptionRepository', { useValue: subscriptionRepo })
  container.register(GetEntitlementsForOrg, {
    useFactory: () => new GetEntitlementsForOrg(subscriptionRepo),
  })
  container.register(ProcessBillingWebhookEvent, {
    useFactory: () => new ProcessBillingWebhookEvent(subscriptionRepo),
  })
  container.register(CreateOrgWithTrial, {
    useFactory: () => new CreateOrgWithTrial(subscriptionRepo),
  })
  container.register('StorageProvider', { useValue: storageProvider })
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
  container.register(ExportClientsCsv, {
    useFactory: () => new ExportClientsCsv(clientRepo),
  })
  container.register(ParseClientImport, {
    useFactory: () => new ParseClientImport(clientRepo),
  })
  container.register(CreateContact, {
    useFactory: () => new CreateContact(contactRepo),
  })
  container.register(PromoteContact, {
    useFactory: (c) =>
      new PromoteContact(
        contactRepo,
        clientRepo,
        c.resolve(AutoCompleteChecklistItems)
      ),
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
  container.register(CreateProposal, {
    useFactory: (c) =>
      new CreateProposal(
        proposalRepo,
        checklistRepo,
        checklistConfig,
        policyRepo,
        contactRepo,
        c.resolve(AutoCompleteChecklistItems)
      ),
  })
  container.register(AdvanceProposalStage, {
    useFactory: (c) =>
      new AdvanceProposalStage(
        proposalRepo,
        checklistRepo,
        checklistConfig,
        contactRepo,
        c.resolve(AutoCompleteChecklistItems)
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
  container.register(UncompleteChecklistItem, {
    useFactory: () => new UncompleteChecklistItem(checklistRepo, proposalRepo),
  })
  container.register(AutoCompleteChecklistItems, {
    useFactory: () =>
      new AutoCompleteChecklistItems(
        checklistRepo,
        proposalRepo,
        contactRepo,
        documentRepo
      ),
  })
  container.register(OnPolicyIssued, {
    useFactory: () => new OnPolicyIssued(commissionRepo),
  })
  container.register(IssuePolicy, {
    useFactory: () =>
      new IssuePolicy(
        policyRepo,
        proposalRepo,
        contactRepo,
        clientRepo,
        container.resolve(OnPolicyIssued)
      ),
  })
  container.register(ListPolicies, {
    useFactory: () => new ListPolicies(policyRepo),
  })
  container.register(GetPolicy, { useFactory: () => new GetPolicy(policyRepo) })
  container.register(EnsurePolicyPdf, {
    useFactory: (c) =>
      new EnsurePolicyPdf(
        policyRepo,
        organizationRepo,
        documentRepo,
        storageProvider,
        c.resolve('PolicyPdfRenderer')
      ),
  })
  container.register(CancelPolicy, {
    useFactory: () => new CancelPolicy(policyRepo),
  })
  container.register(ExportPoliciesCsv, {
    useFactory: () => new ExportPoliciesCsv(policyRepo),
  })
  container.register(ParsePolicyImport, {
    useFactory: () => new ParsePolicyImport(policyRepo),
  })
  container.register(CreateClaim, {
    useFactory: (c) =>
      new CreateClaim(
        claimRepo,
        c.resolve('MemberRepository'),
        c.resolve('NotificationDispatcher')
      ),
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
  container.register(CreateOccurrence, {
    useFactory: () => new CreateOccurrence(occurrenceRepo, claimRepo),
  })
  container.register(ListOccurrences, {
    useFactory: () => new ListOccurrences(occurrenceRepo),
  })
  container.register(CreateEndorsement, {
    useFactory: () => new CreateEndorsement(endorsementRepo),
  })
  container.register(ListEndorsements, {
    useFactory: () => new ListEndorsements(endorsementRepo),
  })
  container.register(GetEndorsement, {
    useFactory: () => new GetEndorsement(endorsementRepo),
  })
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
  container.register(UploadDocument, {
    useFactory: (c) =>
      new UploadDocument(
        storageProvider,
        documentRepo,
        c.resolve(AutoCompleteChecklistItems)
      ),
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
  container.register(ListAuditLogs, {
    useFactory: () => new ListAuditLogs(auditLogRepo),
  })
  container.register(ListAiUsageRecords, {
    useFactory: () => new ListAiUsageRecords(aiUsageRepo),
  })
  container.register(GlobalSearch, {
    useFactory: () => new GlobalSearch(searchRepo),
  })
  container.register(GetOrganization, {
    useFactory: () =>
      new GetOrganization(organizationRepo, cacheService, storageProvider),
  })
  container.register(UpdateOrganization, {
    useFactory: () =>
      new UpdateOrganization(organizationRepo, cacheService, storageProvider),
  })
  container.register(UploadOrganizationLogo, {
    useFactory: () =>
      new UploadOrganizationLogo(
        organizationRepo,
        cacheService,
        storageProvider
      ),
  })
  container.register(BuildDashboardSnapshot, {
    useFactory: () => new BuildDashboardSnapshot(dashboardRepo, cacheService),
  })
  container.register(UpsertGoalsByYear, {
    useFactory: () => new UpsertGoalsByYear(goalRepo),
  })
  container.register(GetGoalsProgressByYear, {
    useFactory: () => new GetGoalsProgressByYear(goalRepo, dashboardRepo),
  })
  container.register(CreateInsurer, {
    useFactory: () => new CreateInsurer(insurerRepo, cacheService),
  })
  container.register(ListInsurers, {
    useFactory: () => new ListInsurers(insurerRepo, cacheService),
  })
  container.register(UpdateInsurer, {
    useFactory: () => new UpdateInsurer(insurerRepo, cacheService),
  })
  container.register(CreateCommission, {
    useFactory: () => new CreateCommission(commissionRepo),
  })
  container.register(ApproveCommissionCommercial, {
    useFactory: () => new ApproveCommissionCommercial(commissionRepo),
  })
  container.register(ApproveCommissionAdmin, {
    useFactory: (c) =>
      new ApproveCommissionAdmin(
        commissionRepo,
        c.resolve('MemberRepository'),
        c.resolve('NotificationDispatcher')
      ),
  })
  container.register(RejectCommission, {
    useFactory: (c) =>
      new RejectCommission(
        commissionRepo,
        c.resolve('MemberRepository'),
        c.resolve('NotificationDispatcher')
      ),
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
  const memberRepo = new PrismaMemberRepository(prismaAdmin)
  container.register('MemberRepository', { useValue: memberRepo })
  container.register('NotificationDispatcher', {
    useValue: new BullmqNotificationDispatcher(),
  })
  container.register('PolicyPdfRenderer', {
    useValue: new ReactPolicyPdfRenderer(),
  })
  container.register(UpdateMemberRole, {
    useFactory: () => new UpdateMemberRole(memberRepo, cacheService),
  })
  container.register(DeactivateMember, {
    useFactory: () => new DeactivateMember(memberRepo, cacheService),
  })
  container.register(ListUserTenants, {
    useFactory: () => new ListUserTenants(memberRepo),
  })
  container.register(ListMembers, {
    useFactory: () => new ListMembers(memberRepo, cacheService),
  })
  const invitationRepo = new PrismaInvitationRepository(prismaAdmin)
  container.register('InvitationRepository', { useValue: invitationRepo })
  container.register(AcceptInvitation, {
    useFactory: () => new AcceptInvitation(invitationRepo, cacheService),
  })
  container.register(CancelInvitation, {
    useFactory: () => new CancelInvitation(invitationRepo),
  })
  container.register(ListPendingInvitations, {
    useFactory: () => new ListPendingInvitations(invitationRepo),
  })
  const invitationEmailNotifier: InvitationEmailNotifier = env.RESEND_API_KEY
    ? new ResendInvitationEmailNotifier({
        apiKey: env.RESEND_API_KEY,
        fromAddress: env.RESEND_FROM_ADDRESS,
        frontendUrl: env.FRONTEND_URL,
      })
    : new NoopInvitationEmailNotifier()
  container.register('InvitationEmailNotifier', {
    useValue: invitationEmailNotifier,
  })
  container.register(CreateInvitation, {
    useFactory: () =>
      new CreateInvitation(
        invitationRepo,
        memberRepo,
        organizationRepo,
        invitationEmailNotifier,
        cacheService
      ),
  })
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
