import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import OpenAI from 'openai';
import { openrouterConfig } from '../config/index.js';
import type { Prisma } from '../generated/prisma/client.js';
import {
  LlmClassificationRequest,
  LlmGenerationRequest,
  LlmResponse,
} from './llm.types.js';

const LLM_RESPONSE_EMPTY_ERROR = 'LLM returned an empty response body';
const LLM_RESPONSE_INVALID_JSON_ERROR =
  'LLM returned invalid JSON in the response body';

function isInputJsonValue(value: unknown): value is Prisma.InputJsonValue {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every((item) => isInputJsonValue(item));
  }

  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return Object.values(value).every((item) => isInputJsonValue(item));
}

@Injectable()
export class LlmService {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(
    @Inject(openrouterConfig.KEY)
    private readonly openrouterConfiguration: ConfigType<
      typeof openrouterConfig
    >,
  ) {
    this.model = this.openrouterConfiguration.model;
    this.client = new OpenAI({
      apiKey: this.openrouterConfiguration.apiKey,
      baseURL: this.openrouterConfiguration.baseUrl,
    });
  }

  async classify(request: LlmClassificationRequest): Promise<LlmResponse> {
    return this.complete(request.systemPrompt, request.userPrompt);
  }

  async generate(request: LlmGenerationRequest): Promise<LlmResponse> {
    return this.complete(request.systemPrompt, request.userPrompt);
  }

  private async complete(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<LlmResponse> {
    const completion = await this.client.responses.create({
      model: this.model,
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const rawText = completion.output_text;

    if (rawText.trim().length === 0) {
      throw new Error(LLM_RESPONSE_EMPTY_ERROR);
    }

    let payload: unknown;

    try {
      payload = JSON.parse(rawText);
    } catch {
      throw new Error(LLM_RESPONSE_INVALID_JSON_ERROR);
    }

    if (!isInputJsonValue(payload)) {
      throw new Error(LLM_RESPONSE_INVALID_JSON_ERROR);
    }

    return {
      model: this.model,
      promptVersion: 'v1',
      payload,
      rawText,
    };
  }
}
