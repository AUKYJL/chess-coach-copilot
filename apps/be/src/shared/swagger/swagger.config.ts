import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import YAML from 'yaml';

export function buildSwaggerDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Chess Coach Copilot')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  return SwaggerModule.createDocument(app, config);
}

export function setupSwagger(app: INestApplication): void {
  const document = buildSwaggerDocument(app);
  SwaggerModule.setup('docs', app, document, {
    raw: false,
  });

  const httpAdapter = app.getHttpAdapter();

  httpAdapter.get('/docs-json', (_request: Request, response: Response) => {
    response.attachment('openapi.json');
    response.send(document);
  });

  httpAdapter.get('/docs-yaml', (_request: Request, response: Response) => {
    response.attachment('openapi.yaml');
    response.send(YAML.stringify(document));
  });
}
