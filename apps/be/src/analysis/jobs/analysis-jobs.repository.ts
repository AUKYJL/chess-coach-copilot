import { Injectable } from '@nestjs/common';
import {
  AnalysisJobStatus,
  ReportAudience,
  type AnalysisJobType,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  ANALYSIS_JOB_LIST_ORDER_BY,
  ANALYSIS_JOB_RESPONSE_SELECT,
} from './analysis-jobs.read-model.js';

@Injectable()
export class AnalysisJobsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    coachAccountId: string;
    studentId: string;
    gameId: string;
    jobType: AnalysisJobType;
    queueName: string;
    sourceAnalysisId?: string | null;
    reportAudience?: ReportAudience | null;
  }) {
    return this.prisma.analysisJob.create({ data });
  }

  findOwnedJob(jobId: string, coachAccountId: string) {
    return this.prisma.analysisJob.findFirst({
      where: {
        id: jobId,
        coachAccountId,
      },
      select: ANALYSIS_JOB_RESPONSE_SELECT,
    });
  }

  findOwnedJobs(args: {
    coachAccountId: string;
    studentId?: string;
    gameId?: string;
    jobType?: AnalysisJobType;
    status?: AnalysisJobStatus;
    limit: number;
    cursor?: string;
  }) {
    return this.prisma.analysisJob.findMany({
      where: {
        coachAccountId: args.coachAccountId,
        ...(args.studentId ? { studentId: args.studentId } : {}),
        ...(args.gameId ? { gameId: args.gameId } : {}),
        ...(args.jobType ? { jobType: args.jobType } : {}),
        ...(args.status ? { status: args.status } : {}),
      },
      select: ANALYSIS_JOB_RESPONSE_SELECT,
      orderBy: ANALYSIS_JOB_LIST_ORDER_BY,
      cursor: args.cursor ? { id: args.cursor } : undefined,
      skip: args.cursor ? 1 : undefined,
      take: args.limit + 1,
    });
  }

  findById(jobId: string) {
    return this.prisma.analysisJob.findUnique({
      where: { id: jobId },
      include: {
        game: true,
        analysis: true,
        student: true,
      },
    });
  }

  findSourceAnalysisById(analysisId: string) {
    return this.prisma.gameAnalysis.findUnique({
      where: { id: analysisId },
      select: {
        id: true,
        coachAccountId: true,
        studentId: true,
        gameId: true,
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

  markFailed(
    jobId: string,
    data: { failureCode: string; failureMessage: string },
  ) {
    return this.prisma.analysisJob.update({
      where: { id: jobId },
      data: {
        status: AnalysisJobStatus.FAILED,
        failureCode: data.failureCode,
        failureMessage: data.failureMessage,
        progressPercent: 100,
        completedAt: new Date(),
      },
    });
  }
}
