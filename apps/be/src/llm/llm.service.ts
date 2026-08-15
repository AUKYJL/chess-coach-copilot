import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { zodTextFormat } from 'openai/helpers/zod';
import OpenAI from 'openai';
import type {
  Response,
  ResponseCreateParamsNonStreaming,
} from 'openai/resources/responses/responses';
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
const LLM_RESPONSE_INCOMPLETE_ERROR =
  'LLM returned an incomplete structured response';
const LLM_RESPONSE_INVALID_JSON_ERROR =
  'LLM returned invalid JSON in the response body';
const GENERATION_PROMPT_VERSION = 'v1';
const STRUCTURED_CLASSIFY_PROMPT_VERSION = 'analysis-structured-output-v2';

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
    const promptVersion = STRUCTURED_CLASSIFY_PROMPT_VERSION;
    const structuredRequest: ResponseCreateParamsNonStreaming & {
      provider: {
        require_parameters: true;
      };
    } = {
      model: this.model,
      input: this.buildInput(request.systemPrompt, request.userPrompt),
      text: {
        format: zodTextFormat(
          request.structuredOutput.schema,
          request.structuredOutput.name,
        ),
      },
      provider: {
        require_parameters: true,
      },
    };
    const response = await this.client.responses.create(structuredRequest);

    return this.toStructuredResponse(response, promptVersion);
  }

  async generate(request: LlmGenerationRequest): Promise<LlmResponse> {
    return this.complete(
      request.systemPrompt,
      request.userPrompt,
      GENERATION_PROMPT_VERSION,
    );
  }

  private async complete(
    systemPrompt: string,
    userPrompt: string,
    promptVersion: string,
  ): Promise<LlmResponse> {
    const completion = await this.client.responses.create({
      model: this.model,
      input: this.buildInput(systemPrompt, userPrompt),
    });

    const rawText =
      typeof completion.output_text === 'string' ? completion.output_text : '';

    if (rawText.trim().length === 0) {
      throw new LlmResponseFormatError(
        LLM_RESPONSE_EMPTY_ERROR,
        LLM_RESPONSE_FORMAT_FAILURE_CODE.EMPTY_RESPONSE,
        rawText,
        this.model,
        promptVersion,
      );
    }

    return {
      model: this.model,
      promptVersion,
      payload: this.parseJsonPayload(rawText, promptVersion),
      rawText,
    };
  }

  private buildInput(systemPrompt: string, userPrompt: string) {
    return [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ];
  }

  private toStructuredResponse(
    response: Response,
    promptVersion: string,
  ): LlmResponse {
    const rawText =
      typeof response.output_text === 'string' ? response.output_text : '';

    if (response.status === 'incomplete') {
      throw new LlmResponseFormatError(
        LLM_RESPONSE_INCOMPLETE_ERROR,
        LLM_RESPONSE_FORMAT_FAILURE_CODE.INCOMPLETE_RESPONSE,
        rawText,
        this.model,
        promptVersion,
      );
    }

    if (rawText.trim().length === 0) {
      throw new LlmResponseFormatError(
        LLM_RESPONSE_EMPTY_ERROR,
        LLM_RESPONSE_FORMAT_FAILURE_CODE.EMPTY_RESPONSE,
        rawText,
        this.model,
        promptVersion,
      );
    }

    return {
      model: this.model,
      promptVersion,
      payload: this.parseJsonPayload(rawText, promptVersion),
      rawText,
    };
  }

  private parseJsonPayload(
    rawText: string,
    promptVersion: string,
  ): Prisma.InputJsonValue {
    const sanitizedText = this.stripOuterJsonFence(rawText);

    try {
      return JSON.parse(sanitizedText) as Prisma.InputJsonValue;
    } catch {
      throw new LlmResponseFormatError(
        LLM_RESPONSE_INVALID_JSON_ERROR,
        LLM_RESPONSE_FORMAT_FAILURE_CODE.INVALID_JSON,
        rawText,
        this.model,
        promptVersion,
      );
    }
  }

  private stripOuterJsonFence(rawText: string): string {
    const trimmedText = rawText.trim();
    const fencedJsonMatch = trimmedText.match(
      /^```(?:json)?[ \t]*\r?\n([\s\S]*?)\r?\n```$/i,
    );

    if (!fencedJsonMatch) {
      return trimmedText;
    }

    return fencedJsonMatch[1];
  }
}
