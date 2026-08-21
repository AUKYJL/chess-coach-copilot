import { jest } from '@jest/globals';
import { QueueWorkerLoggingService } from '../../src/queues/queue-worker-logging.service.js';

describe('QueueWorkerLoggingService', () => {
  it('logs worker and job failures with queue and job context', () => {
    const logger = { setContext: jest.fn(), error: jest.fn() };
    const service = new QueueWorkerLoggingService(logger as never);
    const error = new Error('Redis disconnected');

    service.logWorkerError('analysis', error);
    service.logJobFailed(
      'analysis',
      {
        id: 'bull-job-id',
        name: 'process-analysis',
        attemptsMade: 1,
        data: { analysisJobId: 'analysis-job-id', traceId: 'trace-id' },
      } as never,
      error,
      'active',
    );

    expect(logger.error).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        event: 'bullmq_worker_error',
        queueName: 'analysis',
        err: error,
      }),
      'BullMQ worker error',
    );
    expect(logger.error).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        event: 'bullmq_job_failed',
        analysisJobId: 'analysis-job-id',
        traceId: 'trace-id',
        attempt: 1,
        err: error,
      }),
      'BullMQ job failed',
    );
  });
});
