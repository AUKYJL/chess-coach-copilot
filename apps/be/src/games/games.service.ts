import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AnalysisJobStatus,
  AnnotationCoverage,
  EngineEvidenceSource,
  EngineEvidenceStatus,
  GameResult,
  GameSourceType,
  StudentColor,
} from '../generated/prisma/client.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  GAME_CARD_SELECT,
  GAME_DETAIL_SELECT,
  GAME_LIST_ORDER_BY,
  type GameCardRow,
  mapGameDetail,
  mapGameWithLatestJob,
} from './game-read-model.js';

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  async createImportedGame(data: {
    coachAccountId: string;
    studentId: string;
    sourceLabel?: string;
    studentColor: StudentColor;
    event: string | null;
    site: string | null;
    whitePlayerName: string | null;
    blackPlayerName: string | null;
    openingHeader: string | null;
    ecoCode: string | null;
    rawResult: string | null;
    derivedResult: GameResult;
    plyCount: number | null;
    rawPgn: string;
    normalizedPgnHash: string;
    hasEngineAnnotations: boolean;
    annotationCoverage: AnnotationCoverage;
    reducedConfidenceWarning: string | null;
    engineEvidence: Prisma.InputJsonValue | null;
    engineEvidenceStatus: EngineEvidenceStatus | null;
    engineEvidenceSource: EngineEvidenceSource | null;
  }) {
    const duplicate = await this.prisma.game.findFirst({
      where: {
        studentId: data.studentId,
        normalizedPgnHash: data.normalizedPgnHash,
      },
      select: { id: true },
    });

    const game = await this.prisma.game.create({
      data: {
        ...data,
        engineEvidence: data.engineEvidence ?? Prisma.JsonNull,
        sourceType: GameSourceType.MANUAL_PGN,
      },
    });

    return {
      game,
      isDuplicate: Boolean(duplicate),
    };
  }

  async listStudentGames(args: {
    coachAccountId: string;
    studentId: string;
    limit?: number;
    cursor?: string;
    analysisStatus?: AnalysisJobStatus;
  }) {
    const limit = args.limit ?? 20;
    const rows: GameCardRow[] = args.analysisStatus
      ? await this.listStudentGamesByLatestStatus({
          coachAccountId: args.coachAccountId,
          studentId: args.studentId,
          limit,
          cursor: args.cursor,
          analysisStatus: args.analysisStatus,
        })
      : await this.prisma.game.findMany({
          where: {
            coachAccountId: args.coachAccountId,
            studentId: args.studentId,
          },
          orderBy: GAME_LIST_ORDER_BY,
          cursor: args.cursor ? { id: args.cursor } : undefined,
          skip: args.cursor ? 1 : undefined,
          take: limit + 1,
          select: GAME_CARD_SELECT,
        });

    const items = rows.slice(0, limit).map((row) => mapGameWithLatestJob(row));
    const nextCursor =
      rows.length > limit ? (items[items.length - 1]?.id ?? null) : null;

    return {
      items,
      nextCursor,
    };
  }

  async getOwnedGame(gameId: string, coachAccountId: string) {
    const game = await this.prisma.game.findFirst({
      where: {
        id: gameId,
        coachAccountId,
      },
      select: GAME_DETAIL_SELECT,
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    return mapGameDetail(game);
  }

  async getOwnedGamePgn(gameId: string, coachAccountId: string) {
    const game = await this.prisma.game.findFirst({
      where: {
        id: gameId,
        coachAccountId,
      },
      select: {
        id: true,
        rawPgn: true,
      },
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    return game;
  }

  private async listStudentGamesByLatestStatus(args: {
    coachAccountId: string;
    studentId: string;
    limit: number;
    cursor?: string;
    analysisStatus: AnalysisJobStatus;
  }) {
    const rows: GameCardRow[] = [];
    const chunkSize = Math.max(args.limit * 2, 20);
    let cursor = args.cursor;
    let hasMore = true;

    while (rows.length < args.limit + 1 && hasMore) {
      const chunk = await this.prisma.game.findMany({
        where: {
          coachAccountId: args.coachAccountId,
          studentId: args.studentId,
        },
        orderBy: GAME_LIST_ORDER_BY,
        cursor: cursor ? { id: cursor } : undefined,
        skip: cursor ? 1 : undefined,
        take: chunkSize,
        select: GAME_CARD_SELECT,
      });

      if (chunk.length === 0) {
        break;
      }

      rows.push(
        ...chunk.filter(
          (game) =>
            mapGameWithLatestJob(game).latestAnalysisJobStatus ===
            args.analysisStatus,
        ),
      );
      cursor = chunk[chunk.length - 1]?.id;
      hasMore = chunk.length === chunkSize;
    }

    return rows;
  }
}
