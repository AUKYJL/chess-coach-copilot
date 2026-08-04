import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { ANALYSIS_JOB_NAME, ANALYSIS_QUEUE_NAME } from './queue.constants.js';

export interface AnalysisQueueJobData {
  analysisJobId: string;
}

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(ANALYSIS_QUEUE_NAME)
    private readonly analysisQueue: Queue<AnalysisQueueJobData>,
  ) {}

  enqueueAnalysisJob(
    analysisJobId: string,
  ): Promise<Job<AnalysisQueueJobData>> {
    return this.analysisQueue.add(ANALYSIS_JOB_NAME, { analysisJobId });
  }
}
