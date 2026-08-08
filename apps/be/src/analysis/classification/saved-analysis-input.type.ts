import type {
  ConfidenceLevel,
  GameResult,
  MomentSeverity,
  WeaknessTag,
} from '../../generated/prisma/client.js';

export interface SavedAnalysisInput {
  id: string;
  studentId: string;
  gameId: string;
  confidenceLevel: ConfidenceLevel;
  overallDiagnosis: string;
  openingName: string | null;
  result: GameResult;
  mainWeaknessTag: WeaknessTag | null;
  secondaryWeaknessTags: WeaknessTag[];
  recommendedLessonTitle: string | null;
  recommendedLessonWhy: string | null;
  recommendedFocusPoints: string[];
  criticalMoments: Array<{
    ply: number;
    moveNumber: string;
    san: string;
    severity: MomentSeverity;
    comments?: unknown;
    bestMove?: string | null;
  }>;
  mistakes: Array<{
    severity: MomentSeverity;
    category: string;
    explanation: string;
    suggestedFix: string | null;
  }>;
}
