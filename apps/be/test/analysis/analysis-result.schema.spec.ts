import {
  ConfidenceLevel,
  GameResult,
  MomentSeverity,
  WeaknessTag,
} from '../../src/generated/prisma/client.js';
import { validateAnalysisResultPayload } from '../../src/analysis/classification/analysis-result.schema.js';

describe('validateAnalysisResultPayload', () => {
  it('accepts a valid full payload', () => {
    expect(
      validateAnalysisResultPayload({
        confidenceLevel: ConfidenceLevel.HIGH,
        overallDiagnosis: 'The student rushed tactical decisions.',
        openingName: 'Sicilian Defense',
        result: GameResult.LOSS,
        mainWeaknessTag: WeaknessTag.CALCULATION_DEPTH,
        secondaryWeaknessTags: [WeaknessTag.MISSED_OPPONENT_THREAT],
        recommendedLessonTitle: 'Slow down before forcing lines',
        recommendedLessonWhy:
          'The key mistakes came from incomplete candidate move checks.',
        recommendedFocusPoints: ['Checks', 'Captures', 'Threats'],
        mistakes: [
          {
            criticalMomentPly: 18,
            severity: MomentSeverity.MISTAKE,
            category: 'calculation_depth',
            mainTag: WeaknessTag.CALCULATION_DEPTH,
            secondaryTags: [WeaknessTag.MISSED_OPPONENT_THREAT],
            explanation: 'The move ignored the opponent tactical reply.',
            suggestedFix: 'List the forcing replies before committing.',
            sourceEvidence: {
              engine: 'lichess',
              evalSwing: 1.8,
            },
          },
        ],
      }),
    ).toMatchObject({
      confidenceLevel: ConfidenceLevel.HIGH,
      mistakes: [
        expect.objectContaining({
          criticalMomentPly: 18,
          severity: MomentSeverity.MISTAKE,
        }),
      ],
    });
  });

  it('accepts a reduced-confidence payload with empty mistakes', () => {
    expect(
      validateAnalysisResultPayload({
        confidenceLevel: ConfidenceLevel.LOW,
        overallDiagnosis: 'Not enough annotated evidence was available.',
        openingName: null,
        result: GameResult.UNKNOWN,
        mainWeaknessTag: null,
        secondaryWeaknessTags: [WeaknessTag.REDUCED_CONFIDENCE],
        recommendedLessonTitle: null,
        recommendedLessonWhy: null,
        recommendedFocusPoints: ['Re-export the game with annotations'],
        mistakes: [],
      }),
    ).toMatchObject({
      confidenceLevel: ConfidenceLevel.LOW,
      secondaryWeaknessTags: [WeaknessTag.REDUCED_CONFIDENCE],
      mistakes: [],
    });
  });

  it('rejects a non-object payload', () => {
    expect(() => validateAnalysisResultPayload('invalid')).toThrow();
  });

  it('rejects invalid enum values', () => {
    expect(() =>
      validateAnalysisResultPayload({
        confidenceLevel: 'VERY_HIGH',
        overallDiagnosis: 'Diagnosis',
        result: GameResult.WIN,
        secondaryWeaknessTags: [],
        recommendedFocusPoints: [],
        mistakes: [],
      }),
    ).toThrow();
  });

  it('accepts the Prisma weakness-tag vocabulary', () => {
    expect(
      validateAnalysisResultPayload({
        confidenceLevel: ConfidenceLevel.HIGH,
        overallDiagnosis: 'Diagnosis',
        result: GameResult.WIN,
        mainWeaknessTag: WeaknessTag.INSUFFICIENT_ANNOTATION_DATA,
        secondaryWeaknessTags: [WeaknessTag.TIME_MANAGEMENT],
        recommendedFocusPoints: [],
        mistakes: [],
      }),
    ).toMatchObject({
      mainWeaknessTag: WeaknessTag.INSUFFICIENT_ANNOTATION_DATA,
      secondaryWeaknessTags: [WeaknessTag.TIME_MANAGEMENT],
    });
  });

  it('rejects lowercase or hyphenated weakness-tag aliases', () => {
    expect(() =>
      validateAnalysisResultPayload({
        confidenceLevel: ConfidenceLevel.MEDIUM,
        overallDiagnosis: 'Diagnosis',
        result: GameResult.DRAW,
        mainWeaknessTag: 'calculation_depth',
        secondaryWeaknessTags: ['time-management'],
        recommendedFocusPoints: [],
        mistakes: [],
      }),
    ).toThrow();
  });

  it('rejects missing required fields', () => {
    expect(() =>
      validateAnalysisResultPayload({
        confidenceLevel: ConfidenceLevel.HIGH,
        result: GameResult.WIN,
        secondaryWeaknessTags: [],
        recommendedFocusPoints: [],
        mistakes: [],
      }),
    ).toThrow();
  });

  it('rejects an invalid mistakes entry', () => {
    expect(() =>
      validateAnalysisResultPayload({
        confidenceLevel: ConfidenceLevel.MEDIUM,
        overallDiagnosis: 'Diagnosis',
        result: GameResult.DRAW,
        secondaryWeaknessTags: [],
        recommendedFocusPoints: [],
        mistakes: [
          {
            criticalMomentPly: '18',
            severity: 'MISTAKE',
            category: '',
            mainTag: null,
            secondaryTags: [],
            explanation: 'Explanation',
            sourceEvidence: {},
          },
        ],
      }),
    ).toThrow();
  });

  it('rejects non-object sourceEvidence', () => {
    expect(() =>
      validateAnalysisResultPayload({
        confidenceLevel: ConfidenceLevel.MEDIUM,
        overallDiagnosis: 'Diagnosis',
        result: GameResult.DRAW,
        secondaryWeaknessTags: [],
        recommendedFocusPoints: [],
        mistakes: [
          {
            criticalMomentPly: 12,
            severity: MomentSeverity.INACCURACY,
            category: 'time_management',
            mainTag: WeaknessTag.TIME_MANAGEMENT,
            secondaryTags: [],
            explanation: 'Explanation',
            sourceEvidence: ['invalid'],
          },
        ],
      }),
    ).toThrow();
  });

  it('rejects invalid mistake tag enums', () => {
    expect(() =>
      validateAnalysisResultPayload({
        confidenceLevel: ConfidenceLevel.HIGH,
        overallDiagnosis: 'Diagnosis',
        result: GameResult.WIN,
        mainWeaknessTag: WeaknessTag.CALCULATION_DEPTH,
        secondaryWeaknessTags: [],
        recommendedFocusPoints: [],
        mistakes: [
          {
            criticalMomentPly: 18,
            severity: MomentSeverity.MISTAKE,
            category: 'calculation_depth',
            mainTag: 'calculation_depth',
            secondaryTags: ['time-management'],
            explanation: 'Explanation',
            sourceEvidence: {},
          },
        ],
      }),
    ).toThrow();
  });
});
