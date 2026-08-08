import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  AnalysisJobStatus,
  ReportAudience,
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

  it('uses job-backed report generation and supports draft CRUD', async () => {
    const fixture = await createCompletedAnalysisFixture({ app, prisma });
    const analysisId = fixture.analyses[0].id;
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
      .get(`/reports?analysisId=${analysisId}`)
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
      .get(`/reports?analysisId=${analysisId}`)
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
      analysisId,
      studentId: fixture.studentId,
      audience: ReportAudience.COACH,
      title: expect.stringContaining('Coach report'),
    });

    await request(server)
      .patch(`/reports/${report.id}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .send({
        title: 'Edited coach report',
        content: {
          summary: 'Edited summary',
          highlights: ['Edited highlight'],
          lessonFocus: ['Edited lesson focus'],
          nextSteps: ['Edited next step'],
        },
      })
      .expect(200);

    await request(server)
      .get(`/reports/${report.id}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.title).toBe('Edited coach report');
        expect(body.content.summary).toBe('Edited summary');
      });

    await request(server)
      .post(`/analysis/${analysisId}/reports/generate`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .send({ audience: ReportAudience.PARENT })
      .expect(201);
    await app
      .get(AnalysisProcessor)
      .process(fakeQueue.jobs.at(-1) as unknown as never);

    await request(server)
      .get(`/reports?analysisId=${analysisId}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toHaveLength(2);
      });

    await request(server)
      .delete(`/reports/${report.id}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(204);

    await request(server)
      .get(`/reports/${report.id}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(404);
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
      .get(`/reports?analysisId=${analysisId}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toEqual([]);
      });
  });
});
