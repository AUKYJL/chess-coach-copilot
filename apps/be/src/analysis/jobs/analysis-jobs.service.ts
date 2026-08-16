import {
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Job } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import {
  AnalysisJobStatus,
  AnalysisJobType,
  ReportAudience,
} from '../../generated/prisma/client.js';
import {
  ANALYSIS_JOB_ENQUEUER,
  ANALYSIS_QUEUE_NAME,
} from '../../queues/queue.constants.js';
import type {
  AnalysisJobEnqueuer,
  AnalysisQueueJobData,
} from '../../queues/queue.service.js';
import { AnalysisJobResponse } from '../dto/analysis-job.response.js';
import { AnalysisJobEventsService } from './analysis-job-events.service.js';
import {
  mapAnalysisJobResponse,
  type AnalysisJobResponseRow,
} from './analysis-jobs.read-model.js';
import { AnalysisJobsRepository } from './analysis-jobs.repository.js';

@Injectable()
export class AnalysisJobsService {
  constructor(
    private readonly logger: PinoLogger,
    private readonly analysisJobsRepository: AnalysisJobsRepository,
    private readonly analysisJobEventsService: AnalysisJobEventsService,
    @Inject(ANALYSIS_JOB_ENQUEUER)
    private readonly analysisJobEnqueuer: AnalysisJobEnqueuer,
  ) {
    this.logger.setContext(AnalysisJobsService.name);
  }

  async createAndEnqueueAnalysisJob(data: {
    traceId: string;
    coachAccountId: string;
    studentId: string;
    gameId: string;
  }) {
    const job = await this.analysisJobsRepository.create({
      ...data,
      jobType: AnalysisJobType.ANALYSIS,
      queueName: ANALYSIS_QUEUE_NAME,
    });
    await this.analysisJobEventsService.attachTraceToJobBestEffort(
      data.traceId,
      job.id,
    );
    this.logger.info(
      {
        event: 'analysis_job_created',
        traceId: data.traceId,
        analysisJobId: job.id,
        studentId: data.studentId,
        gameId: data.gameId,
        queueName: ANALYSIS_QUEUE_NAME,
        jobType: job.jobType,
      },
      'Analysis job created',
    );
    await this.analysisJobEventsService.recordBestEffort({
      analysisJobId: job.id,
      traceId: data.traceId,
      stage: 'analysis_job_created',
      level: 'info',
      message: 'Analysis job created',
      payload: {
        studentId: data.studentId,
        gameId: data.gameId,
        queueName: ANALYSIS_QUEUE_NAME,
        jobType: job.jobType,
      },
    });
    this.logger.info(
      {
        event: 'analysis_job_enqueue_started',
        traceId: data.traceId,
        analysisJobId: job.id,
        queueName: ANALYSIS_QUEUE_NAME,
      },
      'Analysis job enqueue started',
    );
    await this.analysisJobEventsService.recordBestEffort({
      analysisJobId: job.id,
      traceId: data.traceId,
      stage: 'analysis_job_enqueue_started',
      level: 'info',
      message: 'Analysis job enqueue started',
      payload: {
        queueName: ANALYSIS_QUEUE_NAME,
      },
    });

    const { job: persistedJob, queueJob } = await this.enqueueCreatedJob(
      job.id,
      data.traceId,
      () => this.analysisJobEnqueuer.enqueueAnalysisJob(job.id, data.traceId),
    );

    this.logger.info(
      {
        event: 'analysis_job_enqueued',
        traceId: data.traceId,
        analysisJobId: persistedJob.id,
        queueName: ANALYSIS_QUEUE_NAME,
        bullJobId: String(queueJob.id),
      },
      'Analysis job enqueued',
    );
    await this.analysisJobEventsService.recordBestEffort({
      analysisJobId: persistedJob.id,
      traceId: data.traceId,
      stage: 'analysis_job_enqueued',
      level: 'info',
      message: 'Analysis job enqueued',
      payload: {
        queueName: ANALYSIS_QUEUE_NAME,
        bullJobId: String(queueJob.id),
      },
    });

    return persistedJob;
  }

  async createAndEnqueueGenerationJob(data: {
    coachAccountId: string;
    studentId: string;
    gameId: string;
    jobType: AnalysisJobType;
    sourceAnalysisId?: string;
    reportAudience?: ReportAudience;
    traceId?: string;
  }) {
    const traceId = data.traceId ?? randomUUID();
    const job = await this.analysisJobsRepository.create({
      ...data,
      traceId,
      queueName: ANALYSIS_QUEUE_NAME,
    });

    const { job: persistedJob } = await this.enqueueCreatedJob(
      job.id,
      traceId,
      () => this.analysisJobEnqueuer.enqueueGenerationJob(job.id, traceId),
    );

    return persistedJob;
  }

