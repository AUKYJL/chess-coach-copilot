import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class AnalysisQueriesService {
  constructor(private readonly prisma: PrismaService) {}

  async listOwnedAnalyses(args: {
    coachAccountId: string;
    studentId?: string;
  }) {
    const items = await this.prisma.gameAnalysis.findMany({
      where: {
        coachAccountId: args.coachAccountId,
        ...(args.studentId ? { studentId: args.studentId } : {}),
      },
      orderBy: {
        createdAt: Prisma.SortOrder.desc,
      },
      include: {
        game: true,
      },
    });

    return items.map((item) => ({
      id: item.id,
      analysisJobId: item.analysisJobId,
      gameId: item.gameId,
      studentId: item.studentId,
      confidenceLevel: item.confidenceLevel,
      annotationCoverage: item.game.annotationCoverage,
      reducedConfidenceWarning: item.game.reducedConfidenceWarning,
      openingName: item.openingName,
      result: item.result,
      mainWeaknessTag: item.mainWeaknessTag,
      createdAt: item.createdAt,
    }));
  }

  async getOwnedAnalysisDetails(analysisId: string, coachAccountId: string) {
    const analysis = await this.prisma.gameAnalysis.findFirst({
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

    if (!analysis) {
      throw new NotFoundException('Analysis not found');
    }

    return {
      id: analysis.id,
      analysisJobId: analysis.analysisJobId,
      gameId: analysis.gameId,
      studentId: analysis.studentId,
      confidenceLevel: analysis.confidenceLevel,
      annotationCoverage: analysis.game.annotationCoverage,
      reducedConfidenceWarning: analysis.game.reducedConfidenceWarning,
      overallDiagnosis: analysis.overallDiagnosis,
      openingName: analysis.openingName,
      result: analysis.result,
      mainWeaknessTag: analysis.mainWeaknessTag,
      secondaryWeaknessTags: analysis.secondaryWeaknessTags,
      recommendedLessonTitle: analysis.recommendedLessonTitle,
      recommendedLessonWhy: analysis.recommendedLessonWhy,
      recommendedFocusPoints: analysis.recommendedFocusPoints,
      criticalMoments: analysis.criticalMoments,
      mistakes: analysis.mistakes,
      rawExtractedContext: analysis.rawExtractedContext,
      rawAnalysisJson: analysis.rawAnalysisJson,
      createdAt: analysis.createdAt,
      updatedAt: analysis.updatedAt,
    };
  }

  getOwnedAnalysisByJobId(analysisJobId: string, coachAccountId: string) {
    return this.prisma.gameAnalysis
      .findFirst({
        where: {
          analysisJobId,
          coachAccountId,
        },
        include: {
          game: true,
          criticalMoments: true,
          mistakes: true,
        },
      })
      .then((analysis) => {
        if (!analysis) {
          return null;
        }

        return analysis;
      });
  }
}
