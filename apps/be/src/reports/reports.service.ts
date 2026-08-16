import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { SavedAnalysisInputMapper } from '../analysis/classification/saved-analysis-input.mapper.js';
import { AnalysisJobsService } from '../analysis/jobs/analysis-jobs.service.js';
import { JobProcessingError } from '../analysis/jobs/job-processing.error.js';
import { SavedOutputGenerationService } from '../analysis/classification/saved-output-generation.service.js';
import { GenerationTraceService } from '../analysis/classification/generation-trace.service.js';
import {
  AnalysisJobType,
  Prisma,
  ReportAudience,
  ReportSource,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StudentsService } from '../students/students.service.js';
import { ReportGenerationRequestDto } from './dto/report-generation-request.dto.js';
import { ReportUpdateDto } from './dto/report-update.dto.js';
import {
  normalizeReportContent,
  toReportContentJson,
} from './report-content.js';

const ARCHIVED_OUTPUTS_ERROR =
  'Archived students cannot receive new generated outputs';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentsService: StudentsService,
    private readonly analysisJobsService: AnalysisJobsService,
    private readonly savedAnalysisInputMapper: SavedAnalysisInputMapper,
    private readonly savedOutputGenerationService: SavedOutputGenerationService,
    private readonly generationTraceService: GenerationTraceService,
  ) {}

  async requestGeneration(
    analysisId: string,
    coachAccountId: string,
    dto: ReportGenerationRequestDto,
  ) {
    const analysis = await this.getOwnedAnalysis(analysisId, coachAccountId);
    const student = await this.studentsService.getOne(
      analysis.studentId,
      coachAccountId,
    );

    if (student.archivedAt) {
      throw new UnprocessableEntityException(ARCHIVED_OUTPUTS_ERROR);
    }

    // Dedupe intentionally keys by game + audience because the domain allows
    // exactly one saved analysis per game.
    const reusableJob =
      await this.analysisJobsService.findLatestOwnedActiveGenerationJob({
        coachAccountId,
        gameId: analysis.gameId,
        reportAudience: dto.audience,
      });

    if (reusableJob) {
      return reusableJob;
    }

    const job = await this.analysisJobsService.createAndEnqueueGenerationJob({
      coachAccountId,
      studentId: analysis.studentId,
      gameId: analysis.gameId,
      jobType: AnalysisJobType.REPORT_GENERATION,
      sourceAnalysisId: analysis.id,
      reportAudience: dto.audience,
    });

    return this.analysisJobsService.getJobResponse(job.id, coachAccountId);
  }

  async list(
    coachAccountId: string,
    query: {
      studentId?: string;
      analysisId?: string;
      gameId?: string;
      audience?: ReportAudience;
    },
  ) {
    const reports = await this.prisma.report.findMany({
      where: {
        coachAccountId,
        ...(query.studentId ? { studentId: query.studentId } : {}),
        ...(query.analysisId ? { analysisId: query.analysisId } : {}),
        ...(query.gameId ? { gameId: query.gameId } : {}),
        ...(query.audience ? { audience: query.audience } : {}),
      },
      orderBy: [
        { updatedAt: Prisma.SortOrder.desc },
        { id: Prisma.SortOrder.desc },
      ],
    });

    return reports.map((report) => this.toReportResponse(report));
  }

  async getOne(reportId: string, coachAccountId: string) {
    const report = await this.getOwnedReport(reportId, coachAccountId);

    return this.toReportResponse(report);
  }

  async update(reportId: string, coachAccountId: string, dto: ReportUpdateDto) {
    const report = await this.getOwnedReport(reportId, coachAccountId);

    if (dto.title === undefined && dto.content === undefined) {
      return this.toReportResponse(report);
    }

    const nextTitle = dto.title !== undefined ? dto.title.trim() : report.title;
    const nextContent =
      dto.content !== undefined
        ? { text: dto.content.text }
        : normalizeReportContent(report.content);

    const updatedReport = await this.prisma.$transaction(async (tx) => {
      const revision = await tx.reportRevision.create({
        data: {
          reportId: report.id,
          analysisId: report.analysisId,
          title: nextTitle,
          content: toReportContentJson(nextContent),
          source: ReportSource.MANUAL,
          promptVersion: report.promptVersion,
          model: report.model,
          version: await this.getNextRevisionVersion(tx, report.id),
        },
      });

      return tx.report.update({
        where: { id: report.id },
        data: {
          title: nextTitle,
          content: toReportContentJson(nextContent),
          source: ReportSource.MANUAL,
          currentRevisionId: revision.id,
        },
      });
    });

    return this.toReportResponse(updatedReport);
  }

  async remove(reportId: string, coachAccountId: string) {
    await this.getOne(reportId, coachAccountId);
    await this.prisma.report.delete({
      where: { id: reportId },
    });
  }

  async generateAndSave(data: {
    analysisJobId: string;
    analysisId: string;
    audience: ReportAudience;
    coachAccountId: string;
    studentId: string;
  }) {
    const student = await this.studentsService.getOne(
      data.studentId,
      data.coachAccountId,
    );

    if (student.archivedAt) {
      throw new JobProcessingError('ARCHIVED_STUDENT', ARCHIVED_OUTPUTS_ERROR);
    }

    const analysis = await this.getAnalysisForGeneration(
      data.analysisId,
      data.coachAccountId,
    );

    if (!analysis) {
      throw new NotFoundException('Analysis not found');
    }

    const generated = await this.savedOutputGenerationService.generateReport({
      analysis: this.savedAnalysisInputMapper.map(analysis),
      audience: data.audience,
    });
    const normalizedContent = normalizeReportContent(generated.content);
    const report = await this.prisma.$transaction(async (tx) => {
      const existingReport = await tx.report.findUnique({
        where: {
          gameId_audience: {
            gameId: analysis.gameId,
            audience: data.audience,
          },
        },
      });

      const logicalReport =
        existingReport ??
        (await tx.report.create({
          data: {
            coachAccountId: analysis.coachAccountId,
            studentId: analysis.studentId,
            gameId: analysis.gameId,
            analysisId: analysis.id,
            title: generated.title,
            audience: data.audience,
            content: toReportContentJson(normalizedContent),
            source: ReportSource.AI,
            currentRevisionId: null,
            promptVersion: generated.promptVersion,
            model: generated.model,
          },
        }));

      const revision = await tx.reportRevision.create({
        data: {
          reportId: logicalReport.id,
          analysisId: analysis.id,
          title: generated.title,
          content: toReportContentJson(normalizedContent),
          source: ReportSource.AI,
          promptVersion: generated.promptVersion,
          model: generated.model,
          version: await this.getNextRevisionVersion(tx, logicalReport.id),
        },
      });

      return tx.report.update({
        where: { id: logicalReport.id },
        data: {
          analysisId: analysis.id,
          title: generated.title,
          content: toReportContentJson(normalizedContent),
          source: ReportSource.AI,
          currentRevisionId: revision.id,
          promptVersion: generated.promptVersion,
          model: generated.model,
        },
      });
    });

    await this.generationTraceService.persistSuccess({
      coachAccountId: analysis.coachAccountId,
      analysisJobId: data.analysisJobId,
      analysisId: analysis.id,
      reportId: report.id,
      promptVersion: generated.promptVersion,
      model: generated.model,
      inputPayload: generated.inputPayload,
      outputPayload: generated.rawOutput,
    });

    return report;
  }

  private async getNextRevisionVersion(
    tx: Prisma.TransactionClient,
    reportId: string,
  ) {
    const latestRevision = await tx.reportRevision.findMany({
      where: {
        reportId,
      },
      orderBy: {
        version: Prisma.SortOrder.desc,
      },
      take: 1,
    });

    return (latestRevision[0]?.version ?? 0) + 1;
  }

  private async getOwnedReport(reportId: string, coachAccountId: string) {
    const report = await this.prisma.report.findFirst({
      where: {
        id: reportId,
        coachAccountId,
      },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return report;
  }

  private toReportResponse<TReport extends { content: unknown }>(
    report: TReport,
  ) {
    return {
      ...report,
      content: normalizeReportContent(report.content),
    };
  }

  private async getOwnedAnalysis(analysisId: string, coachAccountId: string) {
    const analysis = await this.prisma.gameAnalysis.findFirst({
      where: {
        id: analysisId,
        coachAccountId,
      },
      include: {
        criticalMoments: true,
        mistakes: true,
      },
    });

    if (!analysis) {
      throw new NotFoundException('Analysis not found');
    }

    return analysis;
  }

  private getAnalysisForGeneration(analysisId: string, coachAccountId: string) {
    return this.prisma.gameAnalysis.findFirst({
      where: {
        id: analysisId,
        coachAccountId,
      },
      include: {
        criticalMoments: true,
        mistakes: true,
      },
    });
  }
}
