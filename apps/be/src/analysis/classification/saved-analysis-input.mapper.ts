import { Injectable } from '@nestjs/common';
import type { SavedAnalysisInput } from './saved-analysis-input.type.js';

type AnalysisWithRelations = {
  id: string;
  studentId: string;
  gameId: string;
  confidenceLevel: SavedAnalysisInput['confidenceLevel'];
  overallDiagnosis: string;
  openingName: string | null;
  result: SavedAnalysisInput['result'];
  mainWeaknessTag: SavedAnalysisInput['mainWeaknessTag'];
  secondaryWeaknessTags: SavedAnalysisInput['secondaryWeaknessTags'];
  recommendedLessonTitle: string | null;
  recommendedLessonWhy: string | null;
  recommendedFocusPoints: unknown;
  criticalMoments: Array<{
    ply: number;
    moveNumber: string;
    san: string;
    severity: SavedAnalysisInput['criticalMoments'][number]['severity'];
    comments?: unknown;
    bestMove?: string | null;
  }>;
  mistakes: Array<{
    severity: SavedAnalysisInput['mistakes'][number]['severity'];
    category: string;
    mainTag: SavedAnalysisInput['mistakes'][number]['mainTag'];
    secondaryTags: SavedAnalysisInput['mistakes'][number]['secondaryTags'];
    explanation: string;
    suggestedFix: string | null;
    reviewStatus: SavedAnalysisInput['mistakes'][number]['reviewStatus'];
    coachNote: string | null;
  }>;
};

@Injectable()
export class SavedAnalysisInputMapper {
  map(analysis: AnalysisWithRelations): SavedAnalysisInput {
    return {
      id: analysis.id,
      studentId: analysis.studentId,
      gameId: analysis.gameId,
      confidenceLevel: analysis.confidenceLevel,
      overallDiagnosis: analysis.overallDiagnosis,
      openingName: analysis.openingName,
      result: analysis.result,
      mainWeaknessTag: analysis.mainWeaknessTag,
      secondaryWeaknessTags: analysis.secondaryWeaknessTags,
      recommendedLessonTitle: analysis.recommendedLessonTitle,
      recommendedLessonWhy: analysis.recommendedLessonWhy,
      recommendedFocusPoints: analysis.recommendedFocusPoints as string[],
      criticalMoments: analysis.criticalMoments.map((item) => ({
        ply: item.ply,
        moveNumber: item.moveNumber,
        san: item.san,
        severity: item.severity,
        ...(item.comments !== undefined ? { comments: item.comments } : {}),
        ...(item.bestMove !== undefined ? { bestMove: item.bestMove } : {}),
      })),
      mistakes: analysis.mistakes.map((item) => ({
        severity: item.severity,
        category: item.category,
        mainTag: item.mainTag,
        secondaryTags: item.secondaryTags,
        explanation: item.explanation,
        suggestedFix: item.suggestedFix,
        reviewStatus: item.reviewStatus,
        coachNote: item.coachNote,
      })),
    };
  }
}
