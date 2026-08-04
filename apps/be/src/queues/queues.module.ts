import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { redisConfig } from '../config/index.js';
import { ANALYSIS_QUEUE_NAME } from './queue.constants.js';
import { QueueService } from './queue.service.js';

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
  ],
  providers: [QueueService],
  exports: [QueueService, BullModule],
})
export class QueuesModule {}
