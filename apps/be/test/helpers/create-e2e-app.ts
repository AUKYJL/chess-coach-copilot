import { Global, INestApplication, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Logger } from 'nestjs-pino';
import { AuthModule } from '../../src/auth/auth.module.js';
import { AnalysisModule } from '../../src/analysis/analysis.module.js';
import { AnalysisProcessingModule } from '../../src/analysis/jobs/analysis-processing.module.js';
import { configureHttpApp } from '../../src/bootstrap/configure-http-app.js';
import {
  appConfig,
  databaseConfig,
  jwtConfig,
  loggerConfig,
  openrouterConfig,
  redisConfig,
  validateEnv,
} from '../../src/config/index.js';
import { ExternalAccountsModule } from '../../src/external-accounts/external-accounts.module.js';
import { GamesModule } from '../../src/games/games.module.js';
import { HomeworkModule } from '../../src/homework/homework.module.js';
import { ImportsModule } from '../../src/imports/imports.module.js';
import { LlmService } from '../../src/llm/llm.service.js';
import { PrismaModule } from '../../src/prisma/prisma.module.js';
import { ProgressModule } from '../../src/progress/progress.module.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { ANALYSIS_JOB_ENQUEUER } from '../../src/queues/queue.constants.js';
import type { AnalysisQueueJobData } from '../../src/queues/queue.service.js';
import { ReportsModule } from '../../src/reports/reports.module.js';
import { setupSwagger } from '../../src/shared/swagger/swagger.config.js';
import { StudentsModule } from '../../src/students/students.module.js';
import {
  ConfidenceLevel,
  ReportAudience,
  WeaknessTag,
} from '../../src/generated/prisma/client.js';
import { InMemoryPrismaService } from './in-memory-prisma.js';

process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret';
process.env.OPENROUTER_API_KEY ??= 'test-openrouter-key';
process.env.STOCKFISH_BINARY_PATH ??= '/test/stockfish';

class FakeAnalysisJobEnqueuer {
  readonly jobs: Array<{
    id: string;
    name: string;
    data: AnalysisQueueJobData;
  }> = [];
  nextError: Error | null = null;

  enqueueAnalysisJob(analysisJobId: string, traceId: string) {
    return this.enqueue({ analysisJobId, traceId });
  }

  enqueueGenerationJob(analysisJobId: string, traceId: string) {
    return this.enqueue({ analysisJobId, traceId });
  }

  private enqueue(data: AnalysisQueueJobData) {
    if (this.nextError) {
      const error = this.nextError;
      this.nextError = null;
      return Promise.reject(error);
    }

    const job = {
      id: data.analysisJobId,
      name: 'process-analysis',
      data,
    };

    this.jobs.push(job);

    return Promise.resolve(job);
  }
}

class FakeLlmService {
  classify(request: { userPrompt: string }) {
    const parsed = JSON.parse(request.userPrompt) as {
      headers: {
        opening: string | null;
      };
      moments: Array<Record<string, unknown>>;
    };

    return Promise.resolve({
      model: 'fake-llm',
      promptVersion: 'test-v1',
      rawText: '',
      payload: {
        confidenceLevel: 'HIGH',
        overallDiagnosis: 'Annotated middlegame decisions need cleanup.',
        openingName: parsed.headers.opening,
        result: 'WIN',
        mainWeaknessTag: WeaknessTag.CALCULATION_DEPTH,
        secondaryWeaknessTags: [WeaknessTag.TIME_MANAGEMENT],
        recommendedLessonTitle: 'Candidate move discipline',
        recommendedLessonWhy:
          'Several tactical decisions were rushed despite good strategic positions.',
        recommendedFocusPoints: ['Slow down before forcing moves'],
        mistakes: parsed.moments.slice(0, 1).map((moment) => ({
          criticalMomentPly: typeof moment.ply === 'number' ? moment.ply : null,
          severity: moment.severity,
          category: 'calculation_depth',
          explanation: 'The move missed a stronger continuation.',
          suggestedFix: 'Check forcing moves first.',
          sourceEvidence: moment.sourceEvidence,
        })),
      },
    });
  }

