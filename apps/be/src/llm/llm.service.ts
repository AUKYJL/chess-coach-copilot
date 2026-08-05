import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import OpenAI from 'openai';
import { openrouterConfig } from '../config/index.js';
import {
  LlmClassificationRequest,
  LlmGenerationRequest,
  LlmResponse,
} from './llm.types.js';

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

  async classify<TPayload>(
    request: LlmClassificationRequest,
  ): Promise<LlmResponse<TPayload>> {
    return this.complete<TPayload>(request.systemPrompt, request.userPrompt);
  }

  async generate<TPayload>(
    request: LlmGenerationRequest,
  ): Promise<LlmResponse<TPayload>> {
    return this.complete<TPayload>(request.systemPrompt, request.userPrompt);
  }

  private async complete<TPayload>(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<LlmResponse<TPayload>> {
    const completion = await this.client.responses.create({
      model: this.model,
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const rawText = completion.output_text;
    console.log('----------rawText');
    console.log(rawText);

    return {
      model: this.model,
      promptVersion: 'v1',
      payload:
        rawText.length > 0
          ? (JSON.parse(rawText) as TPayload)
          : ({} as TPayload),
      rawText,
    };
  }
}
