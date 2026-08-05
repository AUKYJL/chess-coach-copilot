import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { CurrentCoach } from '../shared/decorators/current-coach.decorator.js';
import type { AuthenticatedCoach } from '../shared/types/authenticated-coach.type.js';
import { AnalysisJobsRepository } from './analysis-jobs.repository.js';
import { AnalysisResultsRepository } from './analysis-results.repository.js';

@ApiTags('Analysis')
@ApiBearerAuth()
@UseGuards(JwtAccessGuard)
@Controller('analysis')
export class AnalysisController {
  constructor(
    private readonly analysisJobsRepository: AnalysisJobsRepository,
    private readonly analysisResultsRepository: AnalysisResultsRepository,
  ) {}

  @ApiQuery({ name: 'studentId', required: false, format: 'uuid' })
  @Get()
  async list(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Query('studentId') studentId?: string,
  ) {
    const items = await this.analysisJobsRepository.findAnalysisList({
      coachAccountId: coach.coachAccountId,
      studentId,
    });

    return {
      items: items.map((item) => ({
        id: item.id,
        analysisJobId: item.analysisJobId,
        gameId: item.gameId,
        studentId: item.studentId,
        confidenceLevel: item.confidenceLevel,
        annotationCoverage: item.game.annotationCoverage,
        reducedConfidenceWarning: item.game.reducedConfidenceWarning,
        openingName: item.openingName,
        result: item.result,
        mainWeaknessTag: item.mainWeaknessTag,
        createdAt: item.createdAt,
      })),
    };
  }

  @Get(':analysisId')
  async getOne(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Param('analysisId', new ParseUUIDPipe()) analysisId: string,
  ) {
    const analysis = await this.analysisResultsRepository.findOwnedAnalysis(
      analysisId,
      coach.coachAccountId,
    );

    if (!analysis) {
      throw new NotFoundException('Analysis not found');
    }

    return {
      id: analysis.id,
      analysisJobId: analysis.analysisJobId,
      gameId: analysis.gameId,
      studentId: analysis.studentId,
      confidenceLevel: analysis.confidenceLevel,
      annotationCoverage: analysis.game.annotationCoverage,
      reducedConfidenceWarning: analysis.game.reducedConfidenceWarning,
      overallDiagnosis: analysis.overallDiagnosis,
      openingName: analysis.openingName,
      result: analysis.result,
      mainWeaknessTag: analysis.mainWeaknessTag,
      secondaryWeaknessTags: analysis.secondaryWeaknessTags,
      recommendedLessonTitle: analysis.recommendedLessonTitle,
      recommendedLessonWhy: analysis.recommendedLessonWhy,
      recommendedFocusPoints: analysis.recommendedFocusPoints,
      criticalMoments: analysis.criticalMoments.map((item) => ({
        ...item,
        confidence: Number(item.confidence),
      })),
      mistakes: analysis.mistakes,
      rawExtractedContext: analysis.rawExtractedContext,
      rawAnalysisJson: analysis.rawAnalysisJson,
      createdAt: analysis.createdAt,
      updatedAt: analysis.updatedAt,
    };
  }
}
