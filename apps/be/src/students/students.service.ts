import { Injectable, NotFoundException } from '@nestjs/common';
import {
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
  StudentsArchivedFilter,
} from './dto/list-students.query.js';
import { SetStudentArchiveDto } from './dto/set-student-archive.dto.js';
import { UpdateStudentDto } from './dto/update-student.dto.js';

const RECENT_ITEMS_LIMIT = 5;
const ANALYSIS_PROFILE_LIMIT = 10;

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(coachAccountId: string, query: ListStudentsQueryDto) {
    const students = await this.prisma.student.findMany({
      where: {
        coachAccountId,
        ...this.buildArchivedFilter(query.archived),
      },
      select: {
        id: true,
        displayName: true,
        birthYear: true,
        rating: true,
        archivedAt: true,
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
    });

    return students.map((student) => ({
      id: student.id,
      displayName: student.displayName,
      birthYear: student.birthYear,
      rating: student.rating,
      archivedAt: student.archivedAt,
      completedAnalysisCount: student._count.analyses,
      lastAnalysisAt: student.analyses[0]?.createdAt ?? null,
      latestAnalysisJobStatus: student.analysisJobs[0]?.status ?? null,
      mainWeaknessTag: student.analyses[0]?.mainWeaknessTag ?? null,
    }));
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
      recentGames: games.map(mapGameWithLatestJob),
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

  private buildArchivedFilter(filter?: StudentsArchivedFilter) {
    switch (filter ?? StudentsArchivedFilter.ACTIVE) {
      case StudentsArchivedFilter.ARCHIVED:
        return { archivedAt: { not: null } };
      case StudentsArchivedFilter.ALL:
        return {};
      case StudentsArchivedFilter.ACTIVE:
      default:
        return { archivedAt: null };
    }
  }
}
