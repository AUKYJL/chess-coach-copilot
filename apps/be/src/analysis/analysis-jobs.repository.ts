import { Injectable } from '@nestjs/common';
import type { AnalysisJobStatus, AnalysisJobType } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

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

  update(jobId: string, data: Record<string, unknown>) {
    return this.prisma.analysisJob.update({
      where: { id: jobId },
      data,
    });
  }

  findAnalysisList(args: { coachAccountId: string; studentId?: string }) {
    return this.prisma.gameAnalysis.findMany({
      where: {
        coachAccountId: args.coachAccountId,
        ...(args.studentId ? { studentId: args.studentId } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        game: true,
      },
    });
  }

  updateStatus(
    jobId: string,
    status: AnalysisJobStatus,
    data: Record<string, unknown> = {},
  ) {
    return this.prisma.analysisJob.update({
      where: { id: jobId },
      data: {
        status,
        ...data,
      },
    });
  }
}
