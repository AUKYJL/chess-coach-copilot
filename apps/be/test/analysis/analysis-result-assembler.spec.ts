import {
  AnnotationCoverage,
  ConfidenceLevel,
  GameResult,
  MomentSeverity,
  StudentColor,
  WeaknessTag,
} from '../../src/generated/prisma/client.js';
import {
  ANALYSIS_INTERPRETATION_ASSEMBLY_ERROR_CODE,
  AnalysisInterpretationAssemblyError,
  assembleAnalysisResultPayload,
  buildReducedConfidenceAnalysisResult,
  deriveAnalysisConfidenceLevel,
} from '../../src/analysis/classification/analysis-result-assembler.js';
import type { ExtractedAnnotationContext } from '../../src/analysis/classification/annotation-extractor.service.js';
import type { AnalysisInterpretationPayload } from '../../src/analysis/classification/analysis-interpretation.schema.js';
import type { ParsedPgn } from '../../src/analysis/preparation/pgn-parser.service.js';

function createParsedPgn(): ParsedPgn {
  return {
    headers: {
      event: 'Training game',
      site: 'Lichess',
      white: 'White',
      black: 'Black',
      result: '0-1',
      opening: 'Sicilian Defense',
      eco: 'B20',
      annotator: 'Lichess',
      initialFen: null,
      setUp: null,
    },
    rawTags: {},
    diagnostics: [],
    moves: [],
    result: GameResult.LOSS,
    rawResult: '0-1',
    studentColor: StudentColor.WHITE,
  };
}

function createExtractedContext(): ExtractedAnnotationContext {
  return {
    hasEngineAnnotations: true,
    annotationCoverage: AnnotationCoverage.FULL,
    reducedConfidenceWarning: null,
    rawCommentCount: 1,
    candidateMomentCount: 2,
    diagnostics: [],
    moments: [
      {
        momentId: 'moment-1',
        ply: 12,
        fullMoveNumber: 6,
        moveNumber: '6.',
        moveColor: 'w',
        san: 'Re1',
        lan: 'e1e1',
        uci: 'e1e1',
        beforeFen: 'before-1',
        afterFen: 'after-1',
        bestMove: 'd4',
        bestVariation: ['d4', 'exd4'],
        nags: ['$2'],
        comments: ['test'],
        evaluationBefore: {
          kind: 'centipawns',
          value: 10,
          raw: 0.1,
        },
        evaluationAfter: {
          kind: 'centipawns',
          value: -90,
          raw: -0.9,
        },
        severity: MomentSeverity.MISTAKE,
        sourceEvidence: { line: 'one' },
      },
      {
        momentId: 'moment-2',
        ply: 19,
        fullMoveNumber: 10,
        moveNumber: '10...',
        moveColor: 'b',
        san: 'Qb6',
        lan: 'd8b6',
        uci: 'd8b6',
        beforeFen: 'before-2',
        afterFen: 'after-2',
        bestMove: 'Nf6',
        bestVariation: ['Nf6', 'Nc3'],
        nags: ['$6'],
        comments: ['test-2'],
        evaluationBefore: {
          kind: 'centipawns',
          value: 0,
          raw: 0,
        },
        evaluationAfter: {
          kind: 'centipawns',
          value: -40,
          raw: -0.4,
        },
        severity: MomentSeverity.INACCURACY,
        sourceEvidence: { line: 'two' },
      },
    ],
  };
}

function createInterpretation(): AnalysisInterpretationPayload {
  return {
    overallDiagnosis: 'The student rushed forcing decisions.',
    mainWeaknessTag: WeaknessTag.CALCULATION_DEPTH,
    secondaryWeaknessTags: [WeaknessTag.MISSED_OPPONENT_THREAT],
    recommendedLessonTitle: 'Calculate forcing replies',
    recommendedLessonWhy: 'The student missed the opponent response.',
    recommendedFocusPoints: ['Checks', 'Captures'],
    mistakes: [
      {
        momentId: 'moment-2',
        category: 'time_management',
        explanation: 'The move was rushed.',
        suggestedFix: 'Pause before forcing moves.',
      },
      {
        momentId: 'moment-1',
        category: 'calculation_depth',
        explanation: 'The student missed a forcing line.',
        suggestedFix: 'Check all forcing replies first.',
      },
    ],
  };
}

