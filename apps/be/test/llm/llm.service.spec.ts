import { jest } from '@jest/globals';
import {
  LLM_RESPONSE_FORMAT_FAILURE_CODE,
  LlmResponseFormatError,
} from '../../src/llm/index.js';
import { LlmService } from '../../src/llm/llm.service.js';

describe('LlmService', () => {
  it('parses a successful JSON response', async () => {
    const service = createServiceWithResponse('{"result":"ok","score":1}');

    await expect(
      service.classify({
        systemPrompt: 'system',
        userPrompt: 'user',
      }),
    ).resolves.toEqual({
      model: 'test-model',
      promptVersion: 'v1',
      rawText: '{"result":"ok","score":1}',
      payload: {
        result: 'ok',
        score: 1,
      },
    });
  });

  it('parses a successful JSON response with null fields', async () => {
    const service = createServiceWithResponse(
      '{"result":"ok","details":{"opening":null},"mistakes":[{"tag":null}]}',
    );

    await expect(
      service.classify({
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

  it('throws when the LLM returns an empty response body', async () => {
    const service = createServiceWithResponse('   ');

    await expect(
      service.classify({
        systemPrompt: 'system',
        userPrompt: 'user',
      }),
    ).rejects.toMatchObject({
      name: LlmResponseFormatError.name,
      message: 'LLM returned an empty response body',
      failureCode: LLM_RESPONSE_FORMAT_FAILURE_CODE.EMPTY_RESPONSE,
      rawText: '   ',
    });
  });

  it('throws when the LLM returns invalid JSON', async () => {
    const service = createServiceWithResponse('{not-json');

    await expect(
      service.classify({
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

function createServiceWithResponse(rawText: string): LlmService {
  const service = new LlmService({
    apiKey: 'test-key',
    baseUrl: 'https://openrouter.example',
    model: 'test-model',
  });
  const create = jest.fn(() =>
    Promise.resolve({
      output_text: rawText,
    }),
  );

  Object.assign(service as object, {
    client: {
      responses: {
        create,
      },
    },
  });

  return service;
}
