import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { readFileSync } from 'fs';
import { Test } from '@nestjs/testing';
import { AnalysisModule } from '../../src/analysis/analysis.module.js';
import { AnalysisProcessingModule } from '../../src/analysis/jobs/analysis-processing.module.js';
import { AnalysisJobsRepository } from '../../src/analysis/jobs/analysis-jobs.repository.js';
import { AnalysisProcessor } from '../../src/analysis/jobs/analysis.processor.js';
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
import {
  AnalysisJobStatus,
  AnalysisJobType,
  ReportAudience,
  WeaknessTag,
} from '../../src/generated/prisma/client.js';

class FakeAnalysisJobEnqueuer {
  enqueueAnalysisJob(analysisJobId: string) {
    return Promise.resolve({
      id: analysisJobId,
      name: 'process-analysis',
      data: { analysisJobId },
    });
  }

  enqueueGenerationJob(analysisJobId: string) {
    return Promise.resolve({
      id: analysisJobId,
      name: 'process-analysis',
      data: { analysisJobId },
    });
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
        AnalysisProcessingModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(LlmService)
      .useValue({
        classify: () =>
          Promise.resolve({
            model: 'fake-llm',
            promptVersion: 'test-v1',
            rawText: '',
            payload: {
              confidenceLevel: 'HIGH',
              overallDiagnosis: 'Completed analysis',
              openingName: 'Test Opening',
              result: 'WIN',
              mainWeaknessTag: WeaknessTag.CALCULATION_DEPTH,
              secondaryWeaknessTags: [WeaknessTag.TIME_MANAGEMENT],
              recommendedLessonTitle: 'Review tactics',
              recommendedLessonWhy: 'Missed tactical detail',
              recommendedFocusPoints: ['Count checks and captures'],
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
    const rawAnnotatedPgn = readFileSync(
      new URL(
        '../fixtures/pgn/annotated-lichess-with-eval.pgn',
        import.meta.url,
      ),
      'utf8',
    );
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
        AnalysisProcessingModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(LlmService)
      .useValue({
        classify: () => Promise.reject(new Error('boom')),
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
        rawPgn: rawAnnotatedPgn,
        normalizedPgnHash: 'hash2',
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
    expect(updated?.status).toBe('FAILED');
    expect(updated?.failureCode).toBe('ANALYSIS_FAILED');
  });

  it('marks the job failed and skips persistence when classification payload is invalid', async () => {
    const rawAnnotatedPgn = readFileSync(
      new URL(
        '../fixtures/pgn/annotated-lichess-with-eval.pgn',
        import.meta.url,
      ),
      'utf8',
    );
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
        AnalysisProcessingModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(LlmService)
      .useValue({
        classify: () =>
          Promise.resolve({
            model: 'fake-llm',
            promptVersion: 'test-v1',
            rawText: '',
            payload: {
              confidenceLevel: 'HIGH',
              overallDiagnosis: 'Invalid analysis payload',
              result: 'WIN',
              secondaryWeaknessTags: [WeaknessTag.TIME_MANAGEMENT],
              recommendedFocusPoints: ['Count checks and captures'],
              mistakes: [
                {
                  criticalMomentPly: 12,
                  severity: 'MISTAKE',
                  category: 'calculation',
                  explanation: 'Invalid source evidence shape.',
                  sourceEvidence: [],
                },
              ],
            },
          }),
      })
      .compile();

    const jobsRepository = moduleRef.get(AnalysisJobsRepository);
    const processor = moduleRef.get(AnalysisProcessor);
    const coach = await prisma.coachAccount.create({
      data: {
        email: 'coach3@example.com',
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
        rawPgn: rawAnnotatedPgn,
        normalizedPgnHash: 'hash3',
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
    expect(updated?.status).toBe('FAILED');
    expect(updated?.failureCode).toBe('ANALYSIS_FAILED');
    expect(updated?.analysis).toBeNull();
  });

  it('fails a report generation job with ANALYSIS_SCOPE_MISMATCH when the persisted analysis scope does not match', async () => {
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
        AnalysisProcessingModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(LlmService)
      .useValue({
        classify: () => Promise.resolve(null),
        generate: () => Promise.resolve(null),
      })
      .compile();

    const jobsRepository = moduleRef.get(AnalysisJobsRepository);
    const processor = moduleRef.get(AnalysisProcessor);
    const coach = await prisma.coachAccount.create({
      data: {
        email: 'coach4@example.com',
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
    const sourceGame = await prisma.game.create({
      data: {
        coachAccountId: coach.id,
        studentId: student.id,
        sourceType: 'MANUAL_PGN',
        sourceLabel: null,
        studentColor: 'WHITE',
        rawPgn: '[Event "Source"]\n[Result "1-0"]\n\n1. e4 e5 1-0',
        normalizedPgnHash: 'source-hash',
        hasEngineAnnotations: true,
        annotationCoverage: 'FULL',
        reducedConfidenceWarning: null,
      },
    });
    const sourceJob = await jobsRepository.create({
      coachAccountId: coach.id,
      studentId: student.id,
      gameId: sourceGame.id,
      jobType: AnalysisJobType.ANALYSIS,
      queueName: 'analysis',
    });
    const sourceAnalysis = await prisma.gameAnalysis.create({
      data: {
        coachAccountId: coach.id,
        studentId: student.id,
        gameId: sourceGame.id,
        analysisJobId: sourceJob.id,
        confidenceLevel: 'HIGH',
        overallDiagnosis: 'Source analysis',
        openingName: 'Italian Game',
        result: 'WIN',
        mainWeaknessTag: WeaknessTag.CALCULATION_DEPTH,
        secondaryWeaknessTags: [WeaknessTag.TIME_MANAGEMENT],
        recommendedLessonTitle: 'Review tactics',
        recommendedLessonWhy: 'Missed tactical detail',
        recommendedFocusPoints: ['Count checks and captures'],
        rawExtractedContext: { source: 'fixture' },
        rawAnalysisJson: { source: 'fixture' },
      },
    });
    const mismatchedGame = await prisma.game.create({
      data: {
        coachAccountId: coach.id,
        studentId: student.id,
        sourceType: 'MANUAL_PGN',
        sourceLabel: null,
        studentColor: 'WHITE',
        rawPgn: '[Event "Mismatch"]\n[Result "1-0"]\n\n1. d4 d5 1-0',
        normalizedPgnHash: 'mismatch-hash',
        hasEngineAnnotations: true,
        annotationCoverage: 'FULL',
        reducedConfidenceWarning: null,
      },
    });
    const generationJob = await jobsRepository.create({
      coachAccountId: coach.id,
      studentId: student.id,
      gameId: mismatchedGame.id,
      jobType: AnalysisJobType.REPORT_GENERATION,
      queueName: 'analysis',
      sourceAnalysisId: sourceAnalysis.id,
      reportAudience: ReportAudience.COACH,
    });

    await processor.processPersistedJob({ analysisJobId: generationJob.id });

    const updated = await jobsRepository.findById(generationJob.id);
    expect(updated?.status).toBe(AnalysisJobStatus.FAILED);
    expect(updated?.failureCode).toBe('ANALYSIS_SCOPE_MISMATCH');
  });
});
