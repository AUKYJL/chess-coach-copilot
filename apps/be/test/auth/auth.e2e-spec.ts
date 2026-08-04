import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { ConfigType } from '@nestjs/config';
import request from 'supertest';
import { hashRefreshToken } from '../../src/auth/auth-crypto.js';
import { jwtConfig } from '../../src/config/index.js';
import { createE2eApp } from '../helpers/create-e2e-app.js';
import { InMemoryPrismaService } from '../helpers/in-memory-prisma.js';

interface AuthBody {
  accessToken: string;
  expiresInSeconds: number;
  coach?: {
    id: string;
    email: string;
    displayName: string;
  };
  refreshToken?: string;
}

type TestServer = Parameters<typeof request>[0];

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: InMemoryPrismaService;
  let jwtConfiguration: ConfigType<typeof jwtConfig>;

  beforeEach(async () => {
    const fixture = await createE2eApp();
    app = fixture.app;
    prisma = fixture.prisma;
    jwtConfiguration = app.get<ConfigType<typeof jwtConfig>>(jwtConfig.KEY);
  });

  afterEach(async () => {
    await app.close();
  });

  it('registers, rotates refresh cookies, reads me, and revokes refresh on logout', async () => {
    const registerResponse = await request(getServer(app))
      .post('/auth/register')
      .send({
        email: 'coach@example.com',
        password: 'strongpass1',
        displayName: 'Coach One',
      })
      .expect(201);
    const registerBody = registerResponse.body as AuthBody;
    const registerCookie = extractRefreshCookie(
      registerResponse,
      jwtConfiguration,
    );

    expect(registerBody).toMatchObject({
      expiresInSeconds: jwtConfiguration.accessTtlSeconds,
      coach: {
        email: 'coach@example.com',
        displayName: 'Coach One',
      },
    });
    expect(registerBody.accessToken).toEqual(expect.any(String));
    expect(registerBody.refreshToken).toBeUndefined();
    expect(registerResponse.headers['cache-control']).toBe('no-store');

    const storedTokens = (await prisma.refreshToken.findMany({
      where: { coachAccountId: registerBody.coach!.id },
    })) as Array<{ tokenHash: string }>;

    expect(storedTokens).toHaveLength(1);
    expect(storedTokens[0].tokenHash).toBe(
      hashRefreshToken(registerCookie.value),
    );
    expect(storedTokens[0].tokenHash).not.toBe(registerCookie.value);

    const meResponse = await request(getServer(app))
      .get('/auth/me')
      .set('Authorization', `Bearer ${registerBody.accessToken}`)
      .expect(200);

    expect(meResponse.body).toMatchObject({
      email: 'coach@example.com',
      displayName: 'Coach One',
    });

    const refreshResponse = await request(getServer(app))
      .post('/auth/refresh')
      .set('Cookie', registerCookie.header)
      .expect(200);
    const refreshBody = refreshResponse.body as AuthBody;
    const refreshCookie = extractRefreshCookie(
      refreshResponse,
      jwtConfiguration,
    );

    expect(refreshBody).toMatchObject({
      expiresInSeconds: jwtConfiguration.accessTtlSeconds,
    });
    expect(refreshBody.coach).toBeUndefined();
    expect(refreshBody.accessToken).toEqual(expect.any(String));
    expect(refreshCookie.value).not.toBe(registerCookie.value);

    await request(getServer(app))
      .post('/auth/refresh')
      .set('Cookie', registerCookie.header)
      .expect(401);

    const logoutResponse = await request(getServer(app))
      .post('/auth/logout')
      .set('Cookie', refreshCookie.header)
      .expect(204);

    expect(logoutResponse.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          new RegExp(`^${escapeRegExp(jwtConfiguration.refreshCookieName)}=;`),
        ),
      ]),
    );

    await request(getServer(app))
      .post('/auth/refresh')
      .set('Cookie', refreshCookie.header)
      .expect(401);
  });

  it('returns the cookie-based contract for login and rejects duplicate registration or bad credentials', async () => {
    await request(getServer(app)).post('/auth/register').send({
      email: 'duplicate@example.com',
      password: 'strongpass1',
      displayName: 'Coach One',
    });

    await request(getServer(app))
      .post('/auth/register')
      .send({
        email: 'duplicate@example.com',
        password: 'strongpass1',
        displayName: 'Coach Two',
      })
      .expect(409);

    const loginResponse = await request(getServer(app))
      .post('/auth/login')
      .send({
        email: 'duplicate@example.com',
        password: 'strongpass1',
      })
      .expect(200);
    const loginBody = loginResponse.body as AuthBody;

    expect(loginBody.refreshToken).toBeUndefined();
    expect(loginBody.coach?.email).toBe('duplicate@example.com');
    expect(loginResponse.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          new RegExp(`^${escapeRegExp(jwtConfiguration.refreshCookieName)}=`),
        ),
      ]),
    );

    await request(getServer(app))
      .post('/auth/login')
      .send({
        email: 'duplicate@example.com',
        password: 'wrongpass1',
      })
      .expect(401);
  });

  it('rejects missing or mismatched token types across access and refresh flows', async () => {
    const registerResponse = await request(getServer(app))
      .post('/auth/register')
      .send({
        email: 'coach@example.com',
        password: 'strongpass1',
        displayName: 'Coach One',
      })
      .expect(201);
    const registerBody = registerResponse.body as AuthBody;
    const refreshCookie = extractRefreshCookie(
      registerResponse,
      jwtConfiguration,
    );

    await request(getServer(app)).post('/auth/refresh').expect(401);

    await request(getServer(app))
      .post('/auth/refresh')
      .set(
        'Cookie',
        `${jwtConfiguration.refreshCookieName}=${registerBody.accessToken}`,
      )
      .expect(401);

    await request(getServer(app))
      .get('/auth/me')
      .set('Authorization', `Bearer ${refreshCookie.value}`)
      .expect(401);
  });

  it('rejects expired access and refresh tokens', async () => {
    const registerResponse = await request(getServer(app))
      .post('/auth/register')
      .send({
        email: 'coach@example.com',
        password: 'strongpass1',
        displayName: 'Coach One',
      })
      .expect(201);
    const registerBody = registerResponse.body as AuthBody;
    const jwtService = app.get(JwtService);
    const expiredRefreshToken = await jwtService.signAsync(
      {
        sub: registerBody.coach!.id,
        jti: 'expired-refresh-token',
        type: 'refresh',
      },
      {
        secret: jwtConfiguration.refreshSecret,
        expiresIn: -1,
      },
    );
    const expiredAccessToken = await jwtService.signAsync(
      {
        sub: registerBody.coach!.id,
        type: 'access',
      },
      {
        secret: jwtConfiguration.accessSecret,
        expiresIn: -1,
      },
    );

    await request(getServer(app))
      .post('/auth/refresh')
      .set(
        'Cookie',
        `${jwtConfiguration.refreshCookieName}=${expiredRefreshToken}`,
      )
      .expect(401);

    await request(getServer(app))
      .get('/auth/me')
      .set('Authorization', `Bearer ${expiredAccessToken}`)
      .expect(401);
  });
});

function extractRefreshCookie(
  response: request.Response,
  jwtConfiguration: ConfigType<typeof jwtConfig>,
): {
  header: string;
  value: string;
} {
  const setCookieHeader = response.headers['set-cookie'];
  const cookies =
    typeof setCookieHeader === 'string' ? [setCookieHeader] : setCookieHeader;
  const refreshCookie = cookies?.find((cookie) =>
    cookie.startsWith(`${jwtConfiguration.refreshCookieName}=`),
  );

  if (!refreshCookie) {
    throw new Error('Missing refresh cookie');
  }

  const [cookiePair] = refreshCookie.split(';');
  const value = cookiePair.slice(
    `${jwtConfiguration.refreshCookieName}=`.length,
  );

  return {
    header: cookiePair,
    value,
  };
}

function getServer(app: INestApplication): TestServer {
  return app.getHttpServer() as TestServer;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
