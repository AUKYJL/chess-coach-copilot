import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAccessGuard } from '../../auth/guards/jwt-access.guard.js';
import { CurrentCoach } from '../../shared/decorators/current-coach.decorator.js';
import type { AuthenticatedCoach } from '../../shared/types/authenticated-coach.type.js';
import { ListAnalysisJobsQueryDto } from '../dto/list-analysis-jobs.query.js';
import { AnalysisJobsService } from './analysis-jobs.service.js';

@ApiTags('Analysis Jobs')
@ApiBearerAuth()
@UseGuards(JwtAccessGuard)
@Controller('analysis/jobs')
export class AnalysisJobsController {
  constructor(private readonly analysisJobsService: AnalysisJobsService) {}

  @Get()
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
  getStatus(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Param('jobId', new ParseUUIDPipe()) jobId: string,
  ) {
    return this.analysisJobsService.getJobResponse(jobId, coach.coachAccountId);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':jobId/retry')
  retry(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Param('jobId', new ParseUUIDPipe()) jobId: string,
  ) {
    return this.analysisJobsService.retry(jobId, coach.coachAccountId);
  }
}
