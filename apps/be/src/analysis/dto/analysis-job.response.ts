import { ApiProperty } from '@nestjs/swagger';
import {
  AnalysisJobStatus,
  AnalysisJobType,
  AnnotationCoverage,
  ReportAudience,
} from '../../generated/prisma/client.js';

export class AnalysisJobResponse {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  gameId: string;

  @ApiProperty({ format: 'uuid' })
  studentId: string;

  @ApiProperty({ enum: AnalysisJobType })
  jobType: AnalysisJobType;

  @ApiProperty({ enum: AnalysisJobStatus })
  status: AnalysisJobStatus;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  sourceAnalysisId: string | null;

  @ApiProperty({ enum: ReportAudience, nullable: true })
  reportAudience: ReportAudience | null;

  @ApiProperty()
  attemptCount: number;

  @ApiProperty()
  maxAttempts: number;

  @ApiProperty({ type: Number, nullable: true })
  progressPercent: number | null;

  @ApiProperty()
  isDuplicate: boolean;

  @ApiProperty({ enum: AnnotationCoverage })
  annotationCoverage: AnnotationCoverage;

  @ApiProperty({ type: String, nullable: true })
  reducedConfidenceWarning: string | null;

  @ApiProperty({ type: String, nullable: true })
  failureCode: string | null;

  @ApiProperty({ type: String, nullable: true })
  failureMessage: string | null;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  analysisId: string | null;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  reportId: string | null;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  homeworkId: string | null;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  progressSnapshotId: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  completedAt: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}
