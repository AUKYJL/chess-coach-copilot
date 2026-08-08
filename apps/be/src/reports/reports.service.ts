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
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StudentsService } from '../students/students.service.js';
import { ReportGenerationRequestDto } from './dto/report-generation-request.dto.js';
import { ReportUpdateDto } from './dto/report-update.dto.js';

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
    query: { studentId?: string; analysisId?: string },
  ) {
    return this.prisma.report.findMany({
      where: {
        coachAccountId,
        ...(query.studentId ? { studentId: query.studentId } : {}),
        ...(query.analysisId ? { analysisId: query.analysisId } : {}),
      },
      orderBy: {
        createdAt: Prisma.SortOrder.desc,
      },
    });
  }

  async getOne(reportId: string, coachAccountId: string) {
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

  async update(reportId: string, coachAccountId: string, dto: ReportUpdateDto) {
    await this.getOne(reportId, coachAccountId);

    return this.prisma.report.update({
      where: { id: reportId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.content !== undefined
          ? { content: dto.content as Prisma.InputJsonObject }
          : {}),
      },
    });
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
    const report = await this.prisma.report.create({
      data: {
        coachAccountId: analysis.coachAccountId,
        studentId: analysis.studentId,
        analysisId: analysis.id,
        title: generated.title,
        audience: data.audience,
        content: generated.content,
        promptVersion: generated.promptVersion,
        model: generated.model,
      },
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
