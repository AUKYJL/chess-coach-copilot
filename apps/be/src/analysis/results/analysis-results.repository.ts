import { Injectable } from '@nestjs/common';
import {
  ConfidenceLevel,
  GameResult,
  MomentSeverity,
  MoveColor,
  Prisma,
  WeaknessTag,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

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
    confidenceLevel: ConfidenceLevel;
    overallDiagnosis: string;
    openingName: string | null;
    result: GameResult;
    mainWeaknessTag: WeaknessTag | null;
    secondaryWeaknessTags: WeaknessTag[];
    recommendedLessonTitle: string | null;
    recommendedLessonWhy: string | null;
    recommendedFocusPoints: string[];
    rawExtractedContext: unknown;
    rawAnalysisJson: unknown;
    criticalMoments: Array<{
      ply: number;
      fullMoveNumber: number;
      moveNumber: string;
      moveColor: MoveColor;
      san: string;
      lan: string | null;
      uci: string | null;
      beforeFen: string;
      afterFen: string;
      bestMove: string | null;
      bestVariation: unknown;
      nags: unknown;
      comments: unknown;
      evaluationBefore: unknown;
      evaluationAfter: unknown;
      severity: MomentSeverity;
      sourceEvidence: unknown;
    }>;
    mistakes: Array<{
      criticalMomentPly: number | null;
      severity: MomentSeverity;
      category: string;
      explanation: string;
      suggestedFix: string | null;
      sourceEvidence: unknown;
    }>;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.gameAnalysis.findFirst({
        where: { analysisJobId: data.jobId },
      });

      const analysis = existing
        ? await tx.gameAnalysis.update({
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
        : await tx.gameAnalysis.create({
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

      await tx.mistake.deleteMany({
        where: {
          analysisId: analysis.id,
        },
      });
      await tx.criticalMoment.deleteMany({
        where: {
          analysisId: analysis.id,
        },
      });

      if (data.criticalMoments.length > 0) {
        await tx.criticalMoment.createMany({
          data: data.criticalMoments.map((item) => ({
            analysisId: analysis.id,
            ply: item.ply,
            fullMoveNumber: item.fullMoveNumber,
            moveNumber: item.moveNumber,
            moveColor: item.moveColor,
            san: item.san,
            lan: item.lan,
            uci: item.uci,
            beforeFen: item.beforeFen,
            afterFen: item.afterFen,
            bestMove: item.bestMove,
            bestVariation: asJson(item.bestVariation),
            nags: asJson(item.nags),
            comments: asJson(item.comments),
            evaluationBefore: item.evaluationBefore
              ? asJson(item.evaluationBefore)
              : Prisma.JsonNull,
            evaluationAfter: item.evaluationAfter
              ? asJson(item.evaluationAfter)
              : Prisma.JsonNull,
            severity: item.severity,
            sourceEvidence: asJson(item.sourceEvidence),
          })),
        });
      }

      const createdMoments = await tx.criticalMoment.findMany({
        where: { analysisId: analysis.id },
      });
      const momentIdsByPly = new Map(
        createdMoments.map((moment) => [moment.ply, moment.id]),
      );

      if (data.mistakes.length > 0) {
        await tx.mistake.createMany({
          data: data.mistakes.map((item) => ({
            analysisId: analysis.id,
            criticalMomentId:
              item.criticalMomentPly === null
                ? null
                : (momentIdsByPly.get(item.criticalMomentPly) ?? null),
            severity: item.severity,
            category: item.category,
            explanation: item.explanation,
            suggestedFix: item.suggestedFix,
            sourceEvidence: asJson(item.sourceEvidence),
          })),
        });
      }

      return analysis;
    });
  }
}
