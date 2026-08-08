import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { CurrentCoach } from '../shared/decorators/current-coach.decorator.js';
import { CoachStudentAccessGuard } from '../shared/guards/coach-student-access.guard.js';
import type { AuthenticatedCoach } from '../shared/types/authenticated-coach.type.js';
import { ProgressService } from './progress.service.js';

@ApiTags('Progress')
@ApiBearerAuth()
@UseGuards(JwtAccessGuard)
@Controller('students/:studentId/progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @UseGuards(CoachStudentAccessGuard)
  @Get()
  getLatest(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
  ) {
    return this.progressService.getLatest(studentId, coach.coachAccountId);
  }

  @UseGuards(CoachStudentAccessGuard)
  @Post('generate')
  requestGeneration(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
  ) {
    return this.progressService.requestGeneration(
      studentId,
      coach.coachAccountId,
    );
  }
}