  generate(request: { userPrompt: string }) {
    return Promise.resolve({
      model: 'fake-llm',
      promptVersion: 'test-v1',
      rawText: `# Generated text output\n\nInput chars: ${request.userPrompt.length}`,
    });
  }

  generateStructured(request: { userPrompt: string }) {
    const parsed = JSON.parse(request.userPrompt) as {
      audience?: string;
      analysis?: {
        openingName?: string | null;
        overallDiagnosis?: string;
      };
      analyses?: Array<{
        overallDiagnosis?: string;
      }>;
    };

    const shouldForceInvalid =
      parsed.analysis?.overallDiagnosis?.includes('__FORCE_INVALID__') ||
      parsed.analyses?.some((analysis) =>
        analysis.overallDiagnosis?.includes('__FORCE_INVALID__'),
      );

    if (shouldForceInvalid) {
      return Promise.resolve({
        model: 'fake-llm',
        promptVersion: 'test-v1',
        rawText: '{"invalid":true}',
        payload: {
          invalid: true,
        },
      });
    }

    if (parsed.analysis && typeof parsed.audience === 'string') {
      return Promise.resolve({
        model: 'fake-llm',
        promptVersion: 'test-v1',
        rawText: '',
        payload: {
          title: `${parsed.audience === ReportAudience.PARENT ? 'Parent' : 'Coach'} report: ${parsed.analysis?.openingName ?? 'Game review'}`,
          summary: 'Structured review of the saved analysis.',
          highlights: [
            'Opening recall improved',
            'Move-order discipline needs work',
          ],
          lessonFocus: ['Candidate move discipline'],
          nextSteps: ['Review the critical moment on move 18'],
        },
      });
    }

    if (parsed.analysis) {
      return Promise.resolve({
        model: 'fake-llm',
        promptVersion: 'test-v1',
        rawText: '',
        payload: {
          title: 'Homework: candidate move discipline',
          overview: 'Use the saved analysis to rehearse forcing-move checks.',
          exercises: [
            'Annotate move 18 alternatives',
            'Solve five fork puzzles',
          ],
          focusPoints: ['Checks, captures, threats'],
          notes: ['Discuss move-order discipline in the next lesson'],
        },
      });
    }

    return Promise.resolve({
      model: 'fake-llm',
      promptVersion: 'test-v1',
      rawText: '',
      payload: {
        summary: 'Progress is visible across the saved analyses.',
        improvements: ['More stable opening decisions'],
        recurringWeaknesses: ['Tactical forcing lines are still missed'],
        nextFocusPoints: ['Slow down before forcing moves'],
        confidenceLevel: ConfidenceLevel.HIGH,
      },
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
  exports: [FakeAnalysisJobEnqueuer, ANALYSIS_JOB_ENQUEUER],
})
class TestingQueueModule {}

@Module({
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
    StudentsModule,
    ExternalAccountsModule,
    GamesModule,
    AnalysisModule,
    ImportsModule,
    ReportsModule,
    HomeworkModule,
    ProgressModule,
    AnalysisProcessingModule,
  ],
})
class E2eAppModule {}

interface CreateE2eAppOptions {
  withSwagger?: boolean;
  withGlobalPrefix?: boolean;
}

export async function createE2eApp(options: CreateE2eAppOptions = {}): Promise<{
  app: INestApplication;
  prisma: InMemoryPrismaService;
  fakeQueue: FakeAnalysisJobEnqueuer;
}> {
  const prisma = new InMemoryPrismaService();
  const moduleRef = await Test.createTestingModule({
    imports: [E2eAppModule],
  })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .overrideProvider(LlmService)
    .useClass(FakeLlmService)
    .compile();

  const app = moduleRef.createNestApplication();
  app.useLogger(app.get(Logger));
  configureHttpApp(app, {
    withGlobalPrefix: options.withGlobalPrefix ?? false,
  });

  if (options.withSwagger) {
    setupSwagger(app);
  }

  await app.init();

  return {
    app,
    prisma,
    fakeQueue: moduleRef.get(FakeAnalysisJobEnqueuer),
  };
}
