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
