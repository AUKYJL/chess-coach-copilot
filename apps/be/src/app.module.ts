import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { AnalysisModule } from './analysis/analysis.module.js';
import { AnalysisProcessingModule } from './analysis/jobs/analysis-processing.module.js';
import {
  appConfig,
  databaseConfig,
  jwtConfig,
  loggerConfig,
  openrouterConfig,
  redisConfig,
  validateEnv,
} from './config/index.js';
import { ExternalAccountsModule } from './external-accounts/external-accounts.module.js';
import { GamesModule } from './games/games.module.js';
import { HomeworkModule } from './homework/homework.module.js';
import { ImportsModule } from './imports/imports.module.js';
import { LlmModule } from './llm/llm.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ProgressModule } from './progress/progress.module.js';
import { QueuesModule } from './queues/queues.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { StudentsModule } from './students/students.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
      load: [
        appConfig,
        databaseConfig,
        redisConfig,
        jwtConfig,
        loggerConfig,
        openrouterConfig,
      ],
    }),
    PrismaModule,
    QueuesModule,
    LlmModule,
    AuthModule,
    StudentsModule,
    ExternalAccountsModule,
    GamesModule,
    AnalysisModule,
    ImportsModule,
    ReportsModule,
    HomeworkModule,
    ProgressModule,
    AnalysisProcessingModule,
  ],
})
export class AppModule {}
