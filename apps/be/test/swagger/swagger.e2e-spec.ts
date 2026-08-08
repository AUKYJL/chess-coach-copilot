import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2eApp } from '../helpers/create-e2e-app.js';

type TestServer = Parameters<typeof request>[0];

interface SwaggerDocumentBody {
  openapi: string;
  info: {
    title: string;
    version: string;
  };
  paths?: Record<string, Record<string, unknown>>;
}

describe('Swagger docs (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const fixture = await createE2eApp({
      withSwagger: true,
    });
    app = fixture.app;
  });

  afterEach(async () => {
    await app.close();
  });

  it('serves the Swagger UI on /docs', async () => {
    const response = await request(getServer(app)).get('/docs').expect(200);

    expect(response.headers['content-type']).toContain('text/html');
    expect(response.text).toContain('swagger-ui');
  });

  it('downloads the OpenAPI document as JSON on /docs-json', async () => {
    const response = await request(getServer(app))
      .get('/docs-json')
      .expect(200);
    const document = parseSwaggerDocument(response.text);

    expect(response.headers['content-disposition']).toContain(
      'attachment; filename="openapi.json"',
    );
    expect(document.openapi).toBeTruthy();
    expect(document.info.title).toBe('Chess Coach Copilot');
    expect(document.info.version).toBe('0.1.0');
    expect(
      getOperation(document, '/analysis/{analysisId}/homework/generate', 'post')
        .requestBody,
    ).toBeUndefined();
    expect(
      getOperation(document, '/students/{studentId}/progress/generate', 'post')
        .requestBody,
    ).toBeUndefined();
    expect(
      getOperation(document, '/analysis/{analysisId}/reports/generate', 'post')
        .requestBody,
    ).toBeDefined();
    expect(getOperation(document, '/students/{studentId}/overview', 'get')).toBeDefined();
    expect(hasOperation(document, '/analysis/jobs/{jobId}/result', 'get')).toBe(false);
  });

  it('downloads the OpenAPI document as YAML on /docs-yaml', async () => {
    const response = await request(getServer(app))
      .get('/docs-yaml')
      .expect(200);

    expect(response.headers['content-disposition']).toContain(
      'attachment; filename="openapi.yaml"',
    );
    expect(response.text).toContain('openapi:');
    expect(response.text).toContain('title: Chess Coach Copilot');
    expect(response.text).toContain('version: 0.1.0');
  });
});

function getServer(app: INestApplication): TestServer {
  return app.getHttpServer() as TestServer;
}

function parseSwaggerDocument(text: string): SwaggerDocumentBody {
  const value = JSON.parse(text) as unknown;

  if (!isSwaggerDocumentBody(value)) {
    throw new Error('Expected Swagger JSON response to match OpenAPI shape');
  }

  return value;
}

function isSwaggerDocumentBody(value: unknown): value is SwaggerDocumentBody {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const document = value as Record<string, unknown>;

  if (typeof document.openapi !== 'string') {
    return false;
  }

  if (typeof document.info !== 'object' || document.info === null) {
    return false;
  }

  const info = document.info as Record<string, unknown>;

  return typeof info.title === 'string' && typeof info.version === 'string';
}

function getOperation(
  document: SwaggerDocumentBody,
  path: string,
  method: string,
): Record<string, unknown> {
  const operation = document.paths?.[path]?.[method];

  if (typeof operation !== 'object' || operation === null) {
    throw new Error(`Expected OpenAPI operation ${method.toUpperCase()} ${path}`);
  }

  return operation as Record<string, unknown>;
}

function hasOperation(
  document: SwaggerDocumentBody,
  path: string,
  method: string,
): boolean {
  return document.paths?.[path]?.[method] !== undefined;
}
