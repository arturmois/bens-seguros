import { injectable, inject } from 'tsyringe';
import type { AssistanceRepository, AssistanceData } from '../domain/assistance-repository.js';
import { AssistanceErrors } from '../domain/assistance-errors.js';

@injectable()
export class GetAssistance {
  constructor(
    @inject('AssistanceRepository') private readonly assistanceRepo: AssistanceRepository,
  ) {}

  async execute(id: string, organizationId: string): Promise<AssistanceData> {
    const assistance = await this.assistanceRepo.findById(id, organizationId);
    if (!assistance) {
      throw AssistanceErrors.notFound(id);
    }
    return assistance;
  }
}
