import { jest } from '@jest/globals';
import {
  ConfidenceLevel,
  GameResult,
  MistakeReviewStatus,
  MomentSeverity,
  ReportAudience,
  WeaknessTag,
} from '../../src/generated/prisma/client.js';
import {
  COACH_REPORT_PROMPT,
  HOMEWORK_PROMPT,
  PROGRESS_ANALYSIS_PROMPT,
} from '../../src/analysis/classification/analysis-classifier.prompt.js';
import { SavedOutputGenerationService } from '../../src/analysis/classification/saved-output-generation.service.js';
import type { SavedAnalysisInput } from '../../src/analysis/classification/saved-analysis-input.type.js';
import { LlmService } from '../../src/llm/llm.service.js';

describe('SavedOutputGenerationService', () => {
  it('generates a report through the explicit structured LLM path', async () => {
    const generate = jest.fn(() =>
      Promise.reject(new Error('raw generate should not be called')),
    );
    const generateStructured = jest.fn(() =>
      Promise.resolve({
        model: 'test-model',
        promptVersion: 'v1',
        rawText:
          '{"title":"Coach report","summary":"Summary","highlights":["Highlight"],"lessonFocus":["Focus"],"nextSteps":["Next"]}',
        payload: {
          title: 'Coach report',
          summary: 'Summary',
          highlights: ['Highlight'],
          lessonFocus: ['Focus'],
          nextSteps: ['Next'],
        },
      }),
    );
    const service = new SavedOutputGenerationService({
      generate,
      generateStructured,
    } as unknown as LlmService);

    const result = await service.generateReport({
      analysis: createSavedAnalysis(),
      audience: ReportAudience.COACH,
    });

    expect(generate).not.toHaveBeenCalled();
    expect(generateStructured).toHaveBeenCalledWith({
      systemPrompt: COACH_REPORT_PROMPT,
      userPrompt: expect.any(String),
      structuredOutput: {
        name: 'generated_report_payload',
        schema: expect.anything(),
      },
    });
    const reportRequest = getStructuredRequest(generateStructured);
    expect(JSON.parse(reportRequest.userPrompt)).toMatchObject({
      audience: ReportAudience.COACH,
      analysis: {
        id: 'analysis-1',
        studentId: 'student-1',
        mistakes: [
          {
            reviewStatus: MistakeReviewStatus.CONFIRMED,
            coachNote: 'Coach note: calculate checks first.',
          },
        ],
      },
    });
    expect(result).toEqual({
      title: 'Coach report',
      content: {
        summary: 'Summary',
        highlights: ['Highlight'],
        lessonFocus: ['Focus'],
        nextSteps: ['Next'],
      },
      promptVersion: 'v1',
      model: 'test-model',
      rawOutput: {
        title: 'Coach report',
        summary: 'Summary',
        highlights: ['Highlight'],
        lessonFocus: ['Focus'],
        nextSteps: ['Next'],
      },
      inputPayload: {
        audience: ReportAudience.COACH,
        analysis: expect.objectContaining({
          id: 'analysis-1',
          studentId: 'student-1',
        }),
      },
    });
  });

  it('generates homework through the explicit structured LLM path', async () => {
    const generateStructured = jest.fn(() =>
      Promise.resolve({
        model: 'test-model',
        promptVersion: 'v1',
        rawText:
          '{"title":"Homework","overview":"Overview","exercises":["Exercise"],"focusPoints":["Focus"],"notes":["Note"]}',
        payload: {
          title: 'Homework',
          overview: 'Overview',
          exercises: ['Exercise'],
          focusPoints: ['Focus'],
          notes: ['Note'],
        },
      }),
    );
    const service = new SavedOutputGenerationService({
      generate: jest.fn(),
      generateStructured,
    } as unknown as LlmService);

    const result = await service.generateHomework({
      analysis: createSavedAnalysis(),
    });

    expect(generateStructured).toHaveBeenCalledWith({
      systemPrompt: HOMEWORK_PROMPT,
      userPrompt: expect.any(String),
      structuredOutput: {
        name: 'generated_homework_payload',
        schema: expect.anything(),
      },
    });
    const homeworkRequest = getStructuredRequest(generateStructured);
    expect(JSON.parse(homeworkRequest.userPrompt)).toMatchObject({
      analysis: {
        id: 'analysis-1',
        studentId: 'student-1',
      },
    });
    expect(result).toEqual({
      title: 'Homework',
      content: {
        overview: 'Overview',
        exercises: ['Exercise'],
        focusPoints: ['Focus'],
        notes: ['Note'],
      },
      promptVersion: 'v1',
      model: 'test-model',
      rawOutput: {
        title: 'Homework',
        overview: 'Overview',
        exercises: ['Exercise'],
        focusPoints: ['Focus'],
        notes: ['Note'],
      },
      inputPayload: {
        analysis: expect.objectContaining({
          id: 'analysis-1',
          studentId: 'student-1',
        }),
      },
    });
  });

  it('generates progress through the explicit structured LLM path', async () => {
    const generateStructured = jest.fn(() =>
      Promise.resolve({
        model: 'test-model',
        promptVersion: 'v1',
        rawText:
          '{"summary":"Summary","improvements":["Improvement"],"recurringWeaknesses":["Weakness"],"nextFocusPoints":["Focus"],"confidenceLevel":"HIGH"}',
        payload: {
          summary: 'Summary',
          improvements: ['Improvement'],
          recurringWeaknesses: ['Weakness'],
          nextFocusPoints: ['Focus'],
          confidenceLevel: ConfidenceLevel.HIGH,
        },
      }),
    );
    const service = new SavedOutputGenerationService({
      generate: jest.fn(),
      generateStructured,
    } as unknown as LlmService);

    const result = await service.generateProgress({
      studentId: 'student-1',
      analyses: [createSavedAnalysis()],
    });

    expect(generateStructured).toHaveBeenCalledWith({
      systemPrompt: PROGRESS_ANALYSIS_PROMPT,
      userPrompt: expect.any(String),
      structuredOutput: {
        name: 'generated_progress_payload',
        schema: expect.anything(),
      },
    });
    const progressRequest = getStructuredRequest(generateStructured);
    expect(JSON.parse(progressRequest.userPrompt)).toMatchObject({
      studentId: 'student-1',
      analyses: [
        {
          id: 'analysis-1',
          studentId: 'student-1',
        },
      ],
    });
    expect(result).toEqual({
      summary: {
        summary: 'Summary',
        improvements: ['Improvement'],
        recurringWeaknesses: ['Weakness'],
        nextFocusPoints: ['Focus'],
        confidenceLevel: ConfidenceLevel.HIGH,
      },
      promptVersion: 'v1',
      model: 'test-model',
      rawOutput: {
        summary: 'Summary',
        improvements: ['Improvement'],
        recurringWeaknesses: ['Weakness'],
        nextFocusPoints: ['Focus'],
        confidenceLevel: ConfidenceLevel.HIGH,
      },
      inputPayload: {
        studentId: 'student-1',
        analyses: [
          expect.objectContaining({
            id: 'analysis-1',
            studentId: 'student-1',
          }),
        ],
      },
    });
  });
});

