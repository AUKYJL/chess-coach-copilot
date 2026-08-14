import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  AnalysisJobStatus,
  MomentSeverity,
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
      lastAnalysisAt: string | null;
      latestAnalysisJobStatus: AnalysisJobStatus | null;
      mainWeaknessTag: WeaknessTag | null;
    }
  >;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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

    const defaultStatusesResponse = await request(getServer(app))
      .get('/students')
      .set('Authorization', `Bearer ${coach.accessToken}`)
      .expect(200);

    expect(
      (defaultStatusesResponse.body as StudentListBody).items,
    ).toHaveLength(1);

    const listResponse = await request(getServer(app))
      .get('/students?statuses=active&statuses=archived')
      .set('Authorization', `Bearer ${coach.accessToken}`)
      .expect(200);
    const listBody = listResponse.body as StudentListBody;

    expect(listBody.items).toHaveLength(1);
    expect(listBody.total).toBe(1);
    expect(listBody.page).toBe(1);
    expect(listBody.limit).toBe(20);
    expect(listBody.totalPages).toBe(1);
    expect(listBody.items[0]).toMatchObject({
      id: studentId,
      displayName: 'Student A',
      completedAnalysisCount: 0,
      lastAnalysisAt: null,
      latestAnalysisJobStatus: null,
      mainWeaknessTag: null,
    });

    const archivedOnlyResponse = await request(getServer(app))
      .get('/students?statuses=archived')
      .set('Authorization', `Bearer ${coach.accessToken}`)
      .expect(200);

    expect(archivedOnlyResponse.body.items).toHaveLength(1);

    const activeOnlyResponse = await request(getServer(app))
      .get('/students?statuses=active')
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

    await request(getServer(app))
      .get(`/students/${studentId}/performance-trend`)
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
      .get('/students?statuses=active&statuses=archived')
      .set('Authorization', `Bearer ${coach.accessToken}`)
      .expect(200);

    expect(listResponse.body.items).toEqual([
      expect.objectContaining({
        id: studentId,
        completedAnalysisCount: 11,
        lastAnalysisAt: '2026-07-11T12:30:00.000Z',
        latestAnalysisJobStatus: 'FAILED',
        mainWeaknessTag: 'CALCULATION_DEPTH',
      }),
    ]);
    expect(listResponse.body.total).toBe(1);

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

  it('supports students list search, sorting, pagination, and query validation', async () => {
    const coach = await registerCoach(app, 'coach-list-query@example.com');
    const coachAccountId = await getCoachAccountId(
      prisma,
      'coach-list-query@example.com',
    );
    const alexResponse = await request(getServer(app))
      .post('/students')
      .set('Authorization', `Bearer ${coach.accessToken}`)
      .send({
        displayName: 'Alexander Ivanov',
        rating: 1620,
      })
      .expect(201);
    const borisResponse = await request(getServer(app))
      .post('/students')
      .set('Authorization', `Bearer ${coach.accessToken}`)
      .send({
        displayName: 'Boris Petrov',
        rating: 980,
      })
      .expect(201);
    const claraResponse = await request(getServer(app))
      .post('/students')
      .set('Authorization', `Bearer ${coach.accessToken}`)
      .send({
        displayName: 'Clara Martin',
        rating: 1510,
      })
      .expect(201);
    const alexStudentId = (alexResponse.body as { id: string }).id;
    const borisStudentId = (borisResponse.body as { id: string }).id;
    const claraStudentId = (claraResponse.body as { id: string }).id;

    await request(getServer(app))
      .post(`/students/${borisStudentId}/archive`)
      .set('Authorization', `Bearer ${coach.accessToken}`)
      .send({ archived: true })
      .expect(200);

    await createAnalysisFixture({
      prisma,
      coachAccountId,
      studentId: alexStudentId,
      analysisCreatedAt: new Date('2026-08-03T12:00:00.000Z'),
      jobStatus: 'COMPLETED',
      mistakeSeverities: [MomentSeverity.BLUNDER],
    });
    await createAnalysisFixture({
      prisma,
      coachAccountId,
      studentId: alexStudentId,
      analysisCreatedAt: new Date('2026-08-05T12:00:00.000Z'),
      jobStatus: 'FAILED',
      mistakeSeverities: [MomentSeverity.MISTAKE],
    });
    await createAnalysisFixture({
      prisma,
      coachAccountId,
      studentId: claraStudentId,
      analysisCreatedAt: new Date('2026-08-06T12:00:00.000Z'),
      jobStatus: 'COMPLETED',
      mistakeSeverities: [MomentSeverity.BLUNDER, MomentSeverity.MATE],
    });

    const searchResponse = await request(getServer(app))
      .get('/students?search=  alex  &statuses=active&statuses=archived')
      .set('Authorization', `Bearer ${coach.accessToken}`)
      .expect(200);

    expect(searchResponse.body).toMatchObject({
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
      items: [
        {
          id: alexStudentId,
          displayName: 'Alexander Ivanov',
        },
      ],
    });

    const archivedResponse = await request(getServer(app))
      .get('/students?statuses=archived')
      .set('Authorization', `Bearer ${coach.accessToken}`)
      .expect(200);

    expect(archivedResponse.body.items).toEqual([
      expect.objectContaining({
        id: borisStudentId,
        displayName: 'Boris Petrov',
      }),
    ]);

    const ratingResponse = await request(getServer(app))
      .get('/students?statuses=active&statuses=archived&sort=rating&order=asc')
      .set('Authorization', `Bearer ${coach.accessToken}`)
      .expect(200);

    expect(
      (ratingResponse.body as StudentListBody).items.map((item) => item.id),
    ).toEqual([borisStudentId, claraStudentId, alexStudentId]);

    const analysisCountResponse = await request(getServer(app))
      .get(
        '/students?statuses=active&statuses=archived&sort=completedAnalysisCount&order=desc',
      )
      .set('Authorization', `Bearer ${coach.accessToken}`)
      .expect(200);

    expect(
      (analysisCountResponse.body as StudentListBody).items.map(
        (item) => item.id,
      ),
    ).toEqual([alexStudentId, claraStudentId, borisStudentId]);

    const lastAnalysisResponse = await request(getServer(app))
      .get(
        '/students?statuses=active&statuses=archived&sort=lastAnalysisAt&order=desc',
      )
      .set('Authorization', `Bearer ${coach.accessToken}`)
      .expect(200);

    expect(
      (lastAnalysisResponse.body as StudentListBody).items.map(
        (item) => item.id,
      ),
    ).toEqual([claraStudentId, alexStudentId, borisStudentId]);

    const paginationResponse = await request(getServer(app))
      .get(
        '/students?statuses=active&statuses=archived&sort=rating&order=desc&page=2&limit=1',
      )
      .set('Authorization', `Bearer ${coach.accessToken}`)
      .expect(200);

    expect(paginationResponse.body).toMatchObject({
      total: 3,
      page: 2,
      limit: 1,
      totalPages: 3,
      items: [{ id: claraStudentId }],
    });

    await request(getServer(app))
      .get('/students?sort=unknown')
      .set('Authorization', `Bearer ${coach.accessToken}`)
      .expect(400);

    await request(getServer(app))
      .get('/students?order=sideways')
      .set('Authorization', `Bearer ${coach.accessToken}`)
      .expect(400);

    await request(getServer(app))
      .get('/students?statuses=something-else')
      .set('Authorization', `Bearer ${coach.accessToken}`)
      .expect(400);

    await request(getServer(app))
      .get('/students?limit=101')
      .set('Authorization', `Bearer ${coach.accessToken}`)
      .expect(400);
  });

  it('returns UNKNOWN when performance trend has no completed analyses', async () => {
    const coach = await registerCoach(app, 'coach-trend-empty@example.com');
    const studentId = await createStudent(app, coach.accessToken);

    const response = await request(getServer(app))
      .get(`/students/${studentId}/performance-trend`)
      .set('Authorization', `Bearer ${coach.accessToken}`)
      .expect(200);

    expect(response.body).toEqual({
      direction: 'UNKNOWN',
      primaryMetric: 'Severe mistakes per game',
      range: '90D',
      points: [],
    });
  });

  it('returns UNKNOWN with one point and excludes non-completed or old analyses', async () => {
    const coach = await registerCoach(app, 'coach-trend-single@example.com');
    const studentId = await createStudent(app, coach.accessToken);
    const coachAccountId = await getCoachAccountId(
      prisma,
      'coach-trend-single@example.com',
    );

    await createAnalysisFixture({
      prisma,
      coachAccountId,
      studentId,
      analysisCreatedAt: daysAgoUtc(12),
      jobStatus: 'COMPLETED',
      mistakeSeverities: [MomentSeverity.BLUNDER, MomentSeverity.MATE],
    });
    await createAnalysisFixture({
      prisma,
      coachAccountId,
      studentId,
      analysisCreatedAt: daysAgoUtc(7),
      jobStatus: 'FAILED',
      mistakeSeverities: [MomentSeverity.BLUNDER],
    });
    await createAnalysisFixture({
      prisma,
      coachAccountId,
      studentId,
      analysisCreatedAt: daysAgoUtc(95),
      jobStatus: 'COMPLETED',
      mistakeSeverities: [MomentSeverity.BLUNDER],
    });

    const response = await request(getServer(app))
      .get(`/students/${studentId}/performance-trend`)
      .set('Authorization', `Bearer ${coach.accessToken}`)
      .expect(200);

    expect(response.body).toEqual({
      direction: 'UNKNOWN',
      primaryMetric: 'Severe mistakes per game',
      range: '90D',
      points: [
        {
          date: formatUtcDate(daysAgoUtc(12)),
          value: 2,
        },
      ],
    });
  });

  it('orders 90-day performance trend points ascending and computes severe mistakes per game', async () => {
    const coach = await registerCoach(app, 'coach-trend-ordered@example.com');
    const studentId = await createStudent(app, coach.accessToken);
    const coachAccountId = await getCoachAccountId(
      prisma,
      'coach-trend-ordered@example.com',
    );

    await createAnalysisFixture({
      prisma,
      coachAccountId,
      studentId,
      analysisCreatedAt: daysAgoUtc(5),
      jobStatus: 'COMPLETED',
      mistakeSeverities: [
        MomentSeverity.BLUNDER,
        MomentSeverity.MATE,
        MomentSeverity.MISTAKE,
      ],
    });
    await createAnalysisFixture({
      prisma,
      coachAccountId,
      studentId,
      analysisCreatedAt: daysAgoUtc(20),
      jobStatus: 'COMPLETED',
      mistakeSeverities: [MomentSeverity.MATE, MomentSeverity.INACCURACY],
    });

    const response = await request(getServer(app))
      .get(`/students/${studentId}/performance-trend`)
      .set('Authorization', `Bearer ${coach.accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      direction: 'DECLINING',
      primaryMetric: 'Severe mistakes per game',
      range: '90D',
      points: [
        {
          date: formatUtcDate(daysAgoUtc(20)),
          value: 1,
        },
        {
          date: formatUtcDate(daysAgoUtc(5)),
          value: 2,
        },
      ],
    });
  });

  it('computes IMPROVING, DECLINING, and STABLE performance trend directions', async () => {
    const coach = await registerCoach(
      app,
      'coach-trend-directions@example.com',
    );
    const improvingStudentId = await createStudent(app, coach.accessToken);
    const decliningStudentId = await createStudent(app, coach.accessToken);
    const stableStudentId = await createStudent(app, coach.accessToken);
    const coachAccountId = await getCoachAccountId(
      prisma,
      'coach-trend-directions@example.com',
    );

    await createPerformanceTrendSeries({
      prisma,
      coachAccountId,
      studentId: improvingStudentId,
      values: [4, 3, 1, 0],
    });
    await createPerformanceTrendSeries({
      prisma,
      coachAccountId,
      studentId: decliningStudentId,
      values: [0, 1, 3, 4],
    });
    await createPerformanceTrendSeries({
      prisma,
      coachAccountId,
      studentId: stableStudentId,
      values: [2, 2, 2, 2],
    });

    const [improvingResponse, decliningResponse, stableResponse] =
      await Promise.all([
        request(getServer(app))
          .get(`/students/${improvingStudentId}/performance-trend`)
          .set('Authorization', `Bearer ${coach.accessToken}`)
          .expect(200),
        request(getServer(app))
          .get(`/students/${decliningStudentId}/performance-trend`)
          .set('Authorization', `Bearer ${coach.accessToken}`)
          .expect(200),
        request(getServer(app))
          .get(`/students/${stableStudentId}/performance-trend`)
          .set('Authorization', `Bearer ${coach.accessToken}`)
          .expect(200),
      ]);

    expect(improvingResponse.body.direction).toBe('IMPROVING');
    expect(decliningResponse.body.direction).toBe('DECLINING');
    expect(stableResponse.body.direction).toBe('STABLE');
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

async function getCoachAccountId(
  prismaService: InMemoryPrismaService,
  email: string,
) {
  const coachAccount = (await prismaService.coachAccount.findUnique({
    where: { email },
  })) as { id: string } | null;

  expect(coachAccount).toBeTruthy();

  return coachAccount!.id;
}

function daysAgoUtc(daysAgo: number): Date {
  const date = new Date();

  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - daysAgo);

  return date;
}

function formatUtcDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

async function createAnalysisFixture(args: {
  prisma: InMemoryPrismaService;
  coachAccountId: string;
  studentId: string;
  analysisCreatedAt: Date;
  jobStatus: AnalysisJobStatus;
  mistakeSeverities: MomentSeverity[];
}) {
  const uniqueSuffix = `${args.studentId}-${args.analysisCreatedAt.getTime()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const game = await args.prisma.game.create({
    data: {
      coachAccountId: args.coachAccountId,
      studentId: args.studentId,
      sourceType: 'MANUAL_PGN',
      sourceLabel: `Trend ${uniqueSuffix}`,
      studentColor: 'WHITE',
      event: `Trend ${uniqueSuffix}`,
      site: null,
      whitePlayerName: 'Student',
      blackPlayerName: 'Opponent',
      openingHeader: null,
      ecoCode: null,
      rawResult: '1-0',
      derivedResult: 'WIN',
      plyCount: 24,
      rawPgn: `1. e4 e5 ${uniqueSuffix}`,
      normalizedPgnHash: `trend-${uniqueSuffix}`,
      hasEngineAnnotations: true,
      annotationCoverage: 'FULL',
      reducedConfidenceWarning: null,
    },
  });
  const job = await args.prisma.analysisJob.create({
    data: {
      coachAccountId: args.coachAccountId,
      studentId: args.studentId,
      gameId: game.id,
      jobType: 'ANALYSIS',
      queueName: 'analysis',
    },
  });
  await args.prisma.analysisJob.update({
    where: { id: job.id },
    data: {
      status: args.jobStatus,
    },
  });
  const analysis = await args.prisma.gameAnalysis.create({
    data: {
      coachAccountId: args.coachAccountId,
      studentId: args.studentId,
      gameId: game.id,
      analysisJobId: job.id,
      confidenceLevel: 'HIGH',
      overallDiagnosis: `Trend diagnosis ${uniqueSuffix}`,
      openingName: null,
      result: 'WIN',
      mainWeaknessTag: 'CALCULATION_DEPTH',
      secondaryWeaknessTags: [],
      recommendedLessonTitle: null,
      recommendedLessonWhy: null,
      recommendedFocusPoints: [],
      rawExtractedContext: { uniqueSuffix },
      rawAnalysisJson: { uniqueSuffix },
    },
  });

  await args.prisma.gameAnalysis.update({
    where: { id: analysis.id },
    data: {
      createdAt: args.analysisCreatedAt,
    },
  });

  if (args.mistakeSeverities.length > 0) {
    await args.prisma.mistake.createMany({
      data: args.mistakeSeverities.map((severity, index) => ({
        analysisId: analysis.id,
        criticalMomentId: null,
        severity,
        category: `category-${index}`,
        explanation: `Explanation ${index}`,
        suggestedFix: null,
        sourceEvidence: { index },
      })),
    });
  }

  return analysis;
}

async function createPerformanceTrendSeries(args: {
  prisma: InMemoryPrismaService;
  coachAccountId: string;
  studentId: string;
  values: number[];
}) {
  for (let index = 0; index < args.values.length; index += 1) {
    await createAnalysisFixture({
      prisma: args.prisma,
      coachAccountId: args.coachAccountId,
      studentId: args.studentId,
      analysisCreatedAt: daysAgoUtc(args.values.length * 3 - index * 3),
      jobStatus: 'COMPLETED',
      mistakeSeverities: Array.from(
        { length: args.values[index] ?? 0 },
        () => MomentSeverity.BLUNDER,
      ),
    });
  }
}
