import { injectable, inject } from 'tsyringe';
import type {
  AssistanceRepository,
  AssistanceData,
  CreateAssistanceInput,
} from '../domain/assistance-repository.js';

@injectable()
export class CreateAssistance {
  constructor(
    @inject('AssistanceRepository') private readonly assistanceRepo: AssistanceRepository,
  ) {}

  async execute(dto: CreateAssistanceInput): Promise<AssistanceData> {
    return this.assistanceRepo.create(dto);
  }
}
