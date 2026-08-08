import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  AnalysisJobStatus,
  WeaknessTag,
} from '../../src/generated/prisma/client.js';
import { createE2eApp } from '../helpers/create-e2e-app.js';
import { InMemoryPrismaService } from '../helpers/in-memory-prisma.js';

interface StudentBody {
  id: string;
  displayName?: string;
  rating: number | null;
  archivedAt: string | null;
}

interface StudentListBody {
  items: Array<
    StudentBody & {
      completedAnalysisCount: number;
      latestAnalysisJobStatus: AnalysisJobStatus | null;
      mainWeaknessTag: WeaknessTag | null;
    }
  >;
}

type TestServer = Parameters<typeof request>[0];

describe('StudentsController (e2e)', () => {
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

  it('supports dashboard summary filtering, coach-owned CRUD, and archive state changes', async () => {
    const coach = await registerCoach(app, 'coach-a@example.com');

    const createResponse = await request(getServer(app))
      .post('/students')
      .set('Authorization', `Bearer ${coach.accessToken}`)
      .send({
        displayName: 'Student A',
        birthYear: 2012,
        rating: 1400,
        notes: 'Works on tactics',
      })
      .expect(201);
    const createdStudent = createResponse.body as StudentBody;

    const studentId = createdStudent.id;

    await request(getServer(app))
      .patch(`/students/${studentId}`)
      .set('Authorization', `Bearer ${coach.accessToken}`)
      .send({
        rating: 1450,
      })
      .expect(200);

    const getResponse = await request(getServer(app))
      .get(`/students/${studentId}`)
      .set('Authorization', `Bearer ${coach.accessToken}`)
      .expect(200);
    const fetchedStudent = getResponse.body as StudentBody;

    expect(fetchedStudent.rating).toBe(1450);

    const archiveResponse = await request(getServer(app))
      .post(`/students/${studentId}/archive`)
      .set('Authorization', `Bearer ${coach.accessToken}`)
      .send({ archived: true })
      .expect(200);
    const archivedStudent = archiveResponse.body as StudentBody;

    expect(archivedStudent.archivedAt).toEqual(expect.any(String));

    const listResponse = await request(getServer(app))
      .get('/students?archived=all')
      .set('Authorization', `Bearer ${coach.accessToken}`)
      .expect(200);
    const listBody = listResponse.body as StudentListBody;

    expect(listBody.items).toHaveLength(1);
    expect(listBody.items[0]).toMatchObject({
      id: studentId,
      displayName: 'Student A',
      completedAnalysisCount: 0,
      latestAnalysisJobStatus: null,
      mainWeaknessTag: null,
    });

    const archivedOnlyResponse = await request(getServer(app))
      .get('/students?archived=archived')
      .set('Authorization', `Bearer ${coach.accessToken}`)
      .expect(200);

    expect(archivedOnlyResponse.body.items).toHaveLength(1);

    const activeOnlyResponse = await request(getServer(app))
      .get('/students?archived=active')
      .set('Authorization', `Bearer ${coach.accessToken}`)
      .expect(200);

    expect(activeOnlyResponse.body.items).toHaveLength(0);
  });

  it('blocks cross-coach access to student records', async () => {
    const coachA = await registerCoach(app, 'coach-a@example.com');
    const coachB = await registerCoach(app, 'coach-b@example.com');

    const createResponse = await request(getServer(app))
      .post('/students')
      .set('Authorization', `Bearer ${coachA.accessToken}`)
      .send({
        displayName: 'Student A',
      })
      .expect(201);
    const createdStudent = createResponse.body as StudentBody;

    const studentId = createdStudent.id;

    await request(getServer(app))
      .get(`/students/${studentId}`)
      .set('Authorization', `Bearer ${coachB.accessToken}`)
      .expect(404);

    await request(getServer(app))
      .patch(`/students/${studentId}`)
      .set('Authorization', `Bearer ${coachB.accessToken}`)
      .send({
        displayName: 'Stolen Student',
      })
      .expect(404);

    await request(getServer(app))
      .get(`/students/${studentId}/overview`)
      .set('Authorization', `Bearer ${coachB.accessToken}`)
      .expect(404);

    await request(getServer(app))
      .get(`/students/${studentId}/analysis-profile`)
      .set('Authorization', `Bearer ${coachB.accessToken}`)
      .expect(404);
  });

  it('returns student overview and aggregated analysis profile', async () => {
    const coach = await registerCoach(app, 'coach-overview@example.com');
    const studentId = await createStudent(app, coach.accessToken);
    const coachAccount = await prisma.coachAccount.findUnique({
      where: { email: 'coach-overview@example.com' },
    });
    const coachAccountId = (coachAccount as { id: string } | null)?.id;

    expect(coachAccountId).toBeTruthy();

    const game = await prisma.game.create({
      data: {
        coachAccountId: coachAccountId!,
        studentId,
        sourceType: 'MANUAL_PGN',
        sourceLabel: 'Annotated export',
        studentColor: 'WHITE',
        event: 'Training Game',
        site: 'Lichess',
        whitePlayerName: 'Student',
        blackPlayerName: 'Opponent',
        openingHeader: 'Ruy Lopez',
        ecoCode: 'C60',
        rawResult: '1-0',
        derivedResult: 'WIN',
        plyCount: 24,
        rawPgn: '1. e4 e5 1-0',
        normalizedPgnHash: 'hash-1',
        hasEngineAnnotations: true,
        annotationCoverage: 'FULL',
        reducedConfidenceWarning: null,
      },
    });
    const analysisJob = await prisma.analysisJob.create({
      data: {
        coachAccountId: coachAccountId!,
        studentId,
        gameId: game.id,
        jobType: 'ANALYSIS',
        queueName: 'analysis',
      },
    });
    const analysis = await prisma.gameAnalysis.create({
      data: {
        coachAccountId: coachAccountId!,
        studentId,
        gameId: game.id,
        analysisJobId: analysisJob.id,
        confidenceLevel: 'HIGH',
        overallDiagnosis: 'Recurring tactical misses.',
        openingName: 'Ruy Lopez',
        result: 'WIN',
        mainWeaknessTag: 'CALCULATION_DEPTH',
        secondaryWeaknessTags: ['TIME_MANAGEMENT', 'TUNNEL_VISION'],
        recommendedLessonTitle: 'Candidate move discipline',
        recommendedLessonWhy: 'Missed a forcing sequence.',
        recommendedFocusPoints: ['Checks, captures, threats'],
        rawExtractedContext: { source: 'test' },
        rawAnalysisJson: { source: 'test' },
      },
    });
    await prisma.mistake.createMany({
      data: [
        {
          analysisId: analysis.id,
          criticalMomentId: null,
          severity: 'MISTAKE',
          category: 'calculation',
          explanation: 'Missed a forcing line.',
          suggestedFix: 'Check forcing moves first.',
          sourceEvidence: { source: 'test' },
        },
      ],
    });
    await prisma.report.create({
      data: {
        coachAccountId: coachAccountId!,
        studentId,
        analysisId: analysis.id,
        title: 'Coach report',
        audience: 'COACH',
        content: { summary: 'report' },
        promptVersion: 'test-v1',
        model: 'fake-llm',
      },
    });
    await prisma.homework.create({
      data: {
        coachAccountId: coachAccountId!,
        studentId,
        analysisId: analysis.id,
        title: 'Homework',
        content: { summary: 'homework' },
        promptVersion: 'test-v1',
        model: 'fake-llm',
      },
    });
    await prisma.progressSnapshot.create({
      data: {
        coachAccountId: coachAccountId!,
        studentId,
        analysisCount: 3,
        summary: { status: 'ready' },
        promptVersion: 'test-v1',
        model: 'fake-llm',
      },
    });
    await prisma.externalAccount.create({
      data: {
        studentId,
        platform: 'LICHESS',
        username: 'student-a',
      },
    });

    const overviewResponse = await request(getServer(app))
      .get(`/students/${studentId}/overview`)
      .set('Authorization', `Bearer ${coach.accessToken}`)
      .expect(200);

    expect(overviewResponse.body).toMatchObject({
      student: { id: studentId },
      stats: {
        gameCount: 1,
        analysisCount: 1,
        reportCount: 1,
        homeworkCount: 1,
      },
      latestProgress: {
        analysisCount: 3,
      },
      recentGames: [
        {
          id: game.id,
          latestAnalysisJobStatus: 'PENDING',
        },
      ],
      recentAnalyses: [
        {
          id: analysis.id,
          mainWeaknessTag: 'CALCULATION_DEPTH',
        },
      ],
    });

    const profileResponse = await request(getServer(app))
      .get(`/students/${studentId}/analysis-profile`)
      .set('Authorization', `Bearer ${coach.accessToken}`)
      .expect(200);

    expect(profileResponse.body).toMatchObject({
      analysisCountUsed: 1,
      mainWeaknessTag: 'CALCULATION_DEPTH',
      secondaryWeaknessTags: ['TIME_MANAGEMENT', 'TUNNEL_VISION'],
      recommendedLessonTitle: 'Candidate move discipline',
      sampleMistakes: [
        {
          analysisId: analysis.id,
          category: 'calculation',
        },
      ],
    });
  });

  it('uses latest relations in list and limits overview/profile payloads', async () => {
    const coach = await registerCoach(app, 'coach-latest@example.com');
    const studentId = await createStudent(app, coach.accessToken);
    const coachAccount = (await prisma.coachAccount.findUnique({
      where: { email: 'coach-latest@example.com' },
    })) as { id: string } | null;

    expect(coachAccount).toBeTruthy();

    for (let index = 0; index < 6; index += 1) {
      const game = await prisma.game.create({
        data: {
          coachAccountId: coachAccount!.id,
          studentId,
          sourceType: 'MANUAL_PGN',
          sourceLabel: `Recent ${index}`,
          studentColor: 'WHITE',
          event: `Recent ${index}`,
          site: null,
          whitePlayerName: null,
          blackPlayerName: null,
          openingHeader: null,
          ecoCode: null,
          rawResult: '1-0',
          derivedResult: 'WIN',
          plyCount: 20,
          rawPgn: `1. e4 e5 ${index}`,
          normalizedPgnHash: `recent-${index}`,
          hasEngineAnnotations: false,
          annotationCoverage: 'NONE',
          reducedConfidenceWarning: null,
        },
      });
      await prisma.game.update({
        where: { id: game.id },
        data: {
          importedAt: new Date(`2026-08-0${index + 1}T10:00:00.000Z`),
          createdAt: new Date(`2026-08-0${index + 1}T10:00:00.000Z`),
        },
      });
    }

    for (let index = 0; index < 11; index += 1) {
      const game = await prisma.game.create({
        data: {
          coachAccountId: coachAccount!.id,
          studentId,
          sourceType: 'MANUAL_PGN',
          sourceLabel: `Analysis ${index}`,
          studentColor: 'BLACK',
          event: null,
          site: null,
          whitePlayerName: null,
          blackPlayerName: null,
          openingHeader: null,
          ecoCode: null,
          rawResult: '0-1',
          derivedResult: 'LOSS',
          plyCount: 24,
          rawPgn: `1. d4 d5 ${index}`,
          normalizedPgnHash: `analysis-${index}`,
          hasEngineAnnotations: false,
          annotationCoverage: 'NONE',
          reducedConfidenceWarning: null,
        },
      });
      const job = await prisma.analysisJob.create({
        data: {
          coachAccountId: coachAccount!.id,
          studentId,
          gameId: game.id,
          jobType: 'ANALYSIS',
          queueName: 'analysis',
        },
      });
      await prisma.analysisJob.update({
        where: { id: job.id },
        data: {
          status: index === 10 ? 'FAILED' : 'COMPLETED',
          createdAt: new Date(
            `2026-07-${String(index + 1).padStart(2, '0')}T12:00:00.000Z`,
          ),
        },
      });
      const analysis = await prisma.gameAnalysis.create({
        data: {
          coachAccountId: coachAccount!.id,
          studentId,
          gameId: game.id,
          analysisJobId: job.id,
          confidenceLevel: 'HIGH',
          overallDiagnosis: `Diagnosis ${index}`,
          openingName: null,
          result: 'LOSS',
          mainWeaknessTag: index === 0 ? 'MATERIAL_GREED' : 'CALCULATION_DEPTH',
          secondaryWeaknessTags:
            index === 10 ? ['TIME_MANAGEMENT', 'TUNNEL_VISION'] : [],
          recommendedLessonTitle: index === 10 ? 'Latest recommendation' : null,
          recommendedLessonWhy: null,
          recommendedFocusPoints: [],
          rawExtractedContext: { index },
          rawAnalysisJson: { index },
        },
      });
      await prisma.gameAnalysis.update({
        where: { id: analysis.id },
        data: {
          createdAt: new Date(
            `2026-07-${String(index + 1).padStart(2, '0')}T12:30:00.000Z`,
          ),
        },
      });
      await prisma.mistake.createMany({
        data: [
          {
            analysisId: analysis.id,
            criticalMomentId: null,
            severity: index === 10 ? 'BLUNDER' : 'MISTAKE',
            category: 'calculation',
            explanation: `Mistake ${index}`,
            suggestedFix: null,
            sourceEvidence: { index },
          },
        ],
      });
      await prisma.report.create({
        data: {
          coachAccountId: coachAccount!.id,
          studentId,
          analysisId: analysis.id,
          title: `Report ${index}`,
          audience: 'COACH',
          content: { index },
          promptVersion: 'test-v1',
          model: 'fake-llm',
        },
      });
      await prisma.homework.create({
        data: {
          coachAccountId: coachAccount!.id,
          studentId,
          analysisId: analysis.id,
          title: `Homework ${index}`,
          content: { index },
          promptVersion: 'test-v1',
          model: 'fake-llm',
        },
      });
    }

    const listResponse = await request(getServer(app))
      .get('/students?archived=all')
      .set('Authorization', `Bearer ${coach.accessToken}`)
      .expect(200);

    expect(listResponse.body.items).toEqual([
      expect.objectContaining({
        id: studentId,
        completedAnalysisCount: 11,
        latestAnalysisJobStatus: 'FAILED',
        mainWeaknessTag: 'CALCULATION_DEPTH',
      }),
    ]);

    const overviewResponse = await request(getServer(app))
      .get(`/students/${studentId}/overview`)
      .set('Authorization', `Bearer ${coach.accessToken}`)
      .expect(200);

    expect(overviewResponse.body.stats).toMatchObject({
      gameCount: 17,
      analysisCount: 11,
      reportCount: 11,
      homeworkCount: 11,
    });
    expect(overviewResponse.body.recentGames).toHaveLength(5);
    expect(overviewResponse.body.recentAnalyses).toHaveLength(5);
    expect(overviewResponse.body.recentReports).toHaveLength(5);
    expect(overviewResponse.body.recentHomework).toHaveLength(5);

    const profileResponse = await request(getServer(app))
      .get(`/students/${studentId}/analysis-profile`)
      .set('Authorization', `Bearer ${coach.accessToken}`)
      .expect(200);

    expect(profileResponse.body).toMatchObject({
      analysisCountUsed: 10,
      mainWeaknessTag: 'CALCULATION_DEPTH',
      recommendedLessonTitle: 'Latest recommendation',
    });
    expect(profileResponse.body.sampleMistakes[0].severity).toBe('BLUNDER');
  });
});

async function registerCoach(app: INestApplication, email: string) {
  const response = await request(getServer(app))
    .post('/auth/register')
    .send({
      email,
      password: 'strongpass1',
      displayName: email,
    })
    .expect(201);

  return response.body as { accessToken: string };
}

function getServer(app: INestApplication): TestServer {
  return app.getHttpServer() as TestServer;
}

async function createStudent(app: INestApplication, accessToken: string) {
  const response = await request(getServer(app))
    .post('/students')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      displayName: 'Student A',
    })
    .expect(201);

  return (response.body as { id: string }).id;
}
