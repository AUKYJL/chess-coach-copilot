import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

type AnalysisJobEventLevel = 'info' | 'warn' | 'error';

type RecordAnalysisJobEventInput = {
  analysisJobId?: string | null;
  traceId: string;
  stage: string;
  level: AnalysisJobEventLevel;
  message: string;
  payload?: Prisma.InputJsonObject;
};

@Injectable()
export class AnalysisJobEventsService {
  constructor(
    private readonly logger: PinoLogger,
    private readonly prisma: PrismaService,
  ) {
    this.logger.setContext(AnalysisJobEventsService.name);
  }

  async record(data: RecordAnalysisJobEventInput) {
    return this.prisma.analysisJobEvent.create({
      data: {
        analysisJobId: data.analysisJobId ?? null,
        traceId: data.traceId,
        stage: data.stage,
        level: data.level,
        message: data.message,
        ...(data.payload ? { payload: data.payload } : {}),
      },
    });
  }

  async recordBestEffort(data: RecordAnalysisJobEventInput) {
    try {
      return await this.record(data);
    } catch (error) {
      this.logger.warn(
        {
          event: 'analysis_job_event_record_failed',
          traceId: data.traceId,
          analysisJobId: data.analysisJobId ?? null,
          stage: data.stage,
          errorName: this.getErrorName(error),
          errorMessage: this.getErrorMessage(error),
        },
        'Failed to persist analysis job event',
      );

      return null;
    }
  }

  attachTraceToJob(traceId: string, analysisJobId: string) {
    return this.prisma.analysisJobEvent.updateMany({
      where: {
        traceId,
        analysisJobId: null,
      },
      data: {
        analysisJobId,
      },
    });
  }

  async attachTraceToJobBestEffort(traceId: string, analysisJobId: string) {
    try {
      return await this.attachTraceToJob(traceId, analysisJobId);
    } catch (error) {
      this.logger.warn(
        {
          event: 'analysis_job_event_attach_failed',
          traceId,
          analysisJobId,
          operation: 'attach_trace_to_job',
          errorName: this.getErrorName(error),
          errorMessage: this.getErrorMessage(error),
        },
        'Failed to attach trace to analysis job events',
      );

      return null;
    }
  }

  private getErrorName(error: unknown) {
    return error instanceof Error ? error.name : 'UnknownError';
  }

  private getErrorMessage(error: unknown) {
    return error instanceof Error
      ? error.message
      : 'Unknown analysis job event persistence failure';
  }
}
