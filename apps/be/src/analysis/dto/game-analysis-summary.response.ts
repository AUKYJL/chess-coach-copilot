import { ApiProperty } from '@nestjs/swagger';
import {
  AnnotationCoverage,
  ConfidenceLevel,
  GameResult,
  WeaknessTag,
} from '../../generated/prisma/client.js';

export class GameAnalysisSummaryResponse {
  id: string;
  analysisJobId: string;
  gameId: string;
  studentId: string;
  confidenceLevel: ConfidenceLevel;
  annotationCoverage: AnnotationCoverage;
  reducedConfidenceWarning: string | null;
  openingName: string | null;
  result: GameResult;
  @ApiProperty({ enum: WeaknessTag, nullable: true })
  mainWeaknessTag: WeaknessTag | null;
  createdAt: Date;
}
