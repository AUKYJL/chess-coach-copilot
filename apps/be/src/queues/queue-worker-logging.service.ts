import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';

type WorkerJobData = {
  analysisJobId: string;
  traceId: string;
};

@Injectable()
export class QueueWorkerLoggingService {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(QueueWorkerLoggingService.name);
  }

  logWorkerError(queueName: string, error: Error): void {
    this.logger.error(
      {
        event: 'bullmq_worker_error',
        queueName,
        errorName: error.name,
        err: error,
      },
      'BullMQ worker error',
    );
  }

  logJobFailed<T extends WorkerJobData>(
    queueName: string,
    job: Job<T> | undefined,
    error: Error,
    previousState: string,
  ): void {
    this.logger.error(
      {
        event: 'bullmq_job_failed',
        queueName,
        bullJobId: job?.id ?? null,
        jobName: job?.name ?? null,
        analysisJobId: job?.data.analysisJobId ?? null,
        traceId: job?.data.traceId ?? null,
        attempt: job?.attemptsMade ?? null,
        previousState,
        errorName: error.name,
        err: error,
      },
      'BullMQ job failed',
    );
  }
}
