import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AnalysisModule } from '../../src/analysis/analysis.module.js';
import { AnalysisJobsRepository } from '../../src/analysis/analysis-jobs.repository.js';
import { AnalysisProcessor } from '../../src/analysis/workers/analysis.processor.js';
import { AuthModule } from '../../src/auth/auth.module.js';
import {
  appConfig,
  databaseConfig,
  jwtConfig,
  openrouterConfig,
  redisConfig,
  validateEnv,
} from '../../src/config/index.js';
import { GamesModule } from '../../src/games/games.module.js';
import { LlmService } from '../../src/llm/llm.service.js';
import { PrismaModule } from '../../src/prisma/prisma.module.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { ANALYSIS_JOB_ENQUEUER } from '../../src/queues/queue.constants.js';
import { InMemoryPrismaService } from '../helpers/in-memory-prisma.js';

class FakeAnalysisJobEnqueuer {
  async enqueueAnalysisJob(analysisJobId: string) {
    return {
      id: analysisJobId,
      name: 'process-analysis',
      data: { analysisJobId },
    };
  }
}

@Global()
@Module({
  providers: [
    FakeAnalysisJobEnqueuer,
    {
      provide: ANALYSIS_JOB_ENQUEUER,
      useExisting: FakeAnalysisJobEnqueuer,
    },
  ],
  exports: [ANALYSIS_JOB_ENQUEUER],
})
class TestingQueueModule {}

describe('AnalysisProcessor (integration)', () => {
  beforeAll(() => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
  });

  it('moves a job through parse, extraction, classification, and completion', async () => {
    const prisma = new InMemoryPrismaService();
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          validate: validateEnv,
          load: [
            appConfig,
            databaseConfig,
            redisConfig,
            jwtConfig,
            openrouterConfig,
          ],
        }),
        PrismaModule,
        TestingQueueModule,
        AuthModule,
        GamesModule,
        AnalysisModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(LlmService)
      .useValue({
        classify: async () => ({
          model: 'fake-llm',
          promptVersion: 'test-v1',
          rawText: '',
          payload: {
            confidenceLevel: 'HIGH',
            overallDiagnosis: 'Completed analysis',
            openingName: 'Test Opening',
            result: 'WIN',
            mainWeaknessTag: 'calculation',
            secondaryWeaknessTags: ['time-management'],
            recommendedLessonTitle: 'Review tactics',
            recommendedLessonWhy: 'Missed tactical detail',
            recommendedFocusPoints: ['Count checks and captures'],
            criticalMoments: [],
            mistakes: [],
          },
        }),
      })
      .compile();

    const jobsRepository = moduleRef.get(AnalysisJobsRepository);
    const processor = moduleRef.get(AnalysisProcessor);
    const coach = await prisma.coachAccount.create({
      data: {
        email: 'coach@example.com',
        passwordHash: 'hash',
        displayName: 'Coach',
      },
    });
    const student = await prisma.student.create({
      data: {
        coachAccountId: coach.id,
        displayName: 'Student',
      },
    });
    const game = await prisma.game.create({
      data: {
        coachAccountId: coach.id,
        studentId: student.id,
        sourceType: 'MANUAL_PGN',
        sourceLabel: null,
        studentColor: 'WHITE',
        rawPgn: `[Event "Training"]\r
[Result "1-0"]

1. e4 { [%eval 0.2] }{ [%eval 0.1] } e5\t\t2. Nf3   Nc6 1-0`,
        normalizedPgnHash: 'hash',
        hasEngineAnnotations: true,
        annotationCoverage: 'FULL',
        reducedConfidenceWarning: null,
      },
    });
    const job = await jobsRepository.create({
      coachAccountId: coach.id,
      studentId: student.id,
      gameId: game.id,
      jobType: 'ANALYSIS',
      queueName: 'analysis',
    });

    await processor.processAnalysisJob(job.id);

    const updated = await jobsRepository.findById(job.id);

    expect(updated?.status).toBe('COMPLETED');
    expect(updated?.analysis).toBeTruthy();
  });

  it('marks the job failed when classification throws', async () => {
    const prisma = new InMemoryPrismaService();
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          validate: validateEnv,
          load: [
            appConfig,
            databaseConfig,
            redisConfig,
            jwtConfig,
            openrouterConfig,
          ],
        }),
        PrismaModule,
        TestingQueueModule,
        AuthModule,
        GamesModule,
        AnalysisModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(LlmService)
      .useValue({
        classify: async () => {
          throw new Error('boom');
        },
      })
      .compile();

    const jobsRepository = moduleRef.get(AnalysisJobsRepository);
    const processor = moduleRef.get(AnalysisProcessor);
    const coach = await prisma.coachAccount.create({
      data: {
        email: 'coach2@example.com',
        passwordHash: 'hash',
        displayName: 'Coach',
      },
    });
    const student = await prisma.student.create({
      data: {
        coachAccountId: coach.id,
        displayName: 'Student',
      },
    });
    const game = await prisma.game.create({
      data: {
        coachAccountId: coach.id,
        studentId: student.id,
        sourceType: 'MANUAL_PGN',
        sourceLabel: null,
        studentColor: 'WHITE',
        rawPgn: `[Event "Training"]
[Result "1-0"]

1. e4 { [%eval 0.2] } e5 1-0`,
        normalizedPgnHash: 'hash2',
        hasEngineAnnotations: true,
        annotationCoverage: 'PARTIAL',
        reducedConfidenceWarning: null,
      },
    });
    const job = await jobsRepository.create({
      coachAccountId: coach.id,
      studentId: student.id,
      gameId: game.id,
      jobType: 'ANALYSIS',
      queueName: 'analysis',
    });

    await processor.processAnalysisJob(job.id);

    const updated = await jobsRepository.findById(job.id);
    expect(updated?.status).toBe('FAILED');
    expect(updated?.failureCode).toBe('ANALYSIS_FAILED');
  });
});
