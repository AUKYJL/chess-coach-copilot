import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { Logger } from 'nestjs-pino';
import { appConfig } from '../config/index.js';
import { HttpExceptionFilter } from '../shared/filters/http-exception.filter.js';

type ConfigureHttpAppOptions = {
  withGlobalPrefix?: boolean;
};

export function configureHttpApp(
  app: INestApplication,
  options: ConfigureHttpAppOptions = {},
): void {
  const applicationConfiguration = app.get<ConfigType<typeof appConfig>>(
    appConfig.KEY,
  );

  if (options.withGlobalPrefix ?? true) {
    app.setGlobalPrefix('api');
  }

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
  app.useGlobalFilters(new HttpExceptionFilter(app.get(Logger)));
}
