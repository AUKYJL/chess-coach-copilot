import {
  AnalysisJobStatus,
  AnalysisJobType,
  AnnotationCoverage,
  ReportAudience,
} from '../../generated/prisma/client.js';

export class AnalysisJobResponse {
  id: string;
  gameId: string;
  studentId: string;
  jobType: AnalysisJobType;
  status: AnalysisJobStatus;
  sourceAnalysisId: string | null;
  reportAudience: ReportAudience | null;
  attemptCount: number;
  maxAttempts: number;
  progressPercent: number | null;
  isDuplicate: boolean;
  annotationCoverage: AnnotationCoverage;
  reducedConfidenceWarning: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  analysisId: string | null;
  reportId: string | null;
  homeworkId: string | null;
  progressSnapshotId: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
