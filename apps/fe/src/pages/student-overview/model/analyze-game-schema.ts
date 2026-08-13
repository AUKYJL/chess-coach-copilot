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
    .min(1, "Annotated PGN is required.")
    .superRefine((value, context) => {
      if (!looksLikePgn(value)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid PGN with headers, move text, and a result.",
        });
        return;
      }

      if (!hasReliableAnnotatedEvidence(value)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Only annotated PGN with engine evaluation or a mistake marker plus best-line variation is supported in this prototype.",
        });
      }
    }),
  studentColor: z.enum(["WHITE", "BLACK"]),
  sourceLabel: z
    .string()
    .trim()
    .max(80, "Keep the source label under 80 characters."),
});
