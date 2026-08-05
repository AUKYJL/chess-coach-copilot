import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  AnalysisJobStatus,
  AnalysisJobType,
} from '../../generated/prisma/client.js';
import {
  ANALYSIS_JOB_ENQUEUER,
  ANALYSIS_QUEUE_NAME,
} from '../../queues/queue.constants.js';
import type { AnalysisJobEnqueuer } from '../../queues/queue.service.js';
import { AnalysisJobResponse } from '../dto/analysis-job.response.js';
import { AnalysisJobsRepository } from './analysis-jobs.repository.js';

@Injectable()
export class AnalysisJobsService {
  constructor(
    private readonly analysisJobsRepository: AnalysisJobsRepository,
    @Inject(ANALYSIS_JOB_ENQUEUER)
    private readonly analysisJobEnqueuer: AnalysisJobEnqueuer,
  ) {}

  createPendingJob(data: {
    coachAccountId: string;
    studentId: string;
    gameId: string;
  }) {
    return this.analysisJobsRepository.create({
      ...data,
      jobType: AnalysisJobType.ANALYSIS,
      queueName: ANALYSIS_QUEUE_NAME,
    });
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

    return {
      id: job.id,
      gameId: job.gameId,
      studentId: job.studentId,
      status: job.status,
      attemptCount: job.attemptCount,
      maxAttempts: job.maxAttempts,
      progressPercent: job.progressPercent ?? null,
      isDuplicate: false,
      annotationCoverage: job.game.annotationCoverage,
      reducedConfidenceWarning: job.game.reducedConfidenceWarning,
      failureCode: job.failureCode ?? null,
      failureMessage: job.failureMessage ?? null,
      completedAt: job.completedAt ?? null,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
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

    await this.analysisJobEnqueuer.enqueueAnalysisJob(updatedJob.id);

    return this.getJobResponse(updatedJob.id, coachAccountId);
  }
}
