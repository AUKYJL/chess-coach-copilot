import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AnnotationCoverage, AnalysisJobStatus } from '../../src/generated/prisma/client.js';
import { createE2eApp } from '../helpers/create-e2e-app.js';
import { InMemoryPrismaService } from '../helpers/in-memory-prisma.js';

describe('Analysis jobs (e2e)', () => {
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

  it('returns job status, completed result, and retries a failed job on the same record', async () => {
    const { accessToken, jobId } = await importGame(app);
    const server = app.getHttpServer();
    const job = await prisma.analysisJob.findUnique({
      where: { id: jobId },
      include: { game: true },
    });

    expect(job).toBeTruthy();

    await request(server)
      .get(`/analysis/jobs/${jobId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

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
        mainWeaknessTag: 'calculation',
        secondaryWeaknessTags: ['time-management'],
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
    await prisma.analysisJob.update({
      where: { id: jobId },
      data: {
        status: AnalysisJobStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    const resultResponse = await request(server)
      .get(`/analysis/jobs/${jobId}/result`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(resultResponse.body.analysis).toBeTruthy();

    await prisma.analysisJob.update({
      where: { id: jobId },
      data: {
        status: AnalysisJobStatus.FAILED,
        failureCode: 'ANALYSIS_FAILED',
        failureMessage: 'Synthetic failure',
      },
    });

    const retryResponse = await request(server)
      .post(`/analysis/jobs/${jobId}/retry`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(retryResponse.body).toMatchObject({
      id: jobId,
      status: AnalysisJobStatus.PENDING,
      failureCode: null,
      failureMessage: null,
    });
  });
});

async function importGame(app: INestApplication, rawPgn?: string) {
  const server = app.getHttpServer();
  const authResponse = await request(server).post('/auth/register').send({
    email: `coach-${Math.random()}@example.com`,
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
