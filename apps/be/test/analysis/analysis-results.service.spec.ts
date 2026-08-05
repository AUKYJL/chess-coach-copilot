import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AnalysisModule } from '../../src/analysis/analysis.module.js';
import type { ClassifiedAnalysisResult } from '../../src/analysis/classification/analysis-classifier.service.js';
import type { ExtractedAnnotationContext } from '../../src/analysis/classification/annotation-extractor.service.js';
import { AnalysisResultsService } from '../../src/analysis/results/analysis-results.service.js';
import {
  appConfig,
  databaseConfig,
  jwtConfig,
  openrouterConfig,
  redisConfig,
  validateEnv,
} from '../../src/config/index.js';
import {
  ConfidenceLevel,
  GameResult,
  MomentSeverity,
} from '../../src/generated/prisma/client.js';
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

describe('AnalysisResultsService (integration)', () => {
  beforeAll(() => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
  });

  it('replaces aggregate data for the same job without duplicating rows', async () => {
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
        AnalysisModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(LlmService)
      .useValue({})
      .compile();

    const analysisResultsService = moduleRef.get(AnalysisResultsService);
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
        rawPgn: 'pgn',
        normalizedPgnHash: 'hash',
        hasEngineAnnotations: true,
        annotationCoverage: 'FULL',
        reducedConfidenceWarning: null,
      },
    });
    const analysisJob = await prisma.analysisJob.create({
      data: {
        coachAccountId: coach.id,
        studentId: student.id,
        gameId: game.id,
        jobType: 'ANALYSIS',
        queueName: 'analysis',
      },
    });

    const firstContext = buildExtractedContext(12);
    const firstResult = buildClassifiedResult(12, 'First diagnosis');

    const firstAnalysis = await analysisResultsService.persistCompletedAnalysis(
      {
        job: {
          id: analysisJob.id,
          coachAccountId: coach.id,
          studentId: student.id,
          gameId: game.id,
        },
        extractedContext: firstContext,
        classifiedResult: firstResult,
      },
    );

    const secondContext = buildExtractedContext(20);
    const secondResult = buildClassifiedResult(20, 'Updated diagnosis');

    const secondAnalysis =
      await analysisResultsService.persistCompletedAnalysis({
        job: {
          id: analysisJob.id,
          coachAccountId: coach.id,
          studentId: student.id,
          gameId: game.id,
        },
        extractedContext: secondContext,
        classifiedResult: secondResult,
      });

    expect(secondAnalysis.id).toBe(firstAnalysis.id);

    const savedAnalysis = await prisma.gameAnalysis.findFirst({
      where: { analysisJobId: analysisJob.id },
      include: {
        criticalMoments: true,
        mistakes: true,
      },
    });

    expect(savedAnalysis).toMatchObject({
      id: firstAnalysis.id,
      overallDiagnosis: 'Updated diagnosis',
    });
    expect(savedAnalysis?.criticalMoments).toHaveLength(1);
    expect(savedAnalysis?.mistakes).toHaveLength(1);

    const [savedCriticalMoment] = savedAnalysis?.criticalMoments ?? [];
    const [savedMistake] = savedAnalysis?.mistakes ?? [];

    expect(savedMistake?.criticalMomentId).toBe(savedCriticalMoment?.id);

    const traces = await prisma.generationTrace.findMany({
      where: { analysisJobId: analysisJob.id },
    });

    expect(traces).toHaveLength(2);

    const persistedMoments = await prisma.criticalMoment.findMany({
      where: { analysisId: firstAnalysis.id },
    });

    expect(persistedMoments).toHaveLength(1);
    expect(persistedMoments[0].ply).toBe(20);
  });
});

function buildExtractedContext(ply: number): ExtractedAnnotationContext {
  return {
    hasEngineAnnotations: true,
    annotationCoverage: 'FULL',
    reducedConfidenceWarning: null,
    rawCommentCount: 1,
    candidateMomentCount: 1,
    diagnostics: [],
    moments: [
      {
        ply,
        fullMoveNumber: 6,
        moveNumber: '6.',
        moveColor: 'w',
        san: 'Re1',
        lan: null,
        uci: null,
        beforeFen: 'before',
        afterFen: 'after',
        bestMove: 'd4',
        bestVariation: ['d4', 'exd4'],
        nags: ['$1'],
        comments: ['test'],
        evaluationBefore: {
          kind: 'centipawns',
          value: 10,
          raw: 0.1,
        },
        evaluationAfter: {
          kind: 'centipawns',
          value: 50,
          raw: 0.5,
        },
        severity: MomentSeverity.MISTAKE,
        sourceEvidence: { line: 'test' },
      },
    ],
  };
}

function buildClassifiedResult(
  criticalMomentPly: number,
  overallDiagnosis: string,
): ClassifiedAnalysisResult {
  return {
    payload: {
      confidenceLevel: ConfidenceLevel.HIGH,
      overallDiagnosis,
      openingName: 'Italian Game',
      result: GameResult.WIN,
      mainWeaknessTag: 'calculation',
      secondaryWeaknessTags: ['time-management'],
      recommendedLessonTitle: 'Candidate move discipline',
      recommendedLessonWhy: 'Missed a forcing line.',
      recommendedFocusPoints: ['Check forcing moves first'],
      mistakes: [
        {
          criticalMomentPly,
          severity: MomentSeverity.MISTAKE,
          category: 'calculation',
          explanation: 'Missed the best continuation.',
          suggestedFix: 'Calculate checks first.',
          sourceEvidence: { line: 'test' },
        },
      ],
    },
    promptVersion: 'test-v1',
    model: 'fake-llm',
    rawOutput: { source: 'test' },
    inputPayload: { source: 'test' },
  };
}
