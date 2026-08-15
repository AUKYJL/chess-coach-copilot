import { z } from 'zod';

const nonEmptyStringSchema = z.string().trim().min(1);
const stringListSchema = z.array(nonEmptyStringSchema);

export const generatedHomeworkPayloadSchema = z.object({
  title: nonEmptyStringSchema,
  overview: nonEmptyStringSchema,
  exercises: stringListSchema,
  focusPoints: stringListSchema,
  notes: stringListSchema,
});

export type GeneratedHomeworkPayload = z.infer<
  typeof generatedHomeworkPayloadSchema
>;

export function validateGeneratedHomeworkPayload(
  payload: unknown,
): GeneratedHomeworkPayload {
  return generatedHomeworkPayloadSchema.parse(payload);
}
