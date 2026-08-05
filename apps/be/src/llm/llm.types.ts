import type { Prisma } from '../generated/prisma/client.js';

export interface LlmClassificationRequest {
  systemPrompt: string;
  userPrompt: string;
  schemaName: string;
}

export interface LlmGenerationRequest {
  systemPrompt: string;
  userPrompt: string;
  schemaName?: string;
}

export interface LlmResponse {
  model: string;
  promptVersion: string;
  payload: Prisma.InputJsonValue;
  rawText: string;
}
