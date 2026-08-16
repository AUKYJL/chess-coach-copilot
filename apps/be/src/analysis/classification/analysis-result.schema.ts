import {
  ConfidenceLevel,
  GameResult,
  MomentSeverity,
  WeaknessTag,
} from '../../generated/prisma/client.js';
import type {
  JsonObject,
  JsonValue,
} from '../../shared/types/json-value.type.js';
import { z } from 'zod';

const nonEmptyStringSchema = z.string().trim().min(1);
const optionalNullableStringSchema = nonEmptyStringSchema.nullable().optional();
const weaknessTagValueSchema = z.nativeEnum(WeaknessTag);
const nullableWeaknessTagSchema = weaknessTagValueSchema.nullable();
const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);
const sourceEvidenceSchema: z.ZodType<JsonObject> = z.record(
  z.string(),
  jsonValueSchema,
);

export const analysisResultMistakeSchema = z.object({
  criticalMomentPly: z.number().int().positive().nullable().optional(),
  severity: z.nativeEnum(MomentSeverity),
  category: nonEmptyStringSchema,
  mainTag: nullableWeaknessTagSchema,
  secondaryTags: z.array(weaknessTagValueSchema),
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
