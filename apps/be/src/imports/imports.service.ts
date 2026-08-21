import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { AnalysisJobEventsService } from '../analysis/jobs/analysis-job-events.service.js';
import { AnalysisJobStatus, Prisma } from '../generated/prisma/client.js';
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

    const {
      parsedPgn,
      extractedContext,
      engineEvidenceInspection,
      engineEvidence,
    } = this.pgnPreparationService.parseForAnalysis(
      dto.rawPgn,
      dto.studentColor,
    );
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
    if (isDuplicate) {
      const analysisJob =
        await this.analysisJobsService.getLatestWorkflowJobForGame(game.id);

      if (analysisJob.status === AnalysisJobStatus.FAILED) {
        this.logger.info(
          {
            event: 'import_duplicate_retry_started',
            traceId,
            studentId,
            gameId: game.id,
            analysisJobId: analysisJob.id,
            jobType: analysisJob.jobType,
            failureCode: analysisJob.failureCode,
          },
          'Retrying failed analysis for an imported duplicate',
        );
        await this.analysisJobEventsService.recordBestEffort({
          analysisJobId: analysisJob.id,
          traceId,
          stage: 'import_duplicate_retry_started',
          level: 'info',
          message: 'Retrying failed analysis for an imported duplicate',
          payload: {
            studentId,
            gameId: game.id,
            jobType: analysisJob.jobType,
            failureCode: analysisJob.failureCode,
          },
        });

        const retryJob = await this.analysisJobsService.retry(
          analysisJob.id,
          coachAccountId,
        );
        this.logger.info(
          {
            event: 'import_duplicate_retry_enqueued',
            traceId,
            studentId,
            gameId: game.id,
            analysisJobId: retryJob.id,
            jobType: retryJob.jobType,
            status: retryJob.status,
          },
          'Retry for imported duplicate was enqueued',
        );
        await this.analysisJobEventsService.recordBestEffort({
          analysisJobId: retryJob.id,
          traceId,
          stage: 'import_duplicate_retry_enqueued',
          level: 'info',
          message: 'Retry for imported duplicate was enqueued',
          payload: {
            studentId,
            gameId: game.id,
            jobType: retryJob.jobType,
            status: retryJob.status,
          },
        });

        return { ...retryJob, isDuplicate: true };
      }

      this.logger.info(
        {
          event: 'import_duplicate_returned',
          traceId,
          studentId,
          gameId: game.id,
          analysisJobId: analysisJob.id,
          jobType: analysisJob.jobType,
          status: analysisJob.status,
          failureCode: analysisJob.failureCode,
          normalizedPgnHashPrefix: game.normalizedPgnHash.slice(0, 12),
        },
        'Imported PGN matched an existing game',
      );
      await this.analysisJobEventsService.recordBestEffort({
        analysisJobId: analysisJob.id,
        traceId,
        stage: 'import_duplicate_returned',
        level: 'info',
        message: 'Imported PGN matched an existing game',
        payload: {
          studentId,
          gameId: game.id,
          jobType: analysisJob.jobType,
          status: analysisJob.status,
          failureCode: analysisJob.failureCode,
        },
      });
      return {
        ...analysisJob,
        isDuplicate: true,
      };
    }

    this.logger.info(
      {
        event: 'import_game_created',
        traceId,
        studentId,
        gameId: game.id,
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
        normalizedPgnHashPrefix: game.normalizedPgnHash.slice(0, 12),
      },
    });

    const analysisJob = engineEvidenceInspection.sufficient
      ? await this.analysisJobsService.createAndEnqueueAnalysisJob({
          traceId,
          coachAccountId,
          studentId,
          gameId: game.id,
        })
      : await this.analysisJobsService.queueEngineAnalysis(game.id, traceId);

    if (!analysisJob) {
      throw new UnprocessableEntityException(
        'Engine analysis is already complete',
      );
    }

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
