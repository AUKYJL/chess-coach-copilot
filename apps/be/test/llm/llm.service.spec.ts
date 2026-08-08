import { jest } from '@jest/globals';
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

  it('throws when the LLM returns an empty response body', async () => {
    const service = createServiceWithResponse('   ');

    await expect(
      service.classify({
        systemPrompt: 'system',
        userPrompt: 'user',
      }),
    ).rejects.toThrow('LLM returned an empty response body');
  });

  it('throws when the LLM returns invalid JSON', async () => {
    const service = createServiceWithResponse('{not-json');

    await expect(
      service.classify({
        systemPrompt: 'system',
        userPrompt: 'user',
      }),
    ).rejects.toThrow('LLM returned invalid JSON in the response body');
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
