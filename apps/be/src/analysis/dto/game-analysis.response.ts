import { ApiProperty } from '@nestjs/swagger';
import {
  AnnotationCoverage,
  ConfidenceLevel,
  GameResult,
  MomentSeverity,
  MoveColor,
  WeaknessTag,
} from '../../generated/prisma/client.js';

export class GameAnalysisMomentResponse {
  id: string;
  ply: number;
  fullMoveNumber: number;
  moveNumber: string;
  moveColor: MoveColor;
  san: string;
  lan: string | null;
  uci: string | null;
  beforeFen: string;
  afterFen: string;
  bestMove: string | null;
  bestVariation: string[];
  nags: string[];
  comments: string[];
  evaluationBefore: Record<string, unknown> | null;
  evaluationAfter: Record<string, unknown> | null;
  severity: MomentSeverity;
  sourceEvidence: Record<string, unknown>;
}

export class GameAnalysisMistakeResponse {
  id: string;
  criticalMomentId: string | null;
  severity: MomentSeverity;
  category: string;
  explanation: string;
  suggestedFix: string | null;
  sourceEvidence: Record<string, unknown>;
}

export class GameAnalysisResponse {
  id: string;
  analysisJobId: string;
  gameId: string;
  studentId: string;
  confidenceLevel: ConfidenceLevel;
  annotationCoverage: AnnotationCoverage;
  reducedConfidenceWarning: string | null;
  overallDiagnosis: string;
  openingName: string | null;
  result: GameResult;
  @ApiProperty({ enum: WeaknessTag, nullable: true })
  mainWeaknessTag: WeaknessTag | null;
  @ApiProperty({ enum: WeaknessTag, isArray: true })
  secondaryWeaknessTags: WeaknessTag[];
  recommendedLessonTitle: string | null;
  recommendedLessonWhy: string | null;
  recommendedFocusPoints: string[];
  criticalMoments: GameAnalysisMomentResponse[];
  mistakes: GameAnalysisMistakeResponse[];
  rawExtractedContext: Record<string, unknown>;
  rawAnalysisJson: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
