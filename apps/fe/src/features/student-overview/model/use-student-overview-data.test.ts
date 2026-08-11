import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useStudentOverviewData } from "./use-student-overview-data";

describe("useStudentOverviewData", () => {
  it("returns populated lesson-prep data for the default scenario", () => {
    const { result } = renderHook(() =>
      useStudentOverviewData({
        studentId: "demo-student",
      }),
    );

    expect(result.current.status).toBe("ready");
    expect(result.current.data?.student.displayName).toBe("Alexander Ivanov");
    expect(result.current.data?.summaryCards).toHaveLength(4);
    expect(result.current.data?.recentGames).toHaveLength(3);
    expect(result.current.data?.nextLesson.title).toBe(
      "Recognizing opponent threats",
    );
  });

  it("recovers section-level failures locally without collapsing the overview", () => {
    const { result } = renderHook(() =>
      useStudentOverviewData({
        studentId: "demo-student",
        scenarioId: "section-error",
      }),
    );

    expect(result.current.status).toBe("ready");
    expect(result.current.scenario.resources.analysisProfile.status).toBe(
      "error",
    );

    act(() => {
      result.current.retry();
    });

    expect(result.current.status).toBe("ready");
    expect(result.current.scenario.resources.analysisProfile.status).toBe(
      "ready",
    );
    expect(result.current.scenario.resources.performanceTrend.status).toBe(
      "ready",
    );
  });

  it("keeps progress insight loading state truthful when overview.latestProgress exists", () => {
    const { result } = renderHook(() =>
      useStudentOverviewData({
        studentId: "demo-student",
        scenarioId: "analysis-processing",
      }),
    );

    expect(result.current.status).toBe("ready");
    expect(result.current.data?.progressInsight?.summary).toMatch(
      /still being processed/i,
    );
  });

  it("keeps progress insight error state truthful when section resources fail", () => {
    const { result } = renderHook(() =>
      useStudentOverviewData({
        studentId: "demo-student",
        scenarioId: "section-error",
      }),
    );

    expect(result.current.status).toBe("ready");
    expect(result.current.data?.progressInsight?.summary).toBe(
      "Progress insight is temporarily unavailable in this review state.",
    );
  });

  it("recovers overview errors locally on retry", () => {
    const { result } = renderHook(() =>
      useStudentOverviewData({
        studentId: "demo-student",
        scenarioId: "overview-error",
      }),
    );

    expect(result.current.status).toBe("error");

    act(() => {
      result.current.retry();
    });

    expect(result.current.status).toBe("ready");
    expect(result.current.data?.student.displayName).toBe("Alexander Ivanov");
  });

  it("toggles archive and restore locally only", () => {
    const { result } = renderHook(() =>
      useStudentOverviewData({
        studentId: "demo-student",
      }),
    );

    expect(result.current.data?.student.statusLabel).toBe("Active student");

    act(() => {
      result.current.toggleArchived();
    });

    expect(result.current.data?.student.statusLabel).toBe("Archived student");

    act(() => {
      result.current.toggleArchived();
    });

    expect(result.current.data?.student.statusLabel).toBe("Active student");
  });

  it("tracks dialog open, cancel, and submit transitions locally", () => {
    const { result } = renderHook(() =>
      useStudentOverviewData({
        studentId: "demo-student",
      }),
    );

    act(() => {
      result.current.openDialog("analyze-game");
    });

    expect(result.current.dialogState.kind).toBe("analyze-game");

    act(() => {
      result.current.closeDialog();
    });

    expect(result.current.dialogState.kind).toBeNull();

    act(() => {
      result.current.submitAnalyzeGame({
        rawPgn:
          '[Event "Training"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6?! {Too loose} 1-0',
        studentColor: "WHITE",
        sourceLabel: "Annotated export",
      });
    });

    expect(
      result.current.scenario.localState?.analyzeGameDraft?.sourceLabel,
    ).toBe("Annotated export");

    act(() => {
      result.current.submitEditStudent({
        displayName: "Alex Ivanov",
        birthYear: 2011,
        rating: 1700,
        notes: "Updated locally",
      });
    });

    expect(result.current.data?.student.displayName).toBe("Alex Ivanov");
    expect(result.current.data?.coachNotes.body).toBe("Updated locally");

    act(() => {
      result.current.openDialog("chess-accounts", {
        editingChessAccountId: "14f5773e-3fef-45ce-8ffc-871fba38625c",
      });
      result.current.submitChessAccount(
        {
          platform: "LICHESS",
          username: "alexander_ivanov_updated",
        },
        {
          accountId: "14f5773e-3fef-45ce-8ffc-871fba38625c",
        },
      );
    });

    expect(result.current.data?.chessAccounts[0]?.username).toBe(
      "alexander_ivanov_updated",
    );

    act(() => {
      result.current.submitCoachNotes({
        notes: "Careful when the opponent has forcing checks.",
      });
    });

    expect(result.current.data?.coachNotes.body).toBe(
      "Careful when the opponent has forcing checks.",
    );
  });

  it("initializes local scenario state from the provided scenario identity", () => {
    const { result } = renderHook(() =>
      useStudentOverviewData({
        studentId: "demo-student",
        scenarioId: "missing-optional-identity",
      }),
    );

    expect(result.current.data?.student.displayName).toBe("Sasha Moroz");
    expect(result.current.dialogState.kind).toBeNull();
  });
});
