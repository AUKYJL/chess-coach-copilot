import {
  Body,
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
import type { AuthenticatedCoach } from '../shared/types/authenticated-coach.type.js';
import { CoachStudentAccessGuard } from '../students/guards/coach-student-access.guard.js';
import { CreateExternalAccountDto } from './dto/create-external-account.dto.js';
import { ExternalAccountsService } from './external-accounts.service.js';

@ApiTags('External Accounts')
@ApiBearerAuth()
@UseGuards(JwtAccessGuard, CoachStudentAccessGuard)
@Controller('students/:studentId/external-accounts')
export class ExternalAccountsController {
  constructor(
    private readonly externalAccountsService: ExternalAccountsService,
  ) {}

  @Get()
  async list(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
  ) {
    const items = await this.externalAccountsService.list(
      studentId,
      coach.coachAccountId,
    );

    return { items };
  }

  @Post()
  create(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
    @Body() dto: CreateExternalAccountDto,
  ) {
    return this.externalAccountsService.create(
      studentId,
      coach.coachAccountId,
      dto,
    );
  }
}
