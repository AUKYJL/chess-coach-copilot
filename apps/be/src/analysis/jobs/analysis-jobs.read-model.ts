import { Prisma } from '../../generated/prisma/client.js';
import type { AnalysisJobResponse } from '../dto/analysis-job.response.js';

export const ANALYSIS_JOB_LIST_ORDER_BY = [
  { createdAt: Prisma.SortOrder.desc },
  { id: Prisma.SortOrder.desc },
] satisfies Prisma.AnalysisJobOrderByWithRelationInput[];

export const ANALYSIS_JOB_RESPONSE_SELECT = {
  id: true,
  gameId: true,
  studentId: true,
  jobType: true,
  status: true,
  sourceAnalysisId: true,
  reportAudience: true,
  attemptCount: true,
  maxAttempts: true,
  progressPercent: true,
  failureCode: true,
  failureMessage: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  game: {
    select: {
      annotationCoverage: true,
      reducedConfidenceWarning: true,
    },
  },
  analysis: {
    select: {
      id: true,
    },
  },
  generationTraces: {
    take: 1,
    orderBy: ANALYSIS_JOB_LIST_ORDER_BY,
    select: {
      reportId: true,
      homeworkId: true,
      progressSnapshotId: true,
    },
  },
} satisfies Prisma.AnalysisJobSelect;

export type AnalysisJobResponseRow = Prisma.AnalysisJobGetPayload<{
  select: typeof ANALYSIS_JOB_RESPONSE_SELECT;
}>;

export function mapAnalysisJobResponse(
  job: AnalysisJobResponseRow,
): AnalysisJobResponse {
  const latestTrace = job.generationTraces[0] ?? null;

  return {
    id: job.id,
    gameId: job.gameId,
    studentId: job.studentId,
    jobType: job.jobType,
    status: job.status,
    sourceAnalysisId: job.sourceAnalysisId ?? null,
    reportAudience: job.reportAudience ?? null,
    attemptCount: job.attemptCount,
    maxAttempts: job.maxAttempts,
    progressPercent: job.progressPercent ?? null,
    isDuplicate: false,
    annotationCoverage: job.game.annotationCoverage,
    reducedConfidenceWarning: job.game.reducedConfidenceWarning,
    failureCode: job.failureCode ?? null,
    failureMessage: job.failureMessage ?? null,
    analysisId: job.analysis?.id ?? null,
    reportId: latestTrace?.reportId ?? null,
    homeworkId: latestTrace?.homeworkId ?? null,
    progressSnapshotId: latestTrace?.progressSnapshotId ?? null,
    completedAt: job.completedAt ?? null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}
