import { ApiProperty } from '@nestjs/swagger';
import { ReportAudience } from '../../generated/prisma/client.js';

export class ReportResponse {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  coachAccountId: string;

  @ApiProperty({ format: 'uuid' })
  studentId: string;

  @ApiProperty({ format: 'uuid' })
  analysisId: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ enum: ReportAudience })
  audience: ReportAudience;

  @ApiProperty({ type: 'object', additionalProperties: true })
  content: Record<string, unknown>;

  @ApiProperty()
  promptVersion: string;

  @ApiProperty()
  model: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}
