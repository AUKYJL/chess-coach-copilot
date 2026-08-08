import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class GenerationTraceService {
  constructor(private readonly prisma: PrismaService) {}

  persistSuccess(data: {
    coachAccountId: string;
    analysisJobId: string | null;
    analysisId?: string;
    reportId?: string;
    homeworkId?: string;
    progressSnapshotId?: string;
    promptVersion: string;
    model: string;
    inputPayload: Prisma.InputJsonValue;
    outputPayload: Prisma.InputJsonValue;
  }) {
    return this.prisma.generationTrace.create({
      data: {
        coachAccountId: data.coachAccountId,
        analysisJobId: data.analysisJobId,
        analysisId: data.analysisId ?? null,
        reportId: data.reportId ?? null,
        homeworkId: data.homeworkId ?? null,
        progressSnapshotId: data.progressSnapshotId ?? null,
        promptVersion: data.promptVersion,
        model: data.model,
        inputPayload: data.inputPayload,
        outputPayload: data.outputPayload,
      },
    });
  }

  persistFailure(data: {
    coachAccountId: string;
    analysisJobId: string | null;
    analysisId?: string;
    reportId?: string;
    homeworkId?: string;
    progressSnapshotId?: string;
    promptVersion?: string;
    model?: string;
    inputPayload: Prisma.InputJsonValue;
    outputPayload: Prisma.InputJsonValue;
    failureCode: string;
    failureMessage: string;
  }) {
    return this.prisma.generationTrace.create({
      data: {
        coachAccountId: data.coachAccountId,
        analysisJobId: data.analysisJobId,
        analysisId: data.analysisId ?? null,
        reportId: data.reportId ?? null,
        homeworkId: data.homeworkId ?? null,
        progressSnapshotId: data.progressSnapshotId ?? null,
        promptVersion: data.promptVersion ?? 'failed-analysis-v1',
        model: data.model ?? 'analysis-processor',
        inputPayload: data.inputPayload,
        outputPayload: data.outputPayload,
        failureCode: data.failureCode,
        failureMessage: data.failureMessage,
      },
    });
  }
}
