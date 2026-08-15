import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import OpenAI from 'openai';
import { openrouterConfig } from '../config/index.js';
import type { Prisma } from '../generated/prisma/client.js';
import {
  LLM_RESPONSE_FORMAT_FAILURE_CODE,
  LlmResponseFormatError,
} from './llm-response-format.error.js';
import {
  LlmClassificationRequest,
  LlmGenerationRequest,
  LlmResponse,
} from './llm.types.js';

const LLM_RESPONSE_EMPTY_ERROR = 'LLM returned an empty response body';
const LLM_RESPONSE_INVALID_JSON_ERROR =
  'LLM returned invalid JSON in the response body';

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

    const rawText =
      typeof completion.output_text === 'string' ? completion.output_text : '';

    if (rawText.trim().length === 0) {
      throw new LlmResponseFormatError(
        LLM_RESPONSE_EMPTY_ERROR,
        LLM_RESPONSE_FORMAT_FAILURE_CODE.EMPTY_RESPONSE,
        rawText,
      );
    }

    let payload: Prisma.InputJsonValue;

    try {
      payload = JSON.parse(rawText) as Prisma.InputJsonValue;
    } catch {
      throw new LlmResponseFormatError(
        LLM_RESPONSE_INVALID_JSON_ERROR,
        LLM_RESPONSE_FORMAT_FAILURE_CODE.INVALID_JSON,
        rawText,
      );
    }

    return {
      model: this.model,
      promptVersion: 'v1',
      payload,
      rawText,
    };
  }
}
