import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import { AnalysisJobStatus } from '../../generated/prisma/client.js';
import {
  ANALYSIS_JOB_NAME,
  ANALYSIS_QUEUE_NAME,
} from '../../queues/queue.constants.js';
import type { AnalysisQueueJobData } from '../../queues/queue.service.js';
import { AnalysisClassifierService } from '../classification/analysis-classifier.service.js';
import { GenerationTraceService } from '../classification/generation-trace.service.js';
import { PgnPreparationService } from '../preparation/pgn-preparation.service.js';
import { AnalysisResultsService } from '../results/analysis-results.service.js';
import { AnalysisJobsRepository } from './analysis-jobs.repository.js';

@Injectable()
@Processor(ANALYSIS_QUEUE_NAME)
export class AnalysisProcessor extends WorkerHost {
  constructor(
    private readonly analysisJobsRepository: AnalysisJobsRepository,
    private readonly pgnPreparationService: PgnPreparationService,
    private readonly analysisClassifierService: AnalysisClassifierService,
    private readonly analysisResultsService: AnalysisResultsService,
    private readonly generationTraceService: GenerationTraceService,
  ) {
    super();
  }

  async process(job: Job<AnalysisQueueJobData>): Promise<void> {
    if (job.name !== ANALYSIS_JOB_NAME) {
      return;
    }

    await this.processAnalysisJob(job.data.analysisJobId);
  }

  async processAnalysisJob(analysisJobId: string): Promise<void> {
    const analysisJob =
      await this.analysisJobsRepository.findById(analysisJobId);

    if (!analysisJob) {
      return;
    }

    try {
      const parsingTransition =
        await this.analysisJobsRepository.transitionStatus(
          analysisJobId,
          [AnalysisJobStatus.PENDING],
          AnalysisJobStatus.PARSING,
          {
            progressPercent: 10,
            startedAt: analysisJob.startedAt ?? new Date(),
          },
        );

      if (parsingTransition.count === 0) {
        return;
      }

      const { parsedPgn, extractedContext } =
        this.pgnPreparationService.parseForAnalysis(
          analysisJob.game.rawPgn,
          analysisJob.game.studentColor,
        );

      await this.analysisJobsRepository.transitionStatus(
        analysisJobId,
        [AnalysisJobStatus.PARSING],
        AnalysisJobStatus.EXTRACTING_ANNOTATIONS,
        {
          progressPercent: 45,
        },
      );

      await this.analysisJobsRepository.transitionStatus(
        analysisJobId,
        [AnalysisJobStatus.EXTRACTING_ANNOTATIONS],
        AnalysisJobStatus.CLASSIFICATION,
        {
          progressPercent: 75,
        },
      );

      const classifiedResult = await this.analysisClassifierService.classify(
        parsedPgn,
        extractedContext,
      );

      await this.analysisResultsService.persistCompletedAnalysis({
        job: {
          id: analysisJob.id,
          coachAccountId: analysisJob.coachAccountId,
          studentId: analysisJob.studentId,
          gameId: analysisJob.gameId,
        },
        extractedContext,
        classifiedResult,
      });

      await this.analysisJobsRepository.transitionStatus(
        analysisJobId,
        [AnalysisJobStatus.CLASSIFICATION],
        AnalysisJobStatus.COMPLETED,
        {
          progressPercent: 100,
          completedAt: new Date(),
          failureCode: null,
          failureMessage: null,
        },
      );
    } catch (error) {
      const failureMessage =
        error instanceof Error ? error.message : 'Unknown analysis failure';

      await this.analysisJobsRepository.transitionStatus(
        analysisJobId,
        [
          AnalysisJobStatus.PENDING,
          AnalysisJobStatus.PARSING,
          AnalysisJobStatus.EXTRACTING_ANNOTATIONS,
          AnalysisJobStatus.CLASSIFICATION,
        ],
        AnalysisJobStatus.FAILED,
        {
          progressPercent: 100,
          completedAt: new Date(),
          failureCode: 'ANALYSIS_FAILED',
          failureMessage,
        },
      );

      await this.generationTraceService.persistFailure({
        coachAccountId: analysisJob.coachAccountId,
        analysisJobId: analysisJob.id,
        inputPayload: {
          rawPgn: analysisJob.game.rawPgn,
        },
        outputPayload: {},
        failureCode: 'ANALYSIS_FAILED',
        failureMessage,
      });
    }
  }
}
