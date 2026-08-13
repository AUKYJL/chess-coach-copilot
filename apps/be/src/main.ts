import type { ConfigType } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureHttpApp } from './bootstrap/configure-http-app.js';
import { appConfig } from './config/index.js';
import { setupSwagger } from './shared/swagger/swagger.config.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  configureHttpApp(app);
  const applicationConfiguration = app.get<ConfigType<typeof appConfig>>(
    appConfig.KEY,
  );
  setupSwagger(app);

  await app.listen(applicationConfiguration.port);
}

void bootstrap();
