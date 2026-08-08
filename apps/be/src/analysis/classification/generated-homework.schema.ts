import type {
  JsonObject,
  JsonValue,
} from '../../shared/types/json-value.type.js';
import { z } from 'zod';

const nonEmptyStringSchema = z.string().trim().min(1);
const stringListSchema = z.array(nonEmptyStringSchema);
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
const jsonObjectSchema: z.ZodType<JsonObject> = z.record(
  z.string(),
  jsonValueSchema,
);

export const generatedHomeworkPayloadSchema = z.object({
  title: nonEmptyStringSchema,
  overview: nonEmptyStringSchema,
  exercises: stringListSchema,
  focusPoints: stringListSchema,
  notes: stringListSchema,
  metadata: jsonObjectSchema.optional(),
});

export type GeneratedHomeworkPayload = z.infer<
  typeof generatedHomeworkPayloadSchema
>;

export function validateGeneratedHomeworkPayload(
  payload: unknown,
): GeneratedHomeworkPayload {
  return generatedHomeworkPayloadSchema.parse(payload);
}