describe('analysis-result-assembler', () => {
  it('assembles deterministic backend evidence with AI interpretation', () => {
    const payload = assembleAnalysisResultPayload({
      parsedPgn: createParsedPgn(),
      extractedContext: createExtractedContext(),
      interpretation: createInterpretation(),
    });

    expect(payload).toMatchObject({
      confidenceLevel: ConfidenceLevel.HIGH,
      openingName: 'Sicilian Defense',
      result: GameResult.LOSS,
      mainWeaknessTag: WeaknessTag.CALCULATION_DEPTH,
      mistakes: [
        {
          criticalMomentPly: 19,
          severity: MomentSeverity.INACCURACY,
          category: 'time_management',
          sourceEvidence: { line: 'two' },
        },
        {
          criticalMomentPly: 12,
          severity: MomentSeverity.MISTAKE,
          category: 'calculation_depth',
          sourceEvidence: { line: 'one' },
        },
      ],
    });
  });

  it('derives confidence from annotation coverage', () => {
    const baseContext = createExtractedContext();

    expect(deriveAnalysisConfidenceLevel(baseContext)).toBe(
      ConfidenceLevel.HIGH,
    );
    expect(
      deriveAnalysisConfidenceLevel({
        ...baseContext,
        annotationCoverage: AnnotationCoverage.PARTIAL,
      }),
    ).toBe(ConfidenceLevel.MEDIUM);
    expect(
      deriveAnalysisConfidenceLevel({
        ...baseContext,
        hasEngineAnnotations: false,
        annotationCoverage: AnnotationCoverage.NONE,
      }),
    ).toBe(ConfidenceLevel.LOW);
  });

  it('returns a specialized assembly error for unknown momentIds', () => {
    expect(() =>
      assembleAnalysisResultPayload({
        parsedPgn: createParsedPgn(),
        extractedContext: createExtractedContext(),
        interpretation: {
          ...createInterpretation(),
          mistakes: [
            {
              momentId: 'moment-99',
              category: 'calculation_depth',
              explanation: 'Unknown moment.',
            },
          ],
        },
      }),
    ).toThrow(
      expect.objectContaining<Partial<AnalysisInterpretationAssemblyError>>({
        name: AnalysisInterpretationAssemblyError.name,
        code: ANALYSIS_INTERPRETATION_ASSEMBLY_ERROR_CODE.UNKNOWN_MOMENT_ID,
        details: {
          momentId: 'moment-99',
          mistakeIndex: 0,
        },
      }),
    );
  });

  it('returns a specialized assembly error for duplicate momentIds', () => {
    expect(() =>
      assembleAnalysisResultPayload({
        parsedPgn: createParsedPgn(),
        extractedContext: createExtractedContext(),
        interpretation: {
          ...createInterpretation(),
          mistakes: [
            {
              momentId: 'moment-1',
              category: 'calculation_depth',
              explanation: 'First.',
            },
            {
              momentId: 'moment-1',
              category: 'time_management',
              explanation: 'Duplicate.',
            },
          ],
        },
      }),
    ).toThrow(
      expect.objectContaining<Partial<AnalysisInterpretationAssemblyError>>({
        name: AnalysisInterpretationAssemblyError.name,
        code: ANALYSIS_INTERPRETATION_ASSEMBLY_ERROR_CODE.DUPLICATE_MOMENT_ID,
        details: {
          momentId: 'moment-1',
          duplicateIndexes: [0, 1],
        },
      }),
    );
  });

  it('builds the reduced-confidence fallback without AI interpretation', () => {
    const payload = buildReducedConfidenceAnalysisResult(createParsedPgn());

    expect(payload).toMatchObject({
      confidenceLevel: ConfidenceLevel.LOW,
      openingName: 'Sicilian Defense',
      result: GameResult.LOSS,
      mainWeaknessTag: WeaknessTag.INSUFFICIENT_ANNOTATION_DATA,
      secondaryWeaknessTags: [WeaknessTag.REDUCED_CONFIDENCE],
      mistakes: [],
    });
  });
});
