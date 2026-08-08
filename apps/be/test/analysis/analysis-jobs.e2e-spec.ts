import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  AnnotationCoverage,
  AnalysisJobStatus,
  MomentSeverity,
  MoveColor,
  WeaknessTag,
} from '../../src/generated/prisma/client.js';
import { createE2eApp } from '../helpers/create-e2e-app.js';
import { InMemoryPrismaService } from '../helpers/in-memory-prisma.js';

type TestServer = Parameters<typeof request>[0];

describe('Analysis jobs (e2e)', () => {
  let app: INestApplication;
  let prisma: InMemoryPrismaService;
  let fakeQueue: Awaited<ReturnType<typeof createE2eApp>>['fakeQueue'];

  beforeEach(async () => {
    const fixture = await createE2eApp();
    app = fixture.app;
    prisma = fixture.prisma;
    fakeQueue = fixture.fakeQueue;
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns job status, completed result, and retries a failed job on the same record', async () => {
    const { accessToken, jobId } = await importGame(app);
    const server = getServer(app);
    const job = await prisma.analysisJob.findUnique({
      where: { id: jobId },
      include: { game: true },
    });

    expect(job).toBeTruthy();
    expect(job?.game).toBeTruthy();

    const jobGame = job?.game;

    await request(server)
      .get(`/analysis/jobs/${jobId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    await prisma.gameAnalysis.create({
      data: {
        coachAccountId: job!.coachAccountId,
        studentId: job!.studentId,
        gameId: job!.gameId,
        analysisJobId: job!.id,
        confidenceLevel: 'HIGH',
        overallDiagnosis: 'Saved completed analysis',
        openingName: 'Test Opening',
        result: 'WIN',
        mainWeaknessTag: WeaknessTag.CALCULATION_DEPTH,
        secondaryWeaknessTags: [WeaknessTag.TIME_MANAGEMENT],
        recommendedLessonTitle: 'Candidate move discipline',
        recommendedLessonWhy: 'Missed forcing sequence',
        recommendedFocusPoints: ['Check forcing moves first'],
        rawExtractedContext: {
          annotationCoverage: AnnotationCoverage.FULL,
          reducedConfidenceWarning: null,
        },
        rawAnalysisJson: {
          source: 'seeded-e2e',
        },
      },
    });
    const analysis = await prisma.gameAnalysis.findFirst({
      where: { analysisJobId: jobId },
    });
    await prisma.criticalMoment.createMany({
      data: [
        {
          analysisId: analysis!.id,
          ply: 5,
          fullMoveNumber: 3,
          moveNumber: '3.',
          moveColor: MoveColor.WHITE,
          san: 'Bb5',
          lan: null,
          uci: null,
          beforeFen: 'before-fen',
          afterFen: 'after-fen',
          bestMove: 'Bc4',
          bestVariation: ['Bc4', 'Nf6'],
          nags: ['$1'],
          comments: ['Playable'],
          evaluationBefore: {
            kind: 'centipawns',
            value: 20,
            raw: 0.2,
          },
          evaluationAfter: {
            kind: 'centipawns',
            value: 40,
            raw: 0.4,
          },
          severity: MomentSeverity.MISTAKE,
          sourceEvidence: { source: 'engine' },
        },
      ],
    });
    const [criticalMoment] = await prisma.criticalMoment.findMany({
      where: { analysisId: analysis!.id },
    });
    await prisma.mistake.createMany({
      data: [
        {
          analysisId: analysis!.id,
          criticalMomentId: criticalMoment.id,
          severity: MomentSeverity.MISTAKE,
          category: 'calculation',
          explanation: 'Missed a stronger continuation.',
          suggestedFix: 'Check forcing moves first.',
          sourceEvidence: { source: 'llm' },
        },
      ],
    });
    await prisma.analysisJob.update({
      where: { id: jobId },
      data: {
        status: AnalysisJobStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    const resultResponse = await request(server)
      .get(`/analysis/jobs/${jobId}/result`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(resultResponse.body.analysis).toMatchObject({
      id: analysis!.id,
      analysisJobId: jobId,
      game: {
        id: job!.gameId,
        annotationCoverage: jobGame?.annotationCoverage,
      },
      criticalMoments: [
        {
          id: criticalMoment.id,
          ply: 5,
        },
      ],
      mistakes: [
        {
          criticalMomentId: criticalMoment.id,
          category: 'calculation',
        },
      ],
    });

    const listResponse = await request(server)
      .get('/analysis')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(listResponse.body.items).toEqual([
      expect.objectContaining({
        id: analysis!.id,
        analysisJobId: jobId,
        gameId: job!.gameId,
        studentId: job!.studentId,
        annotationCoverage: jobGame?.annotationCoverage,
        reducedConfidenceWarning: jobGame?.reducedConfidenceWarning,
        openingName: 'Test Opening',
        result: 'WIN',
        mainWeaknessTag: WeaknessTag.CALCULATION_DEPTH,
      }),
    ]);

    const detailsResponse = await request(server)
      .get(`/analysis/${analysis!.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(detailsResponse.body).toMatchObject({
      id: analysis!.id,
      analysisJobId: jobId,
      gameId: job!.gameId,
      studentId: job!.studentId,
      annotationCoverage: jobGame?.annotationCoverage,
      reducedConfidenceWarning: jobGame?.reducedConfidenceWarning,
      criticalMoments: [
        {
          id: criticalMoment.id,
          ply: 5,
        },
      ],
      mistakes: [
        {
          criticalMomentId: criticalMoment.id,
          category: 'calculation',
        },
      ],
      rawAnalysisJson: {
        source: 'seeded-e2e',
      },
    });

    const outsider = await registerCoach(
      app,
      `outsider-${Math.random()}@example.com`,
    );

    await request(server)
      .get(`/analysis/${analysis!.id}`)
      .set('Authorization', `Bearer ${outsider}`)
      .expect(404);

    await prisma.analysisJob.update({
      where: { id: jobId },
      data: {
        status: AnalysisJobStatus.FAILED,
        failureCode: 'ANALYSIS_FAILED',
        failureMessage: 'Synthetic failure',
        progressPercent: 100,
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });

    const retryResponse = await request(server)
      .post(`/analysis/jobs/${jobId}/retry`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(retryResponse.body).toMatchObject({
      id: jobId,
      status: AnalysisJobStatus.PENDING,
      attemptCount: 1,
      progressPercent: 0,
      failureCode: null,
      failureMessage: null,
      completedAt: null,
    });

    const retriedJob = await prisma.analysisJob.findUnique({
      where: { id: jobId },
    });

    expect(retriedJob).toMatchObject({
      status: AnalysisJobStatus.PENDING,
      attemptCount: 1,
      progressPercent: 0,
      failureCode: null,
      failureMessage: null,
      startedAt: null,
      completedAt: null,
    });
  });

  it('marks a newly created import job as failed when enqueueing to the queue fails', async () => {
    const server = getServer(app);
    const coachEmail = `queue-failure-${Math.random()}@example.com`;
    const accessToken = await registerCoach(
      app,
      coachEmail,
    );
    const studentResponse = await request(server)
      .post('/students')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        displayName: 'Student',
      })
      .expect(201);

    fakeQueue.nextError = new Error('queue offline');

    await request(server)
      .post(`/students/${studentResponse.body.id as string}/imports/pgn`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        studentColor: 'WHITE',
        rawPgn: `[Event "Training"]\n[Result "1-0"]\n\n1. e4 { [%eval 0.2] } e5 1-0`,
      })
      .expect(503);

    const coach = (await prisma.coachAccount.findUnique({
      where: { email: coachEmail },
    })) as { id: string } | null;

    const createdJob = (await prisma.analysisJob.findFirst({
      where: { coachAccountId: coach!.id },
    })) as {
      status: AnalysisJobStatus;
      failureCode: string | null;
      failureMessage: string | null;
      completedAt: Date | null;
      progressPercent: number | null;
    } | null;

    expect(createdJob).toMatchObject({
      status: AnalysisJobStatus.FAILED,
      failureCode: 'QUEUE_ENQUEUE_FAILED',
      failureMessage: 'queue offline',
      progressPercent: 100,
    });
    expect(createdJob?.completedAt).not.toBeNull();
  });
});

async function importGame(app: INestApplication, rawPgn?: string) {
  const server = getServer(app);
  const accessToken = await registerCoach(
    app,
    `coach-${Math.random()}@example.com`,
  );
  const studentResponse = await request(server)
    .post('/students')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      displayName: 'Student',
    });

  const importResponse = await request(server)
    .post(`/students/${studentResponse.body.id as string}/imports/pgn`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      studentColor: 'WHITE',
      rawPgn:
        rawPgn ??
        `[Event "Training"]
[Result "1-0"]

1. e4 { [%eval 0.2] } e5 { [%eval 0.1] } 2. Nf3 { [%eval 0.5] } Nc6 1-0`,
    })
    .expect(201);

  return {
    accessToken,
    jobId: importResponse.body.id as string,
  };
}

async function registerCoach(app: INestApplication, email: string) {
  const server = getServer(app);
  const authResponse = await request(server).post('/auth/register').send({
    email,
    password: 'strongpass1',
    displayName: 'Coach',
  });

  return authResponse.body.accessToken as string;
}

function getServer(app: INestApplication): TestServer {
  return app.getHttpServer() as TestServer;
}
