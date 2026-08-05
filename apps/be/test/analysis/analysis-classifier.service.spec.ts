import { jest } from '@jest/globals';
import {
  AnnotationCoverage,
  ConfidenceLevel,
  GameResult,
  MomentSeverity,
  StudentColor,
  WeaknessTag,
} from '../../src/generated/prisma/client.js';
import type { LlmService } from '../../src/llm/llm.service.js';
import type { LlmResponse } from '../../src/llm/llm.types.js';
import { ANALYSIS_CLASSIFIER_SYSTEM_PROMPT } from '../../src/analysis/classification/analysis-classifier.prompt.js';
import type { ParsedPgn } from '../../src/analysis/preparation/pgn-parser.service.js';
import type {
  ExtractedAnnotationContext,
  ExtractedAnnotationMoment,
} from '../../src/analysis/classification/annotation-extractor.service.js';
import { AnalysisClassifierService } from '../../src/analysis/classification/analysis-classifier.service.js';

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
    moves: [
      {
        ply: 1,
        fullMoveNumber: 1,
        moveNumber: '1.',
        color: 'w',
        san: 'e4',
        lan: 'e2e4',
        uci: 'e2e4',
        beforeFen: 'startpos',
        afterFen: 'after-e4',
        from: 'e2',
        to: 'e4',
        promotion: null,
        nags: [],
        comments: [],
        rawComment: null,
        bestMove: null,
        bestVariation: [],
        bestVariationMoves: [],
        evaluationBefore: null,
        evaluationAfter: null,
        sourceEvidence: {},
      },
      {
        ply: 2,
        fullMoveNumber: 1,
        moveNumber: '1...',
        color: 'b',
        san: 'c5',
        lan: 'c7c5',
        uci: 'c7c5',
        beforeFen: 'after-e4',
        afterFen: 'after-c5',
        from: 'c7',
        to: 'c5',
        promotion: null,
        nags: [],
        comments: [],
        rawComment: null,
        bestMove: null,
        bestVariation: [],
        bestVariationMoves: [],
        evaluationBefore: null,
        evaluationAfter: null,
        sourceEvidence: {},
      },
      {
        ply: 3,
        fullMoveNumber: 2,
        moveNumber: '2.',
        color: 'w',
        san: 'Nf3',
        lan: 'g1f3',
        uci: 'g1f3',
        beforeFen: 'after-c5',
        afterFen: 'after-nf3',
        from: 'g1',
        to: 'f3',
        promotion: null,
        nags: [],
        comments: [],
        rawComment: null,
        bestMove: null,
        bestVariation: [],
        bestVariationMoves: [],
        evaluationBefore: null,
        evaluationAfter: null,
        sourceEvidence: {},
      },
    ],
    result: GameResult.LOSS,
    rawResult: '0-1',
    studentColor: StudentColor.WHITE,
  };
}

function createMoment(): ExtractedAnnotationMoment {
  return {
    ply: 2,
    fullMoveNumber: 1,
    moveNumber: '1...',
    moveColor: 'b',
    san: 'c5',
    lan: 'c7c5',
    uci: 'c7c5',
    beforeFen: 'after-e4',
    afterFen: 'after-c5',
    bestMove: 'e5',
    bestVariation: ['e5', 'Nf3'],
    nags: ['$2'],
    comments: ['Mistake.'],
    evaluationBefore: null,
    evaluationAfter: {
      kind: 'centipawns',
      value: 80,
      raw: 0.8,
    },
    severity: MomentSeverity.MISTAKE,
    sourceEvidence: { engine: 'lichess' },
  };
}

function createExtractedContext(
  overrides: Partial<ExtractedAnnotationContext> = {},
): ExtractedAnnotationContext {
  return {
    hasEngineAnnotations: true,
    annotationCoverage: AnnotationCoverage.FULL,
    reducedConfidenceWarning: null,
    moments: [createMoment()],
    rawCommentCount: 1,
    candidateMomentCount: 1,
    diagnostics: [],
    ...overrides,
  };
}

