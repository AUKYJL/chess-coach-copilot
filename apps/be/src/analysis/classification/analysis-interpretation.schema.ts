import { WeaknessTag } from '../../generated/prisma/client.js';
import { z } from 'zod';

const nonEmptyStringSchema = z.string().trim().min(1);
const optionalNullableStringSchema = nonEmptyStringSchema.nullable().optional();
const weaknessTagValueSchema = z.nativeEnum(WeaknessTag);
const nullableWeaknessTagSchema = weaknessTagValueSchema.nullable();

export const analysisInterpretationMistakeSchema = z.object({
  momentId: nonEmptyStringSchema,
  category: nonEmptyStringSchema,
  explanation: nonEmptyStringSchema,
  suggestedFix: optionalNullableStringSchema,
});

export const analysisInterpretationPayloadSchema = z.object({
  overallDiagnosis: nonEmptyStringSchema,
  mainWeaknessTag: nullableWeaknessTagSchema.optional().default(null),
  secondaryWeaknessTags: z.array(weaknessTagValueSchema).optional().default([]),
  recommendedLessonTitle: optionalNullableStringSchema,
  recommendedLessonWhy: optionalNullableStringSchema,
  recommendedFocusPoints: z.array(nonEmptyStringSchema).optional().default([]),
  mistakes: z.array(analysisInterpretationMistakeSchema),
});
export type AnalysisInterpretationMistake = z.infer<
  typeof analysisInterpretationMistakeSchema
>;
export type AnalysisInterpretationPayload = z.infer<
  typeof analysisInterpretationPayloadSchema
>;
