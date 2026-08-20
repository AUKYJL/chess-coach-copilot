import {
  AnalysisJobStatus,
  AnalysisJobType,
  EngineEvidenceStatus,
} from '../../src/generated/prisma/client.js';
import { EngineAnalysisService } from '../../src/analysis/engine/engine-analysis.service.js';

describe('EngineAnalysisService', () => {
  it('creates one queued execution and returns it for duplicate enqueue', async () => {
    const database = new FakeDatabase();
    const enqueuer = new FakeEnqueuer();
    const service = createService(database, enqueuer);

    const first = await service.queueEngineAnalysis('game-id', 'trace-id');
    const duplicate = await service.queueEngineAnalysis('game-id', 'trace-id');

    expect(first?.jobType).toBe(AnalysisJobType.ENGINE_ANALYSIS);
    expect(duplicate?.id).toBe(first?.id);
    expect(database.gameRecord.engineEvidenceStatus).toBe(
      EngineEvidenceStatus.QUEUED,
    );
    expect(enqueuer.calls).toEqual([
      { analysisJobId: first?.id, gameId: 'game-id', traceId: 'trace-id' },
    ]);
  });

  it('does not enqueue a game whose evidence is ready', async () => {
    const database = new FakeDatabase(EngineEvidenceStatus.READY);
    const enqueuer = new FakeEnqueuer();

    await expect(
      createService(database, enqueuer).queueEngineAnalysis(
        'game-id',
        'trace-id',
      ),
    ).resolves.toBeNull();
    expect(enqueuer.calls).toHaveLength(0);
  });
});

class FakeDatabase {
  readonly gameRecord = {
    id: 'game-id',
    coachAccountId: 'coach-id',
    studentId: 'student-id',
    engineEvidenceStatus: null as EngineEvidenceStatus | null,
  };
  readonly job = {
    id: 'engine-job-id',
    gameId: 'game-id',
    jobType: AnalysisJobType.ENGINE_ANALYSIS,
    status: AnalysisJobStatus.PENDING,
  };

  constructor(status: EngineEvidenceStatus | null = null) {
    this.gameRecord.engineEvidenceStatus = status;
  }

  game = {
    findUnique: () => Promise.resolve(this.gameRecord),
    updateMany: () => {
      this.gameRecord.engineEvidenceStatus = EngineEvidenceStatus.QUEUED;
      return Promise.resolve({ count: 1 });
    },
    update: () => Promise.resolve(this.gameRecord),
  };

  analysisJob = {
    create: () => Promise.resolve(this.job),
    findFirst: () => Promise.resolve(this.job),
    update: () => Promise.resolve(this.job),
  };

  $transaction<T>(callback: (tx: this) => Promise<T>): Promise<T> {
    return callback(this);
  }
}

class FakeEnqueuer {
  readonly calls: Array<{
    analysisJobId: string;
    gameId: string;
    traceId: string;
  }> = [];

  enqueueEngineAnalysisJob(
    analysisJobId: string,
    gameId: string,
    traceId: string,
  ) {
    this.calls.push({ analysisJobId, gameId, traceId });
    return Promise.resolve({
      id: `engine-analysis-${gameId}-${analysisJobId}`,
    });
  }
}

function createService(database: FakeDatabase, enqueuer: FakeEnqueuer) {
  return new EngineAnalysisService(
    { setContext: () => undefined, error: () => undefined } as never,
    {
      $transaction: database.$transaction.bind(database),
    } as never,
    enqueuer as never,
  );
}
