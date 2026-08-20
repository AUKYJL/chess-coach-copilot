import { Processor, WorkerHost } from '@nestjs/bullmq';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import {
  AnalysisJobStatus,
  AnalysisJobType,
  EngineEvidenceSource,
  EngineEvidenceStatus,
} from '../../generated/prisma/client.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  ENGINE_ANALYSIS_JOB_NAME,
  ENGINE_ANALYSIS_QUEUE_NAME,
} from '../../queues/queue.constants.js';
import type { EngineAnalysisQueueJobData } from '../../queues/queue.service.js';
import { PgnParserService } from '../preparation/pgn-parser.service.js';
import { StockfishError } from './stockfish.error.js';
import { StockfishGameAnalyzerService } from './stockfish-game-analyzer.service.js';

@Injectable()
@Processor(ENGINE_ANALYSIS_QUEUE_NAME, { concurrency: 1 })
export class EngineAnalysisProcessor extends WorkerHost {
  constructor(
    private readonly logger: PinoLogger,
    private readonly prisma: PrismaService,
    private readonly pgnParserService: PgnParserService,
    private readonly stockfishGameAnalyzerService: StockfishGameAnalyzerService,
  ) {
    super();
    this.logger.setContext(EngineAnalysisProcessor.name);
  }

  async process(job: Job<EngineAnalysisQueueJobData>): Promise<void> {
    if (job.name !== ENGINE_ANALYSIS_JOB_NAME) {
      return;
    }

    const startedAt = Date.now();
    const persistedJob = await this.prisma.analysisJob.findUnique({
      where: { id: job.data.analysisJobId },
      include: { game: true },
    });

    if (
      !persistedJob ||
      persistedJob.jobType !== AnalysisJobType.ENGINE_ANALYSIS
    ) {
      return;
    }

    const attempt = job.attemptsMade + 1;
    const context = {
      gameId: persistedJob.gameId,
      analysisJobId: persistedJob.id,
      traceId: job.data.traceId || persistedJob.traceId,
      attempt,
    };

    if (
      persistedJob.status === AnalysisJobStatus.COMPLETED ||
      persistedJob.status === AnalysisJobStatus.FAILED
    ) {
      return;
    }

    if (persistedJob.game.engineEvidenceStatus === EngineEvidenceStatus.READY) {
      await this.prisma.analysisJob.updateMany({
        where: {
          id: persistedJob.id,
          status: {
            in: [AnalysisJobStatus.PENDING, AnalysisJobStatus.RUNNING],
          },
        },
        data: {
          status: AnalysisJobStatus.COMPLETED,
          progressPercent: 100,
          completedAt: new Date(),
        },
      });
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.game.update({
        where: { id: persistedJob.gameId },
        data: { engineEvidenceStatus: EngineEvidenceStatus.RUNNING },
      });
      await tx.analysisJob.update({
        where: { id: persistedJob.id },
        data: {
          status: AnalysisJobStatus.RUNNING,
          attemptCount: attempt,
          progressPercent: 50,
          startedAt: persistedJob.startedAt ?? new Date(),
          failureCode: null,
          failureMessage: null,
        },
      });
    });

    try {
      const parsedPgn = this.pgnParserService.parse(
        persistedJob.game.rawPgn,
        persistedJob.game.studentColor,
      );
      const evidence = await this.stockfishGameAnalyzerService.analyze(
        parsedPgn,
        persistedJob.game.studentColor,
      );

      await this.prisma.$transaction(async (tx) => {
        await tx.game.update({
          where: { id: persistedJob.gameId },
          data: {
            engineEvidence: evidence as Prisma.InputJsonValue,
            engineEvidenceStatus: EngineEvidenceStatus.READY,
            engineEvidenceSource: EngineEvidenceSource.STOCKFISH,
          },
        });
        await tx.analysisJob.update({
          where: { id: persistedJob.id },
          data: {
            status: AnalysisJobStatus.COMPLETED,
            progressPercent: 100,
            completedAt: new Date(),
            failureCode: null,
            failureMessage: null,
          },
        });
      });
      this.logger.info(
        { ...context, durationMs: Date.now() - startedAt },
        'Engine analysis completed',
      );
    } catch (error) {
      const failureCode = getFailureCode(error);
      const failureMessage = toFailureMessage(error);
      const terminal = isTerminalError(error);
      const exhausted = terminal || attempt >= (job.opts.attempts ?? 1);

      if (exhausted) {
        await this.prisma.$transaction(async (tx) => {
          await tx.analysisJob.update({
            where: { id: persistedJob.id },
            data: {
              status: AnalysisJobStatus.FAILED,
              failureCode,
              failureMessage,
              progressPercent: 100,
              completedAt: new Date(),
            },
          });
          await tx.game.update({
            where: { id: persistedJob.gameId },
            data: { engineEvidenceStatus: EngineEvidenceStatus.FAILED },
          });
        });
      } else {
        await this.prisma.analysisJob.update({
          where: { id: persistedJob.id },
          data: { failureCode, failureMessage },
        });
      }

      this.logger.error(
        {
          ...context,
          failureCode,
          terminal,
          exhausted,
          durationMs: Date.now() - startedAt,
          err: error instanceof Error ? error : undefined,
        },
        'Engine analysis failed',
      );

      if (terminal) {
        throw new UnrecoverableError(failureMessage);
      }

      throw error;
    }
  }
}

function isTerminalError(error: unknown): boolean {
  return (
    error instanceof BadRequestException ||
    (error instanceof StockfishError &&
      error.code === 'INVALID_ANALYSIS_REQUEST')
  );
}

function getFailureCode(error: unknown): string {
  if (error instanceof StockfishError) {
    return error.code;
  }

  return error instanceof BadRequestException
    ? 'INVALID_PERSISTED_PGN'
    : 'ENGINE_ANALYSIS_FAILED';
}

function toFailureMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Unknown engine analysis failure';
}
