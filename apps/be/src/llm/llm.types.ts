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

export interface LlmResponse<TPayload = unknown> {
  model: string;
  promptVersion: string;
  payload: TPayload;
  rawText: string;
}
