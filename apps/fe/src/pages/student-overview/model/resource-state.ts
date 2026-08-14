import type {
  AnalysisDetailsResponse,
  StudentAnalysisProfileResponse,
  StudentOverviewResponse,
  StudentPerformanceTrendResponse,
  StudentProgressResponse,
} from "./api-types";

export type ResourceStatus = "ready" | "loading" | "error";

export type SectionResource<T> = {
  status: ResourceStatus;
  data: T | null;
  errorMessage?: string;
  retriable: boolean;
};

export type StudentOverviewResources = {
  overview: SectionResource<StudentOverviewResponse>;
  analysisProfile: SectionResource<StudentAnalysisProfileResponse>;
  lessonPreview: SectionResource<AnalysisDetailsResponse>;
  performanceTrend: SectionResource<StudentPerformanceTrendResponse>;
  progressDetails: SectionResource<StudentProgressResponse>;
};

export type StudentOverviewQueryStatus = "ready" | "loading" | "error";
