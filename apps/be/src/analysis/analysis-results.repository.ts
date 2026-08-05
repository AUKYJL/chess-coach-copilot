import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

@Injectable()
export class AnalysisResultsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async replaceAnalysisForJob(data: {
    jobId: string;
    coachAccountId: string;
    studentId: string;
    gameId: string;
    confidenceLevel: import('../generated/prisma/client.js').ConfidenceLevel;
    overallDiagnosis: string;
    openingName: string | null;
    result: import('../generated/prisma/client.js').GameResult;
    mainWeaknessTag: string | null;
    secondaryWeaknessTags: string[];
    recommendedLessonTitle: string | null;
    recommendedLessonWhy: string | null;
    recommendedFocusPoints: string[];
    rawExtractedContext: unknown;
    rawAnalysisJson: unknown;
    criticalMoments: Array<Omit<Prisma.CriticalMomentCreateManyInput, 'analysisId'>>;
    mistakes: Array<Omit<Prisma.MistakeCreateManyInput, 'analysisId'>>;
  }) {
    const existing = await this.prisma.gameAnalysis.findFirst({
      where: { analysisJobId: data.jobId },
    });

    const analysis = existing
      ? await this.prisma.gameAnalysis.update({
          where: { id: existing.id },
          data: {
            confidenceLevel: data.confidenceLevel,
            overallDiagnosis: data.overallDiagnosis,
            openingName: data.openingName,
            result: data.result,
            mainWeaknessTag: data.mainWeaknessTag,
            secondaryWeaknessTags: data.secondaryWeaknessTags,
            recommendedLessonTitle: data.recommendedLessonTitle,
            recommendedLessonWhy: data.recommendedLessonWhy,
            recommendedFocusPoints: data.recommendedFocusPoints,
            rawExtractedContext: asJson(data.rawExtractedContext),
            rawAnalysisJson: asJson(data.rawAnalysisJson),
          },
        })
      : await this.prisma.gameAnalysis.create({
          data: {
            coachAccountId: data.coachAccountId,
            studentId: data.studentId,
            gameId: data.gameId,
            analysisJobId: data.jobId,
            confidenceLevel: data.confidenceLevel,
            overallDiagnosis: data.overallDiagnosis,
            openingName: data.openingName,
            result: data.result,
            mainWeaknessTag: data.mainWeaknessTag,
            secondaryWeaknessTags: data.secondaryWeaknessTags,
            recommendedLessonTitle: data.recommendedLessonTitle,
            recommendedLessonWhy: data.recommendedLessonWhy,
            recommendedFocusPoints: data.recommendedFocusPoints,
            rawExtractedContext: asJson(data.rawExtractedContext),
            rawAnalysisJson: asJson(data.rawAnalysisJson),
          },
        });

    await this.prisma.criticalMoment.deleteMany({
      where: {
        analysisId: analysis.id,
      },
    });
    await this.prisma.mistake.deleteMany({
      where: {
        analysisId: analysis.id,
      },
    });

    if (data.criticalMoments.length > 0) {
      await this.prisma.criticalMoment.createMany({
        data: data.criticalMoments.map((item) => ({
          analysisId: analysis.id,
          ...item,
        })) as Prisma.CriticalMomentCreateManyInput[],
      });
    }

    if (data.mistakes.length > 0) {
      await this.prisma.mistake.createMany({
        data: data.mistakes.map((item) => ({
          analysisId: analysis.id,
          ...item,
        })) as Prisma.MistakeCreateManyInput[],
      });
    }

    return analysis;
  }

  createTrace(data: {
    coachAccountId: string;
    analysisJobId: string;
    analysisId?: string;
    promptVersion: string;
    model: string;
    inputPayload: unknown;
    outputPayload: unknown;
    failureCode?: string;
    failureMessage?: string;
  }) {
    return this.prisma.generationTrace.create({
      data: {
        ...data,
        inputPayload: asJson(data.inputPayload),
        outputPayload: asJson(data.outputPayload),
      },
    });
  }

  findOwnedAnalysis(analysisId: string, coachAccountId: string) {
    return this.prisma.gameAnalysis.findFirst({
      where: {
        id: analysisId,
        coachAccountId,
      },
      include: {
        game: true,
        criticalMoments: true,
        mistakes: true,
      },
    });
  }

  findOwnedAnalysisByJobId(analysisJobId: string, coachAccountId: string) {
    return this.prisma.gameAnalysis.findFirst({
      where: {
        analysisJobId,
        coachAccountId,
      },
      include: {
        game: true,
        criticalMoments: true,
        mistakes: true,
      },
    });
  }
}
