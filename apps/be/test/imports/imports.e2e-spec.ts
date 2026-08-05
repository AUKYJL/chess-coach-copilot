import { INestApplication } from '@nestjs/common';
import { readFileSync } from 'fs';
import request from 'supertest';
import { createE2eApp } from '../helpers/create-e2e-app.js';

type TestServer = Parameters<typeof request>[0];

describe('ImportsController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    ({ app } = await createE2eApp());
  });

  afterEach(async () => {
    await app.close();
  });

  it('creates game and pending analysis job for a valid annotated PGN', async () => {
    const { accessToken, studentId } = await registerCoachAndStudent(app);
    const rawPgn = readFileSync(
      new URL(
        '../fixtures/pgn/annotated-lichess-with-eval.pgn',
        import.meta.url,
      ),
      'utf8',
    );

    const response = await request(getServer(app))
      .post(`/students/${studentId}/imports/pgn`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        studentColor: 'WHITE',
        sourceLabel: 'Annotated export',
        rawPgn,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      status: 'PENDING',
      studentId,
      isDuplicate: false,
      annotationCoverage: 'FULL',
    });
  });

  it('rejects invalid PGN and archived-student imports, and flags duplicates', async () => {
    const { accessToken, studentId } = await registerCoachAndStudent(app);
    const server = getServer(app);
    const payload = {
      studentColor: 'WHITE',
      rawPgn: `[Event "Training"]
[Result "1-0"]

1. e4 { [%eval 0.2] } e5 { [%eval 0.1] } 2. Nf3 { [%eval 0.5] } Nc6 1-0`,
    };

    await request(server)
      .post(`/students/${studentId}/imports/pgn`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...payload, rawPgn: 'broken pgn' })
      .expect(400);

    await request(server)
      .post(`/students/${studentId}/imports/pgn`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload)
      .expect(201);

    const duplicateResponse = await request(server)
      .post(`/students/${studentId}/imports/pgn`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ...payload,
        rawPgn: `[Event "Training"]\r
[Result "1-0"]


1.   e4 {   [%eval 0.2]   } e5\t{ [%eval 0.1] }\t2. Nf3 { [%eval 0.5] } Nc6 1-0`,
      })
      .expect(201);

    expect(duplicateResponse.body.isDuplicate).toBe(true);

    await request(server)
      .post(`/students/${studentId}/archive`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ archived: true })
      .expect(200);

    await request(server)
      .post(`/students/${studentId}/imports/pgn`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload)
      .expect(422);
  });
});

async function registerCoachAndStudent(app: INestApplication) {
  const server = getServer(app);
  const authResponse = await request(server).post('/auth/register').send({
    email: 'coach@example.com',
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

  return {
    accessToken,
    studentId: studentResponse.body.id as string,
  };
}

function getServer(app: INestApplication): TestServer {
  return app.getHttpServer() as TestServer;
}
