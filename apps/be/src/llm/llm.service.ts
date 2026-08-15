import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { zodTextFormat } from 'openai/helpers/zod';
import OpenAI from 'openai';
import type {
  Response,
  ResponseCreateParamsNonStreaming,
} from 'openai/resources/responses/responses';
import type { ZodType } from 'zod';
import { openrouterConfig } from '../config/index.js';
import type { Prisma } from '../generated/prisma/client.js';
import {
  LLM_RESPONSE_FORMAT_FAILURE_CODE,
  LlmResponseFormatError,
} from './llm-response-format.error.js';
import {
  LLM_RESPONSE_VALIDATION_FAILURE_CODE,
  LlmResponseValidationError,
} from './llm-response-validation.error.js';
import {
  LlmClassificationRequest,
  LlmGenerationRequest,
  LlmRawTextResponse,
  LlmResponse,
  LlmStructuredGenerationRequest,
} from './llm.types.js';

const LLM_RESPONSE_EMPTY_ERROR = 'LLM returned an empty response body';
const LLM_RESPONSE_INCOMPLETE_ERROR =
  'LLM returned an incomplete structured response';
const LLM_RESPONSE_INVALID_JSON_ERROR =
  'LLM returned invalid JSON in the response body';
const LLM_RESPONSE_INVALID_STRUCTURED_PAYLOAD_ERROR =
  'LLM returned a payload incompatible with the structured output schema';
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
    return this.completeStructured(request, STRUCTURED_CLASSIFY_PROMPT_VERSION);
  }

  async generate(request: LlmGenerationRequest): Promise<LlmRawTextResponse> {
    return this.complete(
      request.systemPrompt,
      request.userPrompt,
      GENERATION_PROMPT_VERSION,
    );
  }

  async generateStructured(
    request: LlmStructuredGenerationRequest,
  ): Promise<LlmResponse> {
    return this.completeStructured(request, GENERATION_PROMPT_VERSION);
  }

  private async complete(
    systemPrompt: string,
    userPrompt: string,
    promptVersion: string,
  ): Promise<LlmRawTextResponse> {
    const completion = await this.client.responses.create({
      model: this.model,
      input: this.buildInput(systemPrompt, userPrompt),
    });

    const rawText = this.assertNonEmptyRawText(
      completion.output_text,
      promptVersion,
    );

    return {
      model: this.model,
      promptVersion,
      rawText,
    };
  }

  private async completeStructured(
    request: {
      systemPrompt: string;
      userPrompt: string;
      structuredOutput: LlmClassificationRequest['structuredOutput'];
    },
    promptVersion: string,
  ): Promise<LlmResponse> {
    const response = await this.client.responses.create(
      this.buildStructuredRequest(request),
    );

    return this.toStructuredResponse(
      response,
      request.structuredOutput.schema,
      promptVersion,
    );
  }

  private buildInput(systemPrompt: string, userPrompt: string) {
    return [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ];
  }

  private toStructuredResponse(
    response: Response,
    schema: ZodType,
    promptVersion: string,
  ): LlmResponse {
    if (response.status === 'incomplete') {
      throw new LlmResponseFormatError(
        LLM_RESPONSE_INCOMPLETE_ERROR,
        LLM_RESPONSE_FORMAT_FAILURE_CODE.INCOMPLETE_RESPONSE,
        typeof response.output_text === 'string' ? response.output_text : '',
        this.model,
        promptVersion,
      );
    }

    const rawText = this.assertNonEmptyRawText(
      response.output_text,
      promptVersion,
    );
    const payload = this.parseJsonPayload(rawText, promptVersion);
    const validationResult = schema.safeParse(payload);

    if (!validationResult.success) {
      throw new LlmResponseValidationError(
        LLM_RESPONSE_INVALID_STRUCTURED_PAYLOAD_ERROR,
        LLM_RESPONSE_VALIDATION_FAILURE_CODE.INVALID_PAYLOAD,
        rawText,
        payload,
        this.model,
        promptVersion,
        {
          issues: validationResult.error.issues.map((issue) => ({
            path: issue.path.map((segment) => String(segment)),
            code: issue.code,
            message: issue.message,
          })),
        },
      );
    }

    return {
      model: this.model,
      promptVersion,
      payload: validationResult.data as Prisma.InputJsonValue,
      rawText,
    };
  }

  private buildStructuredRequest(
    request: LlmClassificationRequest | LlmStructuredGenerationRequest,
  ): ResponseCreateParamsNonStreaming & {
    provider: {
      require_parameters: true;
    };
  } {
    return {
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

  private assertNonEmptyRawText(
    outputText: Response['output_text'],
    promptVersion: string,
  ): string {
    const rawText = typeof outputText === 'string' ? outputText : '';

    if (rawText.trim().length === 0) {
      throw new LlmResponseFormatError(
        LLM_RESPONSE_EMPTY_ERROR,
        LLM_RESPONSE_FORMAT_FAILURE_CODE.EMPTY_RESPONSE,
        rawText,
        this.model,
        promptVersion,
      );
    }

    return rawText;
  }
}
