import { jest } from '@jest/globals';
import {
  AnalysisJobStatus,
  AnalysisJobType,
  EngineEvidenceStatus,
} from '../../src/generated/prisma/client.js';
import { EngineAnalysisReconciliationService } from '../../src/analysis/engine/engine-analysis-reconciliation.service.js';

describe('EngineAnalysisReconciliationService', () => {
  it('requeues interrupted engine and pending downstream analysis jobs on worker startup', async () => {
    const database = new FakeDatabase();
    const engineEnqueuer = { enqueueEngineAnalysisJob: jest.fn() };
    const analysisEnqueuer = { enqueueAnalysisJob: jest.fn() };
    const service = new EngineAnalysisReconciliationService(
      { setContext: () => undefined } as never,
      database as never,
      engineEnqueuer as never,
      analysisEnqueuer as never,
      { getJob: () => Promise.resolve(undefined) } as never,
    );

    await service.onApplicationBootstrap();

    expect(engineEnqueuer.enqueueEngineAnalysisJob).toHaveBeenCalledWith(
      'engine-job',
      'engine-game',
      'engine-trace',
    );
    expect(analysisEnqueuer.enqueueAnalysisJob).toHaveBeenCalledWith(
      'analysis-job',
      'analysis-trace',
    );
    expect(database.jobUpdates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: AnalysisJobStatus.PENDING }),
      ]),
    );
    expect(database.gameUpdates).toContainEqual({
      engineEvidenceStatus: EngineEvidenceStatus.QUEUED,
    });
  });
});

class FakeDatabase {
  readonly jobUpdates: Array<Record<string, unknown>> = [];
  readonly gameUpdates: Array<Record<string, unknown>> = [];

  analysisJob = {
    findMany: jest
      .fn<() => Promise<unknown>>()
      .mockResolvedValueOnce([
        {
          id: 'engine-job',
          gameId: 'engine-game',
          traceId: 'engine-trace',
          status: AnalysisJobStatus.RUNNING,
          game: { engineEvidenceStatus: EngineEvidenceStatus.RUNNING },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'analysis-job',
          traceId: 'analysis-trace',
          status: AnalysisJobStatus.PENDING,
          jobType: AnalysisJobType.ANALYSIS,
          completedAt: null,
          analysis: null,
          game: {
            engineEvidenceStatus: EngineEvidenceStatus.READY,
            engineEvidence: { source: 'STOCKFISH' },
          },
        },
      ]),
    update: (args: { data: Record<string, unknown> }) => {
      this.jobUpdates.push(args.data);
      return Promise.resolve({});
    },
  };

  game = {
    update: (args: { data: Record<string, unknown> }) => {
      this.gameUpdates.push(args.data);
      return Promise.resolve({});
    },
  };

  $transaction<T>(callback: (tx: this) => Promise<T>): Promise<T> {
    return callback(this);
  }
}
