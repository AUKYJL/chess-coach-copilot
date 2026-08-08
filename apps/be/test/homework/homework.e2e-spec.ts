import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AnalysisJobStatus } from '../../src/generated/prisma/client.js';
import { AnalysisProcessor } from '../../src/analysis/jobs/analysis.processor.js';
import { createE2eApp } from '../helpers/create-e2e-app.js';
import { InMemoryPrismaService } from '../helpers/in-memory-prisma.js';
import {
  createCompletedAnalysisFixture,
  getServer,
} from '../helpers/us3-fixtures.js';

describe('HomeworkController (e2e)', () => {
  let app: INestApplication;
  let prisma: InMemoryPrismaService;
  let fakeQueue: Awaited<ReturnType<typeof createE2eApp>>['fakeQueue'];

  beforeEach(async () => {
    ({ app, prisma, fakeQueue } = await createE2eApp());
  });

  afterEach(async () => {
    await app.close();
  });

  it('uses job-backed homework generation and supports draft CRUD', async () => {
    const fixture = await createCompletedAnalysisFixture({ app, prisma });
    const analysisId = fixture.analyses[0].id;
    const server = getServer(app);

    const queuedResponse = await request(server)
      .post(`/analysis/${analysisId}/homework/generate`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(201);

    expect(queuedResponse.body.status).toBe(AnalysisJobStatus.PENDING);

    await request(server)
      .get(`/homework?analysisId=${analysisId}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toEqual([]);
      });

    await app
      .get(AnalysisProcessor)
      .process(fakeQueue.jobs.at(-1) as unknown as never);

    await request(server)
      .get(`/analysis/jobs/${queuedResponse.body.id as string}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe(AnalysisJobStatus.COMPLETED);
      });

    const generatedList = await request(server)
      .get(`/homework?analysisId=${analysisId}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200);
    const [homework] = generatedList.body.items as Array<{ id: string }>;

    await request(server)
      .get(`/homework/${homework.id}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.title).toContain('Homework');
        expect(body.studentId).toBe(fixture.studentId);
      });

    await request(server)
      .patch(`/homework/${homework.id}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .send({
        title: 'Edited homework',
        content: {
          overview: 'Edited overview',
          exercises: ['Edited exercise'],
          focusPoints: ['Edited focus'],
          notes: ['Edited note'],
        },
      })
      .expect(200);

    await request(server)
      .get(`/homework/${homework.id}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.title).toBe('Edited homework');
        expect(body.content.overview).toBe('Edited overview');
      });

    await request(server)
      .delete(`/homework/${homework.id}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(204);

    await request(server)
      .get(`/homework/${homework.id}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(404);
  });

  it('retries a failed homework generation job on the same persisted record', async () => {
    const fixture = await createCompletedAnalysisFixture({ app, prisma });
    const analysisId = fixture.analyses[0].id;
    const server = getServer(app);

    const queuedResponse = await request(server)
      .post(`/analysis/${analysisId}/homework/generate`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(201);

    await prisma.analysisJob.update({
      where: { id: queuedResponse.body.id as string },
      data: {
        status: AnalysisJobStatus.FAILED,
        failureCode: 'GENERATION_FAILED',
        failureMessage: 'Synthetic homework failure',
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
        expect(body.attemptCount).toBe(1);
      });
  });
});
