import { ApiProperty } from '@nestjs/swagger';
import { ReportResponse } from './report.response.js';

export class ReportListResponse {
  @ApiProperty({ type: () => [ReportResponse] })
  items: ReportResponse[];
}
