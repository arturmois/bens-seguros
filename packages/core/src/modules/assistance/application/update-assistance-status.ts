import { injectable, inject } from 'tsyringe'
import type {
  AssistanceRepository,
  AssistanceData,
  AssistanceStatus,
} from '../domain/assistance-repository.js'
import { AssistanceErrors } from '../domain/assistance-errors.js'

const VALID_TRANSITIONS: Record<AssistanceStatus, readonly AssistanceStatus[]> =
  {
    REQUESTED: ['AWAITING_DOCUMENT', 'DISPATCHED'],
    AWAITING_DOCUMENT: ['PENDING_INSPECTION'],
    PENDING_INSPECTION: ['DISPATCHED'],
    DISPATCHED: ['IN_PROGRESS'],
    IN_PROGRESS: ['COMPLETED'],
    COMPLETED: [],
  } as const

@injectable()
export class UpdateAssistanceStatus {
  constructor(
    @inject('AssistanceRepository')
    private readonly assistanceRepo: AssistanceRepository
  ) {}

  async execute(
    id: string,
    organizationId: string,
    newStatus: AssistanceStatus
  ): Promise<AssistanceData> {
    const assistance = await this.assistanceRepo.findById(id, organizationId)
    if (!assistance) {
      throw AssistanceErrors.notFound(id)
    }
    const allowed = VALID_TRANSITIONS[assistance.status]
    if (!allowed.includes(newStatus)) {
      throw AssistanceErrors.invalidTransition(assistance.status, newStatus)
    }
    const completedAt = newStatus === 'COMPLETED' ? new Date() : undefined
    return this.assistanceRepo.updateStatus(id, organizationId, {
      status: newStatus,
      completedAt,
    })
  }
}
