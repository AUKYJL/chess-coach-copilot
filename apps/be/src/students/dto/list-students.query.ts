import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum StudentsArchivedFilter {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  ALL = 'all',
}

export class ListStudentsQueryDto {
  @ApiPropertyOptional({ enum: StudentsArchivedFilter })
  @IsOptional()
  @IsEnum(StudentsArchivedFilter)
  archived?: StudentsArchivedFilter;
}
