import type { components, paths } from "@/shared/api/apiTypes";

type RecentGameResponse = components["schemas"]["RecentGameResponse"];

export type GameDetailsResponse = RecentGameResponse & {
  annotationCoverage: "NONE" | "PARTIAL" | "FULL";
  createdAt: string;
  hasEngineAnnotations: boolean;
  reducedConfidenceWarning: string | null;
  sourceType: "LICHESS_IMPORT" | "MANUAL_PGN";
  studentId: string;
  updatedAt: string;
};

export type AnalysisDetailsResponse =
  paths["/api/analysis/{analysisId}"]["get"]["responses"][200]["content"]["application/json"];

export type AnalysisJobListResponse =
  paths["/api/analysis/jobs"]["get"]["responses"][200]["content"]["application/json"];

export type AnalysisJobResponse =
  paths["/api/analysis/jobs/{jobId}"]["get"]["responses"][200]["content"]["application/json"];

export type ReportListResponse =
  paths["/api/reports"]["get"]["responses"][200]["content"]["application/json"];

export type ReportResponse =
  paths["/api/reports/{reportId}"]["get"]["responses"][200]["content"]["application/json"];
