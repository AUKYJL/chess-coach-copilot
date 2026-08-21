import { BadRequestException } from '@nestjs/common';
import { UnrecoverableError } from 'bullmq';
import {
  AnalysisJobStatus,
  AnalysisJobType,
  EngineEvidenceStatus,
  StudentColor,
} from '../../src/generated/prisma/client.js';
import { EngineAnalysisProcessor } from '../../src/analysis/engine/engine-analysis.processor.js';
import { ENGINE_ANALYSIS_JOB_NAME } from '../../src/queues/queue.constants.js';

describe('EngineAnalysisProcessor', () => {
  it('persists Stockfish evidence before making the game ready', async () => {
    const database = new FakeDatabase();
    const processor = createProcessor(database);

    await processor.process(createBullJob(database.job) as never);

    expect(
      database.gameUpdates.map((update) => update.engineEvidenceStatus),
    ).toEqual([EngineEvidenceStatus.RUNNING, EngineEvidenceStatus.READY]);
    expect(database.jobUpdates.map((update) => update.status)).toEqual([
      AnalysisJobStatus.RUNNING,
      AnalysisJobStatus.COMPLETED,
    ]);
    expect(database.gameUpdates[1]).toMatchObject({
      engineEvidence: { source: 'STOCKFISH' },
    });
  });

  it('marks invalid persisted PGN terminal and prevents BullMQ retries', async () => {
    const database = new FakeDatabase();
    const processor = createProcessor(database, {
      parse: () => {
        throw new BadRequestException('Invalid PGN');
      },
    });

    await expect(
      processor.process(createBullJob(database.job) as never),
    ).rejects.toBeInstanceOf(UnrecoverableError);

    expect(database.jobUpdates.at(-1)).toMatchObject({
      status: AnalysisJobStatus.FAILED,
      failureCode: 'INVALID_PERSISTED_PGN',
    });
    expect(database.gameUpdates.at(-1)).toMatchObject({
      engineEvidenceStatus: EngineEvidenceStatus.FAILED,
    });
  });

  it('keeps the downstream analysis pending when its enqueue fails', async () => {
    const database = new FakeDatabase();
    const processor = createProcessor(database, undefined, {
      enqueuePersistedAnalysisJob: () =>
        Promise.reject(new Error('analysis queue offline')),
    });

    await expect(
      processor.process(createBullJob(database.job) as never),
    ).resolves.toBeUndefined();

    expect(database.createdAnalysisJob.status).toBe(AnalysisJobStatus.PENDING);
    expect(database.jobUpdates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: AnalysisJobStatus.COMPLETED }),
      ]),
    );
    expect(database.gameUpdates.at(-1)).toMatchObject({
      engineEvidenceStatus: EngineEvidenceStatus.READY,
    });
  });
});

class FakeDatabase {
  readonly gameUpdates: Array<Record<string, unknown>> = [];
  readonly jobUpdates: Array<Record<string, unknown>> = [];
  readonly createdAnalysisJob = {
    id: 'analysis-job',
    status: AnalysisJobStatus.PENDING,
  };
  readonly job = {
    id: 'engine-job',
    createdAt: new Date(),
    traceId: 'trace-id',
    coachAccountId: 'coach-id',
    studentId: 'student-id',
    gameId: 'game-id',
    jobType: AnalysisJobType.ENGINE_ANALYSIS,
    status: AnalysisJobStatus.PENDING,
    startedAt: null,
    game: {
      id: 'game-id',
      rawPgn: '[Event "Test"]\n\n1. e4 e5 1-0',
      studentColor: StudentColor.WHITE,
      engineEvidenceStatus: EngineEvidenceStatus.QUEUED,
    },
  };

  analysisJob = {
    findUnique: () => Promise.resolve(this.job),
    update: (args: { data: Record<string, unknown> }) => {
      this.jobUpdates.push(args.data);
      return Promise.resolve(this.job);
    },
    updateMany: (args: { data: Record<string, unknown> }) => {
      this.jobUpdates.push(args.data);
      return Promise.resolve({ count: 1 });
    },
    findFirst: () => Promise.resolve(null),
    create: () => Promise.resolve(this.createdAnalysisJob),
  };

  game = {
    update: (args: { data: Record<string, unknown> }) => {
      this.gameUpdates.push(args.data);
      return Promise.resolve(this.job.game);
    },
  };

  $transaction<T>(callback: (tx: this) => Promise<T>): Promise<T> {
    return callback(this);
  }
}

function createProcessor(
  database: FakeDatabase,
  parser: { parse: () => unknown } = {
    parse: () => ({ moves: [] }),
  },
  analysisJobsService: {
    enqueuePersistedAnalysisJob: () => Promise<unknown>;
  } = {
    enqueuePersistedAnalysisJob: () => Promise.resolve({}),
  },
) {
  return new EngineAnalysisProcessor(
    {
      setContext: () => undefined,
      info: () => undefined,
      error: () => undefined,
    } as never,
    database as never,
    parser as never,
    {
      analyze: () =>
        Promise.resolve({
          schemaVersion: 1,
          source: 'STOCKFISH',
          positions: [],
        }),
    } as never,
    analysisJobsService as never,
    {
      recordBestEffort: () => Promise.resolve(null),
    } as never,
    {
      logWorkerError: () => undefined,
      logJobFailed: () => undefined,
    } as never,
  );
}

function createBullJob(job: FakeDatabase['job']) {
  return {
    name: ENGINE_ANALYSIS_JOB_NAME,
    data: { analysisJobId: job.id, traceId: job.traceId },
    attemptsMade: 0,
    opts: { attempts: 3 },
  };
}
