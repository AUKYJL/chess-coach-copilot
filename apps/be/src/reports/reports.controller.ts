import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AnalysisJobResponse } from '../analysis/dto/analysis-job.response.js';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { CurrentCoach } from '../shared/decorators/current-coach.decorator.js';
import type { AuthenticatedCoach } from '../shared/types/authenticated-coach.type.js';
import { ListReportsQueryDto } from './dto/list-reports.query.dto.js';
import { ReportGenerationRequestDto } from './dto/report-generation-request.dto.js';
import { ReportListResponse } from './dto/report-list.response.js';
import { ReportResponse } from './dto/report.response.js';
import { ReportUpdateDto } from './dto/report-update.dto.js';
import { ReportsService } from './reports.service.js';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAccessGuard)
@Controller()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('analysis/:analysisId/reports/generate')
  @ApiCreatedResponse({ type: AnalysisJobResponse })
  requestGeneration(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Param('analysisId') analysisId: string,
    @Body() dto: ReportGenerationRequestDto,
  ) {
    return this.reportsService.requestGeneration(
      analysisId,
      coach.coachAccountId,
      dto,
    );
  }

  @Get('reports')
  @ApiOkResponse({ type: ReportListResponse })
  async list(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Query() query: ListReportsQueryDto,
  ) {
    const items = await this.reportsService.list(coach.coachAccountId, {
      studentId: query.studentId,
      analysisId: query.analysisId,
      gameId: query.gameId,
      audience: query.audience,
    });

    return { items };
  }

  @Get('reports/:reportId')
  @ApiOkResponse({ type: ReportResponse })
  getOne(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Param('reportId') reportId: string,
  ) {
    return this.reportsService.getOne(reportId, coach.coachAccountId);
  }

  @Patch('reports/:reportId')
  @ApiOkResponse({ type: ReportResponse })
  update(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Param('reportId') reportId: string,
    @Body() dto: ReportUpdateDto,
  ) {
    return this.reportsService.update(reportId, coach.coachAccountId, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('reports/:reportId')
  async remove(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Param('reportId') reportId: string,
  ) {
    await this.reportsService.remove(reportId, coach.coachAccountId);
  }
}
