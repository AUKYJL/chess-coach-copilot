import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { ConfidenceLevel, WeaknessTag } from '../../generated/prisma/client.js';
import { LlmService } from '../../llm/llm.service.js';
import type { JsonObject } from '../../shared/types/json-value.type.js';
import type { ParsedPgn } from '../preparation/pgn-parser.service.js';
import { ANALYSIS_CLASSIFIER_SYSTEM_PROMPT } from './analysis-classifier.prompt.js';
import {
  AnalysisResultPayload,
  analysisResultPayloadSchema,
  validateAnalysisResultPayload,
} from './analysis-result.schema.js';
import type { ExtractedAnnotationContext } from './annotation-extractor.service.js';
import {
  LLM_RESPONSE_VALIDATION_FAILURE_CODE,
  LlmResponseValidationError,
} from '../../llm/index.js';

export interface ClassifiedAnalysisResult {
  payload: AnalysisResultPayload;
  promptVersion: string;
  model: string;
  rawOutput: Prisma.InputJsonValue;
  inputPayload: Prisma.InputJsonObject;
}

const REDUCED_CONFIDENCE_PROMPT_VERSION = 'rule-based-reduced-confidence-v2';
const REDUCED_CONFIDENCE_MODEL = 'reduced-confidence-fallback';
const INVALID_ANALYSIS_PAYLOAD_ERROR =
  'LLM returned a payload incompatible with the analysis result schema';

@Injectable()
export class AnalysisClassifierService {
  constructor(private readonly llmService: LlmService) {}

  async classify(
    parsedPgn: ParsedPgn,
    extractedContext: ExtractedAnnotationContext,
  ): Promise<ClassifiedAnalysisResult> {
    const inputPayload: Prisma.InputJsonObject = {
      headers: parsedPgn.headers,
      rawResult: parsedPgn.rawResult,
      result: parsedPgn.result,
      studentColor: parsedPgn.studentColor,
      annotationCoverage: extractedContext.annotationCoverage,
      diagnostics: parsedPgn.diagnostics.map((diagnostic) => ({
        type: diagnostic.type,
        key: diagnostic.key,
        value: diagnostic.value,
        message: diagnostic.message,
        location: diagnostic.location,
      })),
      moments: extractedContext.moments.map((moment) => ({
        ...moment,
        sourceEvidence: moment.sourceEvidence,
      })),
      surroundingMoves: this.buildSurroundingMoves(parsedPgn, extractedContext),
    };

    if (
      !extractedContext.hasEngineAnnotations ||
      extractedContext.moments.length === 0
    ) {
      const payload: AnalysisResultPayload = {
        confidenceLevel: ConfidenceLevel.LOW,
        overallDiagnosis:
          'The game is parseable, but it does not contain enough reliable annotated evidence to derive objective coaching mistakes.',
        openingName: parsedPgn.headers.opening,
        result: parsedPgn.result,
        mainWeaknessTag: WeaknessTag.INSUFFICIENT_ANNOTATION_DATA,
        secondaryWeaknessTags: [WeaknessTag.REDUCED_CONFIDENCE],
        recommendedLessonTitle: 'Replay the game with annotated evidence',
        recommendedLessonWhy:
          'Reliable best-line or evaluation evidence is required before assigning objective mistake categories.',
        recommendedFocusPoints: [
          'Re-export the game with full Lichess annotations',
          'Review the critical decisions manually',
        ],
        mistakes: [],
      };

      return {
        payload,
        promptVersion: REDUCED_CONFIDENCE_PROMPT_VERSION,
        model: REDUCED_CONFIDENCE_MODEL,
        rawOutput: payload,
        inputPayload,
      };
    }

    const llmResponse = await this.llmService.classify({
      systemPrompt: ANALYSIS_CLASSIFIER_SYSTEM_PROMPT,
      userPrompt: JSON.stringify(inputPayload),
      structuredOutput: {
        name: 'analysis_result_payload',
        schema: analysisResultPayloadSchema,
      },
    });

    let payload: AnalysisResultPayload;

    try {
      payload = validateAnalysisResultPayload(llmResponse.payload);
    } catch {
      throw new LlmResponseValidationError(
        INVALID_ANALYSIS_PAYLOAD_ERROR,
        LLM_RESPONSE_VALIDATION_FAILURE_CODE.INVALID_PAYLOAD,
        llmResponse.rawText,
        llmResponse.payload,
        llmResponse.model,
        llmResponse.promptVersion,
      );
    }

    return {
      payload,
      promptVersion: llmResponse.promptVersion,
      model: llmResponse.model,
      rawOutput: llmResponse.payload,
      inputPayload,
    };
  }

  private buildSurroundingMoves(
    parsedPgn: ParsedPgn,
    extractedContext: ExtractedAnnotationContext,
  ): Array<JsonObject> {
    return extractedContext.moments.map((moment) => ({
      ply: moment.ply,
      context: parsedPgn.moves
        .filter(
          (move) => move.ply >= moment.ply - 2 && move.ply <= moment.ply + 2,
        )
        .map((move) => ({
          ply: move.ply,
          moveNumber: move.moveNumber,
          color: move.color,
          san: move.san,
          beforeFen: move.beforeFen,
          afterFen: move.afterFen,
        })),
    }));
  }
}
