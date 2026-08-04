import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ExternalPlatform } from '../../src/generated/prisma/client.js';
import { createE2eApp } from '../helpers/create-e2e-app.js';

interface ExternalAccountBody {
  id: string;
  platform: ExternalPlatform;
  username: string;
}

interface ExternalAccountListBody {
  items: ExternalAccountBody[];
}

type TestServer = Parameters<typeof request>[0];

describe('ExternalAccountsController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const fixture = await createE2eApp();
    app = fixture.app;
  });

  afterEach(async () => {
    await app.close();
  });

  it('creates and lists external accounts for the owning coach', async () => {
    const coach = await registerCoach(app, 'coach-a@example.com');
    const studentId = await createStudent(app, coach.accessToken);

    await request(getServer(app))
      .post(`/students/${studentId}/external-accounts`)
      .set('Authorization', `Bearer ${coach.accessToken}`)
      .send({
        platform: ExternalPlatform.LICHESS,
        username: 'student-a',
      })
      .expect(201);

    await request(getServer(app))
      .post(`/students/${studentId}/external-accounts`)
      .set('Authorization', `Bearer ${coach.accessToken}`)
      .send({
        platform: ExternalPlatform.LICHESS,
        username: 'student-a',
      })
      .expect(409);

    const listResponse = await request(getServer(app))
      .get(`/students/${studentId}/external-accounts`)
      .set('Authorization', `Bearer ${coach.accessToken}`)
      .expect(200);
    const listBody = listResponse.body as ExternalAccountListBody;

    expect(listBody.items).toHaveLength(1);
    expect(listBody.items[0]).toMatchObject({
      platform: ExternalPlatform.LICHESS,
      username: 'student-a',
    });
  });

  it('blocks cross-coach access and archived-student writes', async () => {
    const coachA = await registerCoach(app, 'coach-a@example.com');
    const coachB = await registerCoach(app, 'coach-b@example.com');
    const studentId = await createStudent(app, coachA.accessToken);

    await request(getServer(app))
      .get(`/students/${studentId}/external-accounts`)
      .set('Authorization', `Bearer ${coachB.accessToken}`)
      .expect(404);

    await request(getServer(app))
      .post(`/students/${studentId}/archive`)
      .set('Authorization', `Bearer ${coachA.accessToken}`)
      .send({ archived: true })
      .expect(200);

    await request(getServer(app))
      .post(`/students/${studentId}/external-accounts`)
      .set('Authorization', `Bearer ${coachA.accessToken}`)
      .send({
        platform: ExternalPlatform.CHESS_COM,
        username: 'student-b',
      })
      .expect(422);
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

function getServer(app: INestApplication): TestServer {
  return app.getHttpServer() as TestServer;
}
