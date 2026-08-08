import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ReportAudience } from '../../generated/prisma/client.js';

export class ReportGenerationRequestDto {
  @ApiProperty({
    enum: ReportAudience,
    example: ReportAudience.COACH,
  })
  @IsEnum(ReportAudience)
  audience: ReportAudience;
}
