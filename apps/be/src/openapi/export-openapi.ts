import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NestFactory } from '@nestjs/core';
import YAML from 'yaml';
import { AppModule } from '../app.module.js';
import { configureHttpApp } from '../bootstrap/configure-http-app.js';
import { buildSwaggerDocument } from '../shared/swagger/swagger.config.js';

const outputUrl = new URL(
  '../../../fe/src/shared/api/openapi/api-1.yaml',
  import.meta.url,
);

async function exportOpenApi(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  try {
    configureHttpApp(app);
    const document = buildSwaggerDocument(app);
    const outputPath = fileURLToPath(outputUrl);

    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, YAML.stringify(document), 'utf8');
  } finally {
    await app.close();
  }
}

void exportOpenApi();
