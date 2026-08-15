import { ApiProperty } from '@nestjs/swagger';
import { AnalysisJobResponse } from './analysis-job.response.js';

export class AnalysisJobListResponse {
  @ApiProperty({ type: () => [AnalysisJobResponse] })
  items: AnalysisJobResponse[];

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  nextCursor: string | null;
}
