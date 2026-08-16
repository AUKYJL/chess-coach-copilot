import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import type { ProgressSummary } from '../analysis/classification/generated-progress.schema.js';
import { SavedAnalysisInputMapper } from '../analysis/classification/saved-analysis-input.mapper.js';
import { SavedOutputGenerationService } from '../analysis/classification/saved-output-generation.service.js';
import { GenerationTraceService } from '../analysis/classification/generation-trace.service.js';
import { AnalysisJobsService } from '../analysis/jobs/analysis-jobs.service.js';
import { JobProcessingError } from '../analysis/jobs/job-processing.error.js';
import { AnalysisJobType, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StudentsService } from '../students/students.service.js';
import type { ProgressReadResponse } from './dto/progress-read.response.js';

const MINIMUM_PROGRESS_ANALYSES = 3;
const ARCHIVED_OUTPUTS_ERROR =
  'Archived students cannot receive new generated outputs';

@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentsService: StudentsService,
    private readonly analysisJobsService: AnalysisJobsService,
    private readonly savedAnalysisInputMapper: SavedAnalysisInputMapper,
    private readonly savedOutputGenerationService: SavedOutputGenerationService,
    private readonly generationTraceService: GenerationTraceService,
  ) {}

  async requestGeneration(studentId: string, coachAccountId: string) {
    const student = await this.studentsService.getOne(
      studentId,
      coachAccountId,
    );

    if (student.archivedAt) {
      throw new UnprocessableEntityException(ARCHIVED_OUTPUTS_ERROR);
    }

    const analyses = await this.getCompletedAnalyses(studentId, coachAccountId);

    if (analyses.length < MINIMUM_PROGRESS_ANALYSES) {
      throw new UnprocessableEntityException(
        'Not enough completed analyses to generate progress',
      );
    }

    const latestAnalysis = analyses[0];
    const job = await this.analysisJobsService.createAndEnqueueGenerationJob({
      coachAccountId,
      studentId,
      gameId: latestAnalysis.gameId,
      jobType: AnalysisJobType.PROGRESS_GENERATION,
    });

    return this.analysisJobsService.getJobResponse(job.id, coachAccountId);
  }

  async getLatest(
    studentId: string,
    coachAccountId: string,
  ): Promise<ProgressReadResponse> {
    await this.studentsService.getOne(studentId, coachAccountId);

    const analyses = await this.getCompletedAnalyses(studentId, coachAccountId);
    const latestSnapshot = await this.prisma.progressSnapshot.findFirst({
      where: {
        studentId,
        coachAccountId,
      },
      orderBy: {
        createdAt: Prisma.SortOrder.desc,
      },
    });

    if (analyses.length < MINIMUM_PROGRESS_ANALYSES || !latestSnapshot) {
      return {
        status: 'not-enough-data',
        requiredAnalysisCount: MINIMUM_PROGRESS_ANALYSES,
        availableAnalysisCount: analyses.length,
        snapshot: null,
      };
    }

    return {
      status: 'ready',
      requiredAnalysisCount: MINIMUM_PROGRESS_ANALYSES,
      availableAnalysisCount: analyses.length,
      snapshot: {
        id: latestSnapshot.id,
        studentId: latestSnapshot.studentId,
        analysisCount: latestSnapshot.analysisCount,
        summary: latestSnapshot.summary as ProgressSummary,
        promptVersion: latestSnapshot.promptVersion,
        model: latestSnapshot.model,
        createdAt: latestSnapshot.createdAt,
        updatedAt: latestSnapshot.updatedAt,
      },
    };
  }

  async generateAndSave(data: {
    analysisJobId: string;
    studentId: string;
    coachAccountId: string;
  }) {
    const student = await this.studentsService.getOne(
      data.studentId,
      data.coachAccountId,
    );

    if (student.archivedAt) {
      throw new JobProcessingError('ARCHIVED_STUDENT', ARCHIVED_OUTPUTS_ERROR);
    }

    const analyses = await this.getCompletedAnalyses(
      data.studentId,
      data.coachAccountId,
    );

    if (analyses.length < MINIMUM_PROGRESS_ANALYSES) {
      throw new UnprocessableEntityException(
        'Not enough completed analyses to generate progress',
      );
    }

    const generated = await this.savedOutputGenerationService.generateProgress({
      studentId: data.studentId,
      analyses: analyses.map((analysis) =>
        this.savedAnalysisInputMapper.map(analysis),
      ),
    });
    const snapshot = await this.prisma.progressSnapshot.create({
      data: {
        coachAccountId: analyses[0].coachAccountId,
        studentId: data.studentId,
        analysisCount: analyses.length,
        summary: generated.summary,
        promptVersion: generated.promptVersion,
        model: generated.model,
      },
    });

    await this.generationTraceService.persistSuccess({
      coachAccountId: analyses[0].coachAccountId,
      analysisJobId: data.analysisJobId,
      progressSnapshotId: snapshot.id,
      promptVersion: generated.promptVersion,
      model: generated.model,
      inputPayload: generated.inputPayload,
      outputPayload: generated.rawOutput,
    });

    return snapshot;
  }

  private getCompletedAnalyses(studentId: string, coachAccountId?: string) {
    return this.prisma.gameAnalysis.findMany({
      where: {
        studentId,
        ...(coachAccountId ? { coachAccountId } : {}),
      },
      include: {
        criticalMoments: true,
        mistakes: true,
      },
      orderBy: {
        createdAt: Prisma.SortOrder.desc,
      },
    });
  }
}
