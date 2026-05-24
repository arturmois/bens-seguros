import { inject, injectable } from 'tsyringe'
import {
  createAiUsageRecord,
  type CreateAiUsageRecordInput,
} from '../domain/ai-usage-record.js'
import type { AiUsageRepository } from '../domain/ai-usage-repository.js'

@injectable()
export class RecordAiUsage {
  constructor(
    @inject('AiUsageRepository')
    private readonly repository: AiUsageRepository
  ) {}

  async execute(input: CreateAiUsageRecordInput): Promise<void> {
    await this.repository.create(createAiUsageRecord(input))
  }
}
