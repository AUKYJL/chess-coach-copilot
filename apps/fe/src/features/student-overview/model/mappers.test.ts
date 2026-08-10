import { describe, expect, it } from "vitest";

import {
  studentAnalysisProfileMock,
  studentLessonPreviewMock,
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
    lessonPreview: {
      status: "ready",
      data: structuredClone(studentLessonPreviewMock),
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
    expect(viewModel.nextLesson.focusPoints).toEqual(
      studentLessonPreviewMock.recommendedFocusPoints,
    );
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
    expect(viewModel.performanceTrend.tone).toBe("success");
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

  it("maps supplied lesson preview details from the transport boundary", () => {
    const resources = createResources({
      lessonPreview: {
        status: "ready",
        retriable: false,
        data: {
          recommendedLessonTitle: "Neutralize forcing replies before attacking",
          recommendedLessonWhy:
            "The student is launching play on one wing while the opponent's forcing response is still unresolved.",
          recommendedFocusPoints: [
            "List forcing replies before every pawn push",
            "Compare your plan against the opponent's best counter",
          ],
        },
      },
    });

    const viewModel = mapStudentOverviewViewModel(resources);

    expect(viewModel.nextLesson.title).toBe(
      "Neutralize forcing replies before attacking",
    );
    expect(viewModel.nextLesson.rationale).toBe(
      "The student is launching play on one wing while the opponent's forcing response is still unresolved.",
    );
    expect(viewModel.nextLesson.focusPoints).toEqual([
      "List forcing replies before every pawn push",
      "Compare your plan against the opponent's best counter",
    ]);
  });

  it("allows different fixtures to produce different lesson focus points", () => {
    const firstViewModel = mapStudentOverviewViewModel(
      createResources({
        lessonPreview: {
          status: "ready",
          retriable: false,
          data: {
            recommendedLessonTitle: "Counterplay awareness",
            recommendedLessonWhy: "First fixture rationale",
            recommendedFocusPoints: [
              "Track the opponent's forcing move first",
              "State the biggest threat before moving",
            ],
          },
        },
      }),
    );
    const secondViewModel = mapStudentOverviewViewModel(
      createResources({
        lessonPreview: {
          status: "ready",
          retriable: false,
          data: {
            recommendedLessonTitle: "Candidate move discipline",
            recommendedLessonWhy: "Second fixture rationale",
            recommendedFocusPoints: [
              "Write down two candidate moves",
              "Reject moves that fail tactically",
            ],
          },
        },
      }),
    );

    expect(firstViewModel.nextLesson.focusPoints).toEqual([
      "Track the opponent's forcing move first",
      "State the biggest threat before moving",
    ]);
    expect(secondViewModel.nextLesson.focusPoints).toEqual([
      "Write down two candidate moves",
      "Reject moves that fail tactically",
    ]);
  });

  it("does not synthesize the previous default three lesson bullets when the transport does not supply them", () => {
    const viewModel = mapStudentOverviewViewModel(
      createResources({
        lessonPreview: {
          status: "ready",
          retriable: false,
          data: {
            recommendedLessonTitle: "Recognizing opponent threats",
            recommendedLessonWhy: null,
            recommendedFocusPoints: [],
          },
        },
      }),
    );

    expect(viewModel.nextLesson.focusPoints).toEqual([]);
    expect(viewModel.nextLesson.focusPoints).not.toEqual([
      "Checks, captures, and threats",
      "Candidate moves before committing",
      "Defensive tactical motifs",
    ]);
  });

  it("renders a truthful reduced lesson state when optional recommendation details are missing", () => {
    const viewModel = mapStudentOverviewViewModel(
      createResources({
        lessonPreview: {
          status: "ready",
          retriable: false,
          data: {
            recommendedLessonTitle: "Recognizing opponent threats",
            recommendedLessonWhy: null,
            recommendedFocusPoints: [],
          },
        },
      }),
    );

    expect(viewModel.nextLesson.title).toBe("Recognizing opponent threats");
    expect(viewModel.nextLesson.rationale).toMatch(
      /lightweight recommendation data includes the lesson title/i,
    );
    expect(viewModel.nextLesson.focusPoints).toEqual([]);
  });

  it("keeps recommendedLessonTitle truthful for early and no-data lesson states", () => {
    const earlySignalViewModel = mapStudentOverviewViewModel(
      createResources({
        analysisProfile: {
          status: "ready",
          retriable: false,
          data: {
            ...structuredClone(studentAnalysisProfileMock),
            recommendedLessonTitle:
              "Confirm candidate moves before committing",
          },
        },
        lessonPreview: {
          status: "ready",
          retriable: false,
          data: {
            recommendedLessonTitle:
              "Confirm candidate moves before committing",
            recommendedLessonWhy:
              "An early pattern suggests that the first playable move is being chosen too quickly.",
            recommendedFocusPoints: [
              "Compare two candidate moves before choosing",
            ],
          },
        },
      }),
    );
    const noDataViewModel = mapStudentOverviewViewModel(
      createResources({
        analysisProfile: {
          status: "ready",
          retriable: false,
          data: {
            ...structuredClone(studentAnalysisProfileMock),
            analysisCountUsed: 0,
            recommendedLessonTitle: null,
          },
        },
        lessonPreview: {
          status: "ready",
          retriable: false,
          data: {
            recommendedLessonTitle: null,
            recommendedLessonWhy: null,
            recommendedFocusPoints: [],
          },
        },
      }),
    );

    expect(earlySignalViewModel.nextLesson.title).toBe(
      "Confirm candidate moves before committing",
    );
    expect(noDataViewModel.nextLesson.title).toBe(
      "Lesson focus available after analysis",
    );
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

  it("keeps progress insight loading and error states visible even with latestProgress present", () => {
    const loadingViewModel = mapStudentOverviewViewModel(
      createResources({
        progressDetails: {
          status: "loading",
          data: null,
          retriable: false,
        },
      }),
    );
    const errorViewModel = mapStudentOverviewViewModel(
      createResources({
        progressDetails: {
          status: "error",
          data: null,
          errorMessage:
            "Progress insight is temporarily unavailable in this review state.",
          retriable: true,
        },
      }),
    );

    expect(loadingViewModel.progressInsight?.summary).toMatch(
      /still being processed/i,
    );
    expect(errorViewModel.progressInsight?.summary).toBe(
      "Progress insight is temporarily unavailable in this review state.",
    );
  });

  it("maps stable trends and severity counts to semantic tones instead of positional styling", () => {
    const viewModel = mapStudentOverviewViewModel(
      createResources({
        analysisProfile: {
          status: "ready",
          retriable: false,
          data: {
            ...structuredClone(studentAnalysisProfileMock),
            severityCounts: [{ severity: "INACCURACY", count: 2 }],
          },
        },
        performanceTrend: {
          status: "ready",
          retriable: false,
          data: {
            ...structuredClone(studentPerformanceTrendMock),
            direction: "STABLE",
          },
        },
      }),
    );

    expect(viewModel.performanceTrend.tone).toBe("info");
    expect(viewModel.summaryCards[3]?.tone).toBe("info");
    expect(viewModel.weaknessProfile.severitySummary).toEqual([
      {
        label: "Inaccuracy",
        count: 2,
        tone: "info",
      },
    ]);
  });
});
