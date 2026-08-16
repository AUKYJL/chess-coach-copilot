import { INestApplication } from '@nestjs/common';
import { readFileSync } from 'fs';
import request from 'supertest';
import {
  AnalysisJobStatus,
  AnalysisJobType,
  AnnotationCoverage,
  ConfidenceLevel,
  ExternalPlatform,
  GameResult,
  GameSourceType,
  MomentSeverity,
  MoveColor,
  ReportAudience,
  StudentColor,
  WeaknessTag,
} from '../../src/generated/prisma/client.js';
import { createE2eApp } from '../helpers/create-e2e-app.js';
import { InMemoryPrismaService } from '../helpers/in-memory-prisma.js';
import { getServer, registerCoach } from '../helpers/us3-fixtures.js';

const annotatedPgn = readFileSync(
  new URL('../fixtures/pgn/annotated-lichess-with-eval.pgn', import.meta.url),
  'utf8',
);

const opaqueIds = {
  studentId: 'seed-student-boris-new',
  gameId: 'seed-game-boris-1',
  analysisId: 'seed-analysis-boris-1',
  completedJobId: 'seed-job-boris-analysis-1',
  failedJobId: 'seed-job-boris-analysis-failed',
  externalAccountId: 'seed-external-account-boris-1',
  reportId: 'seed-report-boris-1',
  homeworkId: 'seed-homework-boris-1',
} as const;

describe('Opaque route ids (e2e)', () => {
  let app: INestApplication;
  let prisma: InMemoryPrismaService;

  beforeEach(async () => {
    ({ app, prisma } = await createE2eApp());
  });

  afterEach(async () => {
    await app.close();
  });

  it('accepts opaque string ids on read routes', async () => {
    const fixture = await createOpaqueIdFixture(app, prisma);
    const server = getServer(app);

    await request(server)
      .get(`/students/${fixture.studentId}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.id).toBe(fixture.studentId);
      });

    await request(server)
      .get(`/students/${fixture.studentId}/overview`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.student.id).toBe(fixture.studentId);
      });

    await request(server)
      .get(`/students/${fixture.studentId}/analysis-profile`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200);

    await request(server)
      .get(`/students/${fixture.studentId}/performance-trend`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.points).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              value: 1,
            }),
          ]),
        );
      });

    await request(server)
      .get(`/students/${fixture.studentId}/progress`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('not-enough-data');
      });

    await request(server)
      .get(`/students/${fixture.studentId}/games`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.items[0].id).toBe(fixture.gameId);
      });

    await request(server)
      .get(`/games/${fixture.gameId}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.id).toBe(fixture.gameId);
      });

    await request(server)
      .get(`/games/${fixture.gameId}/pgn`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.gameId).toBe(fixture.gameId);
      });

    await request(server)
      .get(`/analysis/${fixture.analysisId}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.id).toBe(fixture.analysisId);
      });

    await request(server)
      .get(`/analysis/jobs/${fixture.failedJobId}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.id).toBe(fixture.failedJobId);
      });

    await request(server)
      .get(`/reports/${fixture.reportId}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.id).toBe(fixture.reportId);
      });

    await request(server)
      .get(`/homework/${fixture.homeworkId}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.id).toBe(fixture.homeworkId);
      });

    await request(server)
      .get(`/students/${fixture.studentId}/external-accounts`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toEqual([
          expect.objectContaining({
            id: fixture.externalAccountId,
          }),
        ]);
      });
  });

  it('accepts opaque string ids on write routes', async () => {
    const fixture = await createOpaqueIdFixture(app, prisma);
    const server = getServer(app);

    await request(server)
      .post(`/students/${fixture.studentId}/imports/pgn`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .send({
        studentColor: StudentColor.WHITE,
        sourceLabel: 'Opaque import',
        rawPgn: annotatedPgn,
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.studentId).toBe(fixture.studentId);
      });

    await request(server)
      .patch(
        `/students/${fixture.studentId}/external-accounts/${fixture.externalAccountId}`,
      )
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .send({
        platform: ExternalPlatform.CHESS_COM,
        username: 'boris-chesscom',
      })
      .expect(200);

    await request(server)
      .delete(
        `/students/${fixture.studentId}/external-accounts/${fixture.externalAccountId}`,
      )
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(204);

    await request(server)
      .post(`/analysis/${fixture.analysisId}/reports/generate`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .send({
        audience: ReportAudience.COACH,
      })
      .expect(201);

    await request(server)
      .patch(`/reports/${fixture.reportId}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .send({
        title: 'Edited opaque report',
        content: {
          text: 'Edited opaque report body.',
        },
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.id).toBe(fixture.reportId);
        expect(body.content.text).toBe('Edited opaque report body.');
      });

    await request(server)
      .post(`/analysis/${fixture.analysisId}/homework/generate`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(201);

    await request(server)
      .patch(`/homework/${fixture.homeworkId}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .send({
        title: 'Edited opaque homework',
        content: {
          overview: 'Edited overview',
          exercises: ['Edited exercise'],
          focusPoints: ['Edited focus'],
          notes: ['Edited note'],
        },
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.id).toBe(fixture.homeworkId);
      });

    await request(server)
      .post(`/analysis/jobs/${fixture.failedJobId}/retry`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.id).toBe(fixture.failedJobId);
        expect(body.status).toBe(AnalysisJobStatus.PENDING);
      });

    await request(server)
      .delete(`/reports/${fixture.reportId}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(204);

    await request(server)
      .delete(`/homework/${fixture.homeworkId}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(204);
  });

  it('returns 404 instead of 400 for absent opaque ids', async () => {
    const fixture = await createOpaqueIdFixture(app, prisma);
    const server = getServer(app);

    await request(server)
      .get('/students/missing-student-id')
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(404);

    await request(server)
      .get('/students/missing-student-id/overview')
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(404);

    await request(server)
      .get('/students/missing-student-id/progress')
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(404);

    await request(server)
      .get('/analysis/missing-analysis-id')
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(404);

    await request(server)
      .get('/games/missing-game-id')
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(404);

    await request(server)
      .get('/analysis/jobs/missing-job-id')
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(404);

    await request(server)
      .get('/reports/missing-report-id')
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(404);

    await request(server)
      .get('/homework/missing-homework-id')
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(404);

    await request(server)
      .patch(
        `/students/${fixture.studentId}/external-accounts/missing-external-id`,
      )
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .send({
        platform: ExternalPlatform.CHESS_COM,
        username: 'missing',
      })
      .expect(404);
  });
});

