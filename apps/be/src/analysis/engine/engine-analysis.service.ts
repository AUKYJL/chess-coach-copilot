import { Inject, Injectable, NotFoundException } from '@nestjs/common';
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
import type { EngineAnalysisJobEnqueuer } from '../../queues/queue.service.js';

@Injectable()
export class EngineAnalysisService {
  constructor(
    private readonly logger: PinoLogger,
    private readonly prisma: PrismaService,
    @Inject(ENGINE_ANALYSIS_JOB_ENQUEUER)
    private readonly engineAnalysisJobEnqueuer: EngineAnalysisJobEnqueuer,
  ) {
    this.logger.setContext(EngineAnalysisService.name);
  }

  async queueEngineAnalysis(gameId: string, traceId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const game = await tx.game.findUnique({
        where: { id: gameId },
        select: {
          id: true,
          coachAccountId: true,
          studentId: true,
          engineEvidenceStatus: true,
        },
      });

      if (!game) {
        throw new NotFoundException('Game not found');
      }

      if (game.engineEvidenceStatus === EngineEvidenceStatus.READY) {
        return { job: null, created: false };
      }

      if (
        game.engineEvidenceStatus === EngineEvidenceStatus.QUEUED ||
        game.engineEvidenceStatus === EngineEvidenceStatus.RUNNING
      ) {
        return {
          job: await tx.analysisJob.findFirst({
            where: {
              gameId,
              jobType: AnalysisJobType.ENGINE_ANALYSIS,
              status: {
                in: [AnalysisJobStatus.PENDING, AnalysisJobStatus.RUNNING],
              },
            },
            orderBy: { createdAt: 'desc' },
          }),
          created: false,
        };
      }

      const claimed = await tx.game.updateMany({
        where: {
          id: gameId,
          OR: [
            { engineEvidenceStatus: null },
            { engineEvidenceStatus: EngineEvidenceStatus.FAILED },
          ],
        },
        data: { engineEvidenceStatus: EngineEvidenceStatus.QUEUED },
      });

      if (claimed.count === 0) {
        return {
          job: await tx.analysisJob.findFirst({
            where: {
              gameId,
              jobType: AnalysisJobType.ENGINE_ANALYSIS,
              status: {
                in: [AnalysisJobStatus.PENDING, AnalysisJobStatus.RUNNING],
              },
            },
            orderBy: { createdAt: 'desc' },
          }),
          created: false,
        };
      }

      return {
        job: await tx.analysisJob.create({
          data: {
            traceId,
            coachAccountId: game.coachAccountId,
            studentId: game.studentId,
            gameId,
            jobType: AnalysisJobType.ENGINE_ANALYSIS,
            queueName: ENGINE_ANALYSIS_QUEUE_NAME,
          },
        }),
        created: true,
      };
    });

    if (!result.job || !result.created) {
      return result.job;
    }

    try {
      await this.engineAnalysisJobEnqueuer.enqueueEngineAnalysisJob(
        result.job.id,
        gameId,
        traceId,
      );
    } catch (error) {
      const failureMessage = toFailureMessage(error);
      this.logger.error(
        {
          event: 'engine_analysis_enqueue_failed',
          gameId,
          analysisJobId: result.job.id,
          traceId,
          failureCode: 'QUEUE_ENQUEUE_FAILED',
          failureMessage,
          err: error instanceof Error ? error : undefined,
        },
        'Engine analysis queue enqueue failed',
      );
      await this.prisma.$transaction(async (tx) => {
        await tx.analysisJob.update({
          where: { id: result.job!.id },
          data: {
            status: AnalysisJobStatus.FAILED,
            failureCode: 'QUEUE_ENQUEUE_FAILED',
            failureMessage,
            progressPercent: 100,
            completedAt: new Date(),
          },
        });
        await tx.game.update({
          where: { id: gameId },
          data: { engineEvidenceStatus: EngineEvidenceStatus.FAILED },
        });
      });
      throw error;
    }

    return result.job;
  }
}

function toFailureMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Engine queue enqueue failed';
}
