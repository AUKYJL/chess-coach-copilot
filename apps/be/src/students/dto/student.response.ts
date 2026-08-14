import { ApiProperty } from '@nestjs/swagger';
import {
  AnalysisJobStatus,
  WeaknessTag,
} from '../../generated/prisma/client.js';

export class StudentReadResponse {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  coachAccountId: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty({ type: Number, nullable: true })
  birthYear: number | null;

  @ApiProperty({ type: Number, nullable: true })
  rating: number | null;

  @ApiProperty({ type: String, nullable: true })
  notes: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  archivedAt: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}

export class StudentListItemResponse {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty({ type: Number, nullable: true })
  birthYear: number | null;

  @ApiProperty({ type: Number, nullable: true })
  rating: number | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  archivedAt: Date | null;

  @ApiProperty()
  completedAnalysisCount: number;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastAnalysisAt: Date | null;

  @ApiProperty({ enum: AnalysisJobStatus, nullable: true })
  latestAnalysisJobStatus: AnalysisJobStatus | null;

  @ApiProperty({ enum: WeaknessTag, nullable: true })
  mainWeaknessTag: WeaknessTag | null;
}

export class StudentListResponse {
  @ApiProperty({ type: () => [StudentListItemResponse] })
  items: StudentListItemResponse[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
