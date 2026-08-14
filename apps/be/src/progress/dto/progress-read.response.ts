import { ApiProperty } from '@nestjs/swagger';

export class ProgressSnapshotResponse {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  studentId: string;

  @ApiProperty()
  analysisCount: number;

  @ApiProperty({ type: 'object', additionalProperties: true })
  summary: Record<string, unknown>;

  @ApiProperty()
  promptVersion: string;

  @ApiProperty()
  model: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}

export class ProgressReadResponse {
  @ApiProperty({ enum: ['ready', 'not-enough-data'] })
  status: string;

  @ApiProperty()
  requiredAnalysisCount: number;

  @ApiProperty()
  availableAnalysisCount: number;

  @ApiProperty({ type: () => ProgressSnapshotResponse, nullable: true })
  snapshot: ProgressSnapshotResponse | null;
}
