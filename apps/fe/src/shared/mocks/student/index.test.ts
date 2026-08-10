import {
  studentAnalysisProfileMock,
  studentLessonPreviewMock,
  studentOverviewMock,
  studentPerformanceTrendMock,
  studentProgressMock,
} from ".";
import { describe, expect, it } from "vitest";

describe("shared student transport mocks", () => {
  it("exports endpoint-shaped overview resources instead of page view-model fixtures", () => {
    expect(Object.keys(studentOverviewMock).sort()).toEqual([
      "externalAccounts",
      "latestProgress",
      "recentAnalyses",
      "recentGames",
      "recentHomework",
      "recentReports",
      "stats",
      "student",
    ]);
    expect(Object.keys(studentAnalysisProfileMock).sort()).toEqual([
      "analysisCountUsed",
      "mainWeaknessTag",
      "recommendedLessonTitle",
      "sampleMistakes",
      "secondaryWeaknessTags",
      "severityCounts",
      "tagCounts",
    ]);
    expect(Object.keys(studentLessonPreviewMock).sort()).toEqual([
      "recommendedFocusPoints",
      "recommendedLessonTitle",
      "recommendedLessonWhy",
    ]);
    expect(Object.keys(studentPerformanceTrendMock).sort()).toEqual([
      "direction",
      "points",
      "primaryMetric",
      "range",
    ]);
    expect(Object.keys(studentProgressMock).sort()).toEqual([
      "availableAnalysisCount",
      "requiredAnalysisCount",
      "snapshot",
      "status",
    ]);
  });

  it("does not leak page-only derived fields into transport mocks", () => {
    expect(studentOverviewMock).not.toHaveProperty("summaryCards");
    expect(studentOverviewMock).not.toHaveProperty("recentMaterials");
    expect(studentAnalysisProfileMock).not.toHaveProperty("mainWeakness");
    expect(studentLessonPreviewMock).not.toHaveProperty("supportingText");
    expect(studentPerformanceTrendMock).not.toHaveProperty("directionLabel");
    expect(studentProgressMock).not.toHaveProperty("supportingText");
  });
});
