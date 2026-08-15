import { jest } from '@jest/globals';
import type { ParsedResponse } from 'openai/resources/responses/responses';
import { z } from 'zod';
import {
  LLM_RESPONSE_FORMAT_FAILURE_CODE,
  LlmResponseFormatError,
} from '../../src/llm/index.js';
import { LlmService } from '../../src/llm/llm.service.js';

const structuredPayloadSchema = z.object({
  result: z.string(),
  score: z.number(),
});

describe('LlmService', () => {
  it('parses a successful structured classify response', async () => {
    const parse = jest.fn(() =>
      Promise.resolve(
        createParsedResponse({
          status: 'completed',
          output_text: '{"result":"ok","score":1}',
          output_parsed: {
            result: 'ok',
            score: 1,
          },
        }),
      ),
    );
    const service = createService({
      parse,
    });

    await expect(
      service.classify({
        systemPrompt: 'system',
        userPrompt: 'user',
        structuredOutput: {
          name: 'analysis_result_payload',
          schema: structuredPayloadSchema,
        },
      }),
    ).resolves.toEqual({
      model: 'test-model',
      promptVersion: 'analysis-structured-output-v2',
      rawText: '{"result":"ok","score":1}',
      payload: {
        result: 'ok',
        score: 1,
      },
    });

    expect(parse).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'test-model',
        provider: {
          require_parameters: true,
        },
        text: {
          format: expect.objectContaining({
            type: 'json_schema',
            name: 'analysis_result_payload',
            strict: false,
          }),
        },
      }),
    );
  });

  it('throws when the structured classify response body is empty', async () => {
    const service = createService({
      parse: jest.fn(() =>
        Promise.resolve(
          createParsedResponse({
            status: 'completed',
            output_text: '   ',
            output_parsed: null,
          }),
        ),
      ),
    });

    await expect(
      service.classify({
        systemPrompt: 'system',
        userPrompt: 'user',
        structuredOutput: {
          name: 'analysis_result_payload',
          schema: structuredPayloadSchema,
        },
      }),
    ).rejects.toMatchObject({
      name: LlmResponseFormatError.name,
      message: 'LLM returned an empty response body',
      failureCode: LLM_RESPONSE_FORMAT_FAILURE_CODE.EMPTY_RESPONSE,
      rawText: '   ',
    });
  });

  it('throws when the structured classify response is incomplete', async () => {
    const service = createService({
      parse: jest.fn(() =>
        Promise.resolve(
          createParsedResponse({
            status: 'incomplete',
            output_text: '{"result":"partial"}',
            output_parsed: null,
          }),
        ),
      ),
    });

    await expect(
      service.classify({
        systemPrompt: 'system',
        userPrompt: 'user',
        structuredOutput: {
          name: 'analysis_result_payload',
          schema: structuredPayloadSchema,
        },
      }),
    ).rejects.toMatchObject({
      name: LlmResponseFormatError.name,
      message: 'LLM returned an incomplete structured response',
      failureCode: LLM_RESPONSE_FORMAT_FAILURE_CODE.INCOMPLETE_RESPONSE,
      rawText: '{"result":"partial"}',
    });
  });

  it('throws when the structured classify response has no parsed payload', async () => {
    const service = createService({
      parse: jest.fn(() =>
        Promise.resolve(
          createParsedResponse({
            status: 'completed',
            output_text: '{"result":"ok","score":1}',
            output_parsed: null,
          }),
        ),
      ),
    });

    await expect(
      service.classify({
        systemPrompt: 'system',
        userPrompt: 'user',
        structuredOutput: {
          name: 'analysis_result_payload',
          schema: structuredPayloadSchema,
        },
      }),
    ).rejects.toMatchObject({
      name: LlmResponseFormatError.name,
      message: 'LLM returned no parsed structured payload',
      failureCode: LLM_RESPONSE_FORMAT_FAILURE_CODE.MISSING_PARSED_OUTPUT,
      rawText: '{"result":"ok","score":1}',
    });
  });

  it('bubbles provider rejections for structured-output requests', async () => {
    const error = new Error('Provider rejected structured output');
    const service = createService({
      parse: jest.fn(() => Promise.reject(error)),
    });

    await expect(
      service.classify({
        systemPrompt: 'system',
        userPrompt: 'user',
        structuredOutput: {
          name: 'analysis_result_payload',
          schema: structuredPayloadSchema,
        },
      }),
    ).rejects.toBe(error);
  });

  it('keeps the legacy generate JSON parsing flow unchanged', async () => {
    const service = createService({
      create: jest.fn(() =>
        Promise.resolve({
          output_text:
            '{"result":"ok","details":{"opening":null},"mistakes":[{"tag":null}]}',
        }),
      ),
    });

    await expect(
      service.generate({
        systemPrompt: 'system',
        userPrompt: 'user',
      }),
    ).resolves.toEqual({
      model: 'test-model',
      promptVersion: 'v1',
      rawText:
        '{"result":"ok","details":{"opening":null},"mistakes":[{"tag":null}]}',
      payload: {
        result: 'ok',
        details: {
          opening: null,
        },
        mistakes: [
          {
            tag: null,
          },
        ],
      },
    });
  });

  it('throws when the legacy generate flow returns invalid JSON', async () => {
    const service = createService({
      create: jest.fn(() =>
        Promise.resolve({
          output_text: '{not-json',
        }),
      ),
    });

    await expect(
      service.generate({
        systemPrompt: 'system',
        userPrompt: 'user',
      }),
    ).rejects.toMatchObject({
      name: LlmResponseFormatError.name,
      message: 'LLM returned invalid JSON in the response body',
      failureCode: LLM_RESPONSE_FORMAT_FAILURE_CODE.INVALID_JSON,
      rawText: '{not-json',
    });
  });
});

function createService(overrides?: {
  create?: jest.Mock;
  parse?: jest.Mock;
}): LlmService {
  const service = new LlmService({
    apiKey: 'test-key',
    baseUrl: 'https://openrouter.example',
    model: 'test-model',
  });

  Object.assign(service as object, {
    client: {
      responses: {
        create: overrides?.create ?? jest.fn(),
        parse: overrides?.parse ?? jest.fn(),
      },
    },
  });

  return service;
}

function createParsedResponse(
  overrides: Partial<ParsedResponse<unknown>>,
): ParsedResponse<unknown> {
  const response: ParsedResponse<unknown> = {
    id: 'resp_test',
    created_at: 0,
    output_text: '',
    error: null,
    incomplete_details: null,
    instructions: null,
    metadata: null,
    model: 'test-model',
    object: 'response',
    output: [],
    output_parsed: null,
    parallel_tool_calls: false,
    temperature: null,
    tool_choice: 'auto',
    tools: [],
    top_p: null,
    ...overrides,
  };

  return response;
}
