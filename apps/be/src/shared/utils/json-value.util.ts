import type { JsonObject, JsonValue } from '../types/json-value.type.js';

export function toJsonValue(value: unknown): JsonValue | undefined {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    const items = value
      .map((item) => toJsonValue(item))
      .filter((item): item is JsonValue => item !== undefined);

    return items;
  }

  if (typeof value !== 'object') {
    return undefined;
  }

  const entries = Object.entries(value)
    .map(([key, item]) => {
      const jsonValue = toJsonValue(item);

      return jsonValue === undefined ? null : [key, jsonValue];
    })
    .filter((entry): entry is [string, JsonValue] => entry !== null);

  return Object.fromEntries(entries);
}

export function toJsonObject(value: unknown): JsonObject | null {
  const jsonValue = toJsonValue(value);

  if (
    jsonValue === undefined ||
    jsonValue === null ||
    Array.isArray(jsonValue) ||
    typeof jsonValue !== 'object'
  ) {
    return null;
  }

  return jsonValue;
}
