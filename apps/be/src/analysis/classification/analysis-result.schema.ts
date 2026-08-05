import {
  ConfidenceLevel,
  GameResult,
  MomentSeverity,
  WeaknessTag,
} from '../../generated/prisma/client.js';
import { z } from 'zod';

const nonEmptyStringSchema = z.string().trim().min(1);
const optionalNullableStringSchema = nonEmptyStringSchema.nullable().optional();
const weaknessTagValueSchema = z.nativeEnum(WeaknessTag);
const nullableWeaknessTagSchema = weaknessTagValueSchema.nullable();
const sourceEvidenceSchema = z.object({}).catchall(z.unknown());

export const analysisResultMistakeSchema = z.object({
  criticalMomentPly: z.number().int().positive().nullable().optional(),
  severity: z.nativeEnum(MomentSeverity),
  category: nonEmptyStringSchema,
  explanation: nonEmptyStringSchema,
  suggestedFix: optionalNullableStringSchema,
  sourceEvidence: sourceEvidenceSchema,
});

export const analysisResultPayloadSchema = z.object({
  confidenceLevel: z.nativeEnum(ConfidenceLevel),
  overallDiagnosis: nonEmptyStringSchema,
  openingName: optionalNullableStringSchema,
  result: z.nativeEnum(GameResult),
  mainWeaknessTag: nullableWeaknessTagSchema,
  secondaryWeaknessTags: z.array(weaknessTagValueSchema),
  recommendedLessonTitle: optionalNullableStringSchema,
  recommendedLessonWhy: optionalNullableStringSchema,
  recommendedFocusPoints: z.array(nonEmptyStringSchema),
  mistakes: z.array(analysisResultMistakeSchema),
});

export type AnalysisResultMistake = z.infer<typeof analysisResultMistakeSchema>;
export type AnalysisResultPayload = z.infer<typeof analysisResultPayloadSchema>;

export function validateAnalysisResultPayload(
  payload: unknown,
): AnalysisResultPayload {
  return analysisResultPayloadSchema.parse(payload);
}
