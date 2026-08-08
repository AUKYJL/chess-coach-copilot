import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { CurrentCoach } from '../shared/decorators/current-coach.decorator.js';
import type { AuthenticatedCoach } from '../shared/types/authenticated-coach.type.js';
import { ReportGenerationRequestDto } from './dto/report-generation-request.dto.js';
import { ReportUpdateDto } from './dto/report-update.dto.js';
import { ReportsService } from './reports.service.js';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAccessGuard)
@Controller()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('analysis/:analysisId/reports/generate')
  requestGeneration(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Param('analysisId', new ParseUUIDPipe()) analysisId: string,
    @Body() dto: ReportGenerationRequestDto,
  ) {
    return this.reportsService.requestGeneration(
      analysisId,
      coach.coachAccountId,
      dto,
    );
  }

  @Get('reports')
  async list(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Query('studentId') studentId?: string,
    @Query('analysisId') analysisId?: string,
  ) {
    const items = await this.reportsService.list(coach.coachAccountId, {
      studentId,
      analysisId,
    });

    return { items };
  }

  @Get('reports/:reportId')
  getOne(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Param('reportId', new ParseUUIDPipe()) reportId: string,
  ) {
    return this.reportsService.getOne(reportId, coach.coachAccountId);
  }

  @Patch('reports/:reportId')
  update(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Param('reportId', new ParseUUIDPipe()) reportId: string,
    @Body() dto: ReportUpdateDto,
  ) {
    return this.reportsService.update(reportId, coach.coachAccountId, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('reports/:reportId')
  async remove(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Param('reportId', new ParseUUIDPipe()) reportId: string,
  ) {
    await this.reportsService.remove(reportId, coach.coachAccountId);
  }
}
