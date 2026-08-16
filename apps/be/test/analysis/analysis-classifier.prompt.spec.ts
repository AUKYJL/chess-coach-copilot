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
      'Do not invent evaluations, best moves, move facts, or mistake details that are absent from the input.',
    );
    expect(ANALYSIS_PROMPTS_BY_MODE.json_analysis).toContain(
      'Return only semantic coaching interpretation; deterministic game facts are assembled by the backend.',
    );
    expect(ANALYSIS_PROMPTS_BY_MODE.json_analysis).toContain(
      'Keep `recommendedFocusPoints` practical, specific, and grounded in the diagnosed habits from the input.',
    );
    expect(ANALYSIS_PROMPTS_BY_MODE.json_analysis).toContain(
      'Return `secondaryWeaknessTags` as an array and use `[]` when there are no credible secondary tags.',
    );
    expect(ANALYSIS_PROMPTS_BY_MODE.json_analysis).toContain(
      'Return `mainWeaknessTag` as either one allowed tag or `null` when the evidence does not support a single main tag.',
    );
    expect(ANALYSIS_PROMPTS_BY_MODE.json_analysis).toContain(
      'Each item in `mistakes` must return `mainTag` as one allowed tag or `null` when the evidence does not support a single tag for that mistake.',
    );
    expect(ANALYSIS_PROMPTS_BY_MODE.json_analysis).toContain(
      'Each item in `mistakes` must return `secondaryTags` as an array of allowed tags and use `[]` when there are no credible secondary tags for that mistake.',
    );
    expect(ANALYSIS_PROMPTS_BY_MODE.json_analysis).toContain(
      'Do not invent free-form values for `mistakes[].mainTag` or `mistakes[].secondaryTags`; use only the allowed weakness tags.',
    );
    expect(ANALYSIS_PROMPTS_BY_MODE.json_analysis).toContain(
      'Return `recommendedFocusPoints` as an array and use `[]` when no concrete focus points are justified.',
    );
    expect(ANALYSIS_PROMPTS_BY_MODE.json_analysis).toContain(
      'Each item in `mistakes` must reference an existing structured moment by `momentId`.',
    );
    expect(ANALYSIS_PROMPTS_BY_MODE.json_analysis).toContain(
      'Do not create new moments, do not return `sourceEvidence`, and do not repeat move or evaluation fields that already exist in the input.',
    );
    expect(ANALYSIS_PROMPTS_BY_MODE.json_analysis).not.toContain(
      'Set `confidenceLevel` according to evidence quality.',
    );
    expect(ANALYSIS_PROMPTS_BY_MODE.json_analysis).not.toContain(
      'Use `openingName` from `headers.opening` when available; otherwise return null.',
    );
    expect(ANALYSIS_PROMPTS_BY_MODE.json_analysis).not.toContain(
      'Keep `result` aligned with the provided runtime `result` field.',
    );
    expect(ANALYSIS_PROMPTS_BY_MODE.json_analysis).not.toContain(
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
