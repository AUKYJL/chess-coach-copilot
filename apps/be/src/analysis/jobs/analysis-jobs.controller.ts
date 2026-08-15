import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAccessGuard } from '../../auth/guards/jwt-access.guard.js';
import { CurrentCoach } from '../../shared/decorators/current-coach.decorator.js';
import type { AuthenticatedCoach } from '../../shared/types/authenticated-coach.type.js';
import { AnalysisJobListResponse } from '../dto/analysis-job-list.response.js';
import { AnalysisJobResponse } from '../dto/analysis-job.response.js';
import { ListAnalysisJobsQueryDto } from '../dto/list-analysis-jobs.query.js';
import { AnalysisJobsService } from './analysis-jobs.service.js';

@ApiTags('Analysis Jobs')
@ApiBearerAuth()
@UseGuards(JwtAccessGuard)
@Controller('analysis/jobs')
export class AnalysisJobsController {
  constructor(private readonly analysisJobsService: AnalysisJobsService) {}

  @Get()
  @ApiOkResponse({ type: AnalysisJobListResponse })
  list(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Query() query: ListAnalysisJobsQueryDto,
  ) {
    return this.analysisJobsService.listOwnedJobs({
      coachAccountId: coach.coachAccountId,
      studentId: query.studentId,
      gameId: query.gameId,
      jobType: query.jobType,
      status: query.status,
      limit: query.limit,
      cursor: query.cursor,
    });
  }

  @Get(':jobId')
  @ApiOkResponse({ type: AnalysisJobResponse })
  getStatus(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Param('jobId') jobId: string,
  ) {
    return this.analysisJobsService.getJobResponse(jobId, coach.coachAccountId);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':jobId/retry')
  @ApiOkResponse({ type: AnalysisJobResponse })
  retry(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Param('jobId') jobId: string,
  ) {
    return this.analysisJobsService.retry(jobId, coach.coachAccountId);
  }
}
