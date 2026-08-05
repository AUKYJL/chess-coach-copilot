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
  MomentSeverity,
  StudentColor,
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
  coachAccountId: string;
  studentId: string;
  gameId: string;
  jobType: AnalysisJobType;
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
  mainWeaknessTag: string | null;
  secondaryWeaknessTags: string[];
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
  moveNumber: string;
  movePlayed: string;
  bestMove: string | null;
  fen: string | null;
  evaluationBefore: string | null;
  evaluationAfter: string | null;
  evalChange: string | null;
  severity: MomentSeverity;
  mainTag: string;
  secondaryTags: string[];
  confidence: number;
  whatHappened: string;
  studentExplanation: string;
  coachNote: string;
  trainingTheme: string | null;
  sourceEvidence: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

type MistakeRecord = {
  id: string;
  analysisId: string;
  moveNumber: string;
  movePlayed: string;
  bestMove: string | null;
  severity: MomentSeverity;
  category: string;
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

export class InMemoryPrismaService {
  private readonly coachAccounts: CoachAccountRecord[] = [];
  private readonly refreshTokens: RefreshTokenRecord[] = [];
  private readonly students: StudentRecord[] = [];
  private readonly externalAccounts: ExternalAccountRecord[] = [];
  private readonly games: GameRecord[] = [];
  private readonly analysisJobs: AnalysisJobRecord[] = [];
  private readonly analyses: GameAnalysisRecord[] = [];
  private readonly criticalMoments: CriticalMomentRecord[] = [];
  private readonly mistakes: MistakeRecord[] = [];
  private readonly generationTraces: GenerationTraceRecord[] = [];

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
    findMany: async (args: { where: { coachAccountId: string } }) => {
      return this.students
        .filter((item) => item.coachAccountId === args.where.coachAccountId)
        .sort(
          (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
        )
        .map((item) => structuredClone(item));
    },
    findFirst: async (args: {
      where: { id?: string; coachAccountId?: string };
      select?: SelectMap;
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

      return applySelect(record, args.select);
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
    findMany: async (args: { where: { studentId: string } }) => {
      return this.externalAccounts
        .filter((item) => item.studentId === args.where.studentId)
        .sort(
          (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
        )
        .map((item) => structuredClone(item));
    },
    findFirst: async (args: {
      where: {
        studentId?: string;
        platform?: ExternalPlatform;
        username?: string;
      };
    }) => {
      const record =
        this.externalAccounts.find((item) => {
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
  };

  game = {
    findFirst: async (args: {
      where: {
        id?: string;
        coachAccountId?: string;
        studentId?: string;
        normalizedPgnHash?: string;
      };
      select?: SelectMap;
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

      return applySelect(record, args.select);
    },
    create: async (args: {
      data: Omit<GameRecord, 'id' | 'importedAt' | 'createdAt' | 'updatedAt' | 'sourceLabel' | 'reducedConfidenceWarning'> & {
        sourceLabel?: string | null;
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
        reducedConfidenceWarning: args.data.reducedConfidenceWarning ?? null,
      };

      this.games.push(record);
      return structuredClone(record);
    },
    update: async (args: { where: { id: string }; data: Partial<GameRecord> }) => {
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
        coachAccountId: string;
        studentId: string;
        gameId: string;
        jobType: AnalysisJobType;
        queueName: string;
      };
    }) => {
      const now = new Date();
      const record: AnalysisJobRecord = {
        id: randomUUID(),
        coachAccountId: args.data.coachAccountId,
        studentId: args.data.studentId,
        gameId: args.data.gameId,
        jobType: args.data.jobType,
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
      where: { id?: string; coachAccountId?: string };
      include?: { game?: boolean; analysis?: boolean };
    }) => {
      const record =
        this.analysisJobs.find((item) => {
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

      return this.attachAnalysisJobRelations(record, args.include);
    },
    findUnique: async (args: {
      where: { id: string };
      include?: { game?: boolean; analysis?: boolean };
    }) => {
      const record =
        this.analysisJobs.find((item) => item.id === args.where.id) ?? null;

      return this.attachAnalysisJobRelations(record, args.include);
    },
    update: async (args: { where: { id: string }; data: Partial<AnalysisJobRecord> }) => {
      const record = this.analysisJobs.find((item) => item.id === args.where.id);

      if (!record) {
        throw new Error('Analysis job not found');
      }

      assignDefined(record, args.data);
      record.updatedAt = new Date();
      return structuredClone(record);
    },
  };

  gameAnalysis = {
    create: async (args: { data: Omit<GameAnalysisRecord, 'id' | 'resultVersion' | 'createdAt' | 'updatedAt'> }) => {
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
      where: { analysisJobId?: string; id?: string; coachAccountId?: string };
      include?: { game?: boolean; criticalMoments?: boolean; mistakes?: boolean };
    }) => {
      const record =
        this.analyses.find((item) => {
          if (args.where.analysisJobId && item.analysisJobId !== args.where.analysisJobId) {
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
    findMany: async (args: {
      where: { coachAccountId: string; studentId?: string };
      orderBy?: { createdAt: 'desc' };
      include?: { game?: boolean };
    }) => {
      return this.analyses
        .filter((item) => {
          if (item.coachAccountId !== args.where.coachAccountId) {
            return false;
          }

          if (args.where.studentId && item.studentId !== args.where.studentId) {
            return false;
          }

          return true;
        })
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
        .map((item) => this.attachGameAnalysisRelations(item, args.include));
    },
    update: async (args: { where: { id: string }; data: Partial<GameAnalysisRecord> }) => {
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
    deleteMany: async (args: { where: { analysisId: string } }) => {
      const before = this.criticalMoments.length;
      for (let index = this.criticalMoments.length - 1; index >= 0; index -= 1) {
        if (this.criticalMoments[index].analysisId === args.where.analysisId) {
          this.criticalMoments.splice(index, 1);
        }
      }

      return { count: before - this.criticalMoments.length };
    },
    createMany: async (args: { data: Array<Omit<CriticalMomentRecord, 'id' | 'createdAt' | 'updatedAt'>> }) => {
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
    deleteMany: async (args: { where: { analysisId: string } }) => {
      const before = this.mistakes.length;
      for (let index = this.mistakes.length - 1; index >= 0; index -= 1) {
        if (this.mistakes[index].analysisId === args.where.analysisId) {
          this.mistakes.splice(index, 1);
        }
      }

      return { count: before - this.mistakes.length };
    },
    createMany: async (args: { data: Array<Omit<MistakeRecord, 'id' | 'createdAt' | 'updatedAt'>> }) => {
      const now = new Date();
      for (const item of args.data) {
        this.mistakes.push({
          id: randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...item,
        });
      }

      return { count: args.data.length };
    },
  };

  generationTrace = {
    create: async (args: {
      data: Omit<GenerationTraceRecord, 'id' | 'reportId' | 'homeworkId' | 'progressSnapshotId' | 'createdAt' | 'updatedAt'>;
    }) => {
      const now = new Date();
      const record: GenerationTraceRecord = {
        id: randomUUID(),
        reportId: null,
        homeworkId: null,
        progressSnapshotId: null,
        createdAt: now,
        updatedAt: now,
        ...args.data,
      };

      this.generationTraces.push(record);
      return structuredClone(record);
    },
    findMany: async (args?: { where?: { analysisJobId?: string } }) => {
      return this.generationTraces
        .filter((item) => {
          if (
            args?.where?.analysisJobId &&
            item.analysisJobId !== args.where.analysisJobId
          ) {
            return false;
          }

          return true;
        })
        .map((item) => structuredClone(item));
    },
  };

  private attachAnalysisJobRelations(
    record: AnalysisJobRecord | null,
    include?: { game?: boolean; analysis?: boolean },
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
                this.analyses.find(
                  (item) => item.analysisJobId === record.id,
                ),
              ) ?? null,
          }
        : {}),
    };
  }

  private attachGameAnalysisRelations(
    record: GameAnalysisRecord | null,
    include?: { game?: boolean; criticalMoments?: boolean; mistakes?: boolean },
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
