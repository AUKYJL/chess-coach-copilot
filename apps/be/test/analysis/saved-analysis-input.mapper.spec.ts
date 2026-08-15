import {
  ConfidenceLevel,
  GameResult,
  MistakeReviewStatus,
  MomentSeverity,
  WeaknessTag,
} from '../../src/generated/prisma/client.js';
import { SavedAnalysisInputMapper } from '../../src/analysis/classification/saved-analysis-input.mapper.js';

describe('SavedAnalysisInputMapper', () => {
  it('propagates review status and coach note into saved analysis input', () => {
    const mapper = new SavedAnalysisInputMapper();

    const input = mapper.map({
      id: 'analysis-1',
      studentId: 'student-1',
      gameId: 'game-1',
      confidenceLevel: ConfidenceLevel.HIGH,
      overallDiagnosis: 'Diagnosis',
      openingName: 'Italian Game',
      result: GameResult.WIN,
      mainWeaknessTag: WeaknessTag.CALCULATION_DEPTH,
      secondaryWeaknessTags: [WeaknessTag.TIME_MANAGEMENT],
      recommendedLessonTitle: 'Checks and forcing moves',
      recommendedLessonWhy: 'The student missed forcing continuations.',
      recommendedFocusPoints: ['Scan checks before candidate moves'],
      criticalMoments: [
        {
          ply: 18,
          moveNumber: '9...',
          san: 'Nc6',
          severity: MomentSeverity.MISTAKE,
        },
      ],
      mistakes: [
        {
          severity: MomentSeverity.MISTAKE,
          category: 'calculation_depth',
          explanation: 'Missed a forcing move.',
          suggestedFix: 'Check forcing moves first.',
          reviewStatus: MistakeReviewStatus.CONFIRMED,
          coachNote: 'Coach note: calculate checks first.',
        },
      ],
    });

    expect(input.mistakes).toEqual([
      expect.objectContaining({
        reviewStatus: MistakeReviewStatus.CONFIRMED,
        coachNote: 'Coach note: calculate checks first.',
      }),
    ]);
  });
});
