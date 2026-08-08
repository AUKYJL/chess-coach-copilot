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
import { HomeworkUpdateDto } from './dto/homework-update.dto.js';
import { HomeworkService } from './homework.service.js';

@ApiTags('Homework')
@ApiBearerAuth()
@UseGuards(JwtAccessGuard)
@Controller()
export class HomeworkController {
  constructor(private readonly homeworkService: HomeworkService) {}

  @Post('analysis/:analysisId/homework/generate')
  requestGeneration(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Param('analysisId', new ParseUUIDPipe()) analysisId: string,
  ) {
    return this.homeworkService.requestGeneration(analysisId, coach.coachAccountId);
  }

  @Get('homework')
  async list(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Query('studentId') studentId?: string,
    @Query('analysisId') analysisId?: string,
  ) {
    const items = await this.homeworkService.list(coach.coachAccountId, {
      studentId,
      analysisId,
    });

    return { items };
  }

  @Get('homework/:homeworkId')
  getOne(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Param('homeworkId', new ParseUUIDPipe()) homeworkId: string,
  ) {
    return this.homeworkService.getOne(homeworkId, coach.coachAccountId);
  }

  @Patch('homework/:homeworkId')
  update(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Param('homeworkId', new ParseUUIDPipe()) homeworkId: string,
    @Body() dto: HomeworkUpdateDto,
  ) {
    return this.homeworkService.update(homeworkId, coach.coachAccountId, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('homework/:homeworkId')
  async remove(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Param('homeworkId', new ParseUUIDPipe()) homeworkId: string,
  ) {
    await this.homeworkService.remove(homeworkId, coach.coachAccountId);
  }
}
