import { Global, Module } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { jest } from '@jest/globals';
import { readFileSync } from 'fs';
import type {
  AnalysisQueueJobData,
  EngineAnalysisQueueJobData,
} from '../../src/queues/queue.service.js';
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
  loggerConfig,
  openrouterConfig,
  redisConfig,
  stockfishConfig,
  validateEnv,
} from '../../src/config/index.js';
import { GamesModule } from '../../src/games/games.module.js';
import {
  LLM_RESPONSE_FORMAT_FAILURE_CODE,
  LlmResponseFormatError,
} from '../../src/llm/index.js';
import { LlmService } from '../../src/llm/llm.service.js';
import { PrismaModule } from '../../src/prisma/prisma.module.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import {
  ANALYSIS_JOB_ENQUEUER,
  ENGINE_ANALYSIS_JOB_ENQUEUER,
  ENGINE_ANALYSIS_QUEUE_NAME,
} from '../../src/queues/queue.constants.js';
import { InMemoryPrismaService } from '../helpers/in-memory-prisma.js';
import {
  AnalysisJobStatus,
  AnalysisJobType,
  type GenerationTrace,
  ReportAudience,
  WeaknessTag,
} from '../../src/generated/prisma/client.js';

class FakeAnalysisJobEnqueuer {
  enqueueAnalysisJob(analysisJobId: string, traceId: string) {
    return Promise.resolve({
      id: analysisJobId,
      name: 'process-analysis',
      data: { analysisJobId, traceId },
    });
  }

  enqueueGenerationJob(analysisJobId: string, traceId: string) {
    return Promise.resolve({
      id: analysisJobId,
      name: 'process-analysis',
      data: { analysisJobId, traceId },
    });
  }

  enqueueEngineAnalysisJob(
    analysisJobId: string,
    _gameId: string,
    traceId: string,
  ): Promise<{ id: string; name: string; data: EngineAnalysisQueueJobData }> {
    return Promise.resolve({
      id: analysisJobId,
      name: 'process-engine-analysis',
      data: { analysisJobId, traceId },
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
    {
      provide: ENGINE_ANALYSIS_JOB_ENQUEUER,
      useExisting: FakeAnalysisJobEnqueuer,
    },
    {
      provide: getQueueToken(ENGINE_ANALYSIS_QUEUE_NAME),
      useValue: { getJob: () => Promise.resolve(undefined) },
    },
  ],
  exports: [
    ANALYSIS_JOB_ENQUEUER,
    ENGINE_ANALYSIS_JOB_ENQUEUER,
    getQueueToken(ENGINE_ANALYSIS_QUEUE_NAME),
  ],
})
class TestingQueueModule {}

describe('AnalysisProcessor (integration)', () => {
  beforeAll(() => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
    process.env.STOCKFISH_BINARY_PATH = '/test/stockfish';
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
            stockfishConfig,
            jwtConfig,
            loggerConfig,
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
            rawText: `\`\`\`json
{"overallDiagnosis":"Completed analysis","mainWeaknessTag":"CALCULATION_DEPTH","recommendedLessonTitle":"Review tactics","recommendedLessonWhy":"Missed tactical detail","recommendedFocusPoints":["Count checks and captures"],"mistakes":[]}
\`\`\``,
            payload: {
              overallDiagnosis: 'Completed analysis',
              mainWeaknessTag: WeaknessTag.CALCULATION_DEPTH,
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

    await processor.processPersistedJob({
      analysisJobId: job.id,
    } as AnalysisQueueJobData);

    const updated = await jobsRepository.findById(job.id);
    const events = await prisma.analysisJobEvent.findMany({
      where: { analysisJobId: job.id },
      orderBy: { createdAt: 'asc' },
    });

    expect(updated?.status).toBe('COMPLETED');
    expect(updated?.analysis).toBeTruthy();
    expect(events.map((event) => event?.stage)).toEqual([
      'analysis_worker_job_received',
      'analysis_status_parsing_started',
      'analysis_status_extracting_annotations',
      'analysis_status_classification_started',
      'analysis_classification_succeeded',
      'analysis_completed',
    ]);
    expect(events.every((event) => event?.traceId === job.traceId)).toBe(true);
  });

  it('completes analysis processing when timeline event persistence is unavailable', async () => {
    const prisma = new InMemoryPrismaService();
    const createSpy = jest
      .spyOn(prisma.analysisJobEvent, 'create')
      .mockRejectedValue(new Error('events offline'));
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
            loggerConfig,
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
              overallDiagnosis: 'Completed analysis',
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
        email: 'coach-events-down@example.com',
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
        normalizedPgnHash: 'hash-events-down',
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

    await processor.processPersistedJob({
      analysisJobId: job.id,
    } as AnalysisQueueJobData);

    const updated = await jobsRepository.findById(job.id);
    const events = await prisma.analysisJobEvent.findMany({
      where: { analysisJobId: job.id },
    });

    expect(createSpy).toHaveBeenCalled();
    expect(updated?.status).toBe('COMPLETED');
    expect(updated?.analysis).toBeTruthy();
    expect(events).toEqual([]);
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
            loggerConfig,
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

  it('fails analysis processing even when timeline event persistence is unavailable', async () => {
    const rawAnnotatedPgn = readFileSync(
      new URL(
        '../fixtures/pgn/annotated-lichess-with-eval.pgn',
        import.meta.url,
      ),
      'utf8',
    );
    const prisma = new InMemoryPrismaService();
    const createSpy = jest
      .spyOn(prisma.analysisJobEvent, 'create')
      .mockRejectedValue(new Error('events offline'));
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
            loggerConfig,
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
        email: 'coach-events-down-failure@example.com',
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
        normalizedPgnHash: 'hash-events-down-failure',
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

    await processor.processPersistedJob({
      analysisJobId: job.id,
    } as AnalysisQueueJobData);

    const updated = await jobsRepository.findById(job.id);
    const failedTraces = (await prisma.generationTrace.findMany({
      where: { analysisJobId: job.id },
    })) as GenerationTrace[];
    const events = await prisma.analysisJobEvent.findMany({
      where: { analysisJobId: job.id },
    });

    expect(createSpy).toHaveBeenCalled();
    expect(updated?.status).toBe('FAILED');
    expect(updated?.failureCode).toBe('ANALYSIS_FAILED');
    expect(failedTraces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          analysisJobId: job.id,
          failureCode: 'ANALYSIS_FAILED',
        }),
      ]),
    );
    expect(events).toEqual([]);
  });

