import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { AnalysisResultsRepository } from '../analysis-results.repository.js';
import type { ClassifiedAnalysisResult } from './analysis-classifier.service.js';
import type { ExtractedAnnotationContext } from './annotation-extractor.service.js';

@Injectable()
export class AnalysisResultsService {
  constructor(
    private readonly analysisResultsRepository: AnalysisResultsRepository,
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
        rawExtractedContext: data.extractedContext as unknown as Record<
          string,
          unknown
        >,
        rawAnalysisJson: data.classifiedResult.rawOutput,
        criticalMoments: data.classifiedResult.payload
          .criticalMoments as unknown as Array<
          Omit<Prisma.CriticalMomentCreateManyInput, 'analysisId'>
        >,
        mistakes: data.classifiedResult.payload.mistakes as unknown as Array<
          Omit<Prisma.MistakeCreateManyInput, 'analysisId'>
        >,
      },
    );

    await this.analysisResultsRepository.createTrace({
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

  persistFailedTrace(data: {
    coachAccountId: string;
    analysisJobId: string;
    promptVersion: string;
    model: string;
    inputPayload: Record<string, unknown>;
    outputPayload: Record<string, unknown>;
    failureCode: string;
    failureMessage: string;
  }) {
    return this.analysisResultsRepository.createTrace(data);
  }
}
