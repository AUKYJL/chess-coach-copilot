import {
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  AnalysisJobStatus,
  AnalysisJobType,
  ReportAudience,
} from '../../generated/prisma/client.js';
import {
  ANALYSIS_JOB_ENQUEUER,
  ANALYSIS_QUEUE_NAME,
} from '../../queues/queue.constants.js';
import type { AnalysisJobEnqueuer } from '../../queues/queue.service.js';
import { AnalysisJobResponse } from '../dto/analysis-job.response.js';
import {
  mapAnalysisJobResponse,
  type AnalysisJobResponseRow,
} from './analysis-jobs.read-model.js';
import { AnalysisJobsRepository } from './analysis-jobs.repository.js';

@Injectable()
export class AnalysisJobsService {
  constructor(
    private readonly analysisJobsRepository: AnalysisJobsRepository,
    @Inject(ANALYSIS_JOB_ENQUEUER)
    private readonly analysisJobEnqueuer: AnalysisJobEnqueuer,
  ) {}

  async createAndEnqueueAnalysisJob(data: {
    coachAccountId: string;
    studentId: string;
    gameId: string;
  }) {
    const job = await this.analysisJobsRepository.create({
      ...data,
      jobType: AnalysisJobType.ANALYSIS,
      queueName: ANALYSIS_QUEUE_NAME,
    });

    return this.enqueueCreatedJob(job.id, () =>
      this.analysisJobEnqueuer.enqueueAnalysisJob(job.id),
    );
  }

  async createAndEnqueueGenerationJob(data: {
    coachAccountId: string;
    studentId: string;
    gameId: string;
    jobType: AnalysisJobType;
    sourceAnalysisId?: string;
    reportAudience?: ReportAudience;
  }) {
    const job = await this.analysisJobsRepository.create({
      ...data,
      queueName: ANALYSIS_QUEUE_NAME,
    });

    return this.enqueueCreatedJob(job.id, () =>
      this.analysisJobEnqueuer.enqueueGenerationJob(job.id),
    );
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
        await this.analysisJobEnqueuer.enqueueAnalysisJob(updatedJob.id);
      } else {
        await this.analysisJobEnqueuer.enqueueGenerationJob(updatedJob.id);
      }
    } catch (error) {
      await this.analysisJobsRepository.markFailed(updatedJob.id, {
        failureCode: 'QUEUE_ENQUEUE_FAILED',
        failureMessage: this.toFailureMessage(error),
      });

      throw new ServiceUnavailableException(
        'Analysis job queue is temporarily unavailable',
      );
    }

    return this.getJobResponse(updatedJob.id, coachAccountId);
  }

  private async enqueueCreatedJob<T>(jobId: string, enqueue: () => Promise<T>) {
    try {
      await enqueue();
    } catch (error) {
      await this.analysisJobsRepository.markFailed(jobId, {
        failureCode: 'QUEUE_ENQUEUE_FAILED',
        failureMessage: this.toFailureMessage(error),
      });

      throw new ServiceUnavailableException(
        'Analysis job queue is temporarily unavailable',
      );
    }

    const job = await this.analysisJobsRepository.findById(jobId);

    if (!job) {
      throw new NotFoundException('Analysis job not found');
    }

    return job;
  }

  private toFailureMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Queue enqueue failed';
  }

  private toJobResponse(job: AnalysisJobResponseRow): AnalysisJobResponse {
    return mapAnalysisJobResponse(job);
  }
}
