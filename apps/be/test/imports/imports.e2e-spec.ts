import { jest } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import { readFileSync } from 'fs';
import request from 'supertest';
import {
  AnalysisJobStatus,
  AnalysisJobType,
  ReportAudience,
  WeaknessTag,
} from '../../src/generated/prisma/client.js';
import { createE2eApp } from '../helpers/create-e2e-app.js';
import { InMemoryPrismaService } from '../helpers/in-memory-prisma.js';

type TestServer = Parameters<typeof request>[0];

describe('ImportsController (e2e)', () => {
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

  it('creates game summaries and pending analysis job for a valid annotated PGN', async () => {
    const { accessToken, studentId } = await registerCoachAndStudent(app);
    const rawPgn = readFileSync(
      new URL(
        '../fixtures/pgn/annotated-lichess-with-eval.pgn',
        import.meta.url,
      ),
      'utf8',
    );

    const response = await request(getServer(app))
      .post(`/students/${studentId}/imports/pgn`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        studentColor: 'WHITE',
        sourceLabel: 'Annotated export',
        rawPgn,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      status: 'PENDING',
      jobType: 'ANALYSIS',
      studentId,
      isDuplicate: false,
      annotationCoverage: 'FULL',
    });
    expect(response.headers['x-request-id']).toEqual(expect.any(String));

    const persistedJob = await prisma.analysisJob.findUnique({
      where: { id: response.body.id as string },
    });
    const persistedEvents = await prisma.analysisJobEvent.findMany({
      where: { analysisJobId: response.body.id as string },
      orderBy: { createdAt: 'asc' },
    });

    expect(persistedJob?.traceId).toBe(response.headers['x-request-id']);
    expect(fakeQueue.jobs[0]?.data).toMatchObject({
      analysisJobId: response.body.id,
      traceId: response.headers['x-request-id'],
    });
    expect(persistedEvents.map((event) => event?.stage)).toEqual([
      'import_started',
      'import_pgn_parsed',
      'import_game_created',
      'analysis_job_created',
      'analysis_job_enqueue_started',
      'analysis_job_enqueued',
    ]);

    const gamesResponse = await request(getServer(app))
      .get(`/students/${studentId}/games`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(gamesResponse.body.items[0]).toMatchObject({
      id: response.body.gameId,
      event: 'Live Chess',
      site: 'Chess.com',
      whitePlayerName: 'yeeet555555',
      blackPlayerName: 'AUKYJL',
      openingHeader: "Bishop's Opening: Warsaw Gambit",
      rawResult: '1-0',
      derivedResult: 'WIN',
      latestAnalysisJobStatus: 'PENDING',
    });

    const jobHistoryResponse = await request(getServer(app))
      .get(`/analysis/jobs?studentId=${studentId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(jobHistoryResponse.body.items[0]).toMatchObject({
      id: response.body.id,
      gameId: response.body.gameId,
      studentId,
      jobType: 'ANALYSIS',
    });
  });

  it('rejects invalid PGN and archived-student imports, and flags duplicates', async () => {
    const { accessToken, studentId } = await registerCoachAndStudent(app);
    const server = getServer(app);
    const payload = {
      studentColor: 'WHITE',
      rawPgn: `[Event "Training"]
[Result "1-0"]

1. e4 { [%eval 0.2] } e5 { [%eval 0.1] } 2. Nf3 { [%eval 0.5] } Nc6 1-0`,
    };

    await request(server)
      .post(`/students/${studentId}/imports/pgn`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...payload, rawPgn: 'broken pgn' })
      .expect(400);

    await request(server)
      .post(`/students/${studentId}/imports/pgn`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload)
      .expect(201);

    const duplicateResponse = await request(server)
      .post(`/students/${studentId}/imports/pgn`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ...payload,
        rawPgn: `[Event "Training"]\r
[Result "1-0"]


1.   e4 {   [%eval 0.2]   } e5\t{ [%eval 0.1] }\t2. Nf3 { [%eval 0.5] } Nc6 1-0`,
      })
      .expect(201);

    expect(duplicateResponse.body.isDuplicate).toBe(true);

    await request(server)
      .post(`/students/${studentId}/archive`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ archived: true })
      .expect(200);

    await request(server)
      .post(`/students/${studentId}/imports/pgn`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload)
      .expect(422);
  });

  it('keeps the import flow successful when analysis job event persistence is unavailable', async () => {
    const { accessToken, studentId } = await registerCoachAndStudent(app);
    const rawPgn = readFileSync(
      new URL(
        '../fixtures/pgn/annotated-lichess-with-eval.pgn',
        import.meta.url,
      ),
      'utf8',
    );
    const createSpy = jest
      .spyOn(prisma.analysisJobEvent, 'create')
      .mockRejectedValue(new Error('events offline'));
    const updateSpy = jest
      .spyOn(prisma.analysisJobEvent, 'updateMany')
      .mockRejectedValue(new Error('events offline'));

    const response = await request(getServer(app))
      .post(`/students/${studentId}/imports/pgn`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        studentColor: 'WHITE',
        sourceLabel: 'Annotated export',
        rawPgn,
      })
      .expect(201);

    const persistedJob = await prisma.analysisJob.findUnique({
      where: { id: response.body.id as string },
    });
    const persistedEvents = await prisma.analysisJobEvent.findMany({
      where: { traceId: response.headers['x-request-id'] },
    });

    expect(createSpy).toHaveBeenCalled();
    expect(updateSpy).toHaveBeenCalled();
    expect(persistedJob).toMatchObject({
      id: response.body.id,
      status: 'PENDING',
      traceId: response.headers['x-request-id'],
    });
    expect(fakeQueue.jobs[0]?.data).toMatchObject({
      analysisJobId: response.body.id,
      traceId: response.headers['x-request-id'],
    });
    expect(persistedEvents).toEqual([]);
  });

  it('paginates games by DB cursor and filters by latest job status only', async () => {
    const { accessToken, studentId } = await registerCoachAndStudent(app);
    const coach = (await prisma.coachAccount.findUnique({
      where: { email: 'coach@example.com' },
    })) as { id: string } | null;

    expect(coach).toBeTruthy();

    const gameA = await prisma.game.create({
      data: {
        coachAccountId: coach!.id,
        studentId,
        sourceType: 'MANUAL_PGN',
        sourceLabel: 'Game A',
        studentColor: 'WHITE',
        event: 'Game A',
        site: null,
        whitePlayerName: null,
        blackPlayerName: null,
        openingHeader: null,
        ecoCode: null,
        rawResult: '1-0',
        derivedResult: 'WIN',
        plyCount: 20,
        rawPgn: '1. e4 e5 1-0',
        normalizedPgnHash: 'hash-a',
        hasEngineAnnotations: false,
        annotationCoverage: 'NONE',
        reducedConfidenceWarning: null,
      },
    });
    const gameB = await prisma.game.create({
      data: {
        coachAccountId: coach!.id,
        studentId,
        sourceType: 'MANUAL_PGN',
        sourceLabel: 'Game B',
        studentColor: 'WHITE',
        event: 'Game B',
        site: null,
        whitePlayerName: null,
        blackPlayerName: null,
        openingHeader: null,
        ecoCode: null,
        rawResult: '0-1',
        derivedResult: 'LOSS',
        plyCount: 24,
        rawPgn: '1. d4 d5 0-1',
        normalizedPgnHash: 'hash-b',
        hasEngineAnnotations: false,
        annotationCoverage: 'NONE',
        reducedConfidenceWarning: null,
      },
    });

    await prisma.game.update({
      where: { id: gameA.id },
      data: {
        importedAt: new Date('2026-08-08T09:00:00.000Z'),
        createdAt: new Date('2026-08-08T09:00:00.000Z'),
      },
    });
    await prisma.game.update({
      where: { id: gameB.id },
      data: {
        importedAt: new Date('2026-08-08T08:00:00.000Z'),
        createdAt: new Date('2026-08-08T08:00:00.000Z'),
      },
    });

    const olderJobA = await prisma.analysisJob.create({
      data: {
        coachAccountId: coach!.id,
        studentId,
        gameId: gameA.id,
        jobType: 'ANALYSIS',
        queueName: 'analysis',
      },
    });
    const latestJobA = await prisma.analysisJob.create({
      data: {
        coachAccountId: coach!.id,
        studentId,
        gameId: gameA.id,
        jobType: 'ANALYSIS',
        queueName: 'analysis',
      },
    });
    const olderJobB = await prisma.analysisJob.create({
      data: {
        coachAccountId: coach!.id,
        studentId,
        gameId: gameB.id,
        jobType: 'ANALYSIS',
        queueName: 'analysis',
      },
    });
    const latestJobB = await prisma.analysisJob.create({
      data: {
        coachAccountId: coach!.id,
        studentId,
        gameId: gameB.id,
        jobType: 'ANALYSIS',
        queueName: 'analysis',
      },
    });

    await prisma.analysisJob.update({
      where: { id: olderJobA.id },
      data: {
        status: AnalysisJobStatus.COMPLETED,
        createdAt: new Date('2026-08-08T09:01:00.000Z'),
      },
    });
    await prisma.analysisJob.update({
      where: { id: latestJobA.id },
      data: {
        status: AnalysisJobStatus.FAILED,
        createdAt: new Date('2026-08-08T09:02:00.000Z'),
      },
    });
    await prisma.analysisJob.update({
      where: { id: olderJobB.id },
      data: {
        status: AnalysisJobStatus.FAILED,
        createdAt: new Date('2026-08-08T08:01:00.000Z'),
      },
    });
    await prisma.analysisJob.update({
      where: { id: latestJobB.id },
      data: {
        status: AnalysisJobStatus.COMPLETED,
        createdAt: new Date('2026-08-08T08:02:00.000Z'),
      },
    });

    const firstPageResponse = await request(getServer(app))
      .get(`/students/${studentId}/games?limit=1`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(firstPageResponse.body.items).toEqual([
      expect.objectContaining({
        id: gameA.id,
        latestAnalysisJobId: latestJobA.id,
        latestAnalysisJobStatus: AnalysisJobStatus.FAILED,
      }),
    ]);
    expect(firstPageResponse.body.nextCursor).toBe(gameA.id);

    const secondPageResponse = await request(getServer(app))
      .get(
        `/students/${studentId}/games?limit=1&cursor=${firstPageResponse.body.nextCursor}`,
      )
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(secondPageResponse.body.items).toEqual([
      expect.objectContaining({
        id: gameB.id,
        latestAnalysisJobId: latestJobB.id,
        latestAnalysisJobStatus: AnalysisJobStatus.COMPLETED,
      }),
    ]);
    expect(secondPageResponse.body.nextCursor).toBeNull();

    const filteredResponse = await request(getServer(app))
      .get(`/students/${studentId}/games?analysisStatus=FAILED`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(filteredResponse.body.items).toEqual([
      expect.objectContaining({
        id: gameA.id,
        latestAnalysisJobId: latestJobA.id,
        latestAnalysisJobStatus: AnalysisJobStatus.FAILED,
      }),
    ]);
  });

  it('keeps latestAnalysis fields pinned to the latest analysis job when newer report jobs exist', async () => {
    const { accessToken, studentId } = await registerCoachAndStudent(app);
    const coach = (await prisma.coachAccount.findUnique({
      where: { email: 'coach@example.com' },
    })) as { id: string } | null;

    expect(coach).toBeTruthy();

    const game = await prisma.game.create({
      data: {
        coachAccountId: coach!.id,
        studentId,
        sourceType: 'MANUAL_PGN',
        sourceLabel: 'Analysis with report',
        studentColor: 'WHITE',
        event: 'Training',
        site: 'Lichess',
        whitePlayerName: 'Student',
        blackPlayerName: 'Opponent',
        openingHeader: 'Italian Game',
        ecoCode: 'C50',
        rawResult: '1-0',
        derivedResult: 'WIN',
        plyCount: 42,
        rawPgn: '[Event "Training"]',
        normalizedPgnHash: 'analysis-with-report-hash',
        hasEngineAnnotations: true,
        annotationCoverage: 'FULL',
        reducedConfidenceWarning: null,
      },
    });
    const analysisJob = await prisma.analysisJob.create({
      data: {
        coachAccountId: coach!.id,
        studentId,
        gameId: game.id,
        jobType: AnalysisJobType.ANALYSIS,
        queueName: 'analysis',
      },
    });

    await prisma.analysisJob.update({
      where: { id: analysisJob.id },
      data: {
        status: AnalysisJobStatus.COMPLETED,
        progressPercent: 100,
        startedAt: new Date('2026-08-08T10:00:00.000Z'),
        completedAt: new Date('2026-08-08T10:05:00.000Z'),
        createdAt: new Date('2026-08-08T10:00:00.000Z'),
      },
    });

    const analysis = await prisma.gameAnalysis.create({
      data: {
        coachAccountId: coach!.id,
        studentId,
        gameId: game.id,
        analysisJobId: analysisJob.id,
        confidenceLevel: 'HIGH',
        overallDiagnosis: 'Saved completed analysis',
        openingName: 'Italian Game',
        result: 'WIN',
        mainWeaknessTag: WeaknessTag.CALCULATION_DEPTH,
        secondaryWeaknessTags: [],
        recommendedLessonTitle: 'Candidate move discipline',
        recommendedLessonWhy: 'Missed forcing sequence',
        recommendedFocusPoints: ['Check forcing moves first'],
        rawExtractedContext: {
          annotationCoverage: 'FULL',
          reducedConfidenceWarning: null,
        },
        rawAnalysisJson: {
          source: 'seeded-e2e',
        },
      },
    });
    const reportJob = await prisma.analysisJob.create({
      data: {
        coachAccountId: coach!.id,
        studentId,
        gameId: game.id,
        jobType: AnalysisJobType.REPORT_GENERATION,
        queueName: 'analysis',
        sourceAnalysisId: analysis.id,
        reportAudience: ReportAudience.COACH,
      },
    });

    await prisma.analysisJob.update({
      where: { id: reportJob.id },
      data: {
        status: AnalysisJobStatus.PENDING,
        createdAt: new Date('2026-08-08T11:00:00.000Z'),
      },
    });

    const gameDetailResponse = await request(getServer(app))
      .get(`/games/${game.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(gameDetailResponse.body).toMatchObject({
      id: game.id,
      latestAnalysisJobId: analysisJob.id,
      latestAnalysisJobStatus: AnalysisJobStatus.COMPLETED,
      latestAnalysisId: analysis.id,
    });

    const filteredResponse = await request(getServer(app))
      .get(`/students/${studentId}/games?analysisStatus=COMPLETED`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(filteredResponse.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: game.id,
          latestAnalysisJobId: analysisJob.id,
          latestAnalysisJobStatus: AnalysisJobStatus.COMPLETED,
          latestAnalysisId: analysis.id,
        }),
      ]),
    );
  });
});

async function registerCoachAndStudent(app: INestApplication) {
  const server = getServer(app);
  const authResponse = await request(server).post('/auth/register').send({
    email: 'coach@example.com',
    password: 'strongpass1',
    displayName: 'Coach',
  });
  const accessToken = authResponse.body.accessToken as string;
  const studentResponse = await request(server)
    .post('/students')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      displayName: 'Student',
    });

  return {
    accessToken,
    studentId: studentResponse.body.id as string,
  };
}

function getServer(app: INestApplication): TestServer {
  return app.getHttpServer() as TestServer;
}
