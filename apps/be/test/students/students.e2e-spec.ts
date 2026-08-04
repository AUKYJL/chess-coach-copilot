import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2eApp } from '../helpers/create-e2e-app.js';

interface StudentBody {
  id: string;
  rating: number | null;
  archivedAt: string | null;
}

interface StudentListBody {
  items: StudentBody[];
}

type TestServer = Parameters<typeof request>[0];

describe('StudentsController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const fixture = await createE2eApp();
    app = fixture.app;
  });

  afterEach(async () => {
    await app.close();
  });

  it('supports coach-owned CRUD and archive state changes', async () => {
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
      .get('/students')
      .set('Authorization', `Bearer ${coach.accessToken}`)
      .expect(200);
    const listBody = listResponse.body as StudentListBody;

    expect(listBody.items).toHaveLength(1);
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