  async findLatestOwnedActiveGenerationJob(args: {
    coachAccountId: string;
    gameId: string;
    reportAudience: ReportAudience;
  }) {
    return this.analysisJobsRepository.findLatestOwnedActiveGenerationJob(args);
  }

  async getJob(jobId: string, coachAccountId: string) {
    const job = await this.analysisJobsRepository.findOwnedJob(
      jobId,
      coachAccountId,
    );

    if (!job) {
      throw new NotFoundException('Analysis job not found');
    }

    return job;
  }

  async getJobResponse(
    jobId: string,
    coachAccountId: string,
  ): Promise<AnalysisJobResponse> {
    const job = await this.getJob(jobId, coachAccountId);

    return this.toJobResponse(job);
  }

  async listOwnedJobs(args: {
    coachAccountId: string;
    studentId?: string;
    gameId?: string;
    jobType?: AnalysisJobType;
    status?: AnalysisJobStatus;
    limit?: number;
    cursor?: string;
  }) {
    const limit = args.limit ?? 20;
    const jobs = await this.analysisJobsRepository.findOwnedJobs({
      ...args,
      limit,
    });
    const items = jobs.slice(0, limit).map((job) => this.toJobResponse(job));

    return {
      items,
      nextCursor:
        jobs.length > limit ? (items[items.length - 1]?.id ?? null) : null,
    };
  }

  async retry(
    jobId: string,
    coachAccountId: string,
  ): Promise<AnalysisJobResponse> {
    const job = await this.getJob(jobId, coachAccountId);

    if (job.status !== AnalysisJobStatus.FAILED) {
      throw new UnprocessableEntityException(
        'Only failed analysis jobs can be retried',
      );
    }

    const result = await this.analysisJobsRepository.retryFailedJob(
      jobId,
      job.attemptCount + 1,
    );

    if (result.count === 0) {
      throw new UnprocessableEntityException(
        'Only failed analysis jobs can be retried',
      );
    }

    const updatedJob = await this.analysisJobsRepository.findById(jobId);

    if (!updatedJob) {
      throw new NotFoundException('Analysis job not found');
    }

    try {
      if (updatedJob.jobType === AnalysisJobType.ANALYSIS) {
        await this.analysisJobEnqueuer.enqueueAnalysisJob(
          updatedJob.id,
          updatedJob.traceId,
        );
      } else {
        await this.analysisJobEnqueuer.enqueueGenerationJob(
          updatedJob.id,
          updatedJob.traceId,
        );
      }
    } catch (error) {
      await this.analysisJobsRepository.markFailed(updatedJob.id, {
        failureCode: 'QUEUE_ENQUEUE_FAILED',
        failureMessage: this.toFailureMessage(error),
      });
      this.logger.error(
        {
          event: 'analysis_job_enqueue_failed',
          traceId: updatedJob.traceId,
          analysisJobId: updatedJob.id,
          failureCode: 'QUEUE_ENQUEUE_FAILED',
          failureMessage: this.toFailureMessage(error),
          err: error instanceof Error ? error : undefined,
        },
        'Analysis job retry enqueue failed',
      );

      throw new ServiceUnavailableException(
        'Analysis job queue is temporarily unavailable',
      );
    }

    return this.getJobResponse(updatedJob.id, coachAccountId);
  }

  private async enqueueCreatedJob(
    jobId: string,
    traceId: string,
    enqueue: () => Promise<Job<AnalysisQueueJobData>>,
  ) {
    let queueJob: Job<AnalysisQueueJobData>;

    try {
      queueJob = await enqueue();
    } catch (error) {
      await this.analysisJobsRepository.markFailed(jobId, {
        failureCode: 'QUEUE_ENQUEUE_FAILED',
        failureMessage: this.toFailureMessage(error),
      });
      this.logger.error(
        {
          event: 'analysis_job_enqueue_failed',
          traceId,
          analysisJobId: jobId,
          failureCode: 'QUEUE_ENQUEUE_FAILED',
          failureMessage: this.toFailureMessage(error),
          err: error instanceof Error ? error : undefined,
        },
        'Analysis job enqueue failed',
      );
      await this.analysisJobEventsService.recordBestEffort({
        analysisJobId: jobId,
        traceId,
        stage: 'analysis_job_enqueue_failed',
        level: 'error',
        message: 'Analysis job queue is temporarily unavailable',
        payload: {
          failureCode: 'QUEUE_ENQUEUE_FAILED',
          failureMessage: this.toFailureMessage(error),
        },
      });

      throw new ServiceUnavailableException(
        'Analysis job queue is temporarily unavailable',
      );
    }

    const job = await this.analysisJobsRepository.findById(jobId);

    if (!job) {
      throw new NotFoundException('Analysis job not found');
    }

    return {
      job,
      queueJob,
    };
  }

  private toFailureMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Queue enqueue failed';
  }

  private toJobResponse(job: AnalysisJobResponseRow): AnalysisJobResponse {
    return mapAnalysisJobResponse(job);
  }
}
