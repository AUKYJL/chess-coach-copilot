import {
  studentAnalysisProfileMock,
  studentLessonPreviewMock,
  studentOverviewMock,
  studentPerformanceTrendMock,
  studentProgressMock,
} from "./mocks";
import type {
  PerformanceTrendResponse,
  StudentAnalysisProfileResponse,
  StudentLessonPreviewResponse,
  StudentOverviewResponse,
  StudentProgressResponse,
} from "@/shared/api/student";

import type {
  OverviewScenario,
  OverviewScenarioResources,
  ResourceStatus,
  SectionResource,
} from "./resource-state";
import {
  isStudentOverviewScenarioId,
  type StudentOverviewScenarioId,
} from "./scenario";

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

function createResource<T>(
  status: ResourceStatus,
  data: T | null,
  errorMessage?: string,
): SectionResource<T> {
  return {
    status,
    data,
    errorMessage,
    retriable: status === "error",
  };
}

function createBaseResources(): OverviewScenarioResources {
  return {
    overview: createResource("ready", cloneValue(studentOverviewMock)),
    analysisProfile: createResource(
      "ready",
      cloneValue(studentAnalysisProfileMock),
    ),
    lessonPreview: createResource("ready", cloneValue(studentLessonPreviewMock)),
    performanceTrend: createResource(
      "ready",
      cloneValue(studentPerformanceTrendMock),
    ),
    progressDetails: createResource("ready", cloneValue(studentProgressMock)),
  };
}

function createScenario(
  id: StudentOverviewScenarioId,
  label: string,
  mutate?: (resources: OverviewScenarioResources) => void,
): OverviewScenario {
  const resources = createBaseResources();

  mutate?.(resources);

  return {
    id,
    label,
    resources,
  };
}

const populatedScenario = createScenario("populated", "Populated overview");

const newStudentScenario = createScenario(
  "new-student",
  "New student",
  (resources) => {
    const overview = resources.overview.data;
    const analysisProfile = resources.analysisProfile.data;
    const trend = resources.performanceTrend.data;
    const progress = resources.progressDetails?.data;

    if (!overview || !analysisProfile || !trend || !progress) {
      return;
    }

    overview.student.displayName = "Mila Petrova";
    overview.student.rating = null;
    overview.student.birthYear = null;
    overview.student.notes = null;
    overview.externalAccounts = [];
    overview.stats.analysisCount = 0;
    overview.stats.gameCount = 0;
    overview.stats.reportCount = 0;
    overview.stats.homeworkCount = 0;
    overview.latestProgress = null;
    overview.recentGames = [];
    overview.recentAnalyses = [];
    overview.recentReports = [];
    overview.recentHomework = [];

    analysisProfile.analysisCountUsed = 0;
    analysisProfile.mainWeaknessTag = null;
    analysisProfile.secondaryWeaknessTags = [];
    analysisProfile.tagCounts = [];
    analysisProfile.severityCounts = [];
    analysisProfile.sampleMistakes = [];
    analysisProfile.recommendedLessonTitle = null;
    resources.lessonPreview = createResource<StudentLessonPreviewResponse>(
      "ready",
      {
        recommendedLessonTitle: null,
        recommendedLessonWhy: null,
        recommendedFocusPoints: [],
      },
    );

    trend.direction = "UNKNOWN";
    trend.primaryMetric = "Trend will appear after the first annotated games";
    trend.points = [];

    progress.status = "not-enough-data";
    progress.requiredAnalysisCount = 3;
    progress.availableAnalysisCount = 0;
    progress.snapshot = null;
  },
);

