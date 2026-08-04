/* eslint-disable @typescript-eslint/require-await */

import { randomUUID } from 'crypto';
import {
  CoachAccountStatus,
  ExternalPlatform,
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
}
