import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { MoveColor } from '../../generated/prisma/client.js';
import type { ClassifiedAnalysisResult } from '../classification/analysis-classifier.service.js';
import { GenerationTraceService } from '../classification/generation-trace.service.js';
import type { ExtractedAnnotationContext } from '../classification/annotation-extractor.service.js';
import { AnalysisResultsRepository } from './analysis-results.repository.js';

@Injectable()
export class AnalysisResultsService {
  constructor(
    private readonly analysisResultsRepository: AnalysisResultsRepository,
    private readonly generationTraceService: GenerationTraceService,
  ) {}

  async persistCompletedAnalysis(data: {
    job: {
      id: string;
      coachAccountId: string;
      studentId: string;
      gameId: string;
    };
    extractedContext: ExtractedAnnotationContext;
    classifiedResult: ClassifiedAnalysisResult;
  }) {
    const analysis = await this.analysisResultsRepository.replaceAnalysisForJob(
      {
        jobId: data.job.id,
        coachAccountId: data.job.coachAccountId,
        studentId: data.job.studentId,
        gameId: data.job.gameId,
        confidenceLevel: data.classifiedResult.payload.confidenceLevel,
        overallDiagnosis: data.classifiedResult.payload.overallDiagnosis,
        openingName: data.classifiedResult.payload.openingName ?? null,
        result: data.classifiedResult.payload.result,
        mainWeaknessTag: data.classifiedResult.payload.mainWeaknessTag ?? null,
        secondaryWeaknessTags:
          data.classifiedResult.payload.secondaryWeaknessTags,
        recommendedLessonTitle:
          data.classifiedResult.payload.recommendedLessonTitle ?? null,
        recommendedLessonWhy:
          data.classifiedResult.payload.recommendedLessonWhy ?? null,
        recommendedFocusPoints:
          data.classifiedResult.payload.recommendedFocusPoints,
        rawExtractedContext: this.toRawExtractedContext(data.extractedContext),
        rawAnalysisJson: data.classifiedResult.rawOutput,
        criticalMoments: data.extractedContext.moments.map((moment) => ({
          ply: moment.ply,
          fullMoveNumber: moment.fullMoveNumber,
          moveNumber: moment.moveNumber,
          moveColor:
            moment.moveColor === 'w' ? MoveColor.WHITE : MoveColor.BLACK,
          san: moment.san,
          lan: moment.lan,
          uci: moment.uci,
          beforeFen: moment.beforeFen,
          afterFen: moment.afterFen,
          bestMove: moment.bestMove,
          bestVariation: moment.bestVariation,
          nags: moment.nags,
          comments: moment.comments,
          evaluationBefore: moment.evaluationBefore,
          evaluationAfter: moment.evaluationAfter,
          severity: moment.severity,
          sourceEvidence: moment.sourceEvidence,
        })),
        mistakes: data.classifiedResult.payload.mistakes.map((mistake) => ({
          criticalMomentPly: mistake.criticalMomentPly ?? null,
          severity: mistake.severity,
          category: mistake.category,
          explanation: mistake.explanation,
          suggestedFix: mistake.suggestedFix ?? null,
          sourceEvidence: mistake.sourceEvidence,
        })),
      },
    );

    await this.generationTraceService.persistSuccess({
      coachAccountId: data.job.coachAccountId,
      analysisJobId: data.job.id,
      analysisId: analysis.id,
      promptVersion: data.classifiedResult.promptVersion,
      model: data.classifiedResult.model,
      inputPayload: data.classifiedResult.inputPayload,
      outputPayload: data.classifiedResult.rawOutput,
    });

    return analysis;
  }

  private toRawExtractedContext(
    extractedContext: ExtractedAnnotationContext,
  ): Prisma.InputJsonObject {
    return {
      hasEngineAnnotations: extractedContext.hasEngineAnnotations,
      annotationCoverage: extractedContext.annotationCoverage,
      reducedConfidenceWarning: extractedContext.reducedConfidenceWarning,
      rawCommentCount: extractedContext.rawCommentCount,
      candidateMomentCount: extractedContext.candidateMomentCount,
      diagnostics: extractedContext.diagnostics.map((diagnostic) => ({
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
    };
  }
}
