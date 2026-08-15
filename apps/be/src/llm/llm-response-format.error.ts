export const LLM_RESPONSE_FORMAT_FAILURE_CODE = {
  EMPTY_RESPONSE: 'EMPTY_RESPONSE',
  INVALID_JSON: 'INVALID_JSON',
} as const;

export type LlmResponseFormatFailureCode =
  (typeof LLM_RESPONSE_FORMAT_FAILURE_CODE)[keyof typeof LLM_RESPONSE_FORMAT_FAILURE_CODE];

export class LlmResponseFormatError extends Error {
  constructor(
    message: string,
    readonly failureCode: LlmResponseFormatFailureCode,
    readonly rawText: string,
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
