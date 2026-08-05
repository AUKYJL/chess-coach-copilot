import { Injectable } from '@nestjs/common';
import { ConfidenceLevel } from '../../generated/prisma/client.js';
import { LlmService } from '../../llm/llm.service.js';
import type { ParsedPgn } from '../parsers/pgn-parser.service.js';
import {
  AnalysisResultPayload,
  validateAnalysisResultPayload,
} from '../schemas/analysis-result.schema.js';
import type { ExtractedAnnotationContext } from './annotation-extractor.service.js';

export interface ClassifiedAnalysisResult {
  payload: AnalysisResultPayload;
  promptVersion: string;
  model: string;
  rawOutput: Record<string, unknown>;
  inputPayload: Record<string, unknown>;
}

@Injectable()
export class AnalysisClassifierService {
  constructor(private readonly llmService: LlmService) {}

  async classify(
    parsedPgn: ParsedPgn,
    extractedContext: ExtractedAnnotationContext,
  ): Promise<ClassifiedAnalysisResult> {
    const inputPayload = {
      headers: parsedPgn.headers,
      moves: parsedPgn.moves.slice(0, 20),
      extractedContext,
    };

    if (!extractedContext.hasEngineAnnotations) {
      const payload: AnalysisResultPayload = {
        confidenceLevel: ConfidenceLevel.LOW,
        overallDiagnosis:
          'The game is structurally valid, but objective engine annotations are missing, so only limited coaching conclusions are available.',
        openingName: parsedPgn.headers.Opening ?? null,
        result: parsedPgn.result,
        mainWeaknessTag: 'insufficient-annotation-data',
        secondaryWeaknessTags: ['reduced-confidence'],
        recommendedLessonTitle: 'Replay the game with engine annotations',
        recommendedLessonWhy:
          'More annotated evidence is required before assigning objective mistake severity.',
        recommendedFocusPoints: [
          'Re-export the PGN with engine annotations',
          'Review the main decision points manually',
        ],
        criticalMoments: extractedContext.moments.map((moment) => ({
          ...moment,
          severity: moment.severity,
        })),
        mistakes: [],
      };

      return {
        payload,
        promptVersion: 'rule-based-reduced-confidence-v1',
        model: 'reduced-confidence-fallback',
        rawOutput: payload as unknown as Record<string, unknown>,
        inputPayload,
      };
    }

    const llmResponse = await this.llmService.classify<AnalysisResultPayload>({
      systemPrompt:
        'You classify coach-facing chess analysis from annotated PGN. Return JSON only.',
      userPrompt: JSON.stringify(inputPayload),
      schemaName: 'analysis-result',
    });
    console.log('----------llmResponse');
    console.log(llmResponse);
    console.log('----------llmResponse.payload');
    console.log(llmResponse.payload);
    return {
      payload: validateAnalysisResultPayload(llmResponse.payload),
      promptVersion: llmResponse.promptVersion,
      model: llmResponse.model,
      rawOutput: llmResponse.payload as unknown as Record<string, unknown>,
      inputPayload,
    };
  }
}
