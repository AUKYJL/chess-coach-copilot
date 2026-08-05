import { Injectable } from '@nestjs/common';
import {
  AnalysisJobStatus,
  type AnalysisJobType,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class AnalysisJobsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    coachAccountId: string;
    studentId: string;
    gameId: string;
    jobType: AnalysisJobType;
    queueName: string;
  }) {
    return this.prisma.analysisJob.create({ data });
  }

  findOwnedJob(jobId: string, coachAccountId: string) {
    return this.prisma.analysisJob.findFirst({
      where: {
        id: jobId,
        coachAccountId,
      },
      include: {
        game: true,
        analysis: true,
      },
    });
  }

  findById(jobId: string) {
    return this.prisma.analysisJob.findUnique({
      where: { id: jobId },
      include: {
        game: true,
        analysis: true,
      },
    });
  }

  transitionStatus(
    jobId: string,
    expectedStatuses: AnalysisJobStatus[],
    status: AnalysisJobStatus,
    data: Record<string, unknown> = {},
  ) {
    return this.prisma.analysisJob.updateMany({
      where: {
        id: jobId,
        status: {
          in: expectedStatuses,
        },
      },
      data: {
        status,
        ...data,
      },
    });
  }

  retryFailedJob(jobId: string, attemptCount: number) {
    return this.prisma.analysisJob.updateMany({
      where: {
        id: jobId,
        status: AnalysisJobStatus.FAILED,
      },
      data: {
        status: AnalysisJobStatus.PENDING,
        failureCode: null,
        failureMessage: null,
        progressPercent: 0,
        completedAt: null,
        startedAt: null,
        lastRetriedAt: new Date(),
        attemptCount,
      },
    });
  }
}
