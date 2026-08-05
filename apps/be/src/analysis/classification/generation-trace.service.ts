import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

@Injectable()
export class GenerationTraceService {
  constructor(private readonly prisma: PrismaService) {}

  persistSuccess(data: {
    coachAccountId: string;
    analysisJobId: string;
    analysisId: string;
    promptVersion: string;
    model: string;
    inputPayload: Record<string, unknown>;
    outputPayload: Record<string, unknown>;
  }) {
    return this.prisma.generationTrace.create({
      data: {
        ...data,
        inputPayload: asJson(data.inputPayload),
        outputPayload: asJson(data.outputPayload),
      },
    });
  }

  persistFailure(data: {
    coachAccountId: string;
    analysisJobId: string;
    inputPayload: Record<string, unknown>;
    outputPayload: Record<string, unknown>;
    failureCode: string;
    failureMessage: string;
  }) {
    return this.prisma.generationTrace.create({
      data: {
        coachAccountId: data.coachAccountId,
        analysisJobId: data.analysisJobId,
        promptVersion: 'failed-analysis-v1',
        model: 'analysis-processor',
        inputPayload: asJson(data.inputPayload),
        outputPayload: asJson(data.outputPayload),
        failureCode: data.failureCode,
        failureMessage: data.failureMessage,
      },
    });
  }
}
