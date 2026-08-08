import {
  AnalysisJobStatus,
  Prisma,
  type GameResult,
  type StudentColor,
} from '../generated/prisma/client.js';

export const LATEST_ANALYSIS_JOB_ORDER_BY = [
  { createdAt: Prisma.SortOrder.desc },
  { id: Prisma.SortOrder.desc },
] satisfies Prisma.AnalysisJobOrderByWithRelationInput[];

export const GAME_LIST_ORDER_BY = [
  { importedAt: Prisma.SortOrder.desc },
  { createdAt: Prisma.SortOrder.desc },
  { id: Prisma.SortOrder.desc },
] satisfies Prisma.GameOrderByWithRelationInput[];

export const GAME_CARD_SELECT = {
  id: true,
  sourceLabel: true,
  studentColor: true,
  event: true,
  site: true,
  whitePlayerName: true,
  blackPlayerName: true,
  openingHeader: true,
  ecoCode: true,
  rawResult: true,
  derivedResult: true,
  plyCount: true,
  importedAt: true,
  analysisJobs: {
    take: 1,
    orderBy: LATEST_ANALYSIS_JOB_ORDER_BY,
    select: {
      id: true,
      status: true,
      analysis: {
        select: {
          id: true,
        },
      },
    },
  },
} satisfies Prisma.GameSelect;

type GameCardBase = {
  id: string;
  sourceLabel: string | null;
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
  importedAt: Date;
  analysisJobs: Array<{
    id: string;
    status: AnalysisJobStatus;
    analysis: { id: string } | null;
  }>;
};

export type GameCardRow = Prisma.GameGetPayload<{
  select: typeof GAME_CARD_SELECT;
}>;

export type GameCard = ReturnType<typeof mapGameWithLatestJob>;

export function mapGameWithLatestJob<TGame extends GameCardBase>(game: TGame) {
  const latestJob = game.analysisJobs[0] ?? null;

  return {
    id: game.id,
    sourceLabel: game.sourceLabel,
    studentColor: game.studentColor,
    event: game.event,
    site: game.site,
    whitePlayerName: game.whitePlayerName,
    blackPlayerName: game.blackPlayerName,
    openingHeader: game.openingHeader,
    ecoCode: game.ecoCode,
    rawResult: game.rawResult,
    derivedResult: game.derivedResult,
    plyCount: game.plyCount,
    importedAt: game.importedAt,
    latestAnalysisJobStatus: latestJob?.status ?? null,
    latestAnalysisJobId: latestJob?.id ?? null,
    latestAnalysisId: latestJob?.analysis?.id ?? null,
  };
}

export const GAME_DETAIL_SELECT = {
  ...GAME_CARD_SELECT,
  studentId: true,
  sourceType: true,
  hasEngineAnnotations: true,
  annotationCoverage: true,
  reducedConfidenceWarning: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.GameSelect;

export type GameDetailRow = Prisma.GameGetPayload<{
  select: typeof GAME_DETAIL_SELECT;
}>;

export type GameDetail = ReturnType<typeof mapGameDetail>;

export function mapGameDetail(game: GameDetailRow) {
  return {
    ...mapGameWithLatestJob(game),
    studentId: game.studentId,
    sourceType: game.sourceType,
    hasEngineAnnotations: game.hasEngineAnnotations,
    annotationCoverage: game.annotationCoverage,
    reducedConfidenceWarning: game.reducedConfidenceWarning,
    createdAt: game.createdAt,
    updatedAt: game.updatedAt,
  };
}
