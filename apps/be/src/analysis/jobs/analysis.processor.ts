import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import {
  AnalysisJobStatus,
  AnalysisJobType,
  ReportAudience,
} from '../../generated/prisma/client.js';
import { HomeworkService } from '../../homework/homework.service.js';
import { ProgressService } from '../../progress/progress.service.js';
import {
  ANALYSIS_JOB_NAME,
  ANALYSIS_QUEUE_NAME,
} from '../../queues/queue.constants.js';
import type { AnalysisQueueJobData } from '../../queues/queue.service.js';
import { ReportsService } from '../../reports/reports.service.js';
import { AnalysisClassifierService } from '../classification/analysis-classifier.service.js';
import { GenerationTraceService } from '../classification/generation-trace.service.js';
import { PgnPreparationService } from '../preparation/pgn-preparation.service.js';
import { AnalysisResultsService } from '../results/analysis-results.service.js';
import { AnalysisJobsRepository } from './analysis-jobs.repository.js';
import { JobProcessingError } from './job-processing.error.js';

type PersistedAnalysisJob = NonNullable<
  Awaited<ReturnType<AnalysisJobsRepository['findById']>>
>;

@Injectable()
@Processor(ANALYSIS_QUEUE_NAME)
export class AnalysisProcessor extends WorkerHost {
  constructor(
    private readonly analysisJobsRepository: AnalysisJobsRepository,
    private readonly pgnPreparationService: PgnPreparationService,
    private readonly analysisClassifierService: AnalysisClassifierService,
    private readonly analysisResultsService: AnalysisResultsService,
    private readonly generationTraceService: GenerationTraceService,
    private readonly reportsService: ReportsService,
    private readonly homeworkService: HomeworkService,
    private readonly progressService: ProgressService,
  ) {
    super();
  }

  async process(job: Job<AnalysisQueueJobData>): Promise<void> {
    if (job.name !== ANALYSIS_JOB_NAME) {
      return;
    }

    await this.processPersistedJob(job.data);
  }

  async processPersistedJob(jobData: AnalysisQueueJobData): Promise<void> {
    const analysisJobId = jobData.analysisJobId;
    const analysisJob =
      await this.analysisJobsRepository.findById(analysisJobId);

    if (!analysisJob) {
      return;
    }

    if (analysisJob.jobType === AnalysisJobType.ANALYSIS) {
      await this.processAnalysisJob(analysisJobId, analysisJob.game.rawPgn);
      return;
    }

    await this.processGenerationJob(analysisJobId);
  }

  async processAnalysisJob(
    analysisJobId: string,
    rawPgnOverride?: string,
  ): Promise<void> {
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
          rawPgnOverride ?? analysisJob.game.rawPgn,
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

  private async processGenerationJob(analysisJobId: string) {
    const analysisJob =
      await this.analysisJobsRepository.findById(analysisJobId);

    if (!analysisJob) {
      return;
    }

    try {
      const transition = await this.analysisJobsRepository.transitionStatus(
        analysisJobId,
        [AnalysisJobStatus.PENDING],
        AnalysisJobStatus.GENERATING_OUTPUT,
        {
          progressPercent: 50,
          startedAt: analysisJob.startedAt ?? new Date(),
        },
      );

      if (transition.count === 0) {
        return;
      }

      switch (analysisJob.jobType) {
        case AnalysisJobType.REPORT_GENERATION: {
          const sourceAnalysis =
            await this.getValidatedSourceAnalysis(analysisJob);
          const audience = this.getValidatedReportAudience(analysisJob);

          await this.reportsService.generateAndSave({
            analysisJobId,
            analysisId: sourceAnalysis.id,
            audience,
            coachAccountId: analysisJob.coachAccountId,
            studentId: analysisJob.studentId,
          });
          break;
        }
        case AnalysisJobType.HOMEWORK_GENERATION: {
          const sourceAnalysis =
            await this.getValidatedSourceAnalysis(analysisJob);

          await this.homeworkService.generateAndSave({
            analysisJobId,
            analysisId: sourceAnalysis.id,
            coachAccountId: analysisJob.coachAccountId,
            studentId: analysisJob.studentId,
          });
          break;
        }
        case AnalysisJobType.PROGRESS_GENERATION: {
          await this.progressService.generateAndSave({
            analysisJobId,
            studentId: analysisJob.studentId,
            coachAccountId: analysisJob.coachAccountId,
          });
          break;
        }
        default:
          return;
      }

      await this.analysisJobsRepository.transitionStatus(
        analysisJobId,
        [AnalysisJobStatus.GENERATING_OUTPUT],
        AnalysisJobStatus.COMPLETED,
        {
          progressPercent: 100,
          completedAt: new Date(),
          failureCode: null,
          failureMessage: null,
        },
      );
    } catch (error) {
      const failureCode =
        error instanceof JobProcessingError
          ? error.failureCode
          : 'GENERATION_FAILED';
      const failureMessage =
        error instanceof Error ? error.message : 'Unknown generation failure';

      await this.analysisJobsRepository.transitionStatus(
        analysisJobId,
        [AnalysisJobStatus.PENDING, AnalysisJobStatus.GENERATING_OUTPUT],
        AnalysisJobStatus.FAILED,
        {
          progressPercent: 100,
          completedAt: new Date(),
          failureCode,
          failureMessage,
        },
      );

      await this.generationTraceService.persistFailure({
        coachAccountId: analysisJob.coachAccountId,
        analysisJobId: analysisJob.id,
        promptVersion: 'failed-generation-v1',
        model: 'generation-processor',
        analysisId: analysisJob.sourceAnalysisId ?? undefined,
        inputPayload: this.toGenerationTraceInput(analysisJob),
        outputPayload: {},
        failureCode,
        failureMessage,
      });
    }
  }

  private async getValidatedSourceAnalysis(job: PersistedAnalysisJob) {
    if (!job.sourceAnalysisId) {
      throw new JobProcessingError(
        'JOB_CONFIGURATION_INVALID',
        'Generation job is missing sourceAnalysisId',
      );
    }

    const sourceAnalysis =
      await this.analysisJobsRepository.findSourceAnalysisById(
        job.sourceAnalysisId,
      );

    if (!sourceAnalysis) {
      throw new JobProcessingError(
        'JOB_CONFIGURATION_INVALID',
        'Generation job source analysis was not found',
      );
    }

    if (
      sourceAnalysis.coachAccountId !== job.coachAccountId ||
      sourceAnalysis.studentId !== job.studentId ||
      sourceAnalysis.gameId !== job.gameId
    ) {
      throw new JobProcessingError(
        'ANALYSIS_SCOPE_MISMATCH',
        'Generation job source analysis does not match the persisted job scope',
      );
    }

    return sourceAnalysis;
  }

  private getValidatedReportAudience(job: PersistedAnalysisJob) {
    if (!job.reportAudience) {
      throw new JobProcessingError(
        'JOB_CONFIGURATION_INVALID',
        'Report generation job is missing reportAudience',
      );
    }

    if (!Object.values(ReportAudience).includes(job.reportAudience)) {
      throw new JobProcessingError(
        'JOB_CONFIGURATION_INVALID',
        'Report generation job has invalid reportAudience',
      );
    }

    return job.reportAudience;
  }

  private toGenerationTraceInput(job: PersistedAnalysisJob) {
    return {
      analysisJobId: job.id,
      jobType: job.jobType,
      studentId: job.studentId,
      gameId: job.gameId,
      sourceAnalysisId: job.sourceAnalysisId,
      reportAudience: job.reportAudience,
    };
  }
}
