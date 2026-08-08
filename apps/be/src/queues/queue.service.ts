import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { ANALYSIS_JOB_NAME, ANALYSIS_QUEUE_NAME } from './queue.constants.js';

export interface AnalysisQueueJobData {
  analysisJobId: string;
}

export interface AnalysisJobEnqueuer {
  enqueueAnalysisJob(analysisJobId: string): Promise<Job<AnalysisQueueJobData>>;
  enqueueGenerationJob(analysisJobId: string): Promise<Job<AnalysisQueueJobData>>;
}

@Injectable()
export class QueueService implements AnalysisJobEnqueuer {
  constructor(
    @InjectQueue(ANALYSIS_QUEUE_NAME)
    private readonly analysisQueue: Queue<AnalysisQueueJobData>,
  ) {}

  enqueueAnalysisJob(
    analysisJobId: string,
  ): Promise<Job<AnalysisQueueJobData>> {
    return this.enqueueJob({ analysisJobId });
  }

  enqueueGenerationJob(
    analysisJobId: string,
  ): Promise<Job<AnalysisQueueJobData>> {
    return this.enqueueJob({ analysisJobId });
  }

  private enqueueJob(
    data: AnalysisQueueJobData,
  ): Promise<Job<AnalysisQueueJobData>> {
    return this.analysisQueue.add(ANALYSIS_JOB_NAME, data);
  }
}
