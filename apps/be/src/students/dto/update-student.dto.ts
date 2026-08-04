import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { swaggerEntityExamples } from '../../shared/swagger/swagger-examples.js';
import { CreateStudentDto } from './create-student.dto.js';

export class UpdateStudentDto extends PartialType(CreateStudentDto) {
  @ApiPropertyOptional({ example: swaggerEntityExamples.student.displayName })
  declare displayName?: string;

  @ApiPropertyOptional({ example: swaggerEntityExamples.student.birthYear })
  declare birthYear?: number;

  @ApiPropertyOptional({ example: swaggerEntityExamples.student.rating })
  declare rating?: number;

  @ApiPropertyOptional({ example: swaggerEntityExamples.student.notes })
  declare notes?: string;
}
