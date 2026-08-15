import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { MistakeReviewStatus } from '../../generated/prisma/client.js';

export class UpdateMistakeReviewDto {
  @ApiProperty({ enum: MistakeReviewStatus })
  @IsEnum(MistakeReviewStatus)
  status: MistakeReviewStatus;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'Coach note: good strategic idea, but the tactic still fails.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  coachNote?: string | null;
}
