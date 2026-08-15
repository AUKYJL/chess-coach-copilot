import { jest } from '@jest/globals';
import { z } from 'zod';
import { generatedHomeworkPayloadSchema } from '../../src/analysis/classification/generated-homework.schema.js';
import { generatedReportPayloadSchema } from '../../src/analysis/classification/generated-report.schema.js';
import {
  LLM_RESPONSE_FORMAT_FAILURE_CODE,
  LlmResponseFormatError,
} from '../../src/llm/index.js';
import {
  LLM_RESPONSE_VALIDATION_FAILURE_CODE,
  LlmResponseValidationError,
} from '../../src/llm/llm-response-validation.error.js';
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
              required: expect.arrayContaining(['result', 'score', 'details']),
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
      rawText: '```\n{"result":"ok","score":1,"details":{"opening":null}}\n```',
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

  it('throws when the structured classify response violates the schema', async () => {
    const service = createService({
      create: jest.fn(() =>
        Promise.resolve(
          createResponse({
            status: 'completed',
            output_text: '{"result":"ok","details":{"opening":null}}',
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
      name: LlmResponseValidationError.name,
      message:
        'LLM returned a payload incompatible with the structured output schema',
      failureCode: LLM_RESPONSE_VALIDATION_FAILURE_CODE.INVALID_PAYLOAD,
      rawText: '{"result":"ok","details":{"opening":null}}',
      parsedPayload: {
        result: 'ok',
        details: {
          opening: null,
        },
      },
      validationIssues: {
        issues: expect.arrayContaining([
          expect.objectContaining({
            path: ['score'],
          }),
        ]),
      },
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

  it('returns raw text from generate without parsing JSON', async () => {
    const service = createService({
      create: jest.fn(() =>
        Promise.resolve({
          output_text:
            '# Lesson recap\n\nThe student handled the opening well, but rushed tactical checks.',
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
        '# Lesson recap\n\nThe student handled the opening well, but rushed tactical checks.',
    });
  });

  it('parses fenced JSON in the explicit structured generation flow', async () => {
    const service = createService({
      create: jest.fn(() =>
        Promise.resolve({
          output_text:
            '```json\n{"result":"ok","details":{"opening":null},"mistakes":[{"tag":null}]}\n```',
        }),
      ),
    });

    await expect(
      service.generateStructured({
        systemPrompt: 'system',
        userPrompt: 'user',
        structuredOutput: {
          name: 'analysis_result_payload',
          schema: z.object({
            result: z.string(),
            details: z.object({
              opening: z.string().nullable().optional(),
            }),
            mistakes: z.array(
              z.object({
                tag: z.string().nullable(),
              }),
            ),
          }),
        },
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

  it.each([
    {
      name: 'generated report schema',
      schemaName: 'generated_report_payload',
      schema: generatedReportPayloadSchema,
      outputText:
        '{"title":"Coach report","summary":"Summary","highlights":["Highlight"],"lessonFocus":["Focus"],"nextSteps":["Next"]}',
      expectedPayload: {
        title: 'Coach report',
        summary: 'Summary',
        highlights: ['Highlight'],
        lessonFocus: ['Focus'],
        nextSteps: ['Next'],
      },
    },
    {
      name: 'generated homework schema',
      schemaName: 'generated_homework_payload',
      schema: generatedHomeworkPayloadSchema,
      outputText:
        '{"title":"Homework","overview":"Overview","exercises":["Exercise"],"focusPoints":["Focus"],"notes":["Note"]}',
      expectedPayload: {
        title: 'Homework',
        overview: 'Overview',
        exercises: ['Exercise'],
        focusPoints: ['Focus'],
        notes: ['Note'],
      },
    },
  ])(
    'builds a structured generation request without schema normalization errors for $name',
    async ({ schemaName, schema, outputText, expectedPayload }) => {
      const create = jest.fn(() =>
        Promise.resolve(
          createResponse({
            status: 'completed',
            output_text: outputText,
          }),
        ),
      );
      const service = createService({ create });

      await expect(
        service.generateStructured({
          systemPrompt: 'system',
          userPrompt: 'user',
          structuredOutput: {
            name: schemaName,
            schema,
          },
        }),
      ).resolves.toEqual({
        model: 'test-model',
        promptVersion: 'v1',
        rawText: outputText,
        payload: expectedPayload,
      });

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          text: {
            format: expect.objectContaining({
              type: 'json_schema',
              name: schemaName,
              strict: true,
              schema: expect.not.objectContaining({
                properties: expect.objectContaining({
                  metadata: expect.anything(),
                }),
              }),
            }),
          },
        }),
      );
    },
  );

  it('throws when the explicit structured generation flow returns invalid JSON', async () => {
    const service = createService({
      create: jest.fn(() =>
        Promise.resolve({
          output_text: '{not-json',
        }),
      ),
    });

    await expect(
      service.generateStructured({
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
