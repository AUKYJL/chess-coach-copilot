import { z } from 'zod';

const nonEmptyStringSchema = z.string().trim().min(1);
const stringListSchema = z.array(nonEmptyStringSchema);

export const generatedReportPayloadSchema = z.object({
  title: nonEmptyStringSchema,
  summary: nonEmptyStringSchema,
  highlights: stringListSchema,
  lessonFocus: stringListSchema,
  nextSteps: stringListSchema,
});

export type GeneratedReportPayload = z.infer<
  typeof generatedReportPayloadSchema
>;

export function validateGeneratedReportPayload(
  payload: unknown,
): GeneratedReportPayload {
  return generatedReportPayloadSchema.parse(payload);
}
