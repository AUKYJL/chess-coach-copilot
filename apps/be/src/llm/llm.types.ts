import type { Prisma } from '../generated/prisma/client.js';
import type { ZodType } from 'zod';

export interface LlmClassificationRequest {
  systemPrompt: string;
  userPrompt: string;
  structuredOutput: {
    name: string;
    schema: ZodType;
  };
}

export interface LlmGenerationRequest {
  systemPrompt: string;
  userPrompt: string;
}

export interface LlmResponse {
  model: string;
  promptVersion: string;
  payload: Prisma.InputJsonValue;
  rawText: string;
}
