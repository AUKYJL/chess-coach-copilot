import type {
  PerformanceTrendResponse,
  StudentAnalysisProfileResponse,
  StudentLessonPreviewResponse,
  StudentOverviewResponse,
  StudentProgressResponse,
} from "@/shared/api/student";

import type { OverviewScenarioLocalState } from "./dialog-state";
import type { StudentOverviewScenarioId } from "./scenario";

export type ResourceStatus = "ready" | "loading" | "error";

export type SectionResource<T> = {
  status: ResourceStatus;
  data: T | null;
  errorMessage?: string;
  retriable: boolean;
};

export type OverviewScenarioResources = {
  overview: SectionResource<StudentOverviewResponse>;
  analysisProfile: SectionResource<StudentAnalysisProfileResponse>;
  lessonPreview: SectionResource<StudentLessonPreviewResponse>;
  performanceTrend: SectionResource<PerformanceTrendResponse>;
  progressDetails?: SectionResource<StudentProgressResponse>;
};

export type OverviewScenario = {
  id: StudentOverviewScenarioId;
  label: string;
  resources: OverviewScenarioResources;
  localState?: OverviewScenarioLocalState;
};

export type StudentOverviewQueryStatus = "ready" | "loading" | "error";
