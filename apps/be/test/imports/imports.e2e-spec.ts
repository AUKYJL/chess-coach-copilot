import { INestApplication } from '@nestjs/common';
import { readFileSync } from 'fs';
import request from 'supertest';
import { AnalysisJobStatus } from '../../src/generated/prisma/client.js';
import { createE2eApp } from '../helpers/create-e2e-app.js';
import { InMemoryPrismaService } from '../helpers/in-memory-prisma.js';

type TestServer = Parameters<typeof request>[0];

describe('ImportsController (e2e)', () => {
  let app: INestApplication;
  let prisma: InMemoryPrismaService;

  beforeEach(async () => {
    const fixture = await createE2eApp();
    app = fixture.app;
    prisma = fixture.prisma;
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
