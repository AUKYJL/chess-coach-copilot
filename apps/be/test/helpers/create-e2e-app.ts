import cookieParser from 'cookie-parser';
import {
  Global,
  INestApplication,
  Module,
  ValidationPipe,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AuthModule } from '../../src/auth/auth.module.js';
import { AnalysisModule } from '../../src/analysis/analysis.module.js';
import {
  appConfig,
  databaseConfig,
  jwtConfig,
  openrouterConfig,
  redisConfig,
  validateEnv,
} from '../../src/config/index.js';
import { ExternalAccountsModule } from '../../src/external-accounts/external-accounts.module.js';
import { GamesModule } from '../../src/games/games.module.js';
import { ImportsModule } from '../../src/imports/imports.module.js';
import { LlmService } from '../../src/llm/llm.service.js';
import { PrismaModule } from '../../src/prisma/prisma.module.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { ANALYSIS_JOB_ENQUEUER } from '../../src/queues/queue.constants.js';
import { HttpExceptionFilter } from '../../src/shared/filters/http-exception.filter.js';
import { setupSwagger } from '../../src/shared/swagger/swagger.config.js';
import { StudentsModule } from '../../src/students/students.module.js';
import { WeaknessTag } from '../../src/generated/prisma/client.js';
import { InMemoryPrismaService } from './in-memory-prisma.js';

class FakeAnalysisJobEnqueuer {
  readonly analysisJobIds: string[] = [];

  enqueueAnalysisJob(analysisJobId: string) {
    this.analysisJobIds.push(analysisJobId);

    return Promise.resolve({
      id: analysisJobId,
      name: 'process-analysis',
      data: { analysisJobId },
    });
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
  ],
  providers: [{ provide: LlmService, useClass: FakeLlmService }],
})
class E2eAppModule {}

interface CreateE2eAppOptions {
  withSwagger?: boolean;
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
    .compile();

  const app = moduleRef.createNestApplication();
  const applicationConfiguration = app.get<ConfigType<typeof appConfig>>(
    appConfig.KEY,
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.use(cookieParser());
  app.enableCors({
    origin: applicationConfiguration.corsOrigins,
    credentials: true,
  });
  app.useGlobalFilters(new HttpExceptionFilter());

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
