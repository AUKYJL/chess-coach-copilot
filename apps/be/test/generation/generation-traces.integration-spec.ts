import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  AnalysisJobStatus,
  ReportAudience,
  type GenerationTrace,
} from '../../src/generated/prisma/client.js';
import { AnalysisProcessor } from '../../src/analysis/jobs/analysis.processor.js';
import { createE2eApp } from '../helpers/create-e2e-app.js';
import { InMemoryPrismaService } from '../helpers/in-memory-prisma.js';
import {
  createCompletedAnalysisFixture,
  getServer,
} from '../helpers/us3-fixtures.js';

describe('GenerationTrace integration', () => {
  let app: INestApplication;
  let prisma: InMemoryPrismaService;
  let fakeQueue: Awaited<ReturnType<typeof createE2eApp>>['fakeQueue'];

  beforeEach(async () => {
    ({ app, prisma, fakeQueue } = await createE2eApp());
  });

  afterEach(async () => {
    await app.close();
  });

  it('persists report, homework, and progress associations on successful generation traces', async () => {
    const fixture = await createCompletedAnalysisFixture({
      app,
      prisma,
      analysisCount: 3,
    });
    const analysisId = fixture.analyses[0].id;
    const server = getServer(app);

    await request(server)
      .post(`/analysis/${analysisId}/reports/generate`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .send({ audience: ReportAudience.COACH })
      .expect(201);
    await app
      .get(AnalysisProcessor)
      .process(fakeQueue.jobs.at(-1) as unknown as never);

    await request(server)
      .post(`/analysis/${analysisId}/homework/generate`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(201);
    await app
      .get(AnalysisProcessor)
      .process(fakeQueue.jobs.at(-1) as unknown as never);

    await request(server)
      .post(`/students/${fixture.studentId}/progress/generate`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(201);
    await app
      .get(AnalysisProcessor)
      .process(fakeQueue.jobs.at(-1) as unknown as never);

    const [report] = (await prisma.report.findMany({
      where: { coachAccountId: fixture.coachAccountId },
      orderBy: { createdAt: 'desc' },
    })) as Array<{ id: string }>;
    const [homework] = (await prisma.homework.findMany({
      where: { coachAccountId: fixture.coachAccountId },
      orderBy: { createdAt: 'desc' },
    })) as Array<{ id: string }>;
    const progressSnapshot = (await prisma.progressSnapshot.findFirst({
      where: {
        coachAccountId: fixture.coachAccountId,
        studentId: fixture.studentId,
      },
      orderBy: { createdAt: 'desc' },
    })) as { id: string } | null;

    const reportTraces = (await prisma.generationTrace.findMany({
      where: { reportId: report.id },
    })) as GenerationTrace[];
    const homeworkTraces = (await prisma.generationTrace.findMany({
      where: { homeworkId: homework.id },
    })) as GenerationTrace[];
    const progressTraces = (await prisma.generationTrace.findMany({
      where: { progressSnapshotId: progressSnapshot!.id },
    })) as GenerationTrace[];

    expect(reportTraces[0]).toMatchObject({
      analysisJobId: expect.any(String),
      analysisId,
      reportId: report.id,
    });
    expect(homeworkTraces[0]).toMatchObject({
      analysisJobId: expect.any(String),
      analysisId,
      homeworkId: homework.id,
    });
    expect(progressTraces[0]).toMatchObject({
      analysisJobId: expect.any(String),
      progressSnapshotId: progressSnapshot!.id,
    });
  });

  it('persists a failed generation trace when generated output validation fails', async () => {
    const fixture = await createCompletedAnalysisFixture({
      app,
      prisma,
      overallDiagnosisPrefix: '__FORCE_INVALID__ report',
    });
    const server = getServer(app);
    const analysisId = fixture.analyses[0].id;

    const queuedResponse = await request(server)
      .post(`/analysis/${analysisId}/reports/generate`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .send({ audience: ReportAudience.COACH })
      .expect(201);

    await app
      .get(AnalysisProcessor)
      .process(fakeQueue.jobs.at(-1) as unknown as never);

    await request(server)
      .get(`/analysis/jobs/${queuedResponse.body.id as string}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe(AnalysisJobStatus.FAILED);
        expect(body.failureCode).toBe('GENERATION_FAILED');
      });

    const failedTraces = (await prisma.generationTrace.findMany({
      where: { analysisJobId: queuedResponse.body.id as string },
    })) as GenerationTrace[];

    expect(failedTraces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          analysisJobId: queuedResponse.body.id as string,
          reportId: null,
          failureCode: 'GENERATION_FAILED',
        }),
      ]),
    );
  });

  it('persists an archived-student failure trace without saving a report', async () => {
    const fixture = await createCompletedAnalysisFixture({ app, prisma });
    const server = getServer(app);
    const analysisId = fixture.analyses[0].id;

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

    const failedTraces = (await prisma.generationTrace.findMany({
      where: { analysisJobId: queuedResponse.body.id as string },
    })) as GenerationTrace[];

    expect(failedTraces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          analysisJobId: queuedResponse.body.id as string,
          analysisId,
          reportId: null,
          failureCode: 'ARCHIVED_STUDENT',
        }),
      ]),
    );
  });
});
