export class ProgressSnapshotResponse {
  id: string;
  studentId: string;
  analysisCount: number;
  summary: Record<string, unknown>;
  promptVersion: string;
  model: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ProgressReadResponse {
  status: string;
  requiredAnalysisCount: number;
  availableAnalysisCount: number;
  snapshot: ProgressSnapshotResponse | null;
}