  it('persists raw LLM output and logs a preview when classification JSON parsing fails', async () => {
    const rawAnnotatedPgn = readFileSync(
      new URL(
        '../fixtures/pgn/annotated-lichess-with-eval.pgn',
        import.meta.url,
      ),
      'utf8',
    );
    const rawText = `{"draft":"${'x'.repeat(2_100)}"`;
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
            loggerConfig,
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
          Promise.reject(
            new LlmResponseFormatError(
              'LLM returned invalid JSON in the response body',
              LLM_RESPONSE_FORMAT_FAILURE_CODE.INVALID_JSON,
              rawText,
            ),
          ),
      })
      .compile();

    const jobsRepository = moduleRef.get(AnalysisJobsRepository);
    const processor = moduleRef.get(AnalysisProcessor);
    const logger = (
      processor as unknown as {
        logger: { error: (...args: unknown[]) => void };
      }
    ).logger;
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {
      return undefined;
    });
    const coach = await prisma.coachAccount.create({
      data: {
        email: 'coach-raw-output@example.com',
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
        normalizedPgnHash: 'raw-output-analysis-hash',
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
    const failedTraces = (await prisma.generationTrace.findMany({
      where: { analysisJobId: job.id },
    })) as GenerationTrace[];

    expect(updated?.status).toBe('FAILED');
    expect(updated?.failureCode).toBe('ANALYSIS_FAILED');
    expect(failedTraces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          analysisJobId: job.id,
          failureCode: 'ANALYSIS_FAILED',
          outputPayload: {
            rawText,
          },
        }),
      ]),
    );
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'analysis_failed',
        traceId: job.traceId,
        analysisJobId: job.id,
        llmFailureCode: LLM_RESPONSE_FORMAT_FAILURE_CODE.INVALID_JSON,
        llmRawTextLength: rawText.length,
        llmRawTextPreview: rawText.slice(0, 2_000),
      }),
      'Analysis processing failed',
    );
  });

  it('marks the job failed and preserves raw structured payload diagnostics when the AI returns unknown momentIds', async () => {
    const rawAnnotatedPgn = readFileSync(
      new URL(
        '../fixtures/pgn/annotated-lichess-with-eval.pgn',
        import.meta.url,
      ),
      'utf8',
    );
    const invalidPayload = {
      overallDiagnosis: 'Invalid analysis payload',
      secondaryWeaknessTags: [WeaknessTag.TIME_MANAGEMENT],
      recommendedFocusPoints: ['Count checks and captures'],
      mistakes: [
        {
          momentId: 'moment-99',
          category: 'calculation',
          explanation: 'First invalid moment reference.',
        },
        {
          momentId: 'moment-100',
          category: 'time_management',
          explanation: 'Second invalid moment reference.',
        },
      ],
    };
    const rawText = JSON.stringify(invalidPayload);
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
            loggerConfig,
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
            promptVersion: 'test-v2',
            rawText,
            payload: invalidPayload,
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
    const failedTraces = (await prisma.generationTrace.findMany({
      where: { analysisJobId: job.id },
    })) as GenerationTrace[];
    const events = await prisma.analysisJobEvent.findMany({
      where: { analysisJobId: job.id },
      orderBy: { createdAt: 'asc' },
    });

    expect(updated?.status).toBe('FAILED');
    expect(updated?.failureCode).toBe('ANALYSIS_FAILED');
    expect(updated?.analysis).toBeNull();
    expect(failedTraces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          analysisJobId: job.id,
          failureCode: 'ANALYSIS_FAILED',
          promptVersion: 'test-v2',
          model: 'fake-llm',
          outputPayload: {
            rawText,
            parsedPayload: invalidPayload,
            validationIssues: {
              issues: [
                {
                  path: ['mistakes', '0', 'momentId'],
                  code: 'custom',
                  message:
                    'Unknown momentId "moment-99" referenced by interpretation payload',
                },
              ],
            },
          },
        }),
      ]),
    );
    expect(
      (
        failedTraces[0]?.outputPayload as {
          parsedPayload: typeof invalidPayload;
        }
      ).parsedPayload.mistakes,
    ).toHaveLength(2);
    expect(events[events.length - 1]).toMatchObject({
      stage: 'analysis_failed',
      traceId: job.traceId,
    });
  });

  it('marks the job failed and preserves semantic validation issues when the AI returns duplicate momentIds', async () => {
    const rawAnnotatedPgn = readFileSync(
      new URL(
        '../fixtures/pgn/annotated-lichess-with-eval.pgn',
        import.meta.url,
      ),
      'utf8',
    );
    const invalidPayload = {
      overallDiagnosis: 'Invalid analysis payload',
      secondaryWeaknessTags: [WeaknessTag.TIME_MANAGEMENT],
      recommendedFocusPoints: ['Count checks and captures'],
      mistakes: [
        {
          momentId: 'moment-1',
          category: 'calculation',
          explanation: 'First duplicate moment reference.',
        },
        {
          momentId: 'moment-1',
          category: 'time_management',
          explanation: 'Second duplicate moment reference.',
        },
      ],
    };
    const rawText = JSON.stringify(invalidPayload);
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
            loggerConfig,
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
            promptVersion: 'test-v2',
            rawText,
            payload: invalidPayload,
          }),
      })
      .compile();

    const jobsRepository = moduleRef.get(AnalysisJobsRepository);
    const processor = moduleRef.get(AnalysisProcessor);
    const coach = await prisma.coachAccount.create({
      data: {
        email: 'coach-duplicates@example.com',
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
        normalizedPgnHash: 'hash-duplicates',
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
    const failedTraces = (await prisma.generationTrace.findMany({
      where: { analysisJobId: job.id },
    })) as GenerationTrace[];

    expect(updated?.status).toBe('FAILED');
    expect(updated?.failureCode).toBe('ANALYSIS_FAILED');
    expect(updated?.analysis).toBeNull();
    expect(failedTraces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          analysisJobId: job.id,
          failureCode: 'ANALYSIS_FAILED',
          promptVersion: 'test-v2',
          model: 'fake-llm',
          outputPayload: {
            rawText,
            parsedPayload: invalidPayload,
            validationIssues: {
              issues: [
                {
                  path: ['mistakes', '0', 'momentId'],
                  code: 'custom',
                  message:
                    'Duplicate momentId "moment-1" referenced by interpretation payload',
                },
                {
                  path: ['mistakes', '1', 'momentId'],
                  code: 'custom',
                  message:
                    'Duplicate momentId "moment-1" referenced by interpretation payload',
                },
              ],
            },
          },
        }),
      ]),
    );
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
            loggerConfig,
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

    await processor.processPersistedJob({
      analysisJobId: generationJob.id,
      traceId: generationJob.traceId,
    });

    const updated = await jobsRepository.findById(generationJob.id);
    expect(updated?.status).toBe(AnalysisJobStatus.FAILED);
    expect(updated?.failureCode).toBe('ANALYSIS_SCOPE_MISMATCH');
  });

  it('persists raw LLM output and logs a preview when generation JSON parsing fails', async () => {
    const rawText = `{"draft":"${'y'.repeat(2_100)}"`;
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
            loggerConfig,
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
        generate: () =>
          Promise.reject(
            new LlmResponseFormatError(
              'LLM returned invalid JSON in the response body',
              LLM_RESPONSE_FORMAT_FAILURE_CODE.INVALID_JSON,
              rawText,
            ),
          ),
      })
      .compile();

    const jobsRepository = moduleRef.get(AnalysisJobsRepository);
    const processor = moduleRef.get(AnalysisProcessor);
    const logger = (
      processor as unknown as {
        logger: { error: (...args: unknown[]) => void };
      }
    ).logger;
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {
      return undefined;
    });
    const coach = await prisma.coachAccount.create({
      data: {
        email: 'coach-generation-raw-output@example.com',
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
        rawPgn: '[Event "Report"]\n[Result "1-0"]\n\n1. e4 e5 1-0',
        normalizedPgnHash: 'generation-raw-output-hash',
        hasEngineAnnotations: true,
        annotationCoverage: 'FULL',
        reducedConfidenceWarning: null,
      },
    });
    const sourceJob = await jobsRepository.create({
      coachAccountId: coach.id,
      studentId: student.id,
      gameId: game.id,
      jobType: AnalysisJobType.ANALYSIS,
      queueName: 'analysis',
    });
    const sourceAnalysis = await prisma.gameAnalysis.create({
      data: {
        coachAccountId: coach.id,
        studentId: student.id,
        gameId: game.id,
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
    const generationJob = await jobsRepository.create({
      coachAccountId: coach.id,
      studentId: student.id,
      gameId: game.id,
      jobType: AnalysisJobType.REPORT_GENERATION,
      queueName: 'analysis',
      sourceAnalysisId: sourceAnalysis.id,
      reportAudience: ReportAudience.COACH,
    });

    await processor.processPersistedJob({
      analysisJobId: generationJob.id,
      traceId: generationJob.traceId,
    });

    const updated = await jobsRepository.findById(generationJob.id);
    const failedTraces = (await prisma.generationTrace.findMany({
      where: { analysisJobId: generationJob.id },
    })) as GenerationTrace[];

    expect(updated?.status).toBe(AnalysisJobStatus.FAILED);
    expect(updated?.failureCode).toBe('GENERATION_FAILED');
    expect(failedTraces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          analysisJobId: generationJob.id,
          analysisId: sourceAnalysis.id,
          failureCode: 'GENERATION_FAILED',
          outputPayload: {
            rawText,
          },
        }),
      ]),
    );
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'generation_failed',
        traceId: generationJob.traceId,
        analysisJobId: generationJob.id,
        llmFailureCode: LLM_RESPONSE_FORMAT_FAILURE_CODE.INVALID_JSON,
        llmRawTextLength: rawText.length,
        llmRawTextPreview: rawText.slice(0, 2_000),
      }),
      'Generation processing failed',
    );
  });
});
