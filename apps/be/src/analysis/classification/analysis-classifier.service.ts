import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { LlmService } from '../../llm/llm.service.js';
import type { JsonObject } from '../../shared/types/json-value.type.js';
import type { ParsedPgn } from '../preparation/pgn-parser.service.js';
import { ANALYSIS_CLASSIFIER_SYSTEM_PROMPT } from './analysis-classifier.prompt.js';
import { AnalysisResultPayload } from './analysis-result.schema.js';
import type { ExtractedAnnotationContext } from './annotation-extractor.service.js';
import {
  LLM_RESPONSE_VALIDATION_FAILURE_CODE,
  LlmResponseValidationError,
} from '../../llm/index.js';
import { analysisInterpretationPayloadSchema } from './analysis-interpretation.schema.js';
import {
  AnalysisInterpretationAssemblyError,
  assembleAnalysisResultPayload,
  buildReducedConfidenceAnalysisResult,
  buildNoCriticalMomentsAnalysisResult,
} from './analysis-result-assembler.js';

export interface ClassifiedAnalysisResult {
  payload: AnalysisResultPayload;
  promptVersion: string;
  model: string;
  rawOutput: Prisma.InputJsonValue;
  inputPayload: Prisma.InputJsonObject;
}

const REDUCED_CONFIDENCE_PROMPT_VERSION = 'rule-based-reduced-confidence-v3';
const REDUCED_CONFIDENCE_MODEL = 'reduced-confidence-fallback';
const INVALID_ANALYSIS_PAYLOAD_ERROR =
  'LLM returned a payload incompatible with the analysis interpretation contract';

@Injectable()
export class AnalysisClassifierService {
  constructor(private readonly llmService: LlmService) {}

  async classify(
    parsedPgn: ParsedPgn,
    extractedContext: ExtractedAnnotationContext,
  ): Promise<ClassifiedAnalysisResult> {
    const inputPayload = this.buildInputPayload(parsedPgn, extractedContext);

    if (
      !extractedContext.hasEngineAnnotations ||
      extractedContext.moments.length === 0
    ) {
      const payload = buildReducedConfidenceAnalysisResult(parsedPgn);

      return {
        payload,
        promptVersion: REDUCED_CONFIDENCE_PROMPT_VERSION,
        model: REDUCED_CONFIDENCE_MODEL,
        rawOutput: {
          mode: 'rule_based_reduced_confidence',
          reason: 'insufficient_engine_annotations',
        },
        inputPayload,
      };
    }

    const llmResponse = await this.llmService.classify({
      systemPrompt: ANALYSIS_CLASSIFIER_SYSTEM_PROMPT,
      userPrompt: JSON.stringify(inputPayload),
      structuredOutput: {
        name: 'analysis_interpretation_payload',
        schema: analysisInterpretationPayloadSchema,
      },
    });

    let payload: AnalysisResultPayload;

    const interpretationResult = analysisInterpretationPayloadSchema.safeParse(
      llmResponse.payload,
    );

    if (!interpretationResult.success) {
      throw new LlmResponseValidationError(
        INVALID_ANALYSIS_PAYLOAD_ERROR,
        LLM_RESPONSE_VALIDATION_FAILURE_CODE.INVALID_PAYLOAD,
        llmResponse.rawText,
        llmResponse.payload,
        llmResponse.model,
        llmResponse.promptVersion,
        {
          issues: interpretationResult.error.issues.map((issue) => ({
            path: issue.path.map((segment) => String(segment)),
            code: issue.code,
            message: issue.message,
          })),
        },
      );
    }

    try {
      payload = assembleAnalysisResultPayload({
        parsedPgn,
        extractedContext,
        interpretation: interpretationResult.data,
      });
    } catch (error) {
      if (!(error instanceof AnalysisInterpretationAssemblyError)) {
        throw error;
      }

      throw new LlmResponseValidationError(
        INVALID_ANALYSIS_PAYLOAD_ERROR,
        LLM_RESPONSE_VALIDATION_FAILURE_CODE.INVALID_PAYLOAD,
        llmResponse.rawText,
        llmResponse.payload,
        llmResponse.model,
        llmResponse.promptVersion,
        this.toAssemblyValidationIssues(error),
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

  createNoCriticalMomentsResult(
    parsedPgn: ParsedPgn,
    extractedContext: ExtractedAnnotationContext,
  ): ClassifiedAnalysisResult {
    return {
      payload: buildNoCriticalMomentsAnalysisResult(parsedPgn),
      promptVersion: 'rule-based-no-critical-moments-v1',
      model: 'rule-based-no-critical-moments',
      rawOutput: {
        mode: 'rule_based_no_critical_moments',
        reason: 'no_product_critical_moments',
      },
      inputPayload: this.buildInputPayload(parsedPgn, extractedContext),
    };
  }

  private buildInputPayload(
    parsedPgn: ParsedPgn,
    extractedContext: ExtractedAnnotationContext,
  ): Prisma.InputJsonObject {
    return {
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
  }

  private buildSurroundingMoves(
    parsedPgn: ParsedPgn,
    extractedContext: ExtractedAnnotationContext,
  ): Array<JsonObject> {
    return extractedContext.moments.map((moment) => ({
      momentId: moment.momentId,
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

  private toAssemblyValidationIssues(
    error: AnalysisInterpretationAssemblyError,
  ): { issues: Array<{ path: string[]; code: string; message: string }> } {
    if ('mistakeIndex' in error.details) {
      return {
        issues: [
          {
            path: ['mistakes', String(error.details.mistakeIndex), 'momentId'],
            code: 'custom',
            message: `Unknown momentId "${error.details.momentId}" referenced by interpretation payload`,
          },
        ],
      };
    }

    return {
      issues: error.details.duplicateIndexes.map((duplicateIndex) => ({
        path: ['mistakes', String(duplicateIndex), 'momentId'],
        code: 'custom',
        message: `Duplicate momentId "${error.details.momentId}" referenced by interpretation payload`,
      })),
    };
  }
}
