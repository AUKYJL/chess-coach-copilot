import { ServiceUnavailableException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { AnalysisJobStatus } from '../../src/generated/prisma/client.js';
import { AnalysisJobsService } from '../../src/analysis/jobs/analysis-jobs.service.js';

describe('AnalysisJobsService', () => {
  it('keeps a persisted downstream job pending when enqueue fails', async () => {
    const job: { id: string; status: AnalysisJobStatus } = {
      id: 'analysis-job',
      status: AnalysisJobStatus.PENDING,
    };
    const analysisJobsRepository = {
      markFailed: jest.fn(() => {
        job.status = AnalysisJobStatus.FAILED;
        return Promise.resolve(job);
      }),
    };
    const analysisJobEventsService = {
      recordBestEffort: jest.fn(() => Promise.resolve()),
    };
    const analysisJobEnqueuer = {
      enqueueAnalysisJob: jest.fn(() =>
        Promise.reject(new Error('analysis queue offline')),
      ),
    };
    const service = new AnalysisJobsService(
      { setContext: () => undefined, error: () => undefined } as never,
      analysisJobsRepository as never,
      analysisJobEventsService as never,
      {} as never,
      analysisJobEnqueuer as never,
    );

    await expect(
      service.enqueuePersistedAnalysisJob(job.id, 'trace-id'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(job.status).toBe(AnalysisJobStatus.PENDING);
    expect(analysisJobsRepository.markFailed).not.toHaveBeenCalled();
    expect(analysisJobEventsService.recordBestEffort).toHaveBeenCalledWith(
      expect.objectContaining({
        analysisJobId: job.id,
        payload: expect.objectContaining({
          failureCode: 'QUEUE_ENQUEUE_FAILED',
        }),
      }),
    );
  });
});
