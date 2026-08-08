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
import { CoachStudentAccessGuard } from '../shared/guards/coach-student-access.guard.js';
import {
  swaggerParamExamples,
  swaggerRequestExamples,
} from '../shared/swagger/swagger-examples.js';
import type { AuthenticatedCoach } from '../shared/types/authenticated-coach.type.js';
import { CreateExternalAccountDto } from './dto/create-external-account.dto.js';
import { UpdateExternalAccountDto } from './dto/update-external-account.dto.js';
import { ExternalAccountsService } from './external-accounts.service.js';

@ApiTags('External Accounts')
@ApiBearerAuth()
@ApiExtraModels(CreateExternalAccountDto, UpdateExternalAccountDto)
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

  @ApiParam({
    name: 'studentId',
    example: swaggerParamExamples.studentId,
    format: 'uuid',
  })
  @Patch(':externalAccountId')
  update(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
    @Param('externalAccountId', new ParseUUIDPipe()) externalAccountId: string,
    @Body() dto: UpdateExternalAccountDto,
  ) {
    return this.externalAccountsService.update(
      studentId,
      externalAccountId,
      coach.coachAccountId,
      dto,
    );
  }

  @ApiParam({
    name: 'studentId',
    example: swaggerParamExamples.studentId,
    format: 'uuid',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':externalAccountId')
  async remove(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
    @Param('externalAccountId', new ParseUUIDPipe()) externalAccountId: string,
  ) {
    await this.externalAccountsService.remove(
      studentId,
      externalAccountId,
      coach.coachAccountId,
    );
  }
}
