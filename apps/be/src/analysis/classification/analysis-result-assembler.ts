import {
  AnnotationCoverage,
  ConfidenceLevel,
  WeaknessTag,
} from '../../generated/prisma/client.js';
import type { ParsedPgn } from '../preparation/pgn-parser.service.js';
import type { ExtractedAnnotationContext } from './annotation-extractor.service.js';
import type { AnalysisInterpretationPayload } from './analysis-interpretation.schema.js';
import type { AnalysisResultPayload } from './analysis-result.schema.js';
import { validateAnalysisResultPayload } from './analysis-result.schema.js';

export const UNKNOWN_MOMENT_ID_ERROR =
  'LLM returned a momentId that does not exist in the structured evidence';
export const DUPLICATE_MOMENT_ID_ERROR =
  'LLM returned duplicate momentIds in the interpretation payload';

export const ANALYSIS_INTERPRETATION_ASSEMBLY_ERROR_CODE = {
  UNKNOWN_MOMENT_ID: 'UNKNOWN_MOMENT_ID',
  DUPLICATE_MOMENT_ID: 'DUPLICATE_MOMENT_ID',
} as const;

type AnalysisInterpretationAssemblyErrorCode =
  (typeof ANALYSIS_INTERPRETATION_ASSEMBLY_ERROR_CODE)[keyof typeof ANALYSIS_INTERPRETATION_ASSEMBLY_ERROR_CODE];

interface UnknownMomentIdAssemblyErrorDetails {
  momentId: string;
  mistakeIndex: number;
}

interface DuplicateMomentIdAssemblyErrorDetails {
  momentId: string;
  duplicateIndexes: [number, number];
}

export class AnalysisInterpretationAssemblyError extends Error {
  constructor(
    readonly code: AnalysisInterpretationAssemblyErrorCode,
    readonly details:
      | UnknownMomentIdAssemblyErrorDetails
      | DuplicateMomentIdAssemblyErrorDetails,
  ) {
    super(
      code === ANALYSIS_INTERPRETATION_ASSEMBLY_ERROR_CODE.UNKNOWN_MOMENT_ID
        ? UNKNOWN_MOMENT_ID_ERROR
        : DUPLICATE_MOMENT_ID_ERROR,
    );
    this.name = AnalysisInterpretationAssemblyError.name;
  }
}

export function deriveAnalysisConfidenceLevel(
  extractedContext: ExtractedAnnotationContext,
): ConfidenceLevel {
  if (
    !extractedContext.hasEngineAnnotations ||
    extractedContext.annotationCoverage === AnnotationCoverage.NONE
  ) {
    return ConfidenceLevel.LOW;
  }

  if (extractedContext.annotationCoverage === AnnotationCoverage.PARTIAL) {
    return ConfidenceLevel.MEDIUM;
  }

  return ConfidenceLevel.HIGH;
}

export function buildReducedConfidenceAnalysisResult(
  parsedPgn: ParsedPgn,
): AnalysisResultPayload {
  return validateAnalysisResultPayload({
    confidenceLevel: ConfidenceLevel.LOW,
    overallDiagnosis:
      'The game is parseable, but it does not contain enough reliable annotated evidence to derive objective coaching mistakes.',
    openingName: parsedPgn.headers.opening,
    result: parsedPgn.result,
    mainWeaknessTag: WeaknessTag.INSUFFICIENT_ANNOTATION_DATA,
    secondaryWeaknessTags: [WeaknessTag.REDUCED_CONFIDENCE],
    recommendedLessonTitle: 'Replay the game with annotated evidence',
    recommendedLessonWhy:
      'Reliable best-line or evaluation evidence is required before assigning objective mistake categories.',
    recommendedFocusPoints: [
      'Re-export the game with full Lichess annotations',
      'Review the critical decisions manually',
    ],
    mistakes: [],
  });
}

export function buildNoCriticalMomentsAnalysisResult(
  parsedPgn: ParsedPgn,
): AnalysisResultPayload {
  return validateAnalysisResultPayload({
    confidenceLevel: ConfidenceLevel.MEDIUM,
    overallDiagnosis:
      'No critical student moves were detected from the available engine evidence.',
    openingName: parsedPgn.headers.opening,
    result: parsedPgn.result,
    mainWeaknessTag: null,
    secondaryWeaknessTags: [],
    recommendedLessonTitle: null,
    recommendedLessonWhy: null,
    recommendedFocusPoints: [],
    mistakes: [],
  });
}

export function assembleAnalysisResultPayload(data: {
  parsedPgn: ParsedPgn;
  extractedContext: ExtractedAnnotationContext;
  interpretation: AnalysisInterpretationPayload;
}): AnalysisResultPayload {
  const momentsById = new Map(
    data.extractedContext.moments.map((moment) => [moment.momentId, moment]),
  );
  const seenMomentIds = new Map<string, number>();

  const mistakes = data.interpretation.mistakes.map((mistake, mistakeIndex) => {
    const firstSeenIndex = seenMomentIds.get(mistake.momentId);

    if (firstSeenIndex !== undefined) {
      throw new AnalysisInterpretationAssemblyError(
        ANALYSIS_INTERPRETATION_ASSEMBLY_ERROR_CODE.DUPLICATE_MOMENT_ID,
        {
          momentId: mistake.momentId,
          duplicateIndexes: [firstSeenIndex, mistakeIndex],
        },
      );
    }

    seenMomentIds.set(mistake.momentId, mistakeIndex);

    const moment = momentsById.get(mistake.momentId);

    if (!moment) {
      throw new AnalysisInterpretationAssemblyError(
        ANALYSIS_INTERPRETATION_ASSEMBLY_ERROR_CODE.UNKNOWN_MOMENT_ID,
        {
          momentId: mistake.momentId,
          mistakeIndex,
        },
      );
    }

    return {
      criticalMomentPly: moment.ply,
      severity: moment.severity,
      category: mistake.category,
      mainTag: mistake.mainTag ?? null,
      secondaryTags: mistake.secondaryTags,
      explanation: mistake.explanation,
      suggestedFix: mistake.suggestedFix ?? null,
      sourceEvidence: moment.sourceEvidence,
    };
  });

  return validateAnalysisResultPayload({
    confidenceLevel: deriveAnalysisConfidenceLevel(data.extractedContext),
    overallDiagnosis: data.interpretation.overallDiagnosis,
    openingName: data.parsedPgn.headers.opening,
    result: data.parsedPgn.result,
    mainWeaknessTag: data.interpretation.mainWeaknessTag ?? null,
    secondaryWeaknessTags: data.interpretation.secondaryWeaknessTags,
    recommendedLessonTitle: data.interpretation.recommendedLessonTitle ?? null,
    recommendedLessonWhy: data.interpretation.recommendedLessonWhy ?? null,
    recommendedFocusPoints: data.interpretation.recommendedFocusPoints,
    mistakes,
  });
}
