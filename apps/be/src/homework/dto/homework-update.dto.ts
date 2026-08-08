import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class HomeworkUpdateDto {
  @ApiPropertyOptional({ example: 'Homework: candidate move discipline' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title?: string;

  @ApiPropertyOptional({
    example: {
      overview: 'Review the forcing-move checklist before every capture.',
      exercises: ['Annotate move 18 alternatives', 'Solve 5 fork puzzles'],
      focusPoints: ['Checks, captures, threats'],
      notes: ['Discuss move-order discipline in next lesson'],
    },
  })
  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;
}
