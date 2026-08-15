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
import { analysisInterpretationPayloadSchema } from '../../src/analysis/classification/analysis-interpretation.schema.js';
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
    momentId: 'moment-1',
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
  it('calls LlmService.classify with schema-aware runtime prompt metadata and stringified payload', async () => {
    const classifyMock = jest.fn(() =>
      Promise.resolve({
        payload: {
          overallDiagnosis:
            'The student forced complications without enough calculation.',
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
            momentId: 'moment-1',
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
      structuredOutput: {
        name: 'analysis_interpretation_payload',
        schema: analysisInterpretationPayloadSchema,
      },
    });
    expect(result.promptVersion).toBe('v2');
    expect(result.model).toBe('test-model');
    expect(result.payload.confidenceLevel).toBe(ConfidenceLevel.HIGH);
    expect(result.payload.openingName).toBe('Sicilian Defense');
    expect(result.payload.result).toBe(GameResult.LOSS);
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
    expect(result.promptVersion).toBe('rule-based-reduced-confidence-v3');
    expect(result.model).toBe('reduced-confidence-fallback');
    expect(result.payload.confidenceLevel).toBe(ConfidenceLevel.LOW);
    expect(result.payload.mainWeaknessTag).toBe(
      WeaknessTag.INSUFFICIENT_ANNOTATION_DATA,
    );
    expect(result.rawOutput).toEqual({
      mode: 'rule_based_reduced_confidence',
      reason: 'insufficient_engine_annotations',
    });
  });

  it('defaults omitted non-critical interpretation fields', async () => {
    const classifyMock = jest.fn(() =>
      Promise.resolve({
        payload: {
          overallDiagnosis: 'The student developed the queen too early.',
          recommendedLessonTitle: 'Queen timing',
          recommendedLessonWhy: 'The queen was exposed before development.',
          mistakes: [
            {
              momentId: 'moment-1',
              category: 'opening_strategy',
              explanation: 'The queen came out before the minor pieces.',
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

    const result = await service.classify(
      createParsedPgn(),
      createExtractedContext(),
    );

    expect(result.payload.mainWeaknessTag).toBeNull();
    expect(result.payload.secondaryWeaknessTags).toEqual([]);
    expect(result.payload.recommendedFocusPoints).toEqual([]);
  });

  it('rejects unknown momentIds from the AI interpretation payload', async () => {
    const classifyMock = jest.fn(() =>
      Promise.resolve({
        payload: {
          overallDiagnosis: 'Valid diagnosis',
          secondaryWeaknessTags: [],
          recommendedFocusPoints: [],
          mistakes: [
            {
              momentId: 'moment-99',
              category: 'calculation_depth',
              explanation: 'Unknown moment reference.',
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
    ).rejects.toMatchObject({
      name: 'LlmResponseValidationError',
      failureCode: 'INVALID_PAYLOAD',
      rawText: '{}',
      parsedPayload: expect.objectContaining({
        mistakes: [
          expect.objectContaining({
            momentId: 'moment-99',
          }),
        ],
      }),
      model: 'test-model',
      promptVersion: 'v2',
      validationIssues: {
        issues: [
          {
            path: ['mistakes', '0', 'momentId'],
            code: 'custom',
            message:
              'Unknown momentId "moment-99" referenced by interpretation payload',
          },
        ],
      },
    });
  });

  it('rejects duplicate momentIds from the AI interpretation payload', async () => {
    const classifyMock = jest.fn(() =>
      Promise.resolve({
        payload: {
          overallDiagnosis: 'Valid diagnosis',
          secondaryWeaknessTags: [],
          recommendedFocusPoints: [],
          mistakes: [
            {
              momentId: 'moment-1',
              category: 'calculation_depth',
              explanation: 'First interpretation.',
            },
            {
              momentId: 'moment-1',
              category: 'time_management',
              explanation: 'Duplicate interpretation.',
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
    ).rejects.toMatchObject({
      name: 'LlmResponseValidationError',
      failureCode: 'INVALID_PAYLOAD',
      rawText: '{}',
      parsedPayload: expect.objectContaining({
        mistakes: [
          expect.objectContaining({
            momentId: 'moment-1',
          }),
          expect.objectContaining({
            momentId: 'moment-1',
          }),
        ],
      }),
      model: 'test-model',
      promptVersion: 'v2',
      validationIssues: {
        issues: [
          {
            path: ['mistakes', '0', 'momentId'],
            code: 'custom',
            message:
              'Duplicate momentId "moment-1" referenced by interpretation payload',
          },
          {
            path: ['mistakes', '1', 'momentId'],
            code: 'custom',
            message:
              'Duplicate momentId "moment-1" referenced by interpretation payload',
          },
        ],
      },
    });
  });

  it('includes validation issues when the interpretation payload is structurally invalid', async () => {
    const classifyMock = jest.fn(() =>
      Promise.resolve({
        payload: {
          secondaryWeaknessTags: [],
          recommendedFocusPoints: [],
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
    ).rejects.toMatchObject({
      name: 'LlmResponseValidationError',
      failureCode: 'INVALID_PAYLOAD',
      validationIssues: {
        issues: expect.arrayContaining([
          expect.objectContaining({
            path: ['overallDiagnosis'],
          }),
          expect.objectContaining({
            path: ['mistakes'],
          }),
        ]),
      },
    });
  });

  it('does not mask unexpected assembler exceptions as LLM validation failures', async () => {
    const classifyMock = jest.fn(() =>
      Promise.resolve({
        payload: {
          overallDiagnosis: 'Valid diagnosis',
          secondaryWeaknessTags: [],
          recommendedFocusPoints: [],
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

    await expect(
      service.classify(
        {
          ...createParsedPgn(),
          result: 'BROKEN_RESULT' as GameResult,
        },
        createExtractedContext(),
      ),
    ).rejects.toMatchObject({
      name: 'ZodError',
    });
  });
});
