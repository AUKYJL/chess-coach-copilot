import {
  AnnotationCoverage,
  ConfidenceLevel,
  GameResult,
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
  mainWeaknessTag: string | null;
  createdAt: Date;
}
