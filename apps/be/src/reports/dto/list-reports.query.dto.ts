import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ReportAudience } from '../../generated/prisma/client.js';

export class ListReportsQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  analysisId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  gameId?: string;

  @ApiPropertyOptional({ enum: ReportAudience })
  @IsOptional()
  @IsEnum(ReportAudience)
  audience?: ReportAudience;
}
