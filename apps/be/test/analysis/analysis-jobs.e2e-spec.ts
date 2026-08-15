import { jest } from '@jest/globals';
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

  it('returns job status/history, keeps raw analysis artifacts out of details, removes the debug endpoint, and retries a failed job on the same record', async () => {
    const { accessToken, jobId } = await importGame(app);
    const server = getServer(app);
    const job = (await prisma.analysisJob.findUnique({
      where: { id: jobId },
      include: { game: true },
    })) as
      | ({
          game: {
            annotationCoverage: AnnotationCoverage;
            reducedConfidenceWarning: string | null;
          };
        } & {
          id: string;
          coachAccountId: string;
          studentId: string;
          gameId: string;
        })
      | null;

    expect(job).toBeTruthy();
    expect(job?.game).toBeTruthy();

    const jobGame = job?.game;

    await request(server)
      .get(`/analysis/jobs/${jobId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const historyResponse = await request(server)
      .get('/analysis/jobs')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(historyResponse.body.items[0]).toMatchObject({
      id: jobId,
      jobType: 'ANALYSIS',
      analysisId: null,
    });

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
          ply: 3,
          fullMoveNumber: 2,
          moveNumber: '2.',
          moveColor: MoveColor.WHITE,
          san: 'Nf3',
          lan: null,
          uci: 'g1f3',
          beforeFen:
            'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
          afterFen:
            'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
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

    const completedJobResponse = await request(server)
      .get(`/analysis/jobs/${jobId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(completedJobResponse.body).toMatchObject({
      id: jobId,
      jobType: 'ANALYSIS',
      analysisId: analysis!.id,
    });
    expect(completedJobResponse.body.reportId).toBeNull();
    expect(completedJobResponse.body.homeworkId).toBeNull();
    expect(completedJobResponse.body.progressSnapshotId).toBeNull();

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
      replay: {
        initialFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        moveCount: 4,
        moves: expect.arrayContaining([
          expect.objectContaining({
            ply: 1,
            moveColor: 'WHITE',
            san: 'e4',
            from: 'e2',
            to: 'e4',
          }),
          expect.objectContaining({
            ply: 2,
            moveColor: 'BLACK',
            san: 'e5',
            from: 'e7',
            to: 'e5',
          }),
        ]),
      },
      criticalMoments: [
        {
          id: criticalMoment.id,
          ply: 3,
          from: 'g1',
          to: 'f3',
          promotion: null,
          bestVariation: ['Bc4', 'Nf6'],
          nags: ['$1'],
          comments: ['Playable'],
          mistake: {
            criticalMomentId: criticalMoment.id,
            category: 'calculation',
            explanation: 'Missed a stronger continuation.',
            suggestedFix: 'Check forcing moves first.',
          },
        },
      ],
      mistakes: [
        {
          criticalMomentId: criticalMoment.id,
          category: 'calculation',
        },
      ],
    });
    expect(detailsResponse.body.game).toBeUndefined();
    expect(detailsResponse.body.rawAnalysisJson).toBeUndefined();
    expect(detailsResponse.body.rawExtractedContext).toBeUndefined();

    await request(server)
      .get(`/analysis/${analysis!.id}/debug`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);

    const gameDetailResponse = await request(server)
      .get(`/games/${job!.gameId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(gameDetailResponse.body).toMatchObject({
      id: job!.gameId,
      latestAnalysisJobId: jobId,
      latestAnalysisId: analysis!.id,
    });

    const pgnResponse = await request(server)
      .get(`/games/${job!.gameId}/pgn`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(pgnResponse.body).toMatchObject({
      gameId: job!.gameId,
    });

    const outsider = await registerCoach(
      app,
      `outsider-${Math.random()}@example.com`,
    );

    await request(server)
      .get(`/analysis/${analysis!.id}`)
      .set('Authorization', `Bearer ${outsider}`)
      .expect(404);

    await request(server)
      .get(`/games/${job!.gameId}`)
      .set('Authorization', `Bearer ${outsider}`)
      .expect(404);

    await request(server)
      .get('/analysis/jobs')
      .set('Authorization', `Bearer ${outsider}`)
      .expect(200);

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
    const accessToken = await registerCoach(app, coachEmail);
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
      id: string;
      traceId: string;
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

    const events = await prisma.analysisJobEvent.findMany({
      where: { analysisJobId: createdJob!.id },
      orderBy: { createdAt: 'asc' },
    });

    expect(events[events.length - 1]).toMatchObject({
      traceId: createdJob?.traceId,
      stage: 'analysis_job_enqueue_failed',
      level: 'error',
    });
  });

  it('keeps enqueue failure semantics when event persistence is unavailable', async () => {
    const server = getServer(app);
    const coachEmail = `queue-failure-best-effort-${Math.random()}@example.com`;
    const accessToken = await registerCoach(app, coachEmail);
    const studentResponse = await request(server)
      .post('/students')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        displayName: 'Student',
      })
      .expect(201);
    const createSpy = jest
      .spyOn(prisma.analysisJobEvent, 'create')
      .mockRejectedValue(new Error('events offline'));
    const updateSpy = jest
      .spyOn(prisma.analysisJobEvent, 'updateMany')
      .mockRejectedValue(new Error('events offline'));

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
      id: string;
      traceId: string;
      status: AnalysisJobStatus;
      failureCode: string | null;
      failureMessage: string | null;
      completedAt: Date | null;
      progressPercent: number | null;
    } | null;
    const events = await prisma.analysisJobEvent.findMany({
      where: { traceId: createdJob!.traceId },
    });

    expect(createSpy).toHaveBeenCalled();
    expect(updateSpy).toHaveBeenCalled();
    expect(createdJob).toMatchObject({
      status: AnalysisJobStatus.FAILED,
      failureCode: 'QUEUE_ENQUEUE_FAILED',
      failureMessage: 'queue offline',
      progressPercent: 100,
    });
    expect(createdJob?.completedAt).not.toBeNull();
    expect(events).toEqual([]);
  });

  it('paginates jobs by createdAt/id and returns the latest generation trace', async () => {
    const server = getServer(app);
    const coachEmail = `jobs-pagination-${Math.random()}@example.com`;
    const accessToken = await registerCoach(app, coachEmail);
    const studentResponse = await request(server)
      .post('/students')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        displayName: 'Student',
      })
      .expect(201);
    const studentId = studentResponse.body.id as string;
    const coach = (await prisma.coachAccount.findUnique({
      where: { email: coachEmail },
    })) as { id: string } | null;

    expect(coach).toBeTruthy();

    const game = await prisma.game.create({
      data: {
        coachAccountId: coach!.id,
        studentId,
        sourceType: 'MANUAL_PGN',
        sourceLabel: 'Seeded game',
        studentColor: 'WHITE',
        event: 'Training',
        site: null,
        whitePlayerName: null,
        blackPlayerName: null,
        openingHeader: null,
        ecoCode: null,
        rawResult: '1-0',
        derivedResult: 'WIN',
        plyCount: 20,
        rawPgn: '1. e4 e5 1-0',
        normalizedPgnHash: 'jobs-pagination-game',
        hasEngineAnnotations: false,
        annotationCoverage: 'NONE',
        reducedConfidenceWarning: null,
      },
    });
    const jobs = await Promise.all([
      prisma.analysisJob.create({
        data: {
          coachAccountId: coach!.id,
          studentId,
          gameId: game.id,
          jobType: 'REPORT_GENERATION',
          queueName: 'analysis',
        },
      }),
      prisma.analysisJob.create({
        data: {
          coachAccountId: coach!.id,
          studentId,
          gameId: game.id,
          jobType: 'HOMEWORK_GENERATION',
          queueName: 'analysis',
        },
      }),
      prisma.analysisJob.create({
        data: {
          coachAccountId: coach!.id,
          studentId,
          gameId: game.id,
          jobType: 'PROGRESS_GENERATION',
          queueName: 'analysis',
        },
      }),
    ]);

    for (const job of jobs) {
      await prisma.analysisJob.update({
        where: { id: job.id },
        data: {
          createdAt: new Date('2026-08-08T12:00:00.000Z'),
        },
      });
    }

    const expectedOrder = jobs
      .map((job) => job.id)
      .sort((left, right) => right.localeCompare(left));

    await prisma.generationTrace.create({
      data: {
        coachAccountId: coach!.id,
        analysisJobId: jobs[0].id,
        analysisId: null,
        reportId: 'report-old',
        homeworkId: null,
        progressSnapshotId: null,
        promptVersion: 'test-v1',
        model: 'fake-llm',
        inputPayload: { order: 'old' },
        outputPayload: { order: 'old' },
        failureCode: null,
        failureMessage: null,
      },
    });
    await prisma.generationTrace.create({
      data: {
        coachAccountId: coach!.id,
        analysisJobId: jobs[0].id,
        analysisId: null,
        reportId: null,
        homeworkId: null,
        progressSnapshotId: 'progress-latest',
        promptVersion: 'test-v1',
        model: 'fake-llm',
        inputPayload: { order: 'latest' },
        outputPayload: { order: 'latest' },
        failureCode: null,
        failureMessage: null,
      },
    });

    const firstPageResponse = await request(server)
      .get('/analysis/jobs?limit=2')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const firstPageItems = firstPageResponse.body.items as Array<{
      id: string;
    }>;

    expect(firstPageItems.map((item) => item.id)).toEqual(
      expectedOrder.slice(0, 2),
    );
    expect(firstPageResponse.body.nextCursor).toBe(expectedOrder[1]);

    const secondPageResponse = await request(server)
      .get(`/analysis/jobs?limit=2&cursor=${firstPageResponse.body.nextCursor}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(secondPageResponse.body.items).toHaveLength(1);
    expect(secondPageResponse.body.items[0].id).toBe(expectedOrder[2]);
    expect(secondPageResponse.body.nextCursor).toBeNull();

    const jobResponse = await request(server)
      .get(`/analysis/jobs/${jobs[0].id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(jobResponse.body).toMatchObject({
      id: jobs[0].id,
      reportId: null,
      homeworkId: null,
      progressSnapshotId: 'progress-latest',
    });
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
