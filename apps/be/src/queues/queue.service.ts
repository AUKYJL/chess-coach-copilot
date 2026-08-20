import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import {
  ANALYSIS_JOB_NAME,
  ANALYSIS_QUEUE_NAME,
  ENGINE_ANALYSIS_JOB_NAME,
  ENGINE_ANALYSIS_QUEUE_NAME,
} from './queue.constants.js';

export interface AnalysisQueueJobData {
  analysisJobId: string;
  traceId: string;
}

export interface AnalysisJobEnqueuer {
  enqueueAnalysisJob(
    analysisJobId: string,
    traceId: string,
  ): Promise<Job<AnalysisQueueJobData>>;
  enqueueGenerationJob(
    analysisJobId: string,
    traceId: string,
  ): Promise<Job<AnalysisQueueJobData>>;
}

export interface EngineAnalysisQueueJobData {
  analysisJobId: string;
  traceId: string;
}

export interface EngineAnalysisJobEnqueuer {
  enqueueEngineAnalysisJob(
    analysisJobId: string,
    gameId: string,
    traceId: string,
  ): Promise<Job<EngineAnalysisQueueJobData>>;
}

@Injectable()
export class QueueService
  implements AnalysisJobEnqueuer, EngineAnalysisJobEnqueuer
{
  constructor(
    private readonly logger: PinoLogger,
    @InjectQueue(ANALYSIS_QUEUE_NAME)
    private readonly analysisQueue: Queue<AnalysisQueueJobData>,
    @InjectQueue(ENGINE_ANALYSIS_QUEUE_NAME)
    private readonly engineAnalysisQueue: Queue<EngineAnalysisQueueJobData>,
  ) {
    this.logger.setContext(QueueService.name);
  }

  enqueueAnalysisJob(
    analysisJobId: string,
    traceId: string,
  ): Promise<Job<AnalysisQueueJobData>> {
    return this.enqueueJob({ analysisJobId, traceId });
  }

  enqueueGenerationJob(
    analysisJobId: string,
    traceId: string,
  ): Promise<Job<AnalysisQueueJobData>> {
    return this.enqueueJob({ analysisJobId, traceId });
  }

  enqueueEngineAnalysisJob(
    analysisJobId: string,
    gameId: string,
    traceId: string,
  ): Promise<Job<EngineAnalysisQueueJobData>> {
    const data = { analysisJobId, traceId };
    const jobId = `engine-analysis-${gameId}-${analysisJobId}`;

    return this.engineAnalysisQueue
      .add(ENGINE_ANALYSIS_JOB_NAME, data, { jobId })
      .then((job) => {
        this.logger.info(
          {
            event: 'engine_analysis_job_enqueued',
            traceId,
            analysisJobId,
            gameId,
            bullJobId: String(job.id),
            queueName: ENGINE_ANALYSIS_QUEUE_NAME,
          },
          'Engine analysis BullMQ job enqueued',
        );

        return job;
      });
  }

  private enqueueJob(
    data: AnalysisQueueJobData,
  ): Promise<Job<AnalysisQueueJobData>> {
    return this.analysisQueue.add(ANALYSIS_JOB_NAME, data).then((job) => {
      this.logger.info(
        {
          event: 'queue_job_enqueued',
          traceId: data.traceId,
          analysisJobId: data.analysisJobId,
          bullJobId: String(job.id),
          queueName: ANALYSIS_QUEUE_NAME,
          jobName: ANALYSIS_JOB_NAME,
        },
        'BullMQ job enqueued',
      );

      return job;
    });
  }
}
