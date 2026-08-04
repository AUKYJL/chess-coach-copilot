import cookieParser from 'cookie-parser';
import { INestApplication, Module, ValidationPipe } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AuthModule } from '../../src/auth/auth.module.js';
import {
  appConfig,
  databaseConfig,
  jwtConfig,
  openrouterConfig,
  redisConfig,
  validateEnv,
} from '../../src/config/index.js';
import { ExternalAccountsModule } from '../../src/external-accounts/external-accounts.module.js';
import { PrismaModule } from '../../src/prisma/prisma.module.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { HttpExceptionFilter } from '../../src/shared/filters/http-exception.filter.js';
import { setupSwagger } from '../../src/shared/swagger/swagger.config.js';
import { StudentsModule } from '../../src/students/students.module.js';
import { InMemoryPrismaService } from './in-memory-prisma.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
      validate: validateEnv,
      load: [
        appConfig,
        databaseConfig,
        redisConfig,
        jwtConfig,
        openrouterConfig,
      ],
    }),
    PrismaModule,
    AuthModule,
    StudentsModule,
    ExternalAccountsModule,
  ],
})
class E2eAppModule {}

interface CreateE2eAppOptions {
  withSwagger?: boolean;
}

export async function createE2eApp(options: CreateE2eAppOptions = {}): Promise<{
  app: INestApplication;
  prisma: InMemoryPrismaService;
}> {
  const prisma = new InMemoryPrismaService();
  const moduleRef = await Test.createTestingModule({
    imports: [E2eAppModule],
  })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .compile();

  const app = moduleRef.createNestApplication();
  const applicationConfiguration = app.get<ConfigType<typeof appConfig>>(
    appConfig.KEY,
  );

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

  if (options.withSwagger) {
    setupSwagger(app);
  }

  await app.init();

  return { app, prisma };
}
