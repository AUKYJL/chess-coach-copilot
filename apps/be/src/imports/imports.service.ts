import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { AnalysisJobResponse } from '../analysis/dto/analysis-job.response.js';
import { AnalysisJobsService } from '../analysis/jobs/analysis-jobs.service.js';
import { PgnPreparationService } from '../analysis/preparation/pgn-preparation.service.js';
import { GamesService } from '../games/games.service.js';
import { StudentsService } from '../students/students.service.js';
import { ImportPgnDto } from './dto/import-pgn.dto.js';

@Injectable()
export class ImportsService {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly gamesService: GamesService,
    private readonly analysisJobsService: AnalysisJobsService,
    private readonly pgnPreparationService: PgnPreparationService,
  ) {}

  async importPgn(
    studentId: string,
    coachAccountId: string,
    dto: ImportPgnDto,
  ): Promise<AnalysisJobResponse> {
    const student = await this.studentsService.getOne(
      studentId,
      coachAccountId,
    );

    if (student.archivedAt) {
      throw new UnprocessableEntityException(
        'Archived students cannot receive new imports',
      );
    }

    const { parsedPgn, extractedContext } =
      this.pgnPreparationService.parseForAnalysis(dto.rawPgn, dto.studentColor);
    const gameSummary = this.pgnPreparationService.buildGameSummary(parsedPgn);

    const { game, isDuplicate } = await this.gamesService.createImportedGame({
      coachAccountId,
      studentId,
      sourceLabel: dto.sourceLabel?.trim(),
      studentColor: dto.studentColor,
      ...gameSummary,
      rawPgn: dto.rawPgn,
      normalizedPgnHash: this.pgnPreparationService.createFingerprint(
        dto.rawPgn,
      ),
      hasEngineAnnotations: extractedContext.hasEngineAnnotations,
      annotationCoverage: extractedContext.annotationCoverage,
      reducedConfidenceWarning: extractedContext.reducedConfidenceWarning,
    });

    const analysisJob =
      await this.analysisJobsService.createAndEnqueueAnalysisJob({
        coachAccountId,
        studentId,
        gameId: game.id,
      });

    return {
      id: analysisJob.id,
      gameId: game.id,
      studentId,
      jobType: analysisJob.jobType,
      status: analysisJob.status,
      sourceAnalysisId: analysisJob.sourceAnalysisId ?? null,
      reportAudience: analysisJob.reportAudience ?? null,
      attemptCount: analysisJob.attemptCount,
      maxAttempts: analysisJob.maxAttempts,
      progressPercent: analysisJob.progressPercent ?? null,
      isDuplicate,
      annotationCoverage: game.annotationCoverage,
      reducedConfidenceWarning: game.reducedConfidenceWarning,
      failureCode: null,
      failureMessage: null,
      analysisId: null,
      reportId: null,
      homeworkId: null,
      progressSnapshotId: null,
      completedAt: null,
      createdAt: analysisJob.createdAt,
      updatedAt: analysisJob.updatedAt,
    };
  }
}
