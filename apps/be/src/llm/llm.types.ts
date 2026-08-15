import type { Prisma } from '../generated/prisma/client.js';
import type { ZodType } from 'zod';

export interface LlmStructuredOutputDefinition {
  name: string;
  schema: ZodType;
}

export interface LlmClassificationRequest {
  systemPrompt: string;
  userPrompt: string;
  structuredOutput: LlmStructuredOutputDefinition;
}

export interface LlmGenerationRequest {
  systemPrompt: string;
  userPrompt: string;
}

export interface LlmStructuredGenerationRequest extends LlmGenerationRequest {
  structuredOutput: LlmStructuredOutputDefinition;
}

export interface LlmRawTextResponse {
  model: string;
  promptVersion: string;
  rawText: string;
}

export interface LlmStructuredResponse extends LlmRawTextResponse {
  model: string;
  promptVersion: string;
  payload: Prisma.InputJsonValue;
}

export type LlmResponse = LlmStructuredResponse;
