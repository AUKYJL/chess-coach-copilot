import type { Prisma } from '../generated/prisma/client.js';

export const LLM_RESPONSE_FORMAT_FAILURE_CODE = {
  EMPTY_RESPONSE: 'EMPTY_RESPONSE',
  INCOMPLETE_RESPONSE: 'INCOMPLETE_RESPONSE',
  INVALID_JSON: 'INVALID_JSON',
  MISSING_PARSED_OUTPUT: 'MISSING_PARSED_OUTPUT',
} as const;

export type LlmResponseFormatFailureCode =
  (typeof LLM_RESPONSE_FORMAT_FAILURE_CODE)[keyof typeof LLM_RESPONSE_FORMAT_FAILURE_CODE];

export class LlmResponseFormatError extends Error {
  constructor(
    message: string,
    readonly failureCode: LlmResponseFormatFailureCode,
    readonly rawText: string,
    readonly model?: string,
    readonly promptVersion?: string,
    readonly parsedPayload?: Prisma.InputJsonValue,
  ) {
    super(message);
    this.name = LlmResponseFormatError.name;
  }
}

export function isLlmResponseFormatError(
  error: unknown,
): error is LlmResponseFormatError {
  return error instanceof LlmResponseFormatError;
}
