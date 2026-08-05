import {
  AnnotationCoverage,
  ConfidenceLevel,
  GameResult,
  MomentSeverity,
} from '../../generated/prisma/client.js';

export class GameAnalysisMomentResponse {
  id: string;
  moveNumber: string;
  movePlayed: string;
  bestMove: string | null;
  fen: string | null;
  evaluationBefore: string | null;
  evaluationAfter: string | null;
  evalChange: string | null;
  severity: MomentSeverity;
  mainTag: string;
  secondaryTags: string[];
  confidence: number;
  whatHappened: string;
  studentExplanation: string;
  coachNote: string;
  trainingTheme: string | null;
  sourceEvidence: Record<string, unknown>;
}

export class GameAnalysisMistakeResponse {
  id: string;
  moveNumber: string;
  movePlayed: string;
  bestMove: string | null;
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
  mainWeaknessTag: string | null;
  secondaryWeaknessTags: string[];
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
