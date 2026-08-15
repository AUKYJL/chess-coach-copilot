import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { JwtAccessGuard } from '../../auth/guards/jwt-access.guard.js';
import { CurrentCoach } from '../../shared/decorators/current-coach.decorator.js';
import type { AuthenticatedCoach } from '../../shared/types/authenticated-coach.type.js';
import {
  AnalysisDetailsResponse,
  AnalysisMistakeResponse,
} from '../dto/analysis-details.response.js';
import { UpdateMistakeReviewDto } from '../dto/update-mistake-review.dto.js';
import { AnalysisQueriesService } from './analysis-queries.service.js';
import { AnalysisReviewsService } from './analysis-reviews.service.js';

@ApiTags('Analysis')
@ApiBearerAuth()
@ApiExtraModels(AnalysisDetailsResponse)
@UseGuards(JwtAccessGuard)
@Controller('analysis')
export class AnalysisController {
  constructor(
    private readonly analysisQueriesService: AnalysisQueriesService,
    private readonly analysisReviewsService: AnalysisReviewsService,
  ) {}

  @ApiQuery({ name: 'studentId', required: false, format: 'uuid' })
  @Get()
  async list(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Query('studentId') studentId?: string,
  ) {
    const items = await this.analysisQueriesService.listOwnedAnalyses({
      coachAccountId: coach.coachAccountId,
      studentId,
    });

    return { items };
  }

  @Get(':analysisId')
  @ApiOkResponse({
    schema: {
      allOf: [{ $ref: getSchemaPath(AnalysisDetailsResponse) }],
    },
  })
  async getOne(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Param('analysisId') analysisId: string,
  ) {
    return this.analysisQueriesService.getOwnedAnalysisDetails(
      analysisId,
      coach.coachAccountId,
    );
  }

  @Patch('mistakes/:mistakeId/review')
  @ApiOkResponse({
    type: AnalysisMistakeResponse,
  })
  updateMistakeReview(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Param('mistakeId') mistakeId: string,
    @Body() dto: UpdateMistakeReviewDto,
  ) {
    return this.analysisReviewsService.updateOwnedMistakeReview(
      mistakeId,
      coach.coachAccountId,
      dto,
    );
  }
}
