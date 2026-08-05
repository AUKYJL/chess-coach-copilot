import {
  AnalysisJobStatus,
  AnnotationCoverage,
} from '../../generated/prisma/client.js';

export class AnalysisJobResponse {
  id: string;
  gameId: string;
  studentId: string;
  status: AnalysisJobStatus;
  attemptCount: number;
  maxAttempts: number;
  progressPercent: number | null;
  isDuplicate: boolean;
  annotationCoverage: AnnotationCoverage;
  reducedConfidenceWarning: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
