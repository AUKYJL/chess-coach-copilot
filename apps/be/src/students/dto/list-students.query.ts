import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum StudentStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export enum StudentsSortField {
  RATING = 'rating',
  COMPLETED_ANALYSIS_COUNT = 'completedAnalysisCount',
  LAST_ANALYSIS_AT = 'lastAnalysisAt',
}

export enum StudentsSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

function normalizeStatusesQueryValue(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.map((item): unknown => item);
  }

  return [value];
}

export class ListStudentsQueryDto {
  @ApiPropertyOptional({
    description: 'Case-insensitive search by student display name.',
    example: 'alex',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: StudentStatus,
    isArray: true,
    default: [StudentStatus.ACTIVE, StudentStatus.ARCHIVED],
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    normalizeStatusesQueryValue(value),
  )
  @IsEnum(StudentStatus, { each: true })
  statuses?: StudentStatus[];

  @ApiPropertyOptional({ enum: StudentsSortField })
  @IsOptional()
  @IsEnum(StudentsSortField)
  sort?: StudentsSortField;

  @ApiPropertyOptional({
    enum: StudentsSortOrder,
    default: StudentsSortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(StudentsSortOrder)
  order?: StudentsSortOrder;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
