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
  ANALYSIS_JOB_ENQUEUER,
} from '../../queues/queue.constants.js';
import type {
  AnalysisJobEnqueuer,
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
    @Inject(ANALYSIS_JOB_ENQUEUER)
    private readonly analysisJobEnqueuer: AnalysisJobEnqueuer,
    @InjectQueue(ENGINE_ANALYSIS_QUEUE_NAME)
    private readonly engineAnalysisQueue: Queue<EngineAnalysisQueueJobData>,
  ) {
    this.logger.setContext(EngineAnalysisReconciliationService.name);
  }

  async onApplicationBootstrap(): Promise<void> {
    const engineJobs = await this.prisma.analysisJob.findMany({
      where: {
        jobType: AnalysisJobType.ENGINE_ANALYSIS,
        status: { in: [AnalysisJobStatus.PENDING, AnalysisJobStatus.RUNNING] },
      },
      include: { game: true },
    });

    for (const job of engineJobs) {
      const bullJobId = `engine-analysis-${job.gameId}-${job.id}`;
      const bullJob = await this.engineAnalysisQueue.getJob(bullJobId);

      if (!bullJob && this.canRequeueEngineJob(job)) {
        if (job.status === AnalysisJobStatus.RUNNING) {
          await this.prisma.$transaction(async (tx) => {
            await tx.analysisJob.update({
              where: { id: job.id },
              data: {
                status: AnalysisJobStatus.PENDING,
                progressPercent: 0,
                startedAt: null,
              },
            });
            await tx.game.update({
              where: { id: job.gameId },
              data: { engineEvidenceStatus: EngineEvidenceStatus.QUEUED },
            });
          });
        }
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

    await this.reconcileAnalysisJobs();
  }

  private canRequeueEngineJob(job: {
    status: AnalysisJobStatus;
    game: { engineEvidenceStatus: EngineEvidenceStatus | null };
  }): boolean {
    return (
      (job.status === AnalysisJobStatus.PENDING &&
        job.game.engineEvidenceStatus === EngineEvidenceStatus.QUEUED) ||
      (job.status === AnalysisJobStatus.RUNNING &&
        job.game.engineEvidenceStatus === EngineEvidenceStatus.RUNNING)
    );
  }

  private async reconcileAnalysisJobs(): Promise<void> {
    const jobs = await this.prisma.analysisJob.findMany({
      where: {
        jobType: AnalysisJobType.ANALYSIS,
        status: {
          in: [
            AnalysisJobStatus.PENDING,
            AnalysisJobStatus.PARSING,
            AnalysisJobStatus.EXTRACTING_ANNOTATIONS,
            AnalysisJobStatus.CLASSIFICATION,
          ],
        },
      },
      include: { game: true, analysis: true },
    });

    for (const job of jobs) {
      if (
        job.game.engineEvidenceStatus !== null &&
        (job.game.engineEvidenceStatus !== EngineEvidenceStatus.READY ||
          job.game.engineEvidence === null)
      ) {
        await this.prisma.analysisJob.update({
          where: { id: job.id },
          data: {
            status: AnalysisJobStatus.FAILED,
            progressPercent: 100,
            completedAt: new Date(),
            failureCode: 'ENGINE_EVIDENCE_NOT_READY',
            failureMessage:
              'Analysis cannot start before engine evidence is ready',
          },
        });
        continue;
      }

      if (job.analysis) {
        await this.prisma.analysisJob.update({
          where: { id: job.id },
          data: {
            status: AnalysisJobStatus.COMPLETED,
            progressPercent: 100,
            completedAt: job.completedAt ?? new Date(),
          },
        });
        continue;
      }

      if (job.status !== AnalysisJobStatus.PENDING) {
        await this.prisma.analysisJob.update({
          where: { id: job.id },
          data: {
            status: AnalysisJobStatus.PENDING,
            progressPercent: 0,
            startedAt: null,
          },
        });
      }

      await this.analysisJobEnqueuer.enqueueAnalysisJob(job.id, job.traceId);
    }
  }
}
