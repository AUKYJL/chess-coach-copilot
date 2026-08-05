import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StudentColor } from '../../generated/prisma/client.js';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { swaggerEntityExamples } from '../../shared/swagger/swagger-examples.js';

export class ImportPgnDto {
  @ApiProperty({ enum: StudentColor, example: swaggerEntityExamples.importPgn.studentColor })
  @IsEnum(StudentColor)
  studentColor: StudentColor;

  @ApiPropertyOptional({ example: swaggerEntityExamples.importPgn.sourceLabel })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  sourceLabel?: string;

  @ApiProperty({ example: swaggerEntityExamples.importPgn.rawPgn })
  @IsString()
  @MinLength(10)
  @MaxLength(50000)
  rawPgn: string;
}
