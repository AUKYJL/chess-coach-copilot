import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AnalysisJobStatus,
  MomentSeverity,
  Prisma,
  WeaknessTag,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  GAME_CARD_SELECT,
  GAME_LIST_ORDER_BY,
  LATEST_ANALYSIS_JOB_ORDER_BY,
  mapGameWithLatestJob,
} from '../games/game-read-model.js';
import { CreateStudentDto } from './dto/create-student.dto.js';
import {
  ListStudentsQueryDto,
  StudentStatus,
  StudentsSortField,
  StudentsSortOrder,
} from './dto/list-students.query.js';
import { SetStudentArchiveDto } from './dto/set-student-archive.dto.js';
import { UpdateStudentDto } from './dto/update-student.dto.js';

const RECENT_ITEMS_LIMIT = 5;
const ANALYSIS_PROFILE_LIMIT = 10;
const DEFAULT_STUDENTS_PAGE = 1;
const DEFAULT_STUDENTS_LIMIT = 20;
const MAX_STUDENTS_LIMIT = 100;
const DEFAULT_STUDENT_STATUSES = [
  StudentStatus.ACTIVE,
  StudentStatus.ARCHIVED,
] as const;
const PERFORMANCE_TREND_RANGE_DAYS = 90;
const PERFORMANCE_TREND_PRIMARY_METRIC = 'Severe mistakes per game';
const PERFORMANCE_TREND_RANGE = '90D';
const severeMistakeSeverities = new Set<MomentSeverity>([
  MomentSeverity.BLUNDER,
  MomentSeverity.MATE,
]);

type StudentsListItem = {
  id: string;
  displayName: string;
  birthYear: number | null;
  rating: number | null;
  archivedAt: Date | null;
  completedAnalysisCount: number;
  lastAnalysisAt: Date | null;
  latestAnalysisJobStatus: AnalysisJobStatus | null;
  mainWeaknessTag: WeaknessTag | null;
  createdAt: Date;
};

