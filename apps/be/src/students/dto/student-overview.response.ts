import { ApiProperty } from '@nestjs/swagger';
import {
  AnalysisJobStatus,
  ExternalPlatform,
  GameResult,
  MomentSeverity,
  WeaknessTag,
} from '../../generated/prisma/client.js';

const performanceDirectionValues = [
  'IMPROVING',
  'STABLE',
  'DECLINING',
  'UNKNOWN',
] as const;

type PerformanceDirection = (typeof performanceDirectionValues)[number];

export class StudentOverviewStudentResponse {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  coachAccountId: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty({ type: Number, nullable: true })
  birthYear: number | null;

  @ApiProperty({ type: Number, nullable: true })
  rating: number | null;

  @ApiProperty({ type: String, nullable: true })
  notes: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  archivedAt: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}

export class ExternalAccountResponse {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  studentId: string;

  @ApiProperty({ enum: ExternalPlatform })
  platform: ExternalPlatform;

  @ApiProperty()
  username: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}

export class StudentOverviewStatsResponse {
  @ApiProperty()
  gameCount: number;

  @ApiProperty()
  analysisCount: number;

  @ApiProperty()
  reportCount: number;

  @ApiProperty()
  homeworkCount: number;
}

export class LatestProgressReferenceResponse {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  analysisCount: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;
}

export class RecentGameResponse {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ type: String, nullable: true })
  sourceLabel: string | null;

  @ApiProperty({ enum: ['WHITE', 'BLACK'] })
  studentColor: 'WHITE' | 'BLACK';

  @ApiProperty({ type: String, nullable: true })
  event: string | null;

  @ApiProperty({ type: String, nullable: true })
  site: string | null;

  @ApiProperty({ type: String, nullable: true })
  whitePlayerName: string | null;

  @ApiProperty({ type: String, nullable: true })
  blackPlayerName: string | null;

  @ApiProperty({ type: String, nullable: true })
  openingHeader: string | null;

  @ApiProperty({ type: String, nullable: true })
  ecoCode: string | null;

  @ApiProperty({ type: String, nullable: true })
  rawResult: string | null;

  @ApiProperty({ enum: GameResult })
  derivedResult: GameResult;

  @ApiProperty({ type: Number, nullable: true })
  plyCount: number | null;

  @ApiProperty({ type: String, format: 'date-time' })
  importedAt: Date;

  @ApiProperty({ enum: AnalysisJobStatus, nullable: true })
  latestAnalysisJobStatus: AnalysisJobStatus | null;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  latestAnalysisJobId: string | null;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  latestAnalysisId: string | null;
}

export class RecentAnalysisResponse {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  analysisJobId: string;

  @ApiProperty({ format: 'uuid' })
  gameId: string;

  @ApiProperty({ enum: WeaknessTag, nullable: true })
  mainWeaknessTag: WeaknessTag | null;

  @ApiProperty({ type: String, nullable: true })
  recommendedLessonTitle: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;
}

export class RecentReportResponse {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  analysisId: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ enum: ['COACH', 'PARENT'] })
  audience: 'COACH' | 'PARENT';

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;
}

export class RecentHomeworkResponse {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  analysisId: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;
}

export class StudentOverviewResponse {
  @ApiProperty({ type: () => StudentOverviewStudentResponse })
  student: StudentOverviewStudentResponse;

  @ApiProperty({ type: () => [ExternalAccountResponse] })
  externalAccounts: ExternalAccountResponse[];

  @ApiProperty({ type: () => StudentOverviewStatsResponse })
  stats: StudentOverviewStatsResponse;

  @ApiProperty({
    type: () => LatestProgressReferenceResponse,
    nullable: true,
  })
  latestProgress: LatestProgressReferenceResponse | null;

  @ApiProperty({ type: () => [RecentGameResponse] })
  recentGames: RecentGameResponse[];

  @ApiProperty({ type: () => [RecentAnalysisResponse] })
  recentAnalyses: RecentAnalysisResponse[];

  @ApiProperty({ type: () => [RecentReportResponse] })
  recentReports: RecentReportResponse[];

  @ApiProperty({ type: () => [RecentHomeworkResponse] })
  recentHomework: RecentHomeworkResponse[];
}

export class WeaknessTagCountResponse {
  @ApiProperty({ enum: WeaknessTag })
  tag: WeaknessTag;

  @ApiProperty()
  count: number;
}

export class SeverityCountResponse {
  @ApiProperty({ enum: MomentSeverity })
  severity: MomentSeverity;

  @ApiProperty()
  count: number;
}

export class SampleMistakeResponse {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  analysisId: string;

  @ApiProperty({ format: 'uuid' })
  gameId: string;

  @ApiProperty({ enum: MomentSeverity })
  severity: MomentSeverity;

  @ApiProperty()
  category: string;

  @ApiProperty()
  explanation: string;

  @ApiProperty({ type: String, nullable: true })
  suggestedFix: string | null;
}

export class StudentAnalysisProfileResponse {
  @ApiProperty()
  analysisCountUsed: number;

  @ApiProperty({ enum: WeaknessTag, nullable: true })
  mainWeaknessTag: WeaknessTag | null;

  @ApiProperty({ enum: WeaknessTag, isArray: true })
  secondaryWeaknessTags: WeaknessTag[];

  @ApiProperty({ type: () => [WeaknessTagCountResponse] })
  tagCounts: WeaknessTagCountResponse[];

  @ApiProperty({ type: () => [SeverityCountResponse] })
  severityCounts: SeverityCountResponse[];

  @ApiProperty({ type: () => [SampleMistakeResponse] })
  sampleMistakes: SampleMistakeResponse[];

  @ApiProperty({ type: String, nullable: true })
  recommendedLessonTitle: string | null;
}

export class PerformanceTrendPointResponse {
  @ApiProperty({ example: '2026-08-13' })
  date: string;

  @ApiProperty()
  value: number;
}

export class StudentPerformanceTrendResponse {
  @ApiProperty({ enum: performanceDirectionValues })
  direction: PerformanceDirection;

  @ApiProperty()
  primaryMetric: string;

  @ApiProperty({ enum: ['90D'] })
  range: '90D';

  @ApiProperty({ type: () => [PerformanceTrendPointResponse] })
  points: PerformanceTrendPointResponse[];
}