const earlySignalScenario = createScenario(
  "early-signal",
  "Early signal",
  (resources) => {
    const overview = resources.overview.data;
    const analysisProfile = resources.analysisProfile.data;
    const trend = resources.performanceTrend.data;
    const progress = resources.progressDetails?.data;

    if (!overview || !analysisProfile || !trend || !progress) {
      return;
    }

    overview.student.displayName = "Nora Sokolova";
    overview.student.rating = 1180;
    overview.stats.analysisCount = 2;
    overview.stats.gameCount = 6;
    overview.stats.reportCount = 1;
    overview.stats.homeworkCount = 1;
    overview.latestProgress = {
      id: "progress-early-signal",
      analysisCount: 2,
      createdAt: "2026-08-08T12:00:00Z",
    };
    overview.recentReports = overview.recentReports.slice(0, 1);
    overview.recentHomework = overview.recentHomework.slice(0, 1);

    analysisProfile.analysisCountUsed = 2;
    analysisProfile.mainWeaknessTag = "CALCULATION_DEPTH";
    analysisProfile.tagCounts = [{ tag: "CALCULATION_DEPTH", count: 2 }];
    analysisProfile.severityCounts = [{ severity: "INACCURACY", count: 2 }];
    analysisProfile.sampleMistakes = [
      {
        ...analysisProfile.sampleMistakes[0],
        explanation:
          "There is an early signal that candidate moves are being selected too quickly, but the sample is still small.",
        suggestedFix:
          "Keep reviewing forcing replies before calling this a stable pattern.",
      },
    ];
    analysisProfile.recommendedLessonTitle =
      "Confirm candidate moves before committing";
    resources.lessonPreview = createResource<StudentLessonPreviewResponse>(
      "ready",
      {
        recommendedLessonTitle:
          "Confirm candidate moves before committing",
        recommendedLessonWhy:
          "Nora is spotting playable ideas, but she still commits before checking the opponent's forcing replies.",
        recommendedFocusPoints: [
          "Checks, captures, and threats before every move",
          "Compare two candidate moves before choosing",
          "Name the opponent's direct threat aloud",
        ],
      },
    );

    trend.direction = "STABLE";
    trend.primaryMetric = "Initial lesson-readiness signal";
    trend.points = [
      { date: "2026-07-20", value: 1172 },
      { date: "2026-07-29", value: 1179 },
      { date: "2026-08-08", value: 1180 },
    ];

    progress.status = "not-enough-data";
    progress.requiredAnalysisCount = 3;
    progress.availableAnalysisCount = 2;
    progress.snapshot = null;
  },
);

const analysisProcessingScenario = createScenario(
  "analysis-processing",
  "Analysis processing",
  (resources) => {
    const overview = resources.overview.data;

    if (!overview) {
      return;
    }

    overview.latestProgress = {
      id: "progress-processing",
      analysisCount: 1,
      createdAt: "2026-08-09T13:40:00Z",
    };
    overview.recentGames = [
      {
        ...overview.recentGames[0],
        sourceLabel: "Fresh import",
        latestAnalysisJobStatus: "PARSING",
        latestAnalysisId: null,
        importedAt: "2026-08-09T13:40:00Z",
      },
      ...overview.recentGames.slice(1, 3),
    ];

    resources.analysisProfile = createResource<StudentAnalysisProfileResponse>(
      "loading",
      null,
    );
    resources.lessonPreview = createResource<StudentLessonPreviewResponse>(
      "loading",
      null,
    );
    resources.performanceTrend = createResource<PerformanceTrendResponse>(
      "loading",
      null,
    );
    resources.progressDetails = createResource<StudentProgressResponse>(
      "loading",
      null,
    );
  },
);

const analysisFailedScenario = createScenario(
  "analysis-failed",
  "Analysis failed",
  (resources) => {
    const overview = resources.overview.data;
    const analysisProfile = resources.analysisProfile.data;
    const trend = resources.performanceTrend.data;
    const progress = resources.progressDetails?.data;

    if (!overview || !analysisProfile || !trend || !progress) {
      return;
    }

    overview.recentGames = [
      {
        ...overview.recentGames[0],
        latestAnalysisJobStatus: "FAILED",
        latestAnalysisId: null,
        importedAt: "2026-08-09T11:00:00Z",
      },
      ...overview.recentGames.slice(1, 3),
    ];

    analysisProfile.mainWeaknessTag = null;
    analysisProfile.tagCounts = [];
    analysisProfile.severityCounts = [];
    analysisProfile.sampleMistakes = [];
    analysisProfile.recommendedLessonTitle = null;
    resources.lessonPreview = createResource<StudentLessonPreviewResponse>(
      "ready",
      {
        recommendedLessonTitle: null,
        recommendedLessonWhy: null,
        recommendedFocusPoints: [],
      },
    );

    trend.direction = "UNKNOWN";
    trend.primaryMetric = "Trend unavailable until analysis succeeds";
    trend.points = [];

    progress.status = "not-enough-data";
    progress.snapshot = null;
    progress.availableAnalysisCount = 1;
  },
);

