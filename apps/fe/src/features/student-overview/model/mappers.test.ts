import { describe, expect, it } from "vitest";

import {
  studentAnalysisProfileMock,
  studentOverviewMock,
  studentPerformanceTrendMock,
  studentProgressMock,
} from "@/shared/mocks/student";

import {
  getAnalyzedGamesCount,
  getStudentInitials,
  mapStudentOverviewViewModel,
} from "./mappers";
import type { OverviewScenarioResources } from "./types";

function createResources(
  overrides?: Partial<OverviewScenarioResources>,
): OverviewScenarioResources {
  return {
    overview: {
      status: "ready",
      data: structuredClone(studentOverviewMock),
      retriable: false,
    },
    analysisProfile: {
      status: "ready",
      data: structuredClone(studentAnalysisProfileMock),
      retriable: false,
    },
    performanceTrend: {
      status: "ready",
      data: structuredClone(studentPerformanceTrendMock),
      retriable: false,
    },
    progressDetails: {
      status: "ready",
      data: structuredClone(studentProgressMock),
      retriable: false,
    },
    ...overrides,
  };
}

describe("student overview mappers", () => {
  it("creates deterministic initials", () => {
    expect(getStudentInitials("Alexander Ivanov")).toBe("AI");
    expect(getStudentInitials("  Magnus  ")).toBe("M");
    expect(getStudentInitials("")).toBe("?");
  });

  it("maps populated lesson-prep sections and summary cards", () => {
    const viewModel = mapStudentOverviewViewModel(createResources());

    expect(viewModel.student.initials).toBe("AI");
    expect(viewModel.summaryCards.map((card) => card.label)).toEqual([
      "Current rating",
      "Analyzed games",
      "Main weakness",
      "Progress",
    ]);
    expect(viewModel.summaryCards[0]?.value).toBe("1620");
    expect(viewModel.summaryCards[1]?.value).toBe("48");
    expect(viewModel.summaryCards[2]?.value).toBe("Missed opponent threats");
    expect(viewModel.summaryCards[3]?.value).toBe("Improving");
    expect(viewModel.nextLesson.title).toBe("Recognizing opponent threats");
  });

  it("prefers overview analyzed games when present", () => {
    const resources = createResources();

    expect(getAnalyzedGamesCount(resources)).toBe(48);
    expect(mapStudentOverviewViewModel(resources).summaryCards[1]?.value).toBe(
      "48",
    );
  });

  it("falls back to analysis-profile analyzed games when overview is unavailable", () => {
    const resources = createResources({
      overview: {
        status: "ready",
        retriable: false,
        data: {
          ...studentOverviewMock,
          stats: {
            ...studentOverviewMock.stats,
            analysisCount: null,
          },
        },
      },
      analysisProfile: {
        status: "ready",
        retriable: false,
        data: {
          ...studentAnalysisProfileMock,
          analysisCountUsed: 21,
        },
      },
    });

    expect(getAnalyzedGamesCount(resources)).toBe(21);
    expect(mapStudentOverviewViewModel(resources).summaryCards[1]?.value).toBe(
      "21",
    );
  });

  it("returns a truthful empty state when both analyzed-game sources are unavailable", () => {
    const resources = createResources({
      overview: {
        status: "ready",
        retriable: false,
        data: {
          ...studentOverviewMock,
          stats: {
            ...studentOverviewMock.stats,
            analysisCount: null,
          },
        },
      },
      analysisProfile: {
        status: "ready",
        retriable: false,
        data: {
          ...studentAnalysisProfileMock,
          analysisCountUsed: null,
        },
      },
    });

    expect(getAnalyzedGamesCount(resources)).toBeNull();
    expect(mapStudentOverviewViewModel(resources).summaryCards[1]?.value).toBe(
      "No data",
    );
  });

  it("uses a dedicated progress payload only when it enriches the latest overview snapshot", () => {
    const viewModel = mapStudentOverviewViewModel(createResources());

    expect(viewModel.progressInsight?.summary).toBe(
      studentProgressMock.snapshot?.summary.summary,
    );
    expect(viewModel.performanceTrend.metricLabel).toBe(
      studentPerformanceTrendMock.primaryMetric,
    );
    expect(viewModel.performanceTrend.directionLabel).toBe("Improving");
  });

  it("falls back to overview.latestProgress when no matching /progress snapshot is needed", () => {
    const viewModel = mapStudentOverviewViewModel(
      createResources({
        progressDetails: undefined,
      }),
    );

    expect(viewModel.progressInsight?.summary).toMatch(
      /recent analysis snapshots are available/i,
    );
    expect(viewModel.progressInsight?.supportingText).toMatch(
      /latest snapshot captured/i,
    );
  });

  it("maps recent games and recent materials into coach-friendly derived rows", () => {
    const viewModel = mapStudentOverviewViewModel(createResources());

    expect(viewModel.recentGames[0]).toEqual({
      id: "846710e0-46ec-4bde-bef4-9fd035cfd8ff",
      playersLabel: "Alexander Ivanov vs Artem Iliev",
      metaLabel: "White · 0-1 · Lichess",
      openingName: "Sicilian Defense, Alapin Variation · B22",
      importedAtLabel: "Aug 7",
      analysisStateLabel: "Ready",
    });
    expect(viewModel.recentMaterials[0]?.title).toBe(
      "Candidate-move worksheet, week 32",
    );
    expect(viewModel.recentMaterials[0]?.kind).toBe("Homework");
  });

  it("returns a truthful progress empty state when analytical summary inputs are unavailable", () => {
    const viewModel = mapStudentOverviewViewModel(
      createResources({
        overview: {
          status: "ready",
          retriable: false,
          data: {
            ...structuredClone(studentOverviewMock),
            latestProgress: null,
          },
        },
        progressDetails: undefined,
      }),
    );

    expect(viewModel.progressInsight?.summary).toMatch(
      /narrative progress summary will appear here/i,
    );
    expect(viewModel.summaryCards[3]?.value).toBe("Improving");
  });
});
