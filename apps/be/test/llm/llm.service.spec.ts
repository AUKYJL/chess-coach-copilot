import { jest } from '@jest/globals';
import { z } from 'zod';
import {
  LLM_RESPONSE_FORMAT_FAILURE_CODE,
  LlmResponseFormatError,
} from '../../src/llm/index.js';
import { LlmService } from '../../src/llm/llm.service.js';

const structuredPayloadSchema = z.object({
  result: z.string(),
  score: z.number(),
  details: z.object({
    opening: z.string().nullable().optional(),
  }),
});

describe('LlmService', () => {
  it('parses a successful structured classify response', async () => {
    const create = jest.fn(() =>
      Promise.resolve(
        createResponse({
          status: 'completed',
          output_text: '{"result":"ok","score":1,"details":{"opening":null}}',
        }),
      ),
    );
    const service = createService({
      create,
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
      rawText: '{"result":"ok","score":1,"details":{"opening":null}}',
      payload: {
        result: 'ok',
        score: 1,
        details: {
          opening: null,
        },
      },
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'test-model',
        provider: {
          require_parameters: true,
        },
        text: {
          format: expect.objectContaining({
            type: 'json_schema',
            name: 'analysis_result_payload',
            strict: true,
            schema: expect.objectContaining({
              type: 'object',
              required: expect.arrayContaining([
                'result',
                'score',
                'details',
              ]),
              properties: expect.objectContaining({
                details: expect.objectContaining({
                  required: ['opening'],
                  properties: expect.objectContaining({
                    opening: {
                      anyOf: [{ type: 'string' }, { type: 'null' }],
                    },
                  }),
                }),
              }),
            }),
          }),
        },
      }),
    );
  });

  it('parses a structured classify response wrapped in a json fence', async () => {
    const service = createService({
      create: jest.fn(() =>
        Promise.resolve(
          createResponse({
            status: 'completed',
            output_text:
              '```json\n{"result":"ok","score":1,"details":{"opening":null}}\n```',
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
    ).resolves.toEqual({
      model: 'test-model',
      promptVersion: 'analysis-structured-output-v2',
      rawText:
        '```json\n{"result":"ok","score":1,"details":{"opening":null}}\n```',
      payload: {
        result: 'ok',
        score: 1,
        details: {
          opening: null,
        },
      },
    });
  });

  it('parses a structured classify response wrapped in a plain fence', async () => {
    const service = createService({
      create: jest.fn(() =>
        Promise.resolve(
          createResponse({
            status: 'completed',
            output_text:
              '```\n{"result":"ok","score":1,"details":{"opening":null}}\n```',
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
    ).resolves.toEqual({
      model: 'test-model',
      promptVersion: 'analysis-structured-output-v2',
      rawText:
        '```\n{"result":"ok","score":1,"details":{"opening":null}}\n```',
      payload: {
        result: 'ok',
        score: 1,
        details: {
          opening: null,
        },
      },
    });
  });

  it('throws when the structured classify response body is empty', async () => {
    const service = createService({
      create: jest.fn(() =>
        Promise.resolve(
          createResponse({
            status: 'completed',
            output_text: '   ',
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
      create: jest.fn(() =>
        Promise.resolve(
          createResponse({
            status: 'incomplete',
            output_text: '{"result":"partial"}',
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

  it('throws when the structured classify response contains invalid JSON after fence stripping', async () => {
    const service = createService({
      create: jest.fn(() =>
        Promise.resolve(
          createResponse({
            status: 'completed',
            output_text: '```json\n{not-json\n```',
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
      message: 'LLM returned invalid JSON in the response body',
      failureCode: LLM_RESPONSE_FORMAT_FAILURE_CODE.INVALID_JSON,
      rawText: '```json\n{not-json\n```',
    });
  });

  it('bubbles provider rejections for structured-output requests', async () => {
    const error = new Error('Provider rejected structured output');
    const service = createService({
      create: jest.fn(() => Promise.reject(error)),
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

  it('parses fenced JSON in the legacy generate flow', async () => {
    const service = createService({
      create: jest.fn(() =>
        Promise.resolve({
          output_text:
            '```json\n{"result":"ok","details":{"opening":null},"mistakes":[{"tag":null}]}\n```',
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
        '```json\n{"result":"ok","details":{"opening":null},"mistakes":[{"tag":null}]}\n```',
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

function createService(overrides?: { create?: jest.Mock }): LlmService {
  const service = new LlmService({
    apiKey: 'test-key',
    baseUrl: 'https://openrouter.example',
    model: 'test-model',
  });

  Object.assign(service as object, {
    client: {
      responses: {
        create: overrides?.create ?? jest.fn(),
      },
    },
  });

  return service;
}

function createResponse(overrides: Record<string, unknown>) {
  return {
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
    parallel_tool_calls: false,
    temperature: null,
    tool_choice: 'auto',
    tools: [],
    top_p: null,
    ...overrides,
  };
}
