import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MistakeReviewStatus } from '../../src/generated/prisma/client.js';
import { createE2eApp } from '../helpers/create-e2e-app.js';
import { InMemoryPrismaService } from '../helpers/in-memory-prisma.js';
import {
  createCompletedAnalysisFixture,
  getServer,
} from '../helpers/us3-fixtures.js';

type TestServer = Parameters<typeof request>[0];

describe('Analysis review (e2e)', () => {
  let app: INestApplication;
  let prisma: InMemoryPrismaService;
  let server: TestServer;

  beforeEach(async () => {
    const fixture = await createE2eApp();
    app = fixture.app;
    prisma = fixture.prisma;
    server = getServer(app);
  });

  afterEach(async () => {
    await app.close();
  });

  it('persists confirmed and rejected review state with coach note changes', async () => {
    const fixture = await createCompletedAnalysisFixture({ app, prisma });
    const analysis = (await prisma.gameAnalysis.findFirst({
      where: { id: fixture.analyses[0].id },
      include: { mistakes: true },
    })) as { mistakes: Array<{ id: string }> } | null;
    const mistakeId = analysis?.mistakes[0]?.id;

    expect(mistakeId).toBeTruthy();

    const confirmedResponse = await request(server)
      .patch(`/analysis/mistakes/${mistakeId}/review`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .send({
        status: MistakeReviewStatus.CONFIRMED,
        coachNote: '  Coach note: calculate checks first.  ',
      })
      .expect(200);

    expect(confirmedResponse.body).toMatchObject({
      id: mistakeId,
      reviewStatus: MistakeReviewStatus.CONFIRMED,
      coachNote: 'Coach note: calculate checks first.',
    });

    const detailsAfterConfirm = await request(server)
      .get(`/analysis/${fixture.analyses[0].id}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200);

    expect(detailsAfterConfirm.body.criticalMoments[0].mistake).toMatchObject({
      id: mistakeId,
      reviewStatus: MistakeReviewStatus.CONFIRMED,
      coachNote: 'Coach note: calculate checks first.',
    });

    await request(server)
      .patch(`/analysis/mistakes/${mistakeId}/review`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .send({
        status: MistakeReviewStatus.REJECTED,
        coachNote: '   ',
      })
      .expect(200);

    const detailsAfterReject = await request(server)
      .get(`/analysis/${fixture.analyses[0].id}`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .expect(200);

    expect(detailsAfterReject.body.criticalMoments[0].mistake).toMatchObject({
      id: mistakeId,
      reviewStatus: MistakeReviewStatus.REJECTED,
      coachNote: null,
    });
  });

  it('rejects invalid review status payloads', async () => {
    const fixture = await createCompletedAnalysisFixture({ app, prisma });
    const analysis = (await prisma.gameAnalysis.findFirst({
      where: { id: fixture.analyses[0].id },
      include: { mistakes: true },
    })) as { mistakes: Array<{ id: string }> } | null;
    const mistakeId = analysis?.mistakes[0]?.id;

    expect(mistakeId).toBeTruthy();

    await request(server)
      .patch(`/analysis/mistakes/${mistakeId}/review`)
      .set('Authorization', `Bearer ${fixture.accessToken}`)
      .send({
        status: 'INVALID_STATUS',
      })
      .expect(400);
  });

  it('does not allow another coach to update the review', async () => {
    const ownerFixture = await createCompletedAnalysisFixture({ app, prisma });
    const otherCoachFixture = await createCompletedAnalysisFixture({
      app,
      prisma,
    });
    const analysis = (await prisma.gameAnalysis.findFirst({
      where: { id: ownerFixture.analyses[0].id },
      include: { mistakes: true },
    })) as { mistakes: Array<{ id: string }> } | null;
    const mistakeId = analysis?.mistakes[0]?.id;

    expect(mistakeId).toBeTruthy();

    await request(server)
      .patch(`/analysis/mistakes/${mistakeId}/review`)
      .set('Authorization', `Bearer ${otherCoachFixture.accessToken}`)
      .send({
        status: MistakeReviewStatus.CONFIRMED,
      })
      .expect(404);
  });
});
