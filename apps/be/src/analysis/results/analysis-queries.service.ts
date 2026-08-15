import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, MoveColor } from '../../generated/prisma/client.js';
import { PgnParserService } from '../preparation/pgn-parser.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const DEFAULT_INITIAL_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

@Injectable()
export class AnalysisQueriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pgnParserService: PgnParserService,
  ) {}

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

    const parsedGame = this.pgnParserService.parse(
      analysis.game.rawPgn,
      analysis.game.studentColor,
    );
    const replayMoves = parsedGame.moves.map((move) => ({
      ply: move.ply,
      fullMoveNumber: move.fullMoveNumber,
      moveNumber: move.moveNumber,
      moveColor: this.mapMoveColor(move.color),
      san: move.san,
      lan: move.lan,
      uci: move.uci,
      from: move.from,
      to: move.to,
      promotion: move.promotion,
      beforeFen: move.beforeFen,
      afterFen: move.afterFen,
      evaluationBefore: move.evaluationBefore,
      evaluationAfter: move.evaluationAfter,
    }));
    const replayMovesByPly = new Map(
      replayMoves.map((move) => [move.ply, move] as const),
    );
    const mistakesByMomentId = new Map(
      analysis.mistakes
        .filter((mistake) => mistake.criticalMomentId !== null)
        .map((mistake) => [mistake.criticalMomentId, mistake] as const),
    );

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
      replay: {
        initialFen:
          replayMoves[0]?.beforeFen ??
          parsedGame.headers.initialFen ??
          DEFAULT_INITIAL_FEN,
        moveCount: replayMoves.length,
        moves: replayMoves,
      },
      criticalMoments: analysis.criticalMoments
        .map((moment) => {
          const replayMove = replayMovesByPly.get(moment.ply);
          const mistake = mistakesByMomentId.get(moment.id) ?? null;

          return {
            ...moment,
            from: replayMove?.from ?? null,
            to: replayMove?.to ?? null,
            promotion: replayMove?.promotion ?? null,
            bestVariation: moment.bestVariation as string[],
            nags: moment.nags as string[],
            comments: moment.comments as string[],
            mistake,
          };
        })
        .sort((left, right) => left.ply - right.ply),
      mistakes: analysis.mistakes,
      createdAt: analysis.createdAt,
      updatedAt: analysis.updatedAt,
    };
  }

  private mapMoveColor(color: 'w' | 'b') {
    return color === 'w' ? MoveColor.WHITE : MoveColor.BLACK;
  }
}
