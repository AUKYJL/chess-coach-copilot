import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import {
  AnalysisJobStatus,
  AnalysisJobType,
  EngineEvidenceStatus,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  ENGINE_ANALYSIS_JOB_ENQUEUER,
  ENGINE_ANALYSIS_QUEUE_NAME,
} from '../../queues/queue.constants.js';
import type {
  EngineAnalysisJobEnqueuer,
  EngineAnalysisQueueJobData,
} from '../../queues/queue.service.js';

@Injectable()
export class EngineAnalysisReconciliationService implements OnApplicationBootstrap {
  constructor(
    private readonly logger: PinoLogger,
    private readonly prisma: PrismaService,
    @Inject(ENGINE_ANALYSIS_JOB_ENQUEUER)
    private readonly engineAnalysisJobEnqueuer: EngineAnalysisJobEnqueuer,
    @InjectQueue(ENGINE_ANALYSIS_QUEUE_NAME)
    private readonly engineAnalysisQueue: Queue<EngineAnalysisQueueJobData>,
  ) {
    this.logger.setContext(EngineAnalysisReconciliationService.name);
  }

  async onApplicationBootstrap(): Promise<void> {
    const jobs = await this.prisma.analysisJob.findMany({
      where: {
        jobType: AnalysisJobType.ENGINE_ANALYSIS,
        status: { in: [AnalysisJobStatus.PENDING, AnalysisJobStatus.RUNNING] },
      },
      include: { game: true },
    });

    for (const job of jobs) {
      const bullJobId = `engine-analysis-${job.gameId}-${job.id}`;
      const bullJob = await this.engineAnalysisQueue.getJob(bullJobId);

      if (
        !bullJob &&
        job.status === AnalysisJobStatus.PENDING &&
        job.game.engineEvidenceStatus === EngineEvidenceStatus.QUEUED
      ) {
        await this.engineAnalysisJobEnqueuer.enqueueEngineAnalysisJob(
          job.id,
          job.gameId,
          job.traceId,
        );
        continue;
      }

      if (bullJob && (await bullJob.getState()) === 'failed') {
        await this.prisma.$transaction(async (tx) => {
          await tx.analysisJob.update({
            where: { id: job.id },
            data: {
              status: AnalysisJobStatus.FAILED,
              failureCode: 'ENGINE_ATTEMPTS_EXHAUSTED',
              failureMessage: bullJob.failedReason || 'Engine analysis failed',
              progressPercent: 100,
              completedAt: new Date(),
            },
          });
          await tx.game.update({
            where: { id: job.gameId },
            data: { engineEvidenceStatus: EngineEvidenceStatus.FAILED },
          });
        });
      }
    }
  }
}
