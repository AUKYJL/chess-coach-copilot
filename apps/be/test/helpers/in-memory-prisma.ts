/* eslint-disable @typescript-eslint/require-await */

import { randomUUID } from 'crypto';
import {
  AnalysisJobStatus,
  AnalysisJobType,
  AnnotationCoverage,
  CoachAccountStatus,
  ConfidenceLevel,
  ExternalPlatform,
  GameResult,
  GameSourceType,
  MistakeReviewStatus,
  MomentSeverity,
  MoveColor,
  ReportAudience,
  ReportSource,
  StudentColor,
  WeaknessTag,
} from '../../src/generated/prisma/client.js';

type CoachAccountRecord = {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  status: CoachAccountStatus;
  createdAt: Date;
  updatedAt: Date;
};

type RefreshTokenRecord = {
  id: string;
  coachAccountId: string;
  tokenHash: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedByTokenId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type StudentRecord = {
  id: string;
  coachAccountId: string;
  displayName: string;
  birthYear: number | null;
  rating: number | null;
  notes: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type ExternalAccountRecord = {
  id: string;
  studentId: string;
  platform: ExternalPlatform;
  username: string;
  createdAt: Date;
  updatedAt: Date;
};

type GameRecord = {
  id: string;
  coachAccountId: string;
  studentId: string;
  sourceType: GameSourceType;
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
  rawPgn: string;
  normalizedPgnHash: string;
  hasEngineAnnotations: boolean;
  annotationCoverage: AnnotationCoverage;
  reducedConfidenceWarning: string | null;
  importedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

type AnalysisJobRecord = {
  id: string;
  traceId: string;
  coachAccountId: string;
  studentId: string;
  gameId: string;
  jobType: AnalysisJobType;
  sourceAnalysisId: string | null;
  reportAudience: ReportAudience | null;
  status: AnalysisJobStatus;
  queueName: string;
  attemptCount: number;
  maxAttempts: number;
  progressPercent: number | null;
  failureCode: string | null;
  failureMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  lastRetriedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type AnalysisJobEventRecord = {
  id: string;
  analysisJobId: string | null;
  traceId: string;
  stage: string;
  level: string;
  message: string;
  payload: Record<string, unknown> | null;
  createdAt: Date;
};

type GameAnalysisRecord = {
  id: string;
  coachAccountId: string;
  studentId: string;
  gameId: string;
  analysisJobId: string;
  resultVersion: number;
  confidenceLevel: ConfidenceLevel;
  overallDiagnosis: string;
  openingName: string | null;
  result: GameResult;
  mainWeaknessTag: WeaknessTag | null;
  secondaryWeaknessTags: WeaknessTag[];
  recommendedLessonTitle: string | null;
  recommendedLessonWhy: string | null;
  recommendedFocusPoints: string[];
  rawExtractedContext: Record<string, unknown>;
  rawAnalysisJson: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

type CriticalMomentRecord = {
  id: string;
  analysisId: string;
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
  bestVariation: string[];
  nags: string[];
  comments: string[];
  evaluationBefore: Record<string, unknown> | null;
  evaluationAfter: Record<string, unknown> | null;
  severity: MomentSeverity;
  sourceEvidence: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

type MistakeRecord = {
  id: string;
  analysisId: string;
  criticalMomentId: string | null;
  severity: MomentSeverity;
  reviewStatus: MistakeReviewStatus;
  coachNote: string | null;
  category: string;
  mainTag: WeaknessTag | null;
  secondaryTags: WeaknessTag[];
  explanation: string;
  suggestedFix: string | null;
  sourceEvidence: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

type GenerationTraceRecord = {
  id: string;
  coachAccountId: string;
  analysisJobId: string | null;
  analysisId: string | null;
  reportId: string | null;
  homeworkId: string | null;
  progressSnapshotId: string | null;
  promptVersion: string;
  model: string;
  inputPayload: Record<string, unknown>;
  outputPayload: Record<string, unknown>;
  failureCode: string | null;
  failureMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ReportRecord = {
  id: string;
  coachAccountId: string;
  studentId: string;
  gameId: string;
  analysisId: string | null;
  title: string;
  audience: ReportAudience;
  content: Record<string, unknown>;
  source: ReportSource;
  currentRevisionId: string | null;
  promptVersion: string | null;
  model: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ReportRevisionRecord = {
  id: string;
  reportId: string;
  analysisId: string | null;
  title: string;
  content: Record<string, unknown>;
  source: ReportSource;
  promptVersion: string | null;
  model: string | null;
  version: number;
  createdAt: Date;
};

type HomeworkRecord = {
  id: string;
  coachAccountId: string;
  studentId: string;
  analysisId: string;
  title: string;
  content: Record<string, unknown>;
  promptVersion: string;
  model: string;
  createdAt: Date;
  updatedAt: Date;
};

type ProgressSnapshotRecord = {
  id: string;
  coachAccountId: string;
  studentId: string;
  analysisCount: number;
  summary: Record<string, unknown>;
  promptVersion: string;
  model: string;
  createdAt: Date;
  updatedAt: Date;
};

type SelectMap = Record<string, boolean> | undefined;

function applySelect<TRecord extends Record<string, unknown>>(
  record: TRecord | null,
  select?: SelectMap,
) {
  if (!record) {
    return null;
  }

  if (!select) {
    return structuredClone(record);
  }

  const result: Record<string, unknown> = {};

  for (const [key, enabled] of Object.entries(select)) {
    if (enabled) {
      result[key] = record[key];
    }
  }

  return result;
}

function assignDefined<TRecord extends Record<string, unknown>>(
  target: TRecord,
  data: Partial<TRecord>,
): TRecord {
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      target[key as keyof TRecord] = value as TRecord[keyof TRecord];
    }
  }

  return target;
}

function sortByCreatedAtDesc<TRecord extends { createdAt: Date }>(
  items: TRecord[],
) {
  return [...items].sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
  );
}

function compareByCreatedAtAndIdDesc<
  TRecord extends { id: string; createdAt: Date },
>(left: TRecord, right: TRecord) {
  const createdAtDiff = right.createdAt.getTime() - left.createdAt.getTime();

  if (createdAtDiff !== 0) {
    return createdAtDiff;
  }

  return right.id.localeCompare(left.id);
}

function sortByCreatedAtAndIdDesc<
  TRecord extends { id: string; createdAt: Date },
>(items: TRecord[]) {
  return [...items].sort(compareByCreatedAtAndIdDesc);
}

function sortGamesByImportedCreatedAndIdDesc<TRecord extends GameRecord[]>(
  items: TRecord,
) {
  return [...items].sort((left, right) => {
    const importedAtDiff =
      right.importedAt.getTime() - left.importedAt.getTime();

    if (importedAtDiff !== 0) {
      return importedAtDiff;
    }

    return compareByCreatedAtAndIdDesc(left, right);
  });
}

function createMonotonicDate(previous?: { createdAt: Date }): Date {
  const now = Date.now();

  if (!previous) {
    return new Date(now);
  }

  return previous.createdAt.getTime() >= now
    ? new Date(previous.createdAt.getTime() + 1)
    : new Date(now);
}

function applyCursorAndTake<TRecord extends { id: string }>(
  items: TRecord[],
  args?: {
    cursor?: { id: string };
    skip?: number;
    take?: number;
  },
) {
  let result = [...items];

  if (args?.cursor) {
    const index = result.findIndex((item) => item.id === args.cursor?.id);

    if (index >= 0) {
      result = result.slice(index + (args.skip ?? 0));
    }
  }

  if (args?.take !== undefined) {
    result = result.slice(0, args.take);
  }

  return result;
}

function createUniqueConstraintError() {
  const error = new Error('Unique constraint failed');

  Object.assign(error, { code: 'P2002' });

  return error;
}

export class InMemoryPrismaService {
  private readonly coachAccounts: CoachAccountRecord[] = [];
  private readonly refreshTokens: RefreshTokenRecord[] = [];
  private readonly students: StudentRecord[] = [];
  private readonly externalAccounts: ExternalAccountRecord[] = [];
  private readonly games: GameRecord[] = [];
  private readonly analysisJobs: AnalysisJobRecord[] = [];
  private readonly analysisJobEvents: AnalysisJobEventRecord[] = [];
  private readonly analyses: GameAnalysisRecord[] = [];
  private readonly criticalMoments: CriticalMomentRecord[] = [];
  private readonly mistakes: MistakeRecord[] = [];
  private readonly generationTraces: GenerationTraceRecord[] = [];
  private readonly reports: ReportRecord[] = [];
  private readonly reportRevisions: ReportRevisionRecord[] = [];
  private readonly homeworks: HomeworkRecord[] = [];
  private readonly progressSnapshots: ProgressSnapshotRecord[] = [];

  async $transaction<T>(callback: (tx: this) => Promise<T>): Promise<T> {
    return callback(this);
  }

  coachAccount = {
    findUnique: async (args: {
      where: { id?: string; email?: string };
      select?: SelectMap;
    }) => {
      const record =
        this.coachAccounts.find((item) => item.id === args.where.id) ??
        this.coachAccounts.find((item) => item.email === args.where.email) ??
        null;

      return applySelect(record, args.select);
    },
    create: async (args: {
      data: { email: string; passwordHash: string; displayName: string };
    }) => {
      const now = new Date();
      const record: CoachAccountRecord = {
        id: randomUUID(),
        email: args.data.email,
        passwordHash: args.data.passwordHash,
        displayName: args.data.displayName,
        status: CoachAccountStatus.ACTIVE,
        createdAt: now,
        updatedAt: now,
      };

      this.coachAccounts.push(record);

      return structuredClone(record);
    },
  };

  refreshToken = {
    create: async (args: {
      data: {
        id: string;
        coachAccountId: string;
        tokenHash: string;
        userAgent?: string;
        ipAddress?: string;
        expiresAt: Date;
      };
    }) => {
      const now = new Date();
      const record: RefreshTokenRecord = {
        ...args.data,
        revokedAt: null,
        replacedByTokenId: null,
        createdAt: now,
        updatedAt: now,
      };

      this.refreshTokens.push(record);
      return structuredClone(record);
    },
    findMany: async (args?: {
      where?: { coachAccountId?: string; id?: string };
      select?: SelectMap;
    }) => {
      return this.refreshTokens
        .filter((item) => {
          if (
            args?.where?.coachAccountId &&
            item.coachAccountId !== args.where.coachAccountId
          ) {
            return false;
          }

          if (args?.where?.id && item.id !== args.where.id) {
            return false;
          }

          return true;
        })
        .map((item) => applySelect(item, args?.select));
    },
    updateMany: async (args: {
      where: {
        id?: string;
        coachAccountId?: string;
        tokenHash?: string;
        revokedAt?: null;
        expiresAt?: { gt: Date };
      };
      data: Partial<RefreshTokenRecord>;
    }) => {
      let count = 0;

      for (const token of this.refreshTokens) {
        if (args.where.id && token.id !== args.where.id) {
          continue;
        }

        if (
          args.where.coachAccountId &&
          token.coachAccountId !== args.where.coachAccountId
        ) {
          continue;
        }

        if (args.where.tokenHash && token.tokenHash !== args.where.tokenHash) {
          continue;
        }

        if (args.where.revokedAt === null && token.revokedAt !== null) {
          continue;
        }

        if (
          args.where.expiresAt?.gt &&
          token.expiresAt <= args.where.expiresAt.gt
        ) {
          continue;
        }

        assignDefined(token, args.data);
        token.updatedAt = new Date();
        count += 1;
      }

      return { count };
    },
  };

  student = {
    findMany: async (args: {
      where: {
        coachAccountId: string;
        archivedAt?: null | { not: null };
      };
      select?: {
        id?: boolean;
        displayName?: boolean;
        birthYear?: boolean;
        rating?: boolean;
        archivedAt?: boolean;
        _count?: {
          select: {
            analyses?: boolean;
          };
        };
        analyses?: {
          take?: number;
          select: {
            createdAt?: boolean;
            mainWeaknessTag?: boolean;
          };
        };
        analysisJobs?: {
          take?: number;
          select: {
            status?: boolean;
          };
        };
      };
      orderBy?: { createdAt: 'desc' };
    }) => {
      return sortByCreatedAtDesc(
        this.students.filter((item) => {
          if (item.coachAccountId !== args.where.coachAccountId) {
            return false;
          }

          if (args.where.archivedAt === null && item.archivedAt !== null) {
            return false;
          }

          if (args.where.archivedAt?.not === null && item.archivedAt === null) {
            return false;
          }

          return true;
        }),
      ).map((item) => this.selectStudent(item, args.select));
    },
    findFirst: async (args: {
      where: { id?: string; coachAccountId?: string };
      select?: {
        id?: boolean;
        coachAccountId?: boolean;
        displayName?: boolean;
        birthYear?: boolean;
        rating?: boolean;
        notes?: boolean;
        archivedAt?: boolean;
        createdAt?: boolean;
        updatedAt?: boolean;
        _count?: {
          select: {
            games?: boolean;
            analyses?: boolean;
            reports?: boolean;
            homeworks?: boolean;
          };
        };
      };
    }) => {
      const record =
        this.students.find((item) => {
          if (args.where.id && item.id !== args.where.id) {
            return false;
          }

          if (
            args.where.coachAccountId &&
            item.coachAccountId !== args.where.coachAccountId
          ) {
            return false;
          }

          return true;
        }) ?? null;

      return this.selectStudent(record, args.select);
    },
    create: async (args: {
      data: {
        coachAccountId: string;
        displayName: string;
        birthYear?: number;
        rating?: number;
        notes?: string;
      };
    }) => {
      const now = new Date();
      const record: StudentRecord = {
        id: randomUUID(),
        coachAccountId: args.data.coachAccountId,
        displayName: args.data.displayName,
        birthYear: args.data.birthYear ?? null,
        rating: args.data.rating ?? null,
        notes: args.data.notes ?? null,
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      this.students.push(record);
      return structuredClone(record);
    },
    update: async (args: {
      where: { id: string };
      data: Partial<StudentRecord>;
    }) => {
      const record = this.students.find((item) => item.id === args.where.id);

      if (!record) {
        throw new Error('Student not found');
      }

      assignDefined(record, args.data);
      record.updatedAt = new Date();

      return structuredClone(record);
    },
  };

  externalAccount = {
    findMany: async (args: {
      where: { studentId: string };
      orderBy?: { createdAt: 'desc' };
      take?: number;
    }) => {
      return sortByCreatedAtAndIdDesc(
        this.externalAccounts.filter(
          (item) => item.studentId === args.where.studentId,
        ),
      )
        .slice(0, args.take)
        .map((item) => structuredClone(item));
    },
    findFirst: async (args: {
      where: {
        id?: string;
        studentId?: string;
        platform?: ExternalPlatform;
        username?: string;
      };
    }) => {
      const record =
        this.externalAccounts.find((item) => {
          if (args.where.id && item.id !== args.where.id) {
            return false;
          }

          if (args.where.studentId && item.studentId !== args.where.studentId) {
            return false;
          }

          if (args.where.platform && item.platform !== args.where.platform) {
            return false;
          }

          if (args.where.username && item.username !== args.where.username) {
            return false;
          }

          return true;
        }) ?? null;

      return record ? structuredClone(record) : null;
    },
    create: async (args: {
      data: {
        studentId: string;
        platform: ExternalPlatform;
        username: string;
      };
    }) => {
      if (
        this.externalAccounts.some(
          (item) =>
            item.studentId === args.data.studentId &&
            item.platform === args.data.platform &&
            item.username === args.data.username,
        )
      ) {
        throw createUniqueConstraintError();
      }

      const now = new Date();
      const record: ExternalAccountRecord = {
        id: randomUUID(),
        studentId: args.data.studentId,
        platform: args.data.platform,
        username: args.data.username,
        createdAt: now,
        updatedAt: now,
      };

      this.externalAccounts.push(record);
      return structuredClone(record);
    },
    update: async (args: {
      where: { id: string };
      data: Partial<ExternalAccountRecord>;
    }) => {
      const record = this.externalAccounts.find(
        (item) => item.id === args.where.id,
      );

      if (!record) {
        throw new Error('External account not found');
      }

      if (
        this.externalAccounts.some(
          (item) =>
            item.id !== record.id &&
            item.studentId === (args.data.studentId ?? record.studentId) &&
            item.platform === (args.data.platform ?? record.platform) &&
            item.username === (args.data.username ?? record.username),
        )
      ) {
        throw createUniqueConstraintError();
      }

      assignDefined(record, args.data);
      record.updatedAt = new Date();

      return structuredClone(record);
    },
    delete: async (args: { where: { id: string } }) => {
      const index = this.externalAccounts.findIndex(
        (item) => item.id === args.where.id,
      );

      if (index === -1) {
        throw new Error('External account not found');
      }

      const [record] = this.externalAccounts.splice(index, 1);
      return structuredClone(record);
    },
  };

  game = {
    findMany: async (args: {
      where: {
        coachAccountId?: string;
        studentId?: string;
      };
      orderBy?:
        | { importedAt: 'desc' }
        | Array<{ importedAt?: 'desc'; createdAt?: 'desc' }>;
      cursor?: { id: string };
      skip?: number;
      take?: number;
      select?: Record<string, unknown>;
    }) => {
      const items = sortGamesByImportedCreatedAndIdDesc(
        this.games.filter((item) => {
          if (
            args.where.coachAccountId &&
            item.coachAccountId !== args.where.coachAccountId
          ) {
            return false;
          }

          if (args.where.studentId && item.studentId !== args.where.studentId) {
            return false;
          }

          return true;
        }),
      );

      return applyCursorAndTake(items, args).map((item) =>
        this.selectGame(item, args.select),
      );
    },
    findFirst: async (args: {
      where: {
        id?: string;
        coachAccountId?: string;
        studentId?: string;
        normalizedPgnHash?: string;
      };
      select?: Record<string, unknown>;
    }) => {
      const record =
        this.games.find((item) => {
          if (args.where.id && item.id !== args.where.id) {
            return false;
          }

          if (
            args.where.coachAccountId &&
            item.coachAccountId !== args.where.coachAccountId
          ) {
            return false;
          }

          if (args.where.studentId && item.studentId !== args.where.studentId) {
            return false;
          }

          if (
            args.where.normalizedPgnHash &&
            item.normalizedPgnHash !== args.where.normalizedPgnHash
          ) {
            return false;
          }

          return true;
        }) ?? null;

      return this.selectGame(record, args.select);
    },
    create: async (args: {
      data: Omit<
        GameRecord,
        | 'id'
        | 'importedAt'
        | 'createdAt'
        | 'updatedAt'
        | 'sourceLabel'
        | 'event'
        | 'site'
        | 'whitePlayerName'
        | 'blackPlayerName'
        | 'openingHeader'
        | 'ecoCode'
        | 'rawResult'
        | 'derivedResult'
        | 'plyCount'
        | 'reducedConfidenceWarning'
      > & {
        sourceLabel?: string | null;
        event?: string | null;
        site?: string | null;
        whitePlayerName?: string | null;
        blackPlayerName?: string | null;
        openingHeader?: string | null;
        ecoCode?: string | null;
        rawResult?: string | null;
        derivedResult?: GameResult;
        plyCount?: number | null;
        reducedConfidenceWarning?: string | null;
      };
    }) => {
      const now = new Date();
      const record: GameRecord = {
        ...args.data,
        id: randomUUID(),
        importedAt: now,
        createdAt: now,
        updatedAt: now,
        sourceLabel: args.data.sourceLabel ?? null,
        event: args.data.event ?? null,
        site: args.data.site ?? null,
        whitePlayerName: args.data.whitePlayerName ?? null,
        blackPlayerName: args.data.blackPlayerName ?? null,
        openingHeader: args.data.openingHeader ?? null,
        ecoCode: args.data.ecoCode ?? null,
        rawResult: args.data.rawResult ?? null,
        derivedResult: args.data.derivedResult ?? GameResult.UNKNOWN,
        plyCount: args.data.plyCount ?? null,
        reducedConfidenceWarning: args.data.reducedConfidenceWarning ?? null,
      };

      this.games.push(record);
      return structuredClone(record);
    },
    update: async (args: {
      where: { id: string };
      data: Partial<GameRecord>;
    }) => {
      const record = this.games.find((item) => item.id === args.where.id);

      if (!record) {
        throw new Error('Game not found');
      }

      assignDefined(record, args.data);
      record.updatedAt = new Date();
      return structuredClone(record);
    },
  };

  analysisJob = {
    create: async (args: {
      data: {
        traceId?: string;
        coachAccountId: string;
        studentId: string;
        gameId: string;
        jobType: AnalysisJobType;
        queueName: string;
        sourceAnalysisId?: string | null;
        reportAudience?: ReportAudience | null;
      };
    }) => {
      const now = new Date();
      const record: AnalysisJobRecord = {
        id: randomUUID(),
        traceId: args.data.traceId ?? randomUUID(),
        coachAccountId: args.data.coachAccountId,
        studentId: args.data.studentId,
        gameId: args.data.gameId,
        jobType: args.data.jobType,
        sourceAnalysisId: args.data.sourceAnalysisId ?? null,
        reportAudience: args.data.reportAudience ?? null,
        queueName: args.data.queueName,
        status: AnalysisJobStatus.PENDING,
        attemptCount: 0,
        maxAttempts: 3,
        progressPercent: null,
        failureCode: null,
        failureMessage: null,
        startedAt: null,
        completedAt: null,
        lastRetriedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      this.analysisJobs.push(record);
      return structuredClone(record);
    },
    findFirst: async (args: {
      where: {
        id?: string;
        coachAccountId?: string;
        studentId?: string;
        gameId?: string;
        jobType?: AnalysisJobType;
        reportAudience?: ReportAudience | null;
        status?:
          | AnalysisJobStatus
          | {
              in: AnalysisJobStatus[];
            };
      };
      select?: Record<string, unknown>;
      include?: { game?: boolean; analysis?: boolean; student?: boolean };
      orderBy?:
        { createdAt: 'desc' } | Array<{ createdAt?: 'desc'; id?: 'desc' }>;
    }) => {
      const record =
        sortByCreatedAtAndIdDesc(this.analysisJobs).find((item) => {
          if (args.where.id && item.id !== args.where.id) {
            return false;
          }

          if (
            args.where.coachAccountId &&
            item.coachAccountId !== args.where.coachAccountId
          ) {
            return false;
          }

          if (args.where.studentId && item.studentId !== args.where.studentId) {
            return false;
          }

          if (args.where.gameId && item.gameId !== args.where.gameId) {
            return false;
          }

          if (args.where.jobType && item.jobType !== args.where.jobType) {
            return false;
          }

          if (
            args.where.reportAudience !== undefined &&
            item.reportAudience !== args.where.reportAudience
          ) {
            return false;
          }

          if (args.where.status) {
            if (typeof args.where.status === 'string') {
              if (item.status !== args.where.status) {
                return false;
              }
            } else if (!args.where.status.in.includes(item.status)) {
              return false;
            }
          }

          return true;
        }) ?? null;

      if (args.select) {
        return this.selectAnalysisJob(record, args.select);
      }

      return this.attachAnalysisJobRelations(record, args.include);
    },
    findMany: async (args: {
      where: {
        coachAccountId?: string;
        studentId?: string;
        gameId?: string;
        jobType?: AnalysisJobType;
        status?: AnalysisJobStatus;
      };
      select?: Record<string, unknown>;
      include?: { game?: boolean; analysis?: boolean; student?: boolean };
      orderBy?:
        { createdAt: 'desc' } | Array<{ createdAt?: 'desc'; id?: 'desc' }>;
      cursor?: { id: string };
      skip?: number;
      take?: number;
    }) => {
      const items = sortByCreatedAtAndIdDesc(this.analysisJobs).filter(
        (item) => {
          if (
            args.where.coachAccountId &&
            item.coachAccountId !== args.where.coachAccountId
          ) {
            return false;
          }

          if (args.where.studentId && item.studentId !== args.where.studentId) {
            return false;
          }

          if (args.where.gameId && item.gameId !== args.where.gameId) {
            return false;
          }

          if (args.where.jobType && item.jobType !== args.where.jobType) {
            return false;
          }

          if (args.where.status && item.status !== args.where.status) {
            return false;
          }

          return true;
        },
      );

      return applyCursorAndTake(items, args).map((item) => {
        if (args.select) {
          return this.selectAnalysisJob(item, args.select);
        }

        return this.attachAnalysisJobRelations(item, args.include);
      });
    },
    findUnique: async (args: {
      where: { id: string };
      select?: Record<string, unknown>;
      include?: { game?: boolean; analysis?: boolean; student?: boolean };
    }) => {
      const record =
        this.analysisJobs.find((item) => item.id === args.where.id) ?? null;

      if (args.select) {
        return this.selectAnalysisJob(record, args.select);
      }

      return this.attachAnalysisJobRelations(record, args.include);
    },
    update: async (args: {
      where: { id: string };
      data: Partial<AnalysisJobRecord>;
    }) => {
      const record = this.analysisJobs.find(
        (item) => item.id === args.where.id,
      );

      if (!record) {
        throw new Error('Analysis job not found');
      }

      assignDefined(record, args.data);
      record.updatedAt = new Date();
      return structuredClone(record);
    },
    updateMany: async (args: {
      where: {
        id?: string;
        status?: AnalysisJobStatus | { in: AnalysisJobStatus[] };
      };
      data: Partial<AnalysisJobRecord>;
    }) => {
      let count = 0;

      for (const record of this.analysisJobs) {
        if (args.where.id && record.id !== args.where.id) {
          continue;
        }

        if (args.where.status) {
          if (typeof args.where.status === 'string') {
            if (record.status !== args.where.status) {
              continue;
            }
          } else if (!args.where.status.in.includes(record.status)) {
            continue;
          }
        }

        assignDefined(record, args.data);
        record.updatedAt = new Date();
        count += 1;
      }

      return { count };
    },
  };

  analysisJobEvent = {
    create: async (args: {
      data: Omit<AnalysisJobEventRecord, 'id' | 'createdAt'>;
    }) => {
      const previousEvent =
        this.analysisJobEvents[this.analysisJobEvents.length - 1];
      const record: AnalysisJobEventRecord = {
        id: randomUUID(),
        createdAt: createMonotonicDate(previousEvent),
        ...args.data,
      };

      this.analysisJobEvents.push(record);

      return structuredClone(record);
    },
    findMany: async (args?: {
      where?: {
        analysisJobId?: string | null;
        traceId?: string;
        stage?: string;
      };
      orderBy?:
        | { createdAt: 'asc' | 'desc' }
        | Array<{ createdAt?: 'asc' | 'desc'; id?: 'asc' | 'desc' }>;
      select?: SelectMap;
    }) => {
      const ordered =
        args?.orderBy &&
        !Array.isArray(args.orderBy) &&
        args.orderBy.createdAt === 'asc'
          ? [...this.analysisJobEvents].sort(
              (left, right) =>
                left.createdAt.getTime() - right.createdAt.getTime(),
            )
          : sortByCreatedAtAndIdDesc(this.analysisJobEvents);

      return ordered
        .filter((item) => {
          if (
            args?.where?.analysisJobId !== undefined &&
            item.analysisJobId !== args.where.analysisJobId
          ) {
            return false;
          }

          if (args?.where?.traceId && item.traceId !== args.where.traceId) {
            return false;
          }

          if (args?.where?.stage && item.stage !== args.where.stage) {
            return false;
          }

          return true;
        })
        .map((item) => applySelect(item, args?.select));
    },
    updateMany: async (args: {
      where: {
        analysisJobId?: string | null;
        traceId?: string;
      };
      data: Partial<AnalysisJobEventRecord>;
    }) => {
      let count = 0;

      for (const event of this.analysisJobEvents) {
        if (
          args.where.analysisJobId !== undefined &&
          event.analysisJobId !== args.where.analysisJobId
        ) {
          continue;
        }

        if (args.where.traceId && event.traceId !== args.where.traceId) {
          continue;
        }

        assignDefined(event, args.data);
        count += 1;
      }

      return { count };
    },
  };

  gameAnalysis = {
    create: async (args: {
      data: Omit<
        GameAnalysisRecord,
        'id' | 'resultVersion' | 'createdAt' | 'updatedAt'
      >;
    }) => {
      const now = new Date();
      const record: GameAnalysisRecord = {
        id: randomUUID(),
        resultVersion: 1,
        createdAt: now,
        updatedAt: now,
        ...args.data,
      };

      this.analyses.push(record);
      return structuredClone(record);
    },
    findFirst: async (args: {
      where: {
        analysisJobId?: string;
        id?: string;
        coachAccountId?: string;
      };
      include?: {
        game?: boolean;
        criticalMoments?: boolean;
        mistakes?: boolean;
      };
    }) => {
      const record =
        this.analyses.find((item) => {
          if (
            args.where.analysisJobId &&
            item.analysisJobId !== args.where.analysisJobId
          ) {
            return false;
          }

          if (args.where.id && item.id !== args.where.id) {
            return false;
          }

          if (
            args.where.coachAccountId &&
            item.coachAccountId !== args.where.coachAccountId
          ) {
            return false;
          }

          return true;
        }) ?? null;

      return this.attachGameAnalysisRelations(record, args.include);
    },
    findUnique: async (args: {
      where: { id: string };
      select?: {
        id?: boolean;
        coachAccountId?: boolean;
        studentId?: boolean;
        gameId?: boolean;
      };
      include?: {
        game?: boolean;
        criticalMoments?: boolean;
        mistakes?: boolean;
      };
    }) => {
      const record =
        this.analyses.find((item) => item.id === args.where.id) ?? null;

      if (args.select) {
        return applySelect(record, args.select);
      }

      return this.attachGameAnalysisRelations(record, args.include);
    },
    findMany: async (args: {
      where: { coachAccountId?: string; studentId?: string };
      orderBy?:
        { createdAt: 'desc' } | Array<{ createdAt?: 'desc'; id?: 'desc' }>;
      take?: number;
      select?: Record<string, unknown>;
      include?: {
        game?: boolean;
        criticalMoments?: boolean;
        mistakes?: boolean;
      };
    }) => {
      return sortByCreatedAtAndIdDesc(this.analyses)
        .filter((item) => {
          if (
            args.where.coachAccountId &&
            item.coachAccountId !== args.where.coachAccountId
          ) {
            return false;
          }

          if (args.where.studentId && item.studentId !== args.where.studentId) {
            return false;
          }

          return true;
        })
        .slice(0, args.take)
        .map((item) => {
          if (args.select) {
            return this.selectGameAnalysis(item, args.select);
          }

          return this.attachGameAnalysisRelations(item, args.include);
        });
    },
    update: async (args: {
      where: { id: string };
      data: Partial<GameAnalysisRecord>;
    }) => {
      const record = this.analyses.find((item) => item.id === args.where.id);

      if (!record) {
        throw new Error('Analysis not found');
      }

      assignDefined(record, args.data);
      record.updatedAt = new Date();
      return structuredClone(record);
    },
  };

  criticalMoment = {
    findMany: async (args: { where: { analysisId: string } }) => {
      return this.criticalMoments
        .filter((item) => item.analysisId === args.where.analysisId)
        .map((item) => structuredClone(item));
    },
    deleteMany: async (args: { where: { analysisId: string } }) => {
      const before = this.criticalMoments.length;
      for (
        let index = this.criticalMoments.length - 1;
        index >= 0;
        index -= 1
      ) {
        if (this.criticalMoments[index].analysisId === args.where.analysisId) {
          this.criticalMoments.splice(index, 1);
        }
      }

      return { count: before - this.criticalMoments.length };
    },
    createMany: async (args: {
      data: Array<Omit<CriticalMomentRecord, 'id' | 'createdAt' | 'updatedAt'>>;
    }) => {
      const now = new Date();
      for (const item of args.data) {
        this.criticalMoments.push({
          id: randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...item,
        });
      }

      return { count: args.data.length };
    },
  };

  mistake = {
    findFirst: async (args: {
      where: { id?: string };
      include?: {
        analysis?: {
          select: {
            coachAccountId?: boolean;
          };
        };
      };
    }) => {
      const record =
        this.mistakes.find((item) => {
          if (args.where.id && item.id !== args.where.id) {
            return false;
          }

          return true;
        }) ?? null;

      if (!record) {
        return null;
      }

      if (!args.include?.analysis) {
        return structuredClone(record);
      }

      const analysis =
        this.analyses.find((item) => item.id === record.analysisId) ?? null;

      return {
        ...structuredClone(record),
        analysis: applySelect(analysis, args.include.analysis.select),
      };
    },
    deleteMany: async (args: { where: { analysisId: string } }) => {
      const before = this.mistakes.length;
      for (let index = this.mistakes.length - 1; index >= 0; index -= 1) {
        if (this.mistakes[index].analysisId === args.where.analysisId) {
          this.mistakes.splice(index, 1);
        }
      }

      return { count: before - this.mistakes.length };
    },
    createMany: async (args: {
      data: Array<
        Omit<
          MistakeRecord,
          | 'id'
          | 'createdAt'
          | 'updatedAt'
          | 'reviewStatus'
          | 'coachNote'
          | 'mainTag'
          | 'secondaryTags'
        > &
          Partial<
            Pick<
              MistakeRecord,
              'reviewStatus' | 'coachNote' | 'mainTag' | 'secondaryTags'
            >
          >
      >;
    }) => {
      const now = new Date();
      for (const item of args.data) {
        this.mistakes.push({
          id: randomUUID(),
          createdAt: now,
          updatedAt: now,
          reviewStatus: item.reviewStatus ?? MistakeReviewStatus.UNREVIEWED,
          coachNote: item.coachNote ?? null,
          mainTag: item.mainTag ?? null,
          secondaryTags: item.secondaryTags ?? [],
          ...item,
        });
      }

      return { count: args.data.length };
    },
    update: async (args: {
      where: { id: string };
      data: Partial<MistakeRecord>;
    }) => {
      const record = this.mistakes.find((item) => item.id === args.where.id);

      if (!record) {
        throw new Error('Mistake not found');
      }

      assignDefined(record, args.data);
      record.updatedAt = new Date();
      return structuredClone(record);
    },
  };

  report = {
    create: async (args: {
      data: {
        coachAccountId: string;
        studentId: string;
        gameId?: string;
        analysisId?: string | null;
        title: string;
        audience: ReportAudience;
        content: Record<string, unknown>;
        source?: ReportSource;
        currentRevisionId?: string | null;
        promptVersion?: string | null;
        model?: string | null;
      };
    }) => {
      const analysis =
        args.data.analysisId === undefined || args.data.analysisId === null
          ? null
          : (this.analyses.find((item) => item.id === args.data.analysisId) ??
            null);
      const gameId = args.data.gameId ?? analysis?.gameId;

      if (!gameId) {
        throw new Error('Report gameId is required');
      }

      const duplicate = this.reports.find(
        (item) =>
          item.gameId === gameId && item.audience === args.data.audience,
      );

      if (duplicate) {
        throw createUniqueConstraintError();
      }

      const now = new Date();
      const record: ReportRecord = {
        id: randomUUID(),
        createdAt: now,
        updatedAt: now,
        coachAccountId: args.data.coachAccountId,
        studentId: args.data.studentId,
        gameId,
        analysisId: args.data.analysisId ?? null,
        title: args.data.title,
        audience: args.data.audience,
        content: args.data.content,
        source: args.data.source ?? ReportSource.AI,
        currentRevisionId: args.data.currentRevisionId ?? null,
        promptVersion: args.data.promptVersion ?? null,
        model: args.data.model ?? null,
      };

      this.reports.push(record);
      return structuredClone(record);
    },
    findMany: async (args: {
      where: {
        coachAccountId: string;
        studentId?: string;
        analysisId?: string;
        gameId?: string;
        audience?: ReportAudience;
      };
      orderBy?:
        | { createdAt?: 'desc'; updatedAt?: 'desc' }
        | Array<{ createdAt?: 'desc'; updatedAt?: 'desc'; id?: 'desc' }>;
      take?: number;
      select?: SelectMap;
    }) => {
      const filteredReports = this.reports.filter((item) => {
        if (item.coachAccountId !== args.where.coachAccountId) {
          return false;
        }

        if (args.where.studentId && item.studentId !== args.where.studentId) {
          return false;
        }

        if (
          args.where.analysisId &&
          item.analysisId !== args.where.analysisId
        ) {
          return false;
        }

        if (args.where.gameId && item.gameId !== args.where.gameId) {
          return false;
        }

        if (args.where.audience && item.audience !== args.where.audience) {
          return false;
        }

        return true;
      });

      const orderedReports = [...filteredReports].sort(
        (leftItem, rightItem) => {
          const updatedAtDelta =
            rightItem.updatedAt.getTime() - leftItem.updatedAt.getTime();

          if (updatedAtDelta !== 0) {
            return updatedAtDelta;
          }

          return rightItem.id.localeCompare(leftItem.id);
        },
      );

      return orderedReports
        .slice(0, args.take)
        .map((item) => applySelect(item, args.select));
    },
    findUnique: async (args: {
      where: {
        id?: string;
        gameId_audience?: {
          gameId: string;
          audience: ReportAudience;
        };
      };
    }) => {
      const record =
        this.reports.find((item) => {
          if (args.where.id && item.id === args.where.id) {
            return true;
          }

          if (
            args.where.gameId_audience &&
            item.gameId === args.where.gameId_audience.gameId &&
            item.audience === args.where.gameId_audience.audience
          ) {
            return true;
          }

          return false;
        }) ?? null;

      return record ? structuredClone(record) : null;
    },
    findFirst: async (args: {
      where: { id?: string; coachAccountId?: string };
    }) => {
      const record =
        this.reports.find((item) => {
          if (args.where.id && item.id !== args.where.id) {
            return false;
          }

          if (
            args.where.coachAccountId &&
            item.coachAccountId !== args.where.coachAccountId
          ) {
            return false;
          }

          return true;
        }) ?? null;

      return record ? structuredClone(record) : null;
    },
    update: async (args: {
      where: { id: string };
      data: Partial<ReportRecord>;
    }) => {
      const record = this.reports.find((item) => item.id === args.where.id);

      if (!record) {
        throw new Error('Report not found');
      }

      const nextGameId = args.data.gameId ?? record.gameId;
      const nextAudience = args.data.audience ?? record.audience;
      const duplicate = this.reports.find(
        (item) =>
          item.id !== record.id &&
          item.gameId === nextGameId &&
          item.audience === nextAudience,
      );

      if (duplicate) {
        throw createUniqueConstraintError();
      }

      assignDefined(record, args.data);
      record.updatedAt = new Date();
      return structuredClone(record);
    },
    delete: async (args: { where: { id: string } }) => {
      const index = this.reports.findIndex((item) => item.id === args.where.id);

      if (index === -1) {
        throw new Error('Report not found');
      }

      const [record] = this.reports.splice(index, 1);
      for (
        let revisionIndex = this.reportRevisions.length - 1;
        revisionIndex >= 0;
        revisionIndex -= 1
      ) {
        if (this.reportRevisions[revisionIndex]?.reportId === record.id) {
          this.reportRevisions.splice(revisionIndex, 1);
        }
      }

      for (const trace of this.generationTraces) {
        if (trace.reportId === record.id) {
          trace.reportId = null;
          trace.updatedAt = new Date();
        }
      }

      return structuredClone(record);
    },
  };

  reportRevision = {
    create: async (args: {
      data: Omit<ReportRevisionRecord, 'id' | 'createdAt'>;
    }) => {
      const duplicate = this.reportRevisions.find(
        (item) =>
          item.reportId === args.data.reportId &&
          item.version === args.data.version,
      );

      if (duplicate) {
        throw createUniqueConstraintError();
      }

      const previousRevision =
        this.reportRevisions[this.reportRevisions.length - 1];
      const now = createMonotonicDate(previousRevision);
      const record: ReportRevisionRecord = {
        id: randomUUID(),
        createdAt: now,
        ...args.data,
      };

      this.reportRevisions.push(record);
      return structuredClone(record);
    },
    findMany: async (args: {
      where: {
        reportId: string;
      };
      orderBy?: {
        version: 'desc';
      };
      take?: number;
    }) => {
      const orderedRevisions = [...this.reportRevisions]
        .filter((item) => item.reportId === args.where.reportId)
        .sort((leftItem, rightItem) => rightItem.version - leftItem.version);

      return orderedRevisions
        .slice(0, args.take)
        .map((item) => structuredClone(item));
    },
  };

  homework = {
    create: async (args: {
      data: Omit<HomeworkRecord, 'id' | 'createdAt' | 'updatedAt'>;
    }) => {
      const now = new Date();
      const record: HomeworkRecord = {
        id: randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...args.data,
      };

      this.homeworks.push(record);
      return structuredClone(record);
    },
    findMany: async (args: {
      where: {
        coachAccountId: string;
        studentId?: string;
        analysisId?: string;
      };
      orderBy?:
        { createdAt: 'desc' } | Array<{ createdAt?: 'desc'; id?: 'desc' }>;
      take?: number;
      select?: SelectMap;
    }) => {
      return sortByCreatedAtAndIdDesc(
        this.homeworks.filter((item) => {
          if (item.coachAccountId !== args.where.coachAccountId) {
            return false;
          }

          if (args.where.studentId && item.studentId !== args.where.studentId) {
            return false;
          }

          if (
            args.where.analysisId &&
            item.analysisId !== args.where.analysisId
          ) {
            return false;
          }

          return true;
        }),
      )
        .slice(0, args.take)
        .map((item) => applySelect(item, args.select));
    },
    findFirst: async (args: {
      where: { id?: string; coachAccountId?: string };
    }) => {
      const record =
        this.homeworks.find((item) => {
          if (args.where.id && item.id !== args.where.id) {
            return false;
          }

          if (
            args.where.coachAccountId &&
            item.coachAccountId !== args.where.coachAccountId
          ) {
            return false;
          }

          return true;
        }) ?? null;

      return record ? structuredClone(record) : null;
    },
    update: async (args: {
      where: { id: string };
      data: Partial<HomeworkRecord>;
    }) => {
      const record = this.homeworks.find((item) => item.id === args.where.id);

      if (!record) {
        throw new Error('Homework not found');
      }

      assignDefined(record, args.data);
      record.updatedAt = new Date();
      return structuredClone(record);
    },
    delete: async (args: { where: { id: string } }) => {
      const index = this.homeworks.findIndex(
        (item) => item.id === args.where.id,
      );

      if (index === -1) {
        throw new Error('Homework not found');
      }

      const [record] = this.homeworks.splice(index, 1);
      return structuredClone(record);
    },
  };

  progressSnapshot = {
    create: async (args: {
      data: Omit<ProgressSnapshotRecord, 'id' | 'createdAt' | 'updatedAt'>;
    }) => {
      const now = new Date();
      const record: ProgressSnapshotRecord = {
        id: randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...args.data,
      };

      this.progressSnapshots.push(record);
      return structuredClone(record);
    },
    findFirst: async (args: {
      where: { studentId?: string; coachAccountId?: string };
      orderBy?:
        { createdAt: 'desc' } | Array<{ createdAt?: 'desc'; id?: 'desc' }>;
      select?: SelectMap;
    }) => {
      const record =
        sortByCreatedAtAndIdDesc(
          this.progressSnapshots.filter((item) => {
            if (
              args.where.studentId &&
              item.studentId !== args.where.studentId
            ) {
              return false;
            }

            if (
              args.where.coachAccountId &&
              item.coachAccountId !== args.where.coachAccountId
            ) {
              return false;
            }

            return true;
          }),
        )[0] ?? null;

      return applySelect(record, args.select);
    },
  };

  generationTrace = {
    create: async (args: {
      data: Omit<GenerationTraceRecord, 'id' | 'createdAt' | 'updatedAt'>;
    }) => {
      const previousTrace =
        this.generationTraces[this.generationTraces.length - 1];
      const now = createMonotonicDate(previousTrace);
      const record: GenerationTraceRecord = {
        id: randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...args.data,
      };

      this.generationTraces.push(record);
      return structuredClone(record);
    },
    findMany: async (args?: {
      where?: {
        analysisJobId?: string;
        reportId?: string;
        homeworkId?: string;
        progressSnapshotId?: string;
      };
      orderBy?:
        { createdAt: 'desc' } | Array<{ createdAt?: 'desc'; id?: 'desc' }>;
      take?: number;
      select?: SelectMap;
    }) => {
      return sortByCreatedAtAndIdDesc(
        this.generationTraces.filter((item) => {
          if (
            args?.where?.analysisJobId &&
            item.analysisJobId !== args.where.analysisJobId
          ) {
            return false;
          }

          if (args?.where?.reportId && item.reportId !== args.where.reportId) {
            return false;
          }

          if (
            args?.where?.homeworkId &&
            item.homeworkId !== args.where.homeworkId
          ) {
            return false;
          }

          if (
            args?.where?.progressSnapshotId &&
            item.progressSnapshotId !== args.where.progressSnapshotId
          ) {
            return false;
          }

          return true;
        }),
      )
        .slice(0, args?.take)
        .map((item) => applySelect(item, args?.select));
    },
  };

  private selectStudent(
    record: StudentRecord | null,
    select?: Record<string, unknown>,
  ) {
    if (!record) {
      return null;
    }

    if (!select) {
      return structuredClone(record);
    }

    const result = applySelect(record, select as SelectMap) as Record<
      string,
      unknown
    >;

    if (select._count) {
      const countSelect = (select._count as { select: Record<string, boolean> })
        .select;

      result._count = {
        ...(countSelect.games
          ? {
              games: this.games.filter((item) => item.studentId === record.id)
                .length,
            }
          : {}),
        ...(countSelect.analyses
          ? {
              analyses: this.analyses.filter(
                (item) => item.studentId === record.id,
              ).length,
            }
          : {}),
        ...(countSelect.reports
          ? {
              reports: this.reports.filter(
                (item) => item.studentId === record.id,
              ).length,
            }
          : {}),
        ...(countSelect.homeworks
          ? {
              homeworks: this.homeworks.filter(
                (item) => item.studentId === record.id,
              ).length,
            }
          : {}),
      };
    }

    if (select.analyses) {
      const analysesSelect = select.analyses as {
        take?: number;
        select: SelectMap;
      };

      result.analyses = sortByCreatedAtAndIdDesc(
        this.analyses.filter((item) => item.studentId === record.id),
      )
        .slice(0, analysesSelect.take)
        .map((item) => applySelect(item, analysesSelect.select));
    }

    if (select.analysisJobs) {
      const jobsSelect = select.analysisJobs as {
        take?: number;
        select: SelectMap;
      };

      result.analysisJobs = sortByCreatedAtAndIdDesc(
        this.analysisJobs.filter((item) => item.studentId === record.id),
      )
        .slice(0, jobsSelect.take)
        .map((item) => applySelect(item, jobsSelect.select));
    }

    return result;
  }

  private selectGame(
    record: GameRecord | null,
    select?: Record<string, unknown>,
  ) {
    if (!record) {
      return null;
    }

    if (!select) {
      return structuredClone(record);
    }

    const result = applySelect(record, select as SelectMap) as Record<
      string,
      unknown
    >;

    if (select.analysisJobs) {
      const analysisJobsSelect = select.analysisJobs as {
        take?: number;
        where?: {
          jobType?: AnalysisJobType;
        };
        select: {
          id?: boolean;
          status?: boolean;
          analysis?: { select: { id?: boolean } };
        };
      };

      result.analysisJobs = sortByCreatedAtAndIdDesc(
        this.analysisJobs.filter((item) => {
          if (item.gameId !== record.id) {
            return false;
          }

          if (
            analysisJobsSelect.where?.jobType &&
            item.jobType !== analysisJobsSelect.where.jobType
          ) {
            return false;
          }

          return true;
        }),
      )
        .slice(0, analysisJobsSelect.take)
        .map((item) => ({
          ...(analysisJobsSelect.select.id ? { id: item.id } : {}),
          ...(analysisJobsSelect.select.status ? { status: item.status } : {}),
          ...(analysisJobsSelect.select.analysis
            ? {
                analysis:
                  this.analyses.find(
                    (analysis) => analysis.analysisJobId === item.id,
                  ) ?? null,
              }
            : {}),
        }))
        .map((item) => {
          if (!analysisJobsSelect.select.analysis) {
            return item;
          }

          const analysis = item.analysis as GameAnalysisRecord | null;

          return {
            ...item,
            analysis: analysis
              ? applySelect(
                  analysis,
                  analysisJobsSelect.select.analysis.select as SelectMap,
                )
              : null,
          };
        });
    }

    return result;
  }

  private selectAnalysisJob(
    record: AnalysisJobRecord | null,
    select?: Record<string, unknown>,
  ) {
    if (!record) {
      return null;
    }

    if (!select) {
      return structuredClone(record);
    }

    const result = applySelect(record, select as SelectMap) as Record<
      string,
      unknown
    >;

    if (select.game) {
      const gameSelect = select.game as { select: SelectMap };
      const game = this.games.find((item) => item.id === record.gameId) ?? null;

      result.game = applySelect(game, gameSelect.select);
    }

    if (select.analysis) {
      const analysisSelect = select.analysis as { select: SelectMap };
      const analysis =
        this.analyses.find((item) => item.analysisJobId === record.id) ?? null;

      result.analysis = applySelect(analysis, analysisSelect.select);
    }

    if (select.generationTraces) {
      const tracesSelect = select.generationTraces as {
        take?: number;
        select: SelectMap;
      };

      result.generationTraces = sortByCreatedAtAndIdDesc(
        this.generationTraces.filter(
          (item) => item.analysisJobId === record.id,
        ),
      )
        .slice(0, tracesSelect.take)
        .map((item) => applySelect(item, tracesSelect.select));
    }

    return result;
  }

  private selectGameAnalysis(
    record: GameAnalysisRecord | null,
    select?: Record<string, unknown>,
  ) {
    if (!record) {
      return null;
    }

    if (!select) {
      return structuredClone(record);
    }

    const result = applySelect(record, select as SelectMap) as Record<
      string,
      unknown
    >;

    if (select.mistakes) {
      const mistakesSelect = select.mistakes as { select: SelectMap };

      result.mistakes = this.mistakes
        .filter((item) => item.analysisId === record.id)
        .map((item) => applySelect(item, mistakesSelect.select));
    }

    return result;
  }

  private attachAnalysisJobRelations(
    record: AnalysisJobRecord | null,
    include?: { game?: boolean; analysis?: boolean; student?: boolean },
  ) {
    if (!record) {
      return null;
    }

    return {
      ...structuredClone(record),
      ...(include?.game
        ? {
            game: structuredClone(
              this.games.find((item) => item.id === record.gameId),
            ),
          }
        : {}),
      ...(include?.analysis
        ? {
            analysis:
              structuredClone(
                this.analyses.find((item) => item.analysisJobId === record.id),
              ) ?? null,
          }
        : {}),
      ...(include?.student
        ? {
            student:
              structuredClone(
                this.students.find((item) => item.id === record.studentId),
              ) ?? null,
          }
        : {}),
    };
  }

  private attachGameAnalysisRelations(
    record: GameAnalysisRecord | null,
    include?: {
      game?: boolean;
      criticalMoments?: boolean;
      mistakes?: boolean;
    },
  ) {
    if (!record) {
      return null;
    }

    return {
      ...structuredClone(record),
      ...(include?.game
        ? {
            game: structuredClone(
              this.games.find((item) => item.id === record.gameId),
            ),
          }
        : {}),
      ...(include?.criticalMoments
        ? {
            criticalMoments: this.criticalMoments
              .filter((item) => item.analysisId === record.id)
              .map((item) => structuredClone(item)),
          }
        : {}),
      ...(include?.mistakes
        ? {
            mistakes: this.mistakes
              .filter((item) => item.analysisId === record.id)
              .map((item) => structuredClone(item)),
          }
        : {}),
    };
  }
}
