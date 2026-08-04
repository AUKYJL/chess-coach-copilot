import { ValidationPipe } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { appConfig } from './config/index.js';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter.js';
import { setupSwagger } from './shared/swagger/swagger.config.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  const applicationConfiguration = app.get<ConfigType<typeof appConfig>>(
    appConfig.KEY,
  );
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.use(cookieParser());
  app.enableCors({
    origin: applicationConfiguration.corsOrigins,
    credentials: true,
  });
  app.useGlobalFilters(new HttpExceptionFilter());
  setupSwagger(app);

  await app.listen(applicationConfiguration.port);
}

void bootstrap();