function createSavedAnalysis(): SavedAnalysisInput {
  return {
    id: 'analysis-1',
    studentId: 'student-1',
    gameId: 'game-1',
    confidenceLevel: ConfidenceLevel.HIGH,
    overallDiagnosis: 'Diagnosis',
    openingName: 'Sicilian Defense',
    result: GameResult.WIN,
    mainWeaknessTag: WeaknessTag.CALCULATION_DEPTH,
    secondaryWeaknessTags: [WeaknessTag.TIME_MANAGEMENT],
    recommendedLessonTitle: 'Lesson title',
    recommendedLessonWhy: 'Lesson why',
    recommendedFocusPoints: ['Focus'],
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
        mainTag: WeaknessTag.CALCULATION_DEPTH,
        secondaryTags: [WeaknessTag.MISSED_OPPONENT_THREAT],
        explanation: 'Missed a forcing move.',
        suggestedFix: 'Check forcing moves first.',
        reviewStatus: MistakeReviewStatus.CONFIRMED,
        coachNote: 'Coach note: calculate checks first.',
      },
    ],
  };
}

function getStructuredRequest(generateStructured: jest.Mock): {
  userPrompt: string;
} {
  const firstCall = generateStructured.mock.calls[0];

  if (!firstCall) {
    throw new Error('Expected generateStructured to be called');
  }

  return firstCall[0] as { userPrompt: string };
}