async function createOpaqueIdFixture(
  app: INestApplication,
  prisma: InMemoryPrismaService,
) {
  const email = 'opaque-route-ids@example.com';
  const accessToken = await registerCoach(app, email);
  const coach = (await prisma.coachAccount.findUnique({
    where: { email },
  })) as { id: string } | null;

  if (!coach) {
    throw new Error('Coach fixture was not created');
  }

  await prisma.student.create({
    data: {
      coachAccountId: coach.id,
      displayName: 'Boris',
      birthYear: 2013,
      rating: 1100,
      notes: 'Seeded opaque id student',
    },
  });
  const createdStudent = (await prisma.student.findFirst({
    where: {
      coachAccountId: coach.id,
    },
  })) as { id: string } | null;

  if (!createdStudent) {
    throw new Error('Student fixture was not created');
  }

  await prisma.student.update({
    where: { id: createdStudent.id },
    data: {
      id: opaqueIds.studentId,
    },
  });

  await prisma.externalAccount.create({
    data: {
      studentId: opaqueIds.studentId,
      platform: ExternalPlatform.LICHESS,
      username: 'boris-lichess',
    },
  });
  const createdExternalAccount = (await prisma.externalAccount.findFirst({
    where: {
      studentId: opaqueIds.studentId,
      platform: ExternalPlatform.LICHESS,
      username: 'boris-lichess',
    },
  })) as { id: string } | null;

  if (!createdExternalAccount) {
    throw new Error('External account fixture was not created');
  }

  await prisma.externalAccount.update({
    where: { id: createdExternalAccount.id },
    data: {
      id: opaqueIds.externalAccountId,
    },
  });

  const game = await prisma.game.create({
    data: {
      coachAccountId: coach.id,
      studentId: opaqueIds.studentId,
      sourceType: GameSourceType.MANUAL_PGN,
      sourceLabel: 'Seeded opaque game',
      studentColor: StudentColor.WHITE,
      event: 'Training Game',
      site: 'Lichess',
      whitePlayerName: 'Boris',
      blackPlayerName: 'Coach',
      openingHeader: 'Italian Game',
      ecoCode: 'C50',
      rawResult: '1-0',
      derivedResult: GameResult.WIN,
      plyCount: 24,
      rawPgn: '[Event "Opaque"]\n[Result "1-0"]\n\n1. e4 e5 1-0',
      normalizedPgnHash: 'opaque-route-hash-game-1',
      hasEngineAnnotations: true,
      annotationCoverage: AnnotationCoverage.FULL,
      reducedConfidenceWarning: null,
    },
  });
  await prisma.game.update({
    where: { id: game.id },
    data: {
      id: opaqueIds.gameId,
    },
  });

  const completedJob = await prisma.analysisJob.create({
    data: {
      coachAccountId: coach.id,
      studentId: opaqueIds.studentId,
      gameId: opaqueIds.gameId,
      jobType: AnalysisJobType.ANALYSIS,
      queueName: 'analysis',
    },
  });
  await prisma.analysisJob.update({
    where: { id: completedJob.id },
    data: {
      id: opaqueIds.completedJobId,
    },
  });

  await prisma.analysisJob.update({
    where: { id: opaqueIds.completedJobId },
    data: {
      status: AnalysisJobStatus.COMPLETED,
      progressPercent: 100,
      completedAt: new Date('2026-08-10T10:00:00.000Z'),
    },
  });

  const failedJob = await prisma.analysisJob.create({
    data: {
      coachAccountId: coach.id,
      studentId: opaqueIds.studentId,
      gameId: opaqueIds.gameId,
      jobType: AnalysisJobType.ANALYSIS,
      queueName: 'analysis',
    },
  });
  await prisma.analysisJob.update({
    where: { id: failedJob.id },
    data: {
      id: opaqueIds.failedJobId,
    },
  });

  await prisma.analysisJob.update({
    where: { id: opaqueIds.failedJobId },
    data: {
      status: AnalysisJobStatus.FAILED,
      failureCode: 'GENERATION_FAILED',
      failureMessage: 'Synthetic opaque-id failure',
      progressPercent: 100,
      completedAt: new Date('2026-08-11T10:00:00.000Z'),
    },
  });

  const analysis = await prisma.gameAnalysis.create({
    data: {
      coachAccountId: coach.id,
      studentId: opaqueIds.studentId,
      gameId: opaqueIds.gameId,
      analysisJobId: opaqueIds.completedJobId,
      confidenceLevel: ConfidenceLevel.HIGH,
      overallDiagnosis: 'Recurring tactical misses.',
      openingName: 'Italian Game',
      result: GameResult.WIN,
      mainWeaknessTag: WeaknessTag.CALCULATION_DEPTH,
      secondaryWeaknessTags: [WeaknessTag.TIME_MANAGEMENT],
      recommendedLessonTitle: 'Candidate move discipline',
      recommendedLessonWhy: 'Missed a forcing sequence.',
      recommendedFocusPoints: ['Checks, captures, threats'],
      rawExtractedContext: { source: 'opaque-route-ids' },
      rawAnalysisJson: { source: 'opaque-route-ids' },
    },
  });
  await prisma.gameAnalysis.update({
    where: { id: analysis.id },
    data: {
      id: opaqueIds.analysisId,
    },
  });

  await prisma.gameAnalysis.update({
    where: { id: opaqueIds.analysisId },
    data: {
      createdAt: new Date('2026-08-12T10:00:00.000Z'),
    },
  });

  await prisma.criticalMoment.createMany({
    data: [
      {
        analysisId: opaqueIds.analysisId,
        ply: 18,
        fullMoveNumber: 9,
        moveNumber: '9.',
        moveColor: MoveColor.WHITE,
        san: 'Bxf7+',
        lan: null,
        uci: null,
        beforeFen: 'before-fen',
        afterFen: 'after-fen',
        bestMove: 'd4',
        bestVariation: ['d4', 'exd4'],
        nags: ['$2'],
        comments: ['Missed the simplest continuation'],
        evaluationBefore: {
          kind: 'centipawns',
          value: 30,
        },
        evaluationAfter: {
          kind: 'centipawns',
          value: -90,
        },
        severity: MomentSeverity.BLUNDER,
        sourceEvidence: { source: 'opaque-route-ids' },
      },
    ],
  });
  const [criticalMoment] = await prisma.criticalMoment.findMany({
    where: { analysisId: opaqueIds.analysisId },
  });

  await prisma.mistake.createMany({
    data: [
      {
        analysisId: opaqueIds.analysisId,
        criticalMomentId: criticalMoment.id,
        severity: MomentSeverity.BLUNDER,
        category: 'calculation',
        explanation: 'Missed the forcing line.',
        suggestedFix: 'Check forcing moves first.',
        sourceEvidence: { source: 'opaque-route-ids' },
      },
    ],
  });

  await prisma.report.create({
    data: {
      coachAccountId: coach.id,
      studentId: opaqueIds.studentId,
      analysisId: opaqueIds.analysisId,
      title: 'Opaque report',
      audience: ReportAudience.COACH,
      content: { summary: 'report' },
      promptVersion: 'test-v1',
      model: 'fake-llm',
    },
  });
  const createdReport = (await prisma.report.findFirst({
    where: {
      coachAccountId: coach.id,
    },
  })) as { id: string } | null;

  if (!createdReport) {
    throw new Error('Report fixture was not created');
  }

  await prisma.report.update({
    where: { id: createdReport.id },
    data: {
      id: opaqueIds.reportId,
    },
  });

  await prisma.homework.create({
    data: {
      coachAccountId: coach.id,
      studentId: opaqueIds.studentId,
      analysisId: opaqueIds.analysisId,
      title: 'Opaque homework',
      content: { overview: 'homework' },
      promptVersion: 'test-v1',
      model: 'fake-llm',
    },
  });
  const createdHomework = (await prisma.homework.findFirst({
    where: {
      coachAccountId: coach.id,
    },
  })) as { id: string } | null;

  if (!createdHomework) {
    throw new Error('Homework fixture was not created');
  }

  await prisma.homework.update({
    where: { id: createdHomework.id },
    data: {
      id: opaqueIds.homeworkId,
    },
  });

  return {
    accessToken,
    studentId: opaqueIds.studentId,
    gameId: opaqueIds.gameId,
    analysisId: opaqueIds.analysisId,
    failedJobId: opaqueIds.failedJobId,
    externalAccountId: opaqueIds.externalAccountId,
    reportId: opaqueIds.reportId,
    homeworkId: opaqueIds.homeworkId,
  };
}
