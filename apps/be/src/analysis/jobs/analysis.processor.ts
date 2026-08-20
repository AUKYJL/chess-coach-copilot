import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import {
  AnalysisJobStatus,
  AnalysisJobType,
  EngineEvidenceStatus,
  ReportAudience,
  type Prisma,
} from '../../generated/prisma/client.js';
import { HomeworkService } from '../../homework/homework.service.js';
import {
  isLlmResponseFormatError,
  isLlmResponseValidationError,
} from '../../llm/index.js';
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
import { AnalysisJobEventsService } from './analysis-job-events.service.js';
import { AnalysisJobsRepository } from './analysis-jobs.repository.js';
import { JobProcessingError } from './job-processing.error.js';

type PersistedAnalysisJob = NonNullable<
  Awaited<ReturnType<AnalysisJobsRepository['findById']>>
>;

const LLM_RAW_TEXT_PREVIEW_LIMIT = 2_000;

@Injectable()
@Processor(ANALYSIS_QUEUE_NAME)
export class AnalysisProcessor extends WorkerHost {
  constructor(
    private readonly logger: PinoLogger,
    private readonly analysisJobsRepository: AnalysisJobsRepository,
    private readonly analysisJobEventsService: AnalysisJobEventsService,
    private readonly pgnPreparationService: PgnPreparationService,
    private readonly analysisClassifierService: AnalysisClassifierService,
    private readonly analysisResultsService: AnalysisResultsService,
    private readonly generationTraceService: GenerationTraceService,
    private readonly reportsService: ReportsService,
    private readonly homeworkService: HomeworkService,
    private readonly progressService: ProgressService,
  ) {
    super();
    this.logger.setContext(AnalysisProcessor.name);
  }

  async process(job: Job<AnalysisQueueJobData>): Promise<void> {
    if (job.name !== ANALYSIS_JOB_NAME) {
      return;
    }

    await this.processPersistedJob(job.data);
  }

  async processPersistedJob(jobData: AnalysisQueueJobData): Promise<void> {
    const analysisJobId = jobData.analysisJobId;
    const payloadTraceId = jobData.traceId;

    this.logger.info(
      {
        event: 'analysis_worker_job_received',
        traceId: payloadTraceId,
        analysisJobId,
      },
      'Analysis worker received a job',
    );
    const analysisJob =
      await this.analysisJobsRepository.findById(analysisJobId);

    if (!analysisJob) {
      this.logger.warn(
        {
          event: 'analysis_job_missing',
          traceId: payloadTraceId,
          analysisJobId,
        },
        'Persisted analysis job was not found',
      );
      return;
    }

    const traceId = payloadTraceId || analysisJob.traceId;

    await this.analysisJobEventsService.recordBestEffort({
      analysisJobId,
      traceId,
      stage: 'analysis_worker_job_received',
      level: 'info',
      message: 'Analysis worker received a job',
    });

    if (analysisJob.jobType === AnalysisJobType.ANALYSIS) {
      await this.processAnalysisJob(
        analysisJobId,
        traceId,
        analysisJob.game.rawPgn,
      );
      return;
    }

    await this.processGenerationJob(analysisJobId);
  }

