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
      'full_pipeline',
      'progress_analysis',
    ]);
  });

  it('maps the classifier system prompt to json_analysis', () => {
    expect(ANALYSIS_CLASSIFIER_SYSTEM_PROMPT).toBe(
      ANALYSIS_PROMPTS_BY_MODE.json_analysis,
    );
  });

  it('documents the runtime input payload and JSON-only response requirement', () => {
    expect(ANALYSIS_PROMPTS_BY_MODE.json_analysis).toContain(
      'Return only JSON',
    );
    expect(ANALYSIS_PROMPTS_BY_MODE.json_analysis).toContain('`headers`');
    expect(ANALYSIS_PROMPTS_BY_MODE.json_analysis).toContain('`rawResult`');
    expect(ANALYSIS_PROMPTS_BY_MODE.json_analysis).toContain('`result`');
    expect(ANALYSIS_PROMPTS_BY_MODE.json_analysis).toContain('`studentColor`');
    expect(ANALYSIS_PROMPTS_BY_MODE.json_analysis).toContain(
      '`annotationCoverage`',
    );
    expect(ANALYSIS_PROMPTS_BY_MODE.json_analysis).toContain('`diagnostics`');
    expect(ANALYSIS_PROMPTS_BY_MODE.json_analysis).toContain('`moments`');
    expect(ANALYSIS_PROMPTS_BY_MODE.json_analysis).toContain(
      '`surroundingMoves`',
    );
  });

  it('derives the allowed weakness tags from the Prisma enum', () => {
    expect(ALLOWED_WEAKNESS_TAG_VALUES).toEqual(Object.values(WeaknessTag));

    for (const weaknessTag of Object.values(WeaknessTag)) {
      expect(ANALYSIS_PROMPTS_BY_MODE.json_analysis).toContain(weaknessTag);
    }
  });
});