type StudentsListResult = {
  items: StudentsListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(coachAccountId: string, query: ListStudentsQueryDto) {
    const search = query.search?.trim() || undefined;
    const statuses = this.normalizeStudentStatuses(query.statuses);
    const sort = query.sort;
    const order = query.order ?? StudentsSortOrder.DESC;
    const page = query.page ?? DEFAULT_STUDENTS_PAGE;
    const limit = Math.min(
      query.limit ?? DEFAULT_STUDENTS_LIMIT,
      MAX_STUDENTS_LIMIT,
    );
    const skip = (page - 1) * limit;

    const result =
      typeof this.prisma.$queryRaw === 'function'
        ? await this.listWithDatabaseReadModel({
            coachAccountId,
            search,
            statuses,
            sort,
            order,
            page,
            limit,
            skip,
          })
        : await this.listWithInMemoryFallback({
            coachAccountId,
            search,
            statuses,
            sort,
            order,
            page,
            limit,
            skip,
          });

    return {
      ...result,
      items: result.items.map((item) => ({
        id: item.id,
        displayName: item.displayName,
        birthYear: item.birthYear,
        rating: item.rating,
        archivedAt: item.archivedAt,
        completedAnalysisCount: item.completedAnalysisCount,
        lastAnalysisAt: item.lastAnalysisAt,
        latestAnalysisJobStatus: item.latestAnalysisJobStatus,
        mainWeaknessTag: item.mainWeaknessTag,
      })),
    };
  }

  create(coachAccountId: string, dto: CreateStudentDto) {
    return this.prisma.student.create({
      data: {
        coachAccountId,
        displayName: dto.displayName.trim(),
        birthYear: dto.birthYear,
        rating: dto.rating,
        notes: dto.notes?.trim(),
      },
    });
  }

  async getOne(studentId: string, coachAccountId: string) {
    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        coachAccountId,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  async getOverview(studentId: string, coachAccountId: string) {
    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        coachAccountId,
      },
      select: {
        id: true,
        coachAccountId: true,
        displayName: true,
        birthYear: true,
        rating: true,
        notes: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            games: true,
            analyses: true,
            reports: true,
            homeworks: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const [
      externalAccounts,
      games,
      analyses,
      reports,
      homework,
      latestProgress,
    ] = await Promise.all([
      this.prisma.externalAccount.findMany({
        where: { studentId },
        orderBy: { createdAt: Prisma.SortOrder.desc },
        take: RECENT_ITEMS_LIMIT,
      }),
      this.prisma.game.findMany({
        where: {
          studentId,
          coachAccountId,
        },
        orderBy: GAME_LIST_ORDER_BY,
        take: RECENT_ITEMS_LIMIT,
        select: GAME_CARD_SELECT,
      }),
      this.prisma.gameAnalysis.findMany({
        where: {
          studentId,
          coachAccountId,
        },
        orderBy: LATEST_ANALYSIS_JOB_ORDER_BY,
        take: RECENT_ITEMS_LIMIT,
        select: {
          id: true,
          analysisJobId: true,
          gameId: true,
          mainWeaknessTag: true,
          recommendedLessonTitle: true,
          createdAt: true,
        },
      }),
      this.prisma.report.findMany({
        where: {
          studentId,
          coachAccountId,
        },
        orderBy: LATEST_ANALYSIS_JOB_ORDER_BY,
        take: RECENT_ITEMS_LIMIT,
        select: {
          id: true,
          analysisId: true,
          title: true,
          audience: true,
          createdAt: true,
        },
      }),
      this.prisma.homework.findMany({
        where: {
          studentId,
          coachAccountId,
        },
        orderBy: LATEST_ANALYSIS_JOB_ORDER_BY,
        take: RECENT_ITEMS_LIMIT,
        select: {
          id: true,
          analysisId: true,
          title: true,
          createdAt: true,
        },
      }),
      this.prisma.progressSnapshot.findFirst({
        where: {
          studentId,
          coachAccountId,
        },
        orderBy: LATEST_ANALYSIS_JOB_ORDER_BY,
        select: {
          id: true,
          analysisCount: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      student,
      externalAccounts,
      stats: {
        gameCount: student._count.games,
        analysisCount: student._count.analyses,
        reportCount: student._count.reports,
        homeworkCount: student._count.homeworks,
      },
      latestProgress: latestProgress
        ? {
            id: latestProgress.id,
            analysisCount: latestProgress.analysisCount,
            createdAt: latestProgress.createdAt,
          }
        : null,
      recentGames: games.map((game) => mapGameWithLatestJob(game)),
      recentAnalyses: analyses.map((analysis) => ({
        id: analysis.id,
        analysisJobId: analysis.analysisJobId,
        gameId: analysis.gameId,
        mainWeaknessTag: analysis.mainWeaknessTag,
        recommendedLessonTitle: analysis.recommendedLessonTitle,
        createdAt: analysis.createdAt,
      })),
      recentReports: reports.map((report) => ({
        id: report.id,
        analysisId: report.analysisId,
        title: report.title,
        audience: report.audience,
        createdAt: report.createdAt,
      })),
      recentHomework: homework.map((item) => ({
        id: item.id,
        analysisId: item.analysisId,
        title: item.title,
        createdAt: item.createdAt,
      })),
    };
  }

  async getAnalysisProfile(studentId: string, coachAccountId: string) {
    const analyses = await this.prisma.gameAnalysis.findMany({
      where: {
        studentId,
        coachAccountId,
      },
      orderBy: LATEST_ANALYSIS_JOB_ORDER_BY,
      take: ANALYSIS_PROFILE_LIMIT,
      select: {
        id: true,
        gameId: true,
        mainWeaknessTag: true,
        secondaryWeaknessTags: true,
        recommendedLessonTitle: true,
        mistakes: {
          select: {
            id: true,
            severity: true,
            category: true,
            explanation: true,
            suggestedFix: true,
          },
        },
      },
    });
    const tagCounts = new Map<WeaknessTag, number>();
    const severityCounts = new Map<MomentSeverity, number>();

    if (analyses.length === 0) {
      const student = await this.prisma.student.findFirst({
        where: {
          id: studentId,
          coachAccountId,
        },
        select: { id: true },
      });

      if (!student) {
        throw new NotFoundException('Student not found');
      }
    }

    for (const analysis of analyses) {
      if (analysis.mainWeaknessTag) {
        tagCounts.set(
          analysis.mainWeaknessTag,
          (tagCounts.get(analysis.mainWeaknessTag) ?? 0) + 1,
        );
      }

      for (const tag of analysis.secondaryWeaknessTags) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }

      for (const mistake of analysis.mistakes) {
        severityCounts.set(
          mistake.severity,
          (severityCounts.get(mistake.severity) ?? 0) + 1,
        );
      }
    }

    const orderedTags = [...tagCounts.entries()].sort((left, right) => {
      if (right[1] === left[1]) {
        return left[0].localeCompare(right[0]);
      }

      return right[1] - left[1];
    });

    return {
      analysisCountUsed: analyses.length,
      mainWeaknessTag: orderedTags[0]?.[0] ?? null,
      secondaryWeaknessTags: orderedTags.slice(1, 4).map(([tag]) => tag),
      tagCounts: orderedTags.map(([tag, count]) => ({ tag, count })),
      severityCounts: [...severityCounts.entries()]
        .sort((left, right) => right[1] - left[1])
        .map(([severity, count]) => ({ severity, count })),
      sampleMistakes: analyses
        .flatMap((analysis) =>
          analysis.mistakes.map((mistake) => ({
            id: mistake.id,
            analysisId: analysis.id,
            gameId: analysis.gameId,
            severity: mistake.severity,
            category: mistake.category,
            explanation: mistake.explanation,
            suggestedFix: mistake.suggestedFix,
          })),
        )
        .slice(0, 5),
      recommendedLessonTitle:
        analyses.find((analysis) => analysis.recommendedLessonTitle)
          ?.recommendedLessonTitle ?? null,
    };
  }

  async getPerformanceTrend(studentId: string, coachAccountId: string) {
    await this.getOne(studentId, coachAccountId);

    const startDate = this.getPerformanceTrendStartDate();
    const [analyses, analysisJobs] = await Promise.all([
      this.prisma.gameAnalysis.findMany({
        where: {
          studentId,
          coachAccountId,
        },
        select: {
          analysisJobId: true,
          createdAt: true,
          mistakes: {
            select: {
              severity: true,
            },
          },
        },
      }),
      this.prisma.analysisJob.findMany({
        where: {
          studentId,
          coachAccountId,
        },
        select: {
          id: true,
          status: true,
        },
      }),
    ]);
    const completedAnalysisJobIds = new Set(
      analysisJobs
        .filter((job) => job.status === AnalysisJobStatus.COMPLETED)
        .map((job) => job.id),
    );
    const points = analyses
      .filter(
        (analysis) =>
          analysis.createdAt >= startDate &&
          completedAnalysisJobIds.has(analysis.analysisJobId),
      )
      .sort(
        (left, right) => left.createdAt.getTime() - right.createdAt.getTime(),
      )
      .map((analysis) => ({
        date: analysis.createdAt.toISOString().slice(0, 10),
        value: analysis.mistakes.filter((mistake) =>
          severeMistakeSeverities.has(mistake.severity),
        ).length,
      }));

    return {
      direction: this.getPerformanceTrendDirection(points),
      primaryMetric: PERFORMANCE_TREND_PRIMARY_METRIC,
      range: PERFORMANCE_TREND_RANGE,
      points,
    };
  }

  async update(
    studentId: string,
    coachAccountId: string,
    dto: UpdateStudentDto,
  ) {
    await this.getOne(studentId, coachAccountId);

    return this.prisma.student.update({
      where: { id: studentId },
      data: {
        displayName: dto.displayName?.trim(),
        birthYear: dto.birthYear,
        rating: dto.rating,
        notes: dto.notes?.trim(),
      },
    });
  }

  async setArchiveState(
    studentId: string,
    coachAccountId: string,
    dto: SetStudentArchiveDto,
  ) {
    await this.getOne(studentId, coachAccountId);

    return this.prisma.student.update({
      where: { id: studentId },
      data: {
        archivedAt: dto.archived ? new Date() : null,
      },
    });
  }

  private normalizeStudentStatuses(statuses?: StudentStatus[]) {
    if (!statuses?.length) {
      return [...DEFAULT_STUDENT_STATUSES];
    }

    return Array.from(new Set(statuses));
  }

  private buildArchivedFilter(statuses: StudentStatus[]) {
    const includesActive = statuses.includes(StudentStatus.ACTIVE);
    const includesArchived = statuses.includes(StudentStatus.ARCHIVED);

    if (includesActive && includesArchived) {
      return {};
    }

    if (includesArchived) {
      return { archivedAt: { not: null } };
    }

    return { archivedAt: null };
  }

  private async listWithDatabaseReadModel(args: {
    coachAccountId: string;
    search?: string;
    statuses: StudentStatus[];
    sort?: StudentsSortField;
    order: StudentsSortOrder;
    page: number;
    limit: number;
    skip: number;
  }): Promise<StudentsListResult> {
    const whereClause = this.buildStudentsListWhereClause({
      coachAccountId: args.coachAccountId,
      statuses: args.statuses,
      search: args.search,
    });
    const orderByClause = this.buildStudentsListOrderByClause(
      args.sort,
      args.order,
    );

    const [rows, totals] = await Promise.all([
      this.prisma.$queryRaw<StudentsListItem[]>(Prisma.sql`
        SELECT
          s.id,
          s."displayName",
          s."birthYear",
          s.rating,
          s."archivedAt",
          s."createdAt",
          COALESCE(analysis_counts."completedAnalysisCount", 0) AS "completedAnalysisCount",
          latest_analysis."lastAnalysisAt" AS "lastAnalysisAt",
          latest_analysis."mainWeaknessTag" AS "mainWeaknessTag",
          latest_job."latestAnalysisJobStatus" AS "latestAnalysisJobStatus"
        FROM "Student" s
        LEFT JOIN LATERAL (
          SELECT
            COUNT(*)::int AS "completedAnalysisCount"
          FROM "GameAnalysis" ga_count
          WHERE ga_count."studentId" = s.id
            AND ga_count."coachAccountId" = s."coachAccountId"
        ) analysis_counts ON TRUE
        LEFT JOIN LATERAL (
          SELECT
            ga."createdAt" AS "lastAnalysisAt",
            ga."mainWeaknessTag" AS "mainWeaknessTag"
          FROM "GameAnalysis" ga
          WHERE ga."studentId" = s.id
            AND ga."coachAccountId" = s."coachAccountId"
          ORDER BY ga."createdAt" DESC, ga.id DESC
          LIMIT 1
        ) latest_analysis ON TRUE
        LEFT JOIN LATERAL (
          SELECT
            aj.status AS "latestAnalysisJobStatus"
          FROM "AnalysisJob" aj
          WHERE aj."studentId" = s.id
            AND aj."coachAccountId" = s."coachAccountId"
          ORDER BY aj."createdAt" DESC, aj.id DESC
          LIMIT 1
        ) latest_job ON TRUE
        ${whereClause}
        ${orderByClause}
        OFFSET ${args.skip}
        LIMIT ${args.limit}
      `),
      this.prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
        SELECT COUNT(*)::int AS total
        FROM "Student" s
        ${whereClause}
      `),
    ]);
    const total = totals[0]?.total ?? 0;

    return {
      items: rows,
      total,
      page: args.page,
      limit: args.limit,
      totalPages: total === 0 ? 0 : Math.ceil(total / args.limit),
    };
  }

  private async listWithInMemoryFallback(args: {
    coachAccountId: string;
    search?: string;
    statuses: StudentStatus[];
    sort?: StudentsSortField;
    order: StudentsSortOrder;
    page: number;
    limit: number;
    skip: number;
  }): Promise<StudentsListResult> {
    const students = (await this.prisma.student.findMany({
      where: {
        coachAccountId: args.coachAccountId,
        ...this.buildArchivedFilter(args.statuses),
      },
      select: {
        id: true,
        displayName: true,
        birthYear: true,
        rating: true,
        archivedAt: true,
        createdAt: true,
        _count: {
          select: {
            analyses: true,
          },
        },
        analyses: {
          take: 1,
          orderBy: LATEST_ANALYSIS_JOB_ORDER_BY,
          select: {
            createdAt: true,
            mainWeaknessTag: true,
          },
        },
        analysisJobs: {
          take: 1,
          orderBy: LATEST_ANALYSIS_JOB_ORDER_BY,
          select: {
            status: true,
          },
        },
      },
      orderBy: { createdAt: Prisma.SortOrder.desc },
    })) as Array<{
      id: string;
      displayName: string;
      birthYear: number | null;
      rating: number | null;
      archivedAt: Date | null;
      createdAt: Date;
      _count: { analyses: number };
      analyses: Array<{ createdAt: Date; mainWeaknessTag: WeaknessTag | null }>;
      analysisJobs: Array<{ status: AnalysisJobStatus }>;
    }>;
    const normalizedSearch = args.search?.toLocaleLowerCase();
    const items = students
      .map<StudentsListItem>((student) => ({
        id: student.id,
        displayName: student.displayName,
        birthYear: student.birthYear,
        rating: student.rating,
        archivedAt: student.archivedAt,
        createdAt: student.createdAt,
        completedAnalysisCount: student._count.analyses,
        lastAnalysisAt: student.analyses[0]?.createdAt ?? null,
        latestAnalysisJobStatus: student.analysisJobs[0]?.status ?? null,
        mainWeaknessTag: student.analyses[0]?.mainWeaknessTag ?? null,
      }))
      .filter((student) => {
        if (!normalizedSearch) {
          return true;
        }

        return student.displayName
          .toLocaleLowerCase()
          .includes(normalizedSearch);
      });
    const orderedItems = items.sort((left, right) =>
      this.compareStudentListItems(left, right, args.sort, args.order),
    );
    const total = orderedItems.length;

    return {
      items: orderedItems.slice(args.skip, args.skip + args.limit),
      total,
      page: args.page,
      limit: args.limit,
      totalPages: total === 0 ? 0 : Math.ceil(total / args.limit),
    };
  }

  private buildStudentsListWhereClause(args: {
    coachAccountId: string;
    statuses: StudentStatus[];
    search?: string;
  }) {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`s."coachAccountId" = ${args.coachAccountId}`,
    ];

    const includesActive = args.statuses.includes(StudentStatus.ACTIVE);
    const includesArchived = args.statuses.includes(StudentStatus.ARCHIVED);

    if (includesActive && !includesArchived) {
      conditions.push(Prisma.sql`s."archivedAt" IS NULL`);
    }

    if (!includesActive && includesArchived) {
      conditions.push(Prisma.sql`s."archivedAt" IS NOT NULL`);
    }

    if (args.search) {
      conditions.push(Prisma.sql`s."displayName" ILIKE ${`%${args.search}%`}`);
    }

    return Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
  }

  private buildStudentsListOrderByClause(
    sort: StudentsSortField | undefined,
    order: StudentsSortOrder,
  ) {
    const direction =
      order === StudentsSortOrder.ASC ? Prisma.raw('ASC') : Prisma.raw('DESC');

    switch (sort) {
      case StudentsSortField.RATING:
        return Prisma.sql`
          ORDER BY s.rating ${direction} NULLS LAST, s."createdAt" DESC, s.id DESC
        `;
      case StudentsSortField.COMPLETED_ANALYSIS_COUNT:
        return Prisma.sql`
          ORDER BY "completedAnalysisCount" ${direction} NULLS LAST, s."createdAt" DESC, s.id DESC
        `;
      case StudentsSortField.LAST_ANALYSIS_AT:
        return Prisma.sql`
          ORDER BY "lastAnalysisAt" ${direction} NULLS LAST, s."createdAt" DESC, s.id DESC
        `;
      default:
        return Prisma.sql`
          ORDER BY s."createdAt" ${direction}, s.id ${direction}
        `;
    }
  }

  private compareStudentListItems(
    left: StudentsListItem,
    right: StudentsListItem,
    sort: StudentsSortField | undefined,
    order: StudentsSortOrder,
  ) {
    const direction = order === StudentsSortOrder.ASC ? 1 : -1;

    switch (sort) {
      case StudentsSortField.RATING:
        return this.compareNullableNumbers(
          left.rating,
          right.rating,
          direction,
        );
      case StudentsSortField.COMPLETED_ANALYSIS_COUNT:
        return (
          this.compareNumbers(
            left.completedAnalysisCount,
            right.completedAnalysisCount,
            direction,
          ) || this.compareDates(left.createdAt, right.createdAt, -1)
        );
      case StudentsSortField.LAST_ANALYSIS_AT:
        return (
          this.compareNullableDates(
            left.lastAnalysisAt,
            right.lastAnalysisAt,
            direction,
          ) || this.compareDates(left.createdAt, right.createdAt, -1)
        );
      default:
        return this.compareDates(left.createdAt, right.createdAt, direction);
    }
  }

  private compareNumbers(left: number, right: number, direction: 1 | -1) {
    if (left === right) {
      return 0;
    }

    return left < right ? -1 * direction : 1 * direction;
  }

  private compareDates(left: Date, right: Date, direction: 1 | -1) {
    return this.compareNumbers(left.getTime(), right.getTime(), direction);
  }

  private compareNullableNumbers(
    left: number | null,
    right: number | null,
    direction: 1 | -1,
  ) {
    if (left === null && right === null) {
      return 0;
    }

    if (left === null) {
      return 1;
    }

    if (right === null) {
      return -1;
    }

    return this.compareNumbers(left, right, direction);
  }

  private compareNullableDates(
    left: Date | null,
    right: Date | null,
    direction: 1 | -1,
  ) {
    if (left === null && right === null) {
      return 0;
    }

    if (left === null) {
      return 1;
    }

    if (right === null) {
      return -1;
    }

    return this.compareDates(left, right, direction);
  }

  private getPerformanceTrendStartDate() {
    const now = new Date();
    const startDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );

    startDate.setUTCDate(
      startDate.getUTCDate() - (PERFORMANCE_TREND_RANGE_DAYS - 1),
    );

    return startDate;
  }

  private getPerformanceTrendDirection(
    points: Array<{
      value: number;
    }>,
  ) {
    if (points.length < 2) {
      return 'UNKNOWN' as const;
    }

    const midpoint = Math.floor(points.length / 2);
    const earliestHalf = points.slice(0, midpoint);
    const latestHalf = points.slice(midpoint);

    const earliestAverage = this.getAverageValue(earliestHalf);
    const latestAverage = this.getAverageValue(latestHalf);

    if (latestAverage < earliestAverage) {
      return 'IMPROVING' as const;
    }

    if (latestAverage > earliestAverage) {
      return 'DECLINING' as const;
    }

    return 'STABLE' as const;
  }

  private getAverageValue(
    points: Array<{
      value: number;
    }>,
  ) {
    return (
      points.reduce((total, point) => total + point.value, 0) / points.length
    );
  }
}
