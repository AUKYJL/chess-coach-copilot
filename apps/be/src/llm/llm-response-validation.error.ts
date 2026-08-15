import type { Prisma } from '../generated/prisma/client.js';

export const LLM_RESPONSE_VALIDATION_FAILURE_CODE = {
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
} as const;

export type LlmResponseValidationFailureCode =
  (typeof LLM_RESPONSE_VALIDATION_FAILURE_CODE)[keyof typeof LLM_RESPONSE_VALIDATION_FAILURE_CODE];

export class LlmResponseValidationError extends Error {
  constructor(
    message: string,
    readonly failureCode: LlmResponseValidationFailureCode,
    readonly rawText: string,
    readonly parsedPayload: Prisma.InputJsonValue,
    readonly model: string,
    readonly promptVersion: string,
  ) {
    super(message);
    this.name = LlmResponseValidationError.name;
  }
}

export function isLlmResponseValidationError(
  error: unknown,
): error is LlmResponseValidationError {
  return error instanceof LlmResponseValidationError;
}
