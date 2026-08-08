import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import {
  AnalysisJobStatus,
  AnalysisJobType,
} from '../../generated/prisma/client.js';

export class ListAnalysisJobsQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  gameId?: string;

  @ApiPropertyOptional({ enum: AnalysisJobType })
  @IsOptional()
  @IsEnum(AnalysisJobType)
  jobType?: AnalysisJobType;

  @ApiPropertyOptional({ enum: AnalysisJobStatus })
  @IsOptional()
  @IsEnum(AnalysisJobStatus)
  status?: AnalysisJobStatus;

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  cursor?: string;
}
