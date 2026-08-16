import { ConfidenceLevel } from '../../generated/prisma/client.js';
import { z } from 'zod';

const nonEmptyStringSchema = z.string().trim().min(1);
const stringListSchema = z.array(nonEmptyStringSchema);

export const generatedProgressPayloadSchema = z.object({
  summary: nonEmptyStringSchema,
  improvements: stringListSchema,
  recurringWeaknesses: stringListSchema,
  nextFocusPoints: stringListSchema,
  confidenceLevel: z.nativeEnum(ConfidenceLevel),
});

export type ProgressSummary = z.infer<typeof generatedProgressPayloadSchema>;

export function validateGeneratedProgressPayload(
  payload: unknown,
): ProgressSummary {
  return generatedProgressPayloadSchema.parse(payload);
}
