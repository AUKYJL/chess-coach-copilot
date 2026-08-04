import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiParam,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { CurrentCoach } from '../shared/decorators/current-coach.decorator.js';
import {
  swaggerParamExamples,
  swaggerRequestExamples,
} from '../shared/swagger/swagger-examples.js';
import type { AuthenticatedCoach } from '../shared/types/authenticated-coach.type.js';
import { CoachStudentAccessGuard } from '../students/guards/coach-student-access.guard.js';
import { CreateExternalAccountDto } from './dto/create-external-account.dto.js';
import { ExternalAccountsService } from './external-accounts.service.js';

@ApiTags('External Accounts')
@ApiBearerAuth()
@ApiExtraModels(CreateExternalAccountDto)
@UseGuards(JwtAccessGuard, CoachStudentAccessGuard)
@Controller('students/:studentId/external-accounts')
export class ExternalAccountsController {
  constructor(
    private readonly externalAccountsService: ExternalAccountsService,
  ) {}

  @ApiParam({
    name: 'studentId',
    example: swaggerParamExamples.studentId,
    format: 'uuid',
  })
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

  @ApiParam({
    name: 'studentId',
    example: swaggerParamExamples.studentId,
    format: 'uuid',
  })
  @ApiBody({
    schema: {
      allOf: [{ $ref: getSchemaPath(CreateExternalAccountDto) }],
      example: swaggerRequestExamples.externalAccounts.create,
    },
  })
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
