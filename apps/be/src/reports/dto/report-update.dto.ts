import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ReportUpdateDto {
  @ApiPropertyOptional({ example: 'Coach report: Italian Game review' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title?: string;

  @ApiPropertyOptional({
    example: {
      summary: 'Middlegame planning improved, but tactical checks were rushed.',
      highlights: [
        'Better opening recall',
        'Missed forcing continuation on move 18',
      ],
      lessonFocus: ['Candidate move discipline'],
      nextSteps: ['Review forcing-move checklist'],
    },
  })
  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;
}
