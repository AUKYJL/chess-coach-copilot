import type { paths } from "@/shared/api/apiTypes";

export type StudentOverviewResponse =
  paths["/api/students/{studentId}/overview"]["get"]["responses"][200]["content"]["application/json"];

export type StudentAnalysisProfileResponse =
  paths["/api/students/{studentId}/analysis-profile"]["get"]["responses"][200]["content"]["application/json"];

export type StudentPerformanceTrendResponse =
  paths["/api/students/{studentId}/performance-trend"]["get"]["responses"][200]["content"]["application/json"];

export type StudentProgressResponse =
  paths["/api/students/{studentId}/progress"]["get"]["responses"][200]["content"]["application/json"];

export type AnalysisDetailsResponse =
  paths["/api/analysis/{analysisId}"]["get"]["responses"][200]["content"]["application/json"];

export type UpdateStudentRequest =
  paths["/api/students/{studentId}"]["patch"]["requestBody"]["content"]["application/json"];

export type SetStudentArchiveRequest =
  paths["/api/students/{studentId}/archive"]["post"]["requestBody"]["content"]["application/json"];

export type CreateExternalAccountRequest =
  paths["/api/students/{studentId}/external-accounts"]["post"]["requestBody"]["content"]["application/json"];

export type UpdateExternalAccountRequest =
  paths["/api/students/{studentId}/external-accounts/{externalAccountId}"]["patch"]["requestBody"]["content"]["application/json"];

export type ImportPgnRequest =
  paths["/api/students/{studentId}/imports/pgn"]["post"]["requestBody"]["content"]["application/json"];

export type ExternalPlatform = CreateExternalAccountRequest["platform"];
export type StudentColor = ImportPgnRequest["studentColor"];
export type ExternalAccountRecord = StudentOverviewResponse["externalAccounts"][number];
export type RecentGameRecord = StudentOverviewResponse["recentGames"][number];
export type PerformanceTrendPoint =
  StudentPerformanceTrendResponse["points"][number];
export type PerformanceDirection =
  StudentPerformanceTrendResponse["direction"];
export type SeverityLevel =
  StudentAnalysisProfileResponse["severityCounts"][number]["severity"];
