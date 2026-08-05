import { Injectable } from '@nestjs/common';
import { AnalysisResultsRepository } from '../analysis-results.repository.js';

@Injectable()
export class GenerationTraceService {
  constructor(
    private readonly analysisResultsRepository: AnalysisResultsRepository,
  ) {}

  persistFailure(data: {
    coachAccountId: string;
    analysisJobId: string;
    inputPayload: Record<string, unknown>;
    outputPayload: Record<string, unknown>;
    failureCode: string;
    failureMessage: string;
  }) {
    return this.analysisResultsRepository.createTrace({
      coachAccountId: data.coachAccountId,
      analysisJobId: data.analysisJobId,
      promptVersion: 'failed-analysis-v1',
      model: 'analysis-processor',
      inputPayload: data.inputPayload,
      outputPayload: data.outputPayload,
      failureCode: data.failureCode,
      failureMessage: data.failureMessage,
    });
  }
}
