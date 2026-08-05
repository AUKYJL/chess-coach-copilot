import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAccessGuard } from '../../auth/guards/jwt-access.guard.js';
import { CurrentCoach } from '../../shared/decorators/current-coach.decorator.js';
import type { AuthenticatedCoach } from '../../shared/types/authenticated-coach.type.js';
import { AnalysisJobsService } from './analysis-jobs.service.js';
import { AnalysisQueriesService } from '../results/analysis-queries.service.js';

@ApiTags('Analysis Jobs')
@ApiBearerAuth()
@UseGuards(JwtAccessGuard)
@Controller('analysis/jobs')
export class AnalysisJobsController {
  constructor(
    private readonly analysisJobsService: AnalysisJobsService,
    private readonly analysisQueriesService: AnalysisQueriesService,
  ) {}

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

  @Get(':jobId/result')
  async getResult(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Param('jobId', new ParseUUIDPipe()) jobId: string,
  ) {
    await this.analysisJobsService.getJob(jobId, coach.coachAccountId);

    const analysis = await this.analysisQueriesService.getOwnedAnalysisByJobId(
      jobId,
      coach.coachAccountId,
    );

    return {
      analysis,
    };
  }
}
