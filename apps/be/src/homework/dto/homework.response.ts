export class HomeworkResponse {
  id: string;
  studentId: string;
  analysisId: string;
  title: string;
  content: Record<string, unknown>;
  promptVersion: string;
  model: string;
  createdAt: Date;
  updatedAt: Date;
}
