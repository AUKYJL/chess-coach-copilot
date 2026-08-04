import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { swaggerEntityExamples } from '../../shared/swagger/swagger-examples.js';

export class CreateStudentDto {
  @ApiProperty({ example: swaggerEntityExamples.student.displayName })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  displayName: string;

  @ApiPropertyOptional({ example: swaggerEntityExamples.student.birthYear })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  birthYear?: number;

  @ApiPropertyOptional({ example: swaggerEntityExamples.student.rating })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(4000)
  rating?: number;

  @ApiPropertyOptional({ example: swaggerEntityExamples.student.notes })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;
}