describe('AnalysisClassifierService', () => {
  it('calls LlmService.classify with the runtime prompt and stringified payload', async () => {
    const classifyMock = jest.fn(() =>
      Promise.resolve({
        payload: {
          confidenceLevel: ConfidenceLevel.HIGH,
          overallDiagnosis:
            'The student forced complications without enough calculation.',
          openingName: 'Sicilian Defense',
          result: GameResult.LOSS,
          mainWeaknessTag: WeaknessTag.CALCULATION_DEPTH,
          secondaryWeaknessTags: [WeaknessTag.MISSED_OPPONENT_THREAT],
          recommendedLessonTitle: 'Calculate forcing moves before committing',
          recommendedLessonWhy:
            'The critical error came from overlooking the opponent reply.',
          recommendedFocusPoints: ['Checks', 'Captures'],
          mistakes: [],
        },
        promptVersion: 'v2',
        model: 'test-model',
        rawText: '{}',
      }),
    ) as () => Promise<LlmResponse>;
    const llmService: Pick<LlmService, 'classify'> = {
      classify: classifyMock,
    };
    const service = new AnalysisClassifierService(
      llmService as unknown as LlmService,
    );
    const parsedPgn = createParsedPgn();
    const extractedContext = createExtractedContext();

    const result = await service.classify(parsedPgn, extractedContext);

    expect(classifyMock).toHaveBeenCalledWith({
      systemPrompt: ANALYSIS_CLASSIFIER_SYSTEM_PROMPT,
      userPrompt: JSON.stringify({
        headers: parsedPgn.headers,
        rawResult: parsedPgn.rawResult,
        result: parsedPgn.result,
        studentColor: parsedPgn.studentColor,
        annotationCoverage: extractedContext.annotationCoverage,
        diagnostics: parsedPgn.diagnostics,
        moments: extractedContext.moments,
        surroundingMoves: [
          {
            ply: 2,
            context: parsedPgn.moves.map((move) => ({
              ply: move.ply,
              moveNumber: move.moveNumber,
              color: move.color,
              san: move.san,
              beforeFen: move.beforeFen,
              afterFen: move.afterFen,
            })),
          },
        ],
      }),
      schemaName: 'analysis-result',
    });
    expect(result.promptVersion).toBe('v2');
    expect(result.model).toBe('test-model');
    expect(result.payload.mainWeaknessTag).toBe(WeaknessTag.CALCULATION_DEPTH);
    expect(result.payload.secondaryWeaknessTags).toEqual([
      WeaknessTag.MISSED_OPPONENT_THREAT,
    ]);
  });

  it('returns the reduced-confidence fallback without calling LLM when evidence is insufficient', async () => {
    const classifyMock = jest.fn<() => Promise<LlmResponse>>();
    const llmService: Pick<LlmService, 'classify'> = {
      classify: classifyMock,
    };
    const service = new AnalysisClassifierService(
      llmService as unknown as LlmService,
    );

    const result = await service.classify(
      createParsedPgn(),
      createExtractedContext({
        hasEngineAnnotations: false,
        moments: [],
        annotationCoverage: AnnotationCoverage.NONE,
      }),
    );

    expect(classifyMock).not.toHaveBeenCalled();
    expect(result.promptVersion).toBe('rule-based-reduced-confidence-v2');
    expect(result.model).toBe('reduced-confidence-fallback');
    expect(result.payload.confidenceLevel).toBe(ConfidenceLevel.LOW);
    expect(result.payload.mainWeaknessTag).toBe(
      WeaknessTag.INSUFFICIENT_ANNOTATION_DATA,
    );
  });

  it('throws when LLM returns an invalid payload', async () => {
    const classifyMock = jest.fn(() =>
      Promise.resolve({
        payload: {
          confidenceLevel: ConfidenceLevel.HIGH,
          overallDiagnosis: 'Valid diagnosis',
          result: GameResult.LOSS,
          secondaryWeaknessTags: [],
          recommendedFocusPoints: [],
          mistakes: [
            {
              criticalMomentPly: 2,
              severity: 'MISTAKE',
              category: 'calculation_depth',
              explanation: 'Missing enum validation.',
              sourceEvidence: [],
            },
          ],
        },
        promptVersion: 'v2',
        model: 'test-model',
        rawText: '{}',
      }),
    ) as () => Promise<LlmResponse>;
    const llmService: Pick<LlmService, 'classify'> = {
      classify: classifyMock,
    };
    const service = new AnalysisClassifierService(
      llmService as unknown as LlmService,
    );

    await expect(
      service.classify(createParsedPgn(), createExtractedContext()),
    ).rejects.toThrow();
  });
});
