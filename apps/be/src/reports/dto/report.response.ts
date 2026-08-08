import { ReportAudience } from '../../generated/prisma/client.js';

export class ReportResponse {
  id: string;
  studentId: string;
  analysisId: string;
  title: string;
  audience: ReportAudience;
  content: Record<string, unknown>;
  promptVersion: string;
  model: string;
  createdAt: Date;
  updatedAt: Date;
}
