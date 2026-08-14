import { z } from "zod";

const pgnHeaderLinePattern = /^\[[A-Za-z][A-Za-z0-9_]*\s+"[^"\r\n]*"\]$/m;
const pgnMoveTextPattern = /\b\d+\.(?:\.\.)?\s*(?:O-O(?:-O)?|[^\s{([]+)/;
const pgnResultPattern = /\b(?:1-0|0-1|1\/2-1\/2|\*)\s*$/;
const structuredEvalPattern = /\[%eval\s+[^\]]+\]/i;
const reliableSeverityPattern = /(?:\$(?:2|4|6)|\?\?|\?!|\?)(?=\s|[({]|$)/;
const recursiveAnnotationVariationPattern = /\((?:[^()]+|\([^()]*\))*\)/;

function hasPgnHeaders(value: string) {
  return pgnHeaderLinePattern.test(value);
}

function hasPgnMoveText(value: string) {
  return pgnMoveTextPattern.test(value);
}

function hasPgnResult(value: string) {
  return pgnResultPattern.test(value);
}

export function looksLikePgn(value: string) {
  const normalizedValue = value.trim();

  return (
    hasPgnHeaders(normalizedValue) &&
    hasPgnMoveText(normalizedValue) &&
    hasPgnResult(normalizedValue)
  );
}

export function hasStructuredEngineAnnotations(value: string) {
  return structuredEvalPattern.test(value);
}

export function hasReliableAnnotatedEvidence(value: string) {
  if (hasStructuredEngineAnnotations(value)) {
    return true;
  }

  return (
    reliableSeverityPattern.test(value) &&
    recursiveAnnotationVariationPattern.test(value)
  );
}

export function isAnnotatedPgn(value: string) {
  const normalizedValue = value.trim();

  return (
    looksLikePgn(normalizedValue) &&
    hasReliableAnnotatedEvidence(normalizedValue)
  );
}

export const analyzeGameSchema = z.object({
  rawPgn: z
    .string()
    .trim()
    .min(1, "Вставьте аннотированный PGN.")
    .superRefine((value, context) => {
      if (!looksLikePgn(value)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Введите корректный PGN с заголовками, ходами и результатом.",
        });
        return;
      }

      if (!hasReliableAnnotatedEvidence(value)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "В этом прототипе поддерживается только аннотированный PGN с оценкой движка или пометкой ошибки и вариантом лучшего продолжения.",
        });
      }
    }),
  studentColor: z.enum(["WHITE", "BLACK"]),
  sourceLabel: z
    .string()
    .trim()
    .max(80, "Подпись источника должна быть не длиннее 80 символов."),
});
