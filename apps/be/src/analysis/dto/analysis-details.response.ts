import { ApiProperty } from '@nestjs/swagger';
import {
  ConfidenceLevel,
  GameResult,
  MomentSeverity,
  MoveColor,
  WeaknessTag,
} from '../../generated/prisma/client.js';

export class AnalysisCriticalMomentResponse {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  analysisId: string;

  @ApiProperty()
  ply: number;

  @ApiProperty()
  fullMoveNumber: number;

  @ApiProperty()
  moveNumber: string;

  @ApiProperty({ enum: MoveColor })
  moveColor: MoveColor;

  @ApiProperty()
  san: string;

  @ApiProperty({ type: String, nullable: true })
  lan: string | null;

  @ApiProperty({ type: String, nullable: true })
  uci: string | null;

  @ApiProperty()
  beforeFen: string;

  @ApiProperty()
  afterFen: string;

  @ApiProperty({ type: String, nullable: true })
  bestMove: string | null;

  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  bestVariation: Record<string, unknown>[];

  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  nags: Record<string, unknown>[];

  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  comments: Record<string, unknown>[];

  @ApiProperty({ type: 'object', additionalProperties: true, nullable: true })
  evaluationBefore: Record<string, unknown> | null;

  @ApiProperty({ type: 'object', additionalProperties: true, nullable: true })
  evaluationAfter: Record<string, unknown> | null;

  @ApiProperty({ enum: MomentSeverity })
  severity: MomentSeverity;

  @ApiProperty({ type: 'object', additionalProperties: true })
  sourceEvidence: Record<string, unknown>;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}

export class AnalysisMistakeResponse {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  analysisId: string;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  criticalMomentId: string | null;

  @ApiProperty({ enum: MomentSeverity })
  severity: MomentSeverity;

  @ApiProperty()
  category: string;

  @ApiProperty()
  explanation: string;

  @ApiProperty({ type: String, nullable: true })
  suggestedFix: string | null;

  @ApiProperty({ type: 'object', additionalProperties: true })
  sourceEvidence: Record<string, unknown>;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}

export class AnalysisDetailsResponse {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  analysisJobId: string;

  @ApiProperty({ format: 'uuid' })
  gameId: string;

  @ApiProperty({ format: 'uuid' })
  studentId: string;

  @ApiProperty({ enum: ConfidenceLevel })
  confidenceLevel: ConfidenceLevel;

  @ApiProperty({ enum: ['NONE', 'PARTIAL', 'FULL'] })
  annotationCoverage: 'NONE' | 'PARTIAL' | 'FULL';

  @ApiProperty({ type: String, nullable: true })
  reducedConfidenceWarning: string | null;

  @ApiProperty()
  overallDiagnosis: string;

  @ApiProperty({ type: String, nullable: true })
  openingName: string | null;

  @ApiProperty({ enum: GameResult })
  result: GameResult;

  @ApiProperty({ enum: WeaknessTag, nullable: true })
  mainWeaknessTag: WeaknessTag | null;

  @ApiProperty({ enum: WeaknessTag, isArray: true })
  secondaryWeaknessTags: WeaknessTag[];

  @ApiProperty({ type: String, nullable: true })
  recommendedLessonTitle: string | null;

  @ApiProperty({ type: String, nullable: true })
  recommendedLessonWhy: string | null;

  @ApiProperty({ type: [String] })
  recommendedFocusPoints: string[];

  @ApiProperty({ type: () => [AnalysisCriticalMomentResponse] })
  criticalMoments: AnalysisCriticalMomentResponse[];

  @ApiProperty({ type: () => [AnalysisMistakeResponse] })
  mistakes: AnalysisMistakeResponse[];

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}
