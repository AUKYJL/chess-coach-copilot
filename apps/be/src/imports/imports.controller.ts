import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiParam,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { CurrentCoach } from '../shared/decorators/current-coach.decorator.js';
import { CoachStudentAccessGuard } from '../shared/guards/coach-student-access.guard.js';
import { resolveRequestId } from '../shared/logging/request-id.util.js';
import {
  swaggerParamExamples,
  swaggerRequestExamples,
} from '../shared/swagger/swagger-examples.js';
import type { AuthenticatedCoach } from '../shared/types/authenticated-coach.type.js';
import { ImportPgnDto } from './dto/import-pgn.dto.js';
import { ImportsService } from './imports.service.js';

@ApiTags('Imports')
@ApiBearerAuth()
@ApiExtraModels(ImportPgnDto)
@UseGuards(JwtAccessGuard, CoachStudentAccessGuard)
@Controller('students/:studentId/imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @ApiParam({
    name: 'studentId',
    example: swaggerParamExamples.studentId,
    format: 'uuid',
  })
  @ApiBody({
    schema: {
      allOf: [{ $ref: getSchemaPath(ImportPgnDto) }],
      example: swaggerRequestExamples.imports.create,
    },
  })
  @Post('pgn')
  importPgn(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Param('studentId') studentId: string,
    @Body() dto: ImportPgnDto,
    @Req() request: Request,
  ) {
    return this.importsService.importPgn(
      studentId,
      coach.coachAccountId,
      dto,
      resolveRequestId(request),
    );
  }
}