  async processAnalysisJob(
    analysisJobId: string,
    traceIdOverride?: string,
    rawPgnOverride?: string,
  ): Promise<void> {
    const analysisJob =
      await this.analysisJobsRepository.findById(analysisJobId);

    if (!analysisJob) {
      return;
    }

    const traceId = traceIdOverride || analysisJob.traceId;
    const startedAt = Date.now();
    let stage = 'analysis_status_parsing_started';

    try {
      if (
        analysisJob.game.engineEvidenceStatus !== null &&
        (analysisJob.game.engineEvidenceStatus !== EngineEvidenceStatus.READY ||
          analysisJob.game.engineEvidence === null)
      ) {
        await this.analysisJobsRepository.transitionStatus(
          analysisJobId,
          [AnalysisJobStatus.PENDING],
          AnalysisJobStatus.FAILED,
          {
            progressPercent: 100,
            completedAt: new Date(),
            failureCode: 'ENGINE_EVIDENCE_NOT_READY',
            failureMessage:
              'Analysis cannot start before engine evidence is ready',
          },
        );
        this.logger.warn(
          {
            event: 'analysis_blocked_engine_evidence_not_ready',
            traceId,
            analysisJobId,
            gameId: analysisJob.gameId,
            engineEvidenceStatus: analysisJob.game.engineEvidenceStatus,
          },
          'Analysis job was blocked because engine evidence is not ready',
        );
        return;
      }

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

      this.logger.info(
        {
          event: 'analysis_status_parsing_started',
          traceId,
          analysisJobId,
          status: AnalysisJobStatus.PARSING,
        },
        'Analysis parsing started',
      );
      await this.analysisJobEventsService.recordBestEffort({
        analysisJobId,
        traceId,
        stage,
        level: 'info',
        message: 'Analysis parsing started',
        payload: {
          status: AnalysisJobStatus.PARSING,
        },
      });

      const usesPersistedEngineEvidence =
        analysisJob.game.engineEvidence !== null;
      const preparedPgn = usesPersistedEngineEvidence
        ? this.pgnPreparationService.parsePersistedForAnalysis(
            rawPgnOverride ?? analysisJob.game.rawPgn,
            analysisJob.game.studentColor,
            analysisJob.game.engineEvidence,
          )
        : this.pgnPreparationService.parseForAnalysis(
            rawPgnOverride ?? analysisJob.game.rawPgn,
            analysisJob.game.studentColor,
          );
      const { parsedPgn, extractedContext } = preparedPgn;
      stage = 'analysis_status_extracting_annotations';

      await this.analysisJobsRepository.transitionStatus(
        analysisJobId,
        [AnalysisJobStatus.PARSING],
        AnalysisJobStatus.EXTRACTING_ANNOTATIONS,
        {
          progressPercent: 45,
        },
      );
      this.logger.info(
        {
          event: 'analysis_status_extracting_annotations',
          traceId,
          analysisJobId,
          status: AnalysisJobStatus.EXTRACTING_ANNOTATIONS,
        },
        'Annotation extraction started',
      );
      await this.analysisJobEventsService.recordBestEffort({
        analysisJobId,
        traceId,
        stage,
        level: 'info',
        message: 'Annotation extraction started',
        payload: {
          status: AnalysisJobStatus.EXTRACTING_ANNOTATIONS,
        },
      });
      stage = 'analysis_status_classification_started';

      await this.analysisJobsRepository.transitionStatus(
        analysisJobId,
        [AnalysisJobStatus.EXTRACTING_ANNOTATIONS],
        AnalysisJobStatus.CLASSIFICATION,
        {
          progressPercent: 75,
        },
      );
      this.logger.info(
        {
          event: 'analysis_status_classification_started',
          traceId,
          analysisJobId,
          status: AnalysisJobStatus.CLASSIFICATION,
        },
        'Analysis classification started',
      );
      await this.analysisJobEventsService.recordBestEffort({
        analysisJobId,
        traceId,
        stage,
        level: 'info',
        message: 'Analysis classification started',
        payload: {
          status: AnalysisJobStatus.CLASSIFICATION,
        },
      });

      const classifiedResult =
        usesPersistedEngineEvidence && extractedContext.moments.length === 0
          ? this.analysisClassifierService.createNoCriticalMomentsResult(
              parsedPgn,
              extractedContext,
            )
          : await this.analysisClassifierService.classify(
              parsedPgn,
              extractedContext,
            );

      const persistedAnalysis =
        await this.analysisResultsService.persistCompletedAnalysis({
          job: {
            id: analysisJob.id,
            traceId,
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
      this.logger.info(
        {
          event: 'analysis_classification_succeeded',
          traceId,
          analysisJobId,
          confidenceLevel: classifiedResult.payload.confidenceLevel,
          mistakeCount: classifiedResult.payload.mistakes.length,
          criticalMomentCount: extractedContext.moments.length,
          elapsedMs: Date.now() - startedAt,
        },
        'Analysis classification succeeded',
      );
      await this.analysisJobEventsService.recordBestEffort({
        analysisJobId,
        traceId,
        stage: 'analysis_classification_succeeded',
        level: 'info',
        message: 'Analysis classification succeeded',
        payload: {
          analysisId: persistedAnalysis.id,
          confidenceLevel: classifiedResult.payload.confidenceLevel,
          mistakeCount: classifiedResult.payload.mistakes.length,
          criticalMomentCount: extractedContext.moments.length,
          elapsedMs: Date.now() - startedAt,
        },
      });
      this.logger.info(
        {
          event: 'analysis_completed',
          traceId,
          analysisJobId,
          status: AnalysisJobStatus.COMPLETED,
          elapsedMs: Date.now() - startedAt,
        },
        'Analysis completed',
      );
      await this.analysisJobEventsService.recordBestEffort({
        analysisJobId,
        traceId,
        stage: 'analysis_completed',
        level: 'info',
        message: 'Analysis completed',
        payload: {
          status: AnalysisJobStatus.COMPLETED,
          elapsedMs: Date.now() - startedAt,
        },
      });
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
      this.logger.error(
        {
          event: 'analysis_failed',
          traceId,
          analysisJobId,
          failureCode: 'ANALYSIS_FAILED',
          failureMessage,
          stage,
          elapsedMs: Date.now() - startedAt,
          ...this.getLlmFailureLogFields(error),
          err: error instanceof Error ? error : undefined,
        },
        'Analysis processing failed',
      );
      await this.analysisJobEventsService.recordBestEffort({
        analysisJobId,
        traceId,
        stage: 'analysis_failed',
        level: 'error',
        message: 'Analysis processing failed',
        payload: {
          failureCode: 'ANALYSIS_FAILED',
          failureMessage,
          stage,
          elapsedMs: Date.now() - startedAt,
        },
      });

      await this.generationTraceService.persistFailure({
        coachAccountId: analysisJob.coachAccountId,
        analysisJobId: analysisJob.id,
        promptVersion: this.getLlmFailurePromptVersion(error),
        model: this.getLlmFailureModel(error),
        inputPayload: {
          analysisJobId: analysisJob.id,
          traceId,
        },
        outputPayload: this.toFailureOutputPayload(error),
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

      this.logger.error(
        {
          event: 'generation_failed',
          traceId: analysisJob.traceId,
          analysisJobId,
          failureCode,
          failureMessage,
          ...this.getLlmFailureLogFields(error),
          err: error instanceof Error ? error : undefined,
        },
        'Generation processing failed',
      );

      await this.generationTraceService.persistFailure({
        coachAccountId: analysisJob.coachAccountId,
        analysisJobId: analysisJob.id,
        promptVersion:
          this.getLlmFailurePromptVersion(error) ?? 'failed-generation-v1',
        model: this.getLlmFailureModel(error) ?? 'generation-processor',
        analysisId: analysisJob.sourceAnalysisId ?? undefined,
        inputPayload: this.toGenerationTraceInput(analysisJob),
        outputPayload: this.toFailureOutputPayload(error),
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

  private toFailureOutputPayload(error: unknown): Prisma.InputJsonValue {
    if (isLlmResponseValidationError(error)) {
      return {
        rawText: error.rawText,
        parsedPayload: error.parsedPayload,
        validationIssues: error.validationIssues,
      };
    }

    if (isLlmResponseFormatError(error)) {
      return {
        rawText: error.rawText,
      };
    }

    return {};
  }

  private getLlmFailureLogFields(error: unknown) {
    if (isLlmResponseValidationError(error)) {
      return {
        llmFailureCode: error.failureCode,
        llmRawTextLength: error.rawText.length,
        llmRawTextPreview: error.rawText.slice(0, LLM_RAW_TEXT_PREVIEW_LIMIT),
        llmValidationIssues: error.validationIssues,
      };
    }

    if (isLlmResponseFormatError(error)) {
      return {
        llmFailureCode: error.failureCode,
        llmRawTextLength: error.rawText.length,
        llmRawTextPreview: error.rawText.slice(0, LLM_RAW_TEXT_PREVIEW_LIMIT),
      };
    }

    return {};
  }

  private getLlmFailurePromptVersion(error: unknown) {
    if (
      isLlmResponseFormatError(error) ||
      isLlmResponseValidationError(error)
    ) {
      return error.promptVersion;
    }

    return undefined;
  }

  private getLlmFailureModel(error: unknown) {
    if (
      isLlmResponseFormatError(error) ||
      isLlmResponseValidationError(error)
    ) {
      return error.model;
    }

    return undefined;
  }
}
