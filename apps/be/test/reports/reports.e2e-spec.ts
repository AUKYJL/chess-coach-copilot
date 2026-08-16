import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  AnalysisJobStatus,
  ReportAudience,
  ReportSource,
} from '../../src/generated/prisma/client.js';
import { AnalysisProcessor } from '../../src/analysis/jobs/analysis.processor.js';
import { createE2eApp } from '../helpers/create-e2e-app.js';
import { InMemoryPrismaService } from '../helpers/in-memory-prisma.js';
import {
  createCompletedAnalysisFixture,
  getServer,
} from '../helpers/us3-fixtures.js';

describe('ReportsController (e2e)', () => {
  let app: INestApplication;
  let prisma: InMemoryPrismaService;
  let fakeQueue: Awaited<ReturnType<typeof createE2eApp>>['fakeQueue'];

  beforeEach(async () => {
    ({ app, prisma, fakeQueue } = await createE2eApp());
  });

  afterEach(async () => {
    await app.close();
  });

  it('keeps one logical report per game and audience while preserving revision history', async () => {
    const fixture = await createCompletedAnalysisFixture({ app, prisma });
    const analysisId = fixture.analyses[0].id;
    const gameId = fixture.analyses[0].gameId;
    const server = getServer(app);

    const queuedResponse = await request(server)
      .post(`/analysis/${analysisId}/reports/generate`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .send({ audience: ReportAudience.COACH })
      .expect(201);

    expect(queuedResponse.body).toMatchObject({
      studentId: fixture.studentId,
      status: AnalysisJobStatus.PENDING,
    });

    const queuedList = await request(server)
      .get(`/reports?gameId=${gameId}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200);

    expect(queuedList.body.items).toEqual([]);

    await app
      .get(AnalysisProcessor)
      .process(fakeQueue.jobs.at(-1) as unknown as never);

    const statusResponse = await request(server)
      .get(`/analysis/jobs/${queuedResponse.body.id as string}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200);
    expect(statusResponse.body.status).toBe(AnalysisJobStatus.COMPLETED);

    const generatedList = await request(server)
      .get(`/reports?gameId=${gameId}&audience=${ReportAudience.COACH}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200);

    expect(generatedList.body.items).toHaveLength(1);
    const [report] = generatedList.body.items as Array<{ id: string }>;

    const generatedReport = await request(server)
      .get(`/reports/${report.id}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200);

    expect(generatedReport.body).toMatchObject({
      id: report.id,
      gameId,
      analysisId,
      studentId: fixture.studentId,
      audience: ReportAudience.COACH,
      source: ReportSource.AI,
      title: expect.stringContaining('Coach report'),
      content: {
        text: expect.stringContaining('Резюме'),
      },
    });

    const editedResponse = await request(server)
      .patch(`/reports/${report.id}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .send({
        content: {
          text: 'Обновленный текст отчета для тренера.',
        },
      })
      .expect(200);

    expect(editedResponse.body).toMatchObject({
      id: report.id,
      source: ReportSource.MANUAL,
      content: {
        text: 'Обновленный текст отчета для тренера.',
      },
    });

    await request(server)
      .get(`/reports/${report.id}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.title).toBe(generatedReport.body.title);
        expect(body.source).toBe(ReportSource.MANUAL);
        expect(body.content.text).toBe('Обновленный текст отчета для тренера.');
      });

    const regeneratedCoachResponse = await request(server)
      .post(`/analysis/${analysisId}/reports/generate`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .send({ audience: ReportAudience.COACH })
      .expect(201);

    await app
      .get(AnalysisProcessor)
      .process(fakeQueue.jobs.at(-1) as unknown as never);

    const regeneratedCoachList = await request(server)
      .get(`/reports?analysisId=${analysisId}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200);

    expect(regeneratedCoachList.body.items).toHaveLength(1);
    expect(regeneratedCoachList.body.items[0]).toMatchObject({
      id: report.id,
      audience: ReportAudience.COACH,
      source: ReportSource.AI,
    });

    const coachRevisions = (await prisma.reportRevision.findMany({
      where: { reportId: report.id },
      orderBy: { version: 'desc' },
    })) as Array<{ source: ReportSource; version: number }>;

    expect(coachRevisions).toEqual([
      expect.objectContaining({
        source: ReportSource.AI,
        version: 3,
      }),
      expect.objectContaining({
        source: ReportSource.MANUAL,
        version: 2,
      }),
      expect.objectContaining({
        source: ReportSource.AI,
        version: 1,
      }),
    ]);

    expect(regeneratedCoachResponse.body.id).not.toBeNull();

    await request(server)
      .post(`/analysis/${analysisId}/reports/generate`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .send({ audience: ReportAudience.PARENT })
      .expect(201);
    await app
      .get(AnalysisProcessor)
      .process(fakeQueue.jobs.at(-1) as unknown as never);

    await request(server)
      .get(`/reports?gameId=${gameId}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        const items = body.items as Array<{ audience: ReportAudience }>;

        expect(items).toHaveLength(2);
        expect(items.map((item) => item.audience)).toEqual([
          ReportAudience.PARENT,
          ReportAudience.COACH,
        ]);
      });
  });

  it('blocks new report generation for archived students', async () => {
    const fixture = await createCompletedAnalysisFixture({
      app,
      prisma,
      archivedStudent: true,
    });
    const analysisId = fixture.analyses[0].id;

    await request(getServer(app))
      .post(`/analysis/${analysisId}/reports/generate`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .send({ audience: ReportAudience.COACH })
      .expect(422);
  });

  it('reuses an in-flight generation job for the same game and same audience', async () => {
    const fixture = await createCompletedAnalysisFixture({ app, prisma });
    const analysisId = fixture.analyses[0].id;
    const server = getServer(app);

    const firstResponse = await request(server)
      .post(`/analysis/${analysisId}/reports/generate`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .send({ audience: ReportAudience.COACH })
      .expect(201);

    const secondResponse = await request(server)
      .post(`/analysis/${analysisId}/reports/generate`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .send({ audience: ReportAudience.COACH })
      .expect(201);

    expect(secondResponse.body.id).toBe(firstResponse.body.id);
    expect(secondResponse.body.gameId).toBe(firstResponse.body.gameId);
    expect(secondResponse.body.reportAudience).toBe(
      firstResponse.body.reportAudience,
    );
    expect(fakeQueue.jobs).toHaveLength(1);
  });

  it('returns GENERATING_OUTPUT while a report job is in progress and retries a failed report generation job', async () => {
    const fixture = await createCompletedAnalysisFixture({ app, prisma });
    const analysisId = fixture.analyses[0].id;
    const server = getServer(app);

    const queuedResponse = await request(server)
      .post(`/analysis/${analysisId}/reports/generate`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .send({ audience: ReportAudience.COACH })
      .expect(201);

    await prisma.analysisJob.update({
      where: { id: queuedResponse.body.id as string },
      data: {
        status: AnalysisJobStatus.GENERATING_OUTPUT,
        progressPercent: 50,
        startedAt: new Date(),
      },
    });

    await request(server)
      .get(`/analysis/jobs/${queuedResponse.body.id as string}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe(AnalysisJobStatus.GENERATING_OUTPUT);
      });

    await prisma.analysisJob.update({
      where: { id: queuedResponse.body.id as string },
      data: {
        status: AnalysisJobStatus.FAILED,
        failureCode: 'GENERATION_FAILED',
        failureMessage: 'Synthetic failure',
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
        expect(body.failureCode).toBeNull();
      });
  });

  it('fails report generation without creating output if the student is archived after enqueue', async () => {
    const fixture = await createCompletedAnalysisFixture({ app, prisma });
    const analysisId = fixture.analyses[0].id;
    const server = getServer(app);

    const queuedResponse = await request(server)
      .post(`/analysis/${analysisId}/reports/generate`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .send({ audience: ReportAudience.COACH })
      .expect(201);

    await request(server)
      .post(`/students/${fixture.studentId}/archive`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .send({ archived: true })
      .expect(200);

    await app
      .get(AnalysisProcessor)
      .process(fakeQueue.jobs.at(-1) as unknown as never);

    await request(server)
      .get(`/analysis/jobs/${queuedResponse.body.id as string}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe(AnalysisJobStatus.FAILED);
        expect(body.failureCode).toBe('ARCHIVED_STUDENT');
      });

    await request(server)
      .get(`/reports?gameId=${fixture.analyses[0].gameId}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toEqual([]);
      });
  });
});
