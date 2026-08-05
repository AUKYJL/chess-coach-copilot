import {
  ConfidenceLevel,
  GameResult,
  MomentSeverity,
} from '../../generated/prisma/client.js';

export interface AnalysisResultMoment {
  moveNumber: string;
  movePlayed: string;
  bestMove?: string | null;
  fen?: string | null;
  evaluationBefore?: string | null;
  evaluationAfter?: string | null;
  evalChange?: string | null;
  severity: MomentSeverity;
  mainTag: string;
  secondaryTags: string[];
  confidence: number;
  whatHappened: string;
  studentExplanation: string;
  coachNote: string;
  trainingTheme?: string | null;
  sourceEvidence: Record<string, unknown>;
}

export interface AnalysisResultMistake {
  moveNumber: string;
  movePlayed: string;
  bestMove?: string | null;
  severity: MomentSeverity;
  category: string;
  explanation: string;
  suggestedFix?: string | null;
  sourceEvidence: Record<string, unknown>;
}

export interface AnalysisResultPayload {
  confidenceLevel: ConfidenceLevel;
  overallDiagnosis: string;
  openingName?: string | null;
  result: GameResult;
  mainWeaknessTag?: string | null;
  secondaryWeaknessTags: string[];
  recommendedLessonTitle?: string | null;
  recommendedLessonWhy?: string | null;
  recommendedFocusPoints: string[];
  criticalMoments: AnalysisResultMoment[];
  mistakes: AnalysisResultMistake[];
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

export function validateAnalysisResultPayload(
  payload: unknown,
): AnalysisResultPayload {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Analysis result payload must be an object');
  }

  const value = payload as Record<string, unknown>;

  if (
    !Object.values(ConfidenceLevel).includes(
      value.confidenceLevel as ConfidenceLevel,
    )
  ) {
    throw new Error('Invalid confidenceLevel');
  }

  if (!Object.values(GameResult).includes(value.result as GameResult)) {
    throw new Error('Invalid result');
  }

  if (
    typeof value.overallDiagnosis !== 'string' ||
    value.overallDiagnosis.length === 0
  ) {
    throw new Error('overallDiagnosis is required');
  }

  if (!isStringArray(value.secondaryWeaknessTags)) {
    throw new Error('secondaryWeaknessTags must be an array of strings');
  }

  if (!isStringArray(value.recommendedFocusPoints)) {
    throw new Error('recommendedFocusPoints must be an array of strings');
  }

  if (!Array.isArray(value.criticalMoments) || !Array.isArray(value.mistakes)) {
    throw new Error('criticalMoments and mistakes must be arrays');
  }

  return value as unknown as AnalysisResultPayload;
}
