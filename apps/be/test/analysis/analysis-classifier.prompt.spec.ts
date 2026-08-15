import {
  ALLOWED_WEAKNESS_TAG_VALUES,
  ANALYSIS_CLASSIFIER_SYSTEM_PROMPT,
  ANALYSIS_PROMPTS_BY_MODE,
} from '../../src/analysis/classification/analysis-classifier.prompt.js';
import { WeaknessTag } from '../../src/generated/prisma/client.js';

describe('analysis-classifier prompt registry', () => {
  it('contains all supported prompt modes', () => {
    expect(Object.keys(ANALYSIS_PROMPTS_BY_MODE)).toEqual([
      'json_analysis',
      'coach_report',
      'parent_report',
      'homework',
      'full_pipeline',
      'progress_analysis',
    ]);
  });

  it('maps the classifier system prompt to json_analysis', () => {
    expect(ANALYSIS_CLASSIFIER_SYSTEM_PROMPT).toBe(
      ANALYSIS_PROMPTS_BY_MODE.json_analysis,
    );
  });

  it('keeps only semantic analysis rules in the classifier prompt', () => {
    expect(ANALYSIS_PROMPTS_BY_MODE.json_analysis).toContain(
      'Analyze only the student side indicated by `studentColor`.',
    );
    expect(ANALYSIS_PROMPTS_BY_MODE.json_analysis).toContain(
      'Do not invent evaluations, best moves, opening names, or mistake details that are absent from the input.',
    );
    expect(ANALYSIS_PROMPTS_BY_MODE.json_analysis).toContain(
      'Use `openingName` from `headers.opening` when available; otherwise return null.',
    );
    expect(ANALYSIS_PROMPTS_BY_MODE.json_analysis).toContain(
      'Keep `result` aligned with the provided runtime `result` field.',
    );
    expect(ANALYSIS_PROMPTS_BY_MODE.json_analysis).toContain(
      'Keep `recommendedFocusPoints` practical, specific, and grounded in the diagnosed habits from the input.',
    );
    expect(ANALYSIS_PROMPTS_BY_MODE.json_analysis).toContain(
      'include `sourceEvidence` grounded in the provided structured input.',
    );
    expect(ANALYSIS_PROMPTS_BY_MODE.json_analysis).not.toContain(
      'Return only JSON',
    );
    expect(ANALYSIS_PROMPTS_BY_MODE.json_analysis).not.toContain(
      'Do not wrap the response in markdown',
    );
  });

  it('derives the allowed weakness tags from the Prisma enum', () => {
    expect(ALLOWED_WEAKNESS_TAG_VALUES).toEqual(Object.values(WeaknessTag));

    for (const weaknessTag of Object.values(WeaknessTag)) {
      expect(ANALYSIS_PROMPTS_BY_MODE.json_analysis).toContain(weaknessTag);
    }
  });
});
