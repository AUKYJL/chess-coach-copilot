import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { swaggerEntityExamples } from '../../shared/swagger/swagger-examples.js';

export class SetStudentArchiveDto {
  @ApiProperty({ example: swaggerEntityExamples.student.archived })
  @IsBoolean()
  archived: boolean;
}
