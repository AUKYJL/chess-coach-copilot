import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  AnalysisJobStatus,
  AnalysisJobType,
  AnnotationCoverage,
  ConfidenceLevel,
  GameResult,
  GameSourceType,
  StudentColor,
  WeaknessTag,
} from '../../src/generated/prisma/client.js';
import { AnalysisProcessor } from '../../src/analysis/jobs/analysis.processor.js';
import { createE2eApp } from '../helpers/create-e2e-app.js';
import { InMemoryPrismaService } from '../helpers/in-memory-prisma.js';
import {
  createCompletedAnalysisFixture,
  getServer,
} from '../helpers/us3-fixtures.js';

describe('ProgressController (e2e)', () => {
  let app: INestApplication;
  let prisma: InMemoryPrismaService;
  let fakeQueue: Awaited<ReturnType<typeof createE2eApp>>['fakeQueue'];

  beforeEach(async () => {
    ({ app, prisma, fakeQueue } = await createE2eApp());
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns not-enough-data when fewer than 3 completed analyses exist', async () => {
    const fixture = await createCompletedAnalysisFixture({
      app,
      prisma,
      analysisCount: 2,
    });

    await request(getServer(app))
      .get(`/students/${fixture.studentId}/progress`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          status: 'not-enough-data',
          requiredAnalysisCount: 3,
          availableAnalysisCount: 2,
          snapshot: null,
        });
      });
  });

  it('generates and retrieves a saved progress snapshot after enough analyses exist', async () => {
    const fixture = await createCompletedAnalysisFixture({
      app,
      prisma,
      analysisCount: 3,
    });
    const server = getServer(app);

    const queuedResponse = await request(server)
      .post(`/students/${fixture.studentId}/progress/generate`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(201);

    expect(queuedResponse.body.status).toBe(AnalysisJobStatus.PENDING);

    await app
      .get(AnalysisProcessor)
      .process(fakeQueue.jobs.at(-1) as unknown as never);

    await request(server)
      .get(`/analysis/jobs/${queuedResponse.body.id as string}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe(AnalysisJobStatus.COMPLETED);
      });

    await request(server)
      .get(`/students/${fixture.studentId}/progress`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('ready');
        expect(body.snapshot.analysisCount).toBe(3);
        expect(body.snapshot.summary.summary).toContain('Progress');
      });
  });

  it('retries a failed progress generation job on the same persisted record', async () => {
    const fixture = await createCompletedAnalysisFixture({
      app,
      prisma,
      analysisCount: 3,
    });
    const server = getServer(app);

    const queuedResponse = await request(server)
      .post(`/students/${fixture.studentId}/progress/generate`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(201);

    await prisma.analysisJob.update({
      where: { id: queuedResponse.body.id as string },
      data: {
        status: AnalysisJobStatus.FAILED,
        failureCode: 'GENERATION_FAILED',
        failureMessage: 'Synthetic progress failure',
        progressPercent: 100,
        completedAt: new Date(),
      },
    });

    await request(server)
      .post(`/analysis/jobs/${queuedResponse.body.id as string}/retry`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe(AnalysisJobStatus.PENDING);
        expect(body.attemptCount).toBe(1);
      });
  });

  it('does not count analyses from a different coach when checking progress generation readiness', async () => {
    const fixture = await createCompletedAnalysisFixture({
      app,
      prisma,
      analysisCount: 2,
    });

    const foreignGame = await prisma.game.create({
      data: {
        coachAccountId: 'foreign-coach',
        studentId: fixture.studentId,
        sourceType: GameSourceType.MANUAL_PGN,
        sourceLabel: 'Foreign game',
        studentColor: StudentColor.WHITE,
        rawPgn: '[Event "Foreign"]\n[Result "1-0"]\n\n1. e4 e5 1-0',
        normalizedPgnHash: `foreign-${Math.random()}`,
        hasEngineAnnotations: true,
        annotationCoverage: AnnotationCoverage.FULL,
        reducedConfidenceWarning: null,
      },
    });
    const foreignJob = await prisma.analysisJob.create({
      data: {
        coachAccountId: 'foreign-coach',
        studentId: fixture.studentId,
        gameId: foreignGame.id,
        jobType: AnalysisJobType.ANALYSIS,
        queueName: 'analysis',
      },
    });
    await prisma.gameAnalysis.create({
      data: {
        coachAccountId: 'foreign-coach',
        studentId: fixture.studentId,
        gameId: foreignGame.id,
        analysisJobId: foreignJob.id,
        confidenceLevel: ConfidenceLevel.HIGH,
        overallDiagnosis: 'Foreign coach analysis',
        openingName: 'Italian Game',
        result: GameResult.WIN,
        mainWeaknessTag: WeaknessTag.CALCULATION_DEPTH,
        secondaryWeaknessTags: [WeaknessTag.TIME_MANAGEMENT],
        recommendedLessonTitle: 'Foreign lesson',
        recommendedLessonWhy: 'Foreign explanation',
        recommendedFocusPoints: ['Foreign focus'],
        rawExtractedContext: {
          annotationCoverage: AnnotationCoverage.FULL,
          reducedConfidenceWarning: null,
        },
        rawAnalysisJson: {
          source: 'foreign',
        },
      },
    });

    await request(getServer(app))
      .post(`/students/${fixture.studentId}/progress/generate`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(422);
  });
});