const insufficientProgressScenario = createScenario(
  "insufficient-progress",
  "Insufficient progress",
  (resources) => {
    const overview = resources.overview.data;
    const trend = resources.performanceTrend.data;
    const progress = resources.progressDetails?.data;

    if (!overview || !trend || !progress) {
      return;
    }

    overview.stats.analysisCount = 2;
    overview.latestProgress = null;

    trend.direction = "UNKNOWN";
    trend.primaryMetric = "Trend will unlock after more reviewed games";
    trend.points = [];

    progress.status = "not-enough-data";
    progress.requiredAnalysisCount = 3;
    progress.availableAnalysisCount = 2;
    progress.snapshot = null;
  },
);

const archivedScenario = createScenario("archived", "Archived", (resources) => {
  const overview = resources.overview.data;

  if (!overview) {
    return;
  }

  overview.student.archivedAt = "2026-08-03T09:00:00Z";
});

const sectionErrorScenario = createScenario(
  "section-error",
  "Section error",
  (resources) => {
    resources.analysisProfile = createResource<StudentAnalysisProfileResponse>(
      "error",
      null,
      "Weakness and lesson signals could not be loaded from local mock state.",
    );
    resources.lessonPreview = createResource<StudentLessonPreviewResponse>(
      "error",
      null,
      "Lesson recommendation preview is temporarily unavailable in this review state.",
    );
    resources.performanceTrend = createResource<PerformanceTrendResponse>(
      "error",
      null,
      "Performance trend could not be loaded from local mock state.",
    );
    resources.progressDetails = createResource<StudentProgressResponse>(
      "error",
      null,
      "Progress insight is temporarily unavailable in this review state.",
    );
  },
);

const overviewErrorScenario = createScenario(
  "overview-error",
  "Overview error",
  (resources) => {
    resources.overview = createResource<StudentOverviewResponse>(
      "error",
      null,
      "The primary overview resource failed before the workspace could be composed.",
    );
    resources.analysisProfile = createResource(
      "ready",
      cloneValue(studentAnalysisProfileMock),
    );
    resources.lessonPreview = createResource(
      "ready",
      cloneValue(studentLessonPreviewMock),
    );
    resources.performanceTrend = createResource(
      "ready",
      cloneValue(studentPerformanceTrendMock),
    );
    resources.progressDetails = createResource(
      "ready",
      cloneValue(studentProgressMock),
    );
  },
);

const loadingScenario = createScenario("loading", "Loading", (resources) => {
  resources.overview = createResource<StudentOverviewResponse>("loading", null);
  resources.analysisProfile = createResource<StudentAnalysisProfileResponse>(
    "loading",
    null,
  );
  resources.lessonPreview = createResource<StudentLessonPreviewResponse>(
    "loading",
    null,
  );
  resources.performanceTrend = createResource<PerformanceTrendResponse>(
    "loading",
    null,
  );
  resources.progressDetails = createResource<StudentProgressResponse>(
    "loading",
    null,
  );
});

const missingOptionalIdentityScenario = createScenario(
  "missing-optional-identity",
  "Missing optional identity",
  (resources) => {
    const overview = resources.overview.data;

    if (!overview) {
      return;
    }

    overview.student.displayName = "Sasha Moroz";
    overview.student.rating = null;
    overview.student.birthYear = null;
  },
);

export const studentOverviewScenarios: Record<
  StudentOverviewScenarioId,
  OverviewScenario
> = {
  populated: populatedScenario,
  "new-student": newStudentScenario,
  "early-signal": earlySignalScenario,
  "analysis-processing": analysisProcessingScenario,
  "analysis-failed": analysisFailedScenario,
  "insufficient-progress": insufficientProgressScenario,
  archived: archivedScenario,
  "section-error": sectionErrorScenario,
  "overview-error": overviewErrorScenario,
  loading: loadingScenario,
  "missing-optional-identity": missingOptionalIdentityScenario,
};

export function getStudentOverviewScenario(
  scenarioId?: string,
): OverviewScenario {
  if (scenarioId && isStudentOverviewScenarioId(scenarioId)) {
    return cloneValue(studentOverviewScenarios[scenarioId]);
  }

  return cloneValue(populatedScenario);
}
