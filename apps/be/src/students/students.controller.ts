import {
  Body,
  Controller,
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
  ApiBody,
  ApiExtraModels,
  ApiOkResponse,
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
import { CreateStudentDto } from './dto/create-student.dto.js';
import { ListStudentsQueryDto } from './dto/list-students.query.js';
import { SetStudentArchiveDto } from './dto/set-student-archive.dto.js';
import {
  StudentAnalysisProfileResponse,
  StudentOverviewResponse,
  StudentPerformanceTrendResponse,
} from './dto/student-overview.response.js';
import { UpdateStudentDto } from './dto/update-student.dto.js';
import { StudentsService } from './students.service.js';

@ApiTags('Students')
@ApiBearerAuth()
@ApiExtraModels(
  CreateStudentDto,
  UpdateStudentDto,
  SetStudentArchiveDto,
  StudentOverviewResponse,
  StudentAnalysisProfileResponse,
  StudentPerformanceTrendResponse,
)
@UseGuards(JwtAccessGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  async list(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Query() query: ListStudentsQueryDto,
  ) {
    const items = await this.studentsService.list(coach.coachAccountId, query);
    return { items };
  }

  @ApiBody({
    schema: {
      allOf: [{ $ref: getSchemaPath(CreateStudentDto) }],
      example: swaggerRequestExamples.students.create,
    },
  })
  @Post()
  create(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Body() dto: CreateStudentDto,
  ) {
    return this.studentsService.create(coach.coachAccountId, dto);
  }

  @UseGuards(CoachStudentAccessGuard)
  @ApiParam({
    name: 'studentId',
    example: swaggerParamExamples.studentId,
    format: 'uuid',
  })
  @Get(':studentId')
  getOne(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Param('studentId') studentId: string,
  ) {
    return this.studentsService.getOne(studentId, coach.coachAccountId);
  }

  @UseGuards(CoachStudentAccessGuard)
  @ApiParam({
    name: 'studentId',
    example: swaggerParamExamples.studentId,
    format: 'uuid',
  })
  @ApiOkResponse({
    schema: {
      allOf: [{ $ref: getSchemaPath(StudentOverviewResponse) }],
    },
  })
  @Get(':studentId/overview')
  getOverview(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Param('studentId') studentId: string,
  ) {
    return this.studentsService.getOverview(studentId, coach.coachAccountId);
  }

  @UseGuards(CoachStudentAccessGuard)
  @ApiParam({
    name: 'studentId',
    example: swaggerParamExamples.studentId,
    format: 'uuid',
  })
  @ApiOkResponse({
    schema: {
      allOf: [{ $ref: getSchemaPath(StudentAnalysisProfileResponse) }],
    },
  })
  @Get(':studentId/analysis-profile')
  getAnalysisProfile(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Param('studentId') studentId: string,
  ) {
    return this.studentsService.getAnalysisProfile(
      studentId,
      coach.coachAccountId,
    );
  }

  @UseGuards(CoachStudentAccessGuard)
  @ApiParam({
    name: 'studentId',
    example: swaggerParamExamples.studentId,
    format: 'uuid',
  })
  @ApiOkResponse({
    schema: {
      allOf: [{ $ref: getSchemaPath(StudentPerformanceTrendResponse) }],
    },
  })
  @Get(':studentId/performance-trend')
  getPerformanceTrend(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Param('studentId') studentId: string,
  ) {
    return this.studentsService.getPerformanceTrend(
      studentId,
      coach.coachAccountId,
    );
  }

  @UseGuards(CoachStudentAccessGuard)
  @ApiParam({
    name: 'studentId',
    example: swaggerParamExamples.studentId,
    format: 'uuid',
  })
  @ApiBody({
    schema: {
      allOf: [{ $ref: getSchemaPath(UpdateStudentDto) }],
      example: swaggerRequestExamples.students.update,
    },
  })
  @Patch(':studentId')
  update(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Param('studentId') studentId: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.studentsService.update(studentId, coach.coachAccountId, dto);
  }

  @UseGuards(CoachStudentAccessGuard)
  @ApiParam({
    name: 'studentId',
    example: swaggerParamExamples.studentId,
    format: 'uuid',
  })
  @ApiBody({
    schema: {
      allOf: [{ $ref: getSchemaPath(SetStudentArchiveDto) }],
      example: swaggerRequestExamples.students.setArchive,
    },
  })
  @HttpCode(HttpStatus.OK)
  @Post(':studentId/archive')
  setArchiveState(
    @CurrentCoach() coach: AuthenticatedCoach,
    @Param('studentId') studentId: string,
    @Body() dto: SetStudentArchiveDto,
  ) {
    return this.studentsService.setArchiveState(
      studentId,
      coach.coachAccountId,
      dto,
    );
  }
}
