import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { redisConfig } from '../config/index.js';
import {
  ANALYSIS_JOB_ENQUEUER,
  ANALYSIS_QUEUE_NAME,
  ENGINE_ANALYSIS_JOB_ENQUEUER,
  ENGINE_ANALYSIS_QUEUE_NAME,
} from './queue.constants.js';
import { QueueService } from './queue.service.js';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [redisConfig.KEY],
      useFactory: (redisConfiguration: ConfigType<typeof redisConfig>) => ({
        connection: {
          url: redisConfiguration.url,
        },
      }),
    }),
    BullModule.registerQueue({
      name: ANALYSIS_QUEUE_NAME,
    }),
    BullModule.registerQueue({
      name: ENGINE_ANALYSIS_QUEUE_NAME,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1_000 },
      },
    }),
  ],
  providers: [
    QueueService,
    {
      provide: ANALYSIS_JOB_ENQUEUER,
      useExisting: QueueService,
    },
    {
      provide: ENGINE_ANALYSIS_JOB_ENQUEUER,
      useExisting: QueueService,
    },
  ],
  exports: [
    QueueService,
    ANALYSIS_JOB_ENQUEUER,
    ENGINE_ANALYSIS_JOB_ENQUEUER,
    BullModule,
  ],
})
export class QueuesModule {}
