import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAccessGuard } from '../../auth/guards/jwt-access.guard.js';
import { CurrentCoach } from '../../shared/decorators/current-coach.decorator.js';
import type { AuthenticatedCoach } from '../../shared/types/authenticated-coach.type.js';
import { AnalysisQueriesService } from './analysis-queries.service.js';

@ApiTags('Analysis')
@ApiBearerAuth()
@UseGuards(JwtAccessGuard)
@Controller('analysis')
export class AnalysisController {
  constructor(
    private readonly analysisQueriesService: AnalysisQueriesService,
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
  async getOne(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Param('analysisId', new ParseUUIDPipe()) analysisId: string,
  ) {
    return this.analysisQueriesService.getOwnedAnalysisDetails(
      analysisId,
      coach.coachAccountId,
    );
  }
}
