import { ApiProperty } from '@nestjs/swagger';
import { ReportAudience, ReportSource } from '../../generated/prisma/client.js';

class ReportContentResponse {
  @ApiProperty()
  text: string;
}

export class ReportResponse {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  coachAccountId: string;

  @ApiProperty({ format: 'uuid' })
  studentId: string;

  @ApiProperty({ format: 'uuid' })
  gameId: string;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  analysisId: string | null;

  @ApiProperty()
  title: string;

  @ApiProperty({ enum: ReportAudience })
  audience: ReportAudience;

  @ApiProperty({ enum: ReportSource })
  source: ReportSource;

  @ApiProperty({ type: () => ReportContentResponse })
  content: ReportContentResponse;

  @ApiProperty({ type: String, nullable: true })
  promptVersion: string | null;

  @ApiProperty({ type: String, nullable: true })
  model: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}
