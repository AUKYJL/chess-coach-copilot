import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { AnalysisJobEventsService } from '../analysis/jobs/analysis-job-events.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { AnalysisJobResponse } from '../analysis/dto/analysis-job.response.js';
import { AnalysisJobsService } from '../analysis/jobs/analysis-jobs.service.js';
import { PgnPreparationService } from '../analysis/preparation/pgn-preparation.service.js';
import { GamesService } from '../games/games.service.js';
import { StudentsService } from '../students/students.service.js';
import { ImportPgnDto } from './dto/import-pgn.dto.js';

@Injectable()
export class ImportsService {
  constructor(
    private readonly logger: PinoLogger,
    private readonly studentsService: StudentsService,
    private readonly gamesService: GamesService,
    private readonly analysisJobsService: AnalysisJobsService,
    private readonly analysisJobEventsService: AnalysisJobEventsService,
    private readonly pgnPreparationService: PgnPreparationService,
  ) {
    this.logger.setContext(ImportsService.name);
  }

  async importPgn(
    studentId: string,
    coachAccountId: string,
    dto: ImportPgnDto,
    traceId: string,
  ): Promise<AnalysisJobResponse> {
    this.logger.info(
      {
        event: 'import_started',
        traceId,
        studentId,
        coachAccountId,
        studentColor: dto.studentColor,
        sourceLabel: dto.sourceLabel?.trim() ?? null,
        rawPgnLength: dto.rawPgn.length,
      },
      'PGN import started',
    );
    await this.analysisJobEventsService.recordBestEffort({
      traceId,
      stage: 'import_started',
      level: 'info',
      message: 'PGN import started',
      payload: {
        studentId,
        coachAccountId,
        studentColor: dto.studentColor,
        sourceLabel: dto.sourceLabel?.trim() ?? null,
        rawPgnLength: dto.rawPgn.length,
      },
    });

    const student = await this.studentsService.getOne(
      studentId,
      coachAccountId,
    );

    if (student.archivedAt) {
      this.logger.warn(
        {
          event: 'import_rejected_archived_student',
          traceId,
          studentId,
          coachAccountId,
        },
        'PGN import rejected for archived student',
      );
      await this.analysisJobEventsService.recordBestEffort({
        traceId,
        stage: 'import_rejected_archived_student',
        level: 'warn',
        message: 'Archived students cannot receive new imports',
        payload: {
          studentId,
          coachAccountId,
        },
      });
      throw new UnprocessableEntityException(
        'Archived students cannot receive new imports',
      );
    }

    const { parsedPgn, extractedContext, engineEvidence } =
      this.pgnPreparationService.parseForAnalysis(dto.rawPgn, dto.studentColor);
    const gameSummary = this.pgnPreparationService.buildGameSummary(parsedPgn);
    this.logger.info(
      {
        event: 'import_pgn_parsed',
        traceId,
        studentId,
        annotationCoverage: extractedContext.annotationCoverage,
        hasEngineAnnotations: extractedContext.hasEngineAnnotations,
        reducedConfidenceWarning: extractedContext.reducedConfidenceWarning,
        plyCount: gameSummary.plyCount,
        openingHeader: gameSummary.openingHeader,
        rawResult: gameSummary.rawResult,
      },
      'PGN import parsed for analysis',
    );
    await this.analysisJobEventsService.recordBestEffort({
      traceId,
      stage: 'import_pgn_parsed',
      level: 'info',
      message: 'PGN import parsed for analysis',
      payload: {
        studentId,
        annotationCoverage: extractedContext.annotationCoverage,
        hasEngineAnnotations: extractedContext.hasEngineAnnotations,
        reducedConfidenceWarning: extractedContext.reducedConfidenceWarning,
        plyCount: gameSummary.plyCount,
        openingHeader: gameSummary.openingHeader,
        rawResult: gameSummary.rawResult,
      },
    });

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
      engineEvidence: engineEvidence as Prisma.InputJsonValue,
      engineEvidenceStatus: engineEvidence ? 'READY' : null,
      engineEvidenceSource: engineEvidence ? 'PGN' : null,
    });
    this.logger.info(
      {
        event: 'import_game_created',
        traceId,
        studentId,
        gameId: game.id,
        isDuplicate,
        normalizedPgnHashPrefix: game.normalizedPgnHash.slice(0, 12),
      },
      'Imported game persisted',
    );
    await this.analysisJobEventsService.recordBestEffort({
      traceId,
      stage: 'import_game_created',
      level: 'info',
      message: 'Imported game persisted',
      payload: {
        studentId,
        gameId: game.id,
        isDuplicate,
        normalizedPgnHashPrefix: game.normalizedPgnHash.slice(0, 12),
      },
    });

    const analysisJob =
      await this.analysisJobsService.createAndEnqueueAnalysisJob({
        traceId,
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
