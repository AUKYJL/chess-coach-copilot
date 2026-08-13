import { useEffect, useState } from "react";

import type { ExternalAccountRecord } from "@/shared/api/student";

import {
  getStudentOverviewStatus,
  mapStudentOverviewViewModel,
} from "./mappers";
import { getStudentOverviewScenario } from "./mock-scenarios";
import type {
  AnalyzeGameDraft,
  ChessAccountDraft,
  CoachNotesDraft,
  EditStudentDraft,
  OverviewScenario,
  StudentOverviewDialogState,
  StudentOverviewQueryResult,
  StudentOverviewScenarioId,
} from "./index";

type UseStudentOverviewDataOptions = {
  studentId: string;
  scenarioId?: StudentOverviewScenarioId;
};

function cloneScenario(scenario: OverviewScenario): OverviewScenario {
  return structuredClone(scenario);
}

function getScenarioBaseline(
  scenarioId: StudentOverviewScenarioId,
): OverviewScenario {
  return cloneScenario(getStudentOverviewScenario(scenarioId));
}

function createDefaultDialogState(): StudentOverviewDialogState {
  return {
    kind: null,
    editingChessAccountId: null,
  };
}

function createExternalAccountRecord(
  studentId: string,
  draft: ChessAccountDraft,
): ExternalAccountRecord {
  const timestamp = Date.now();

  return {
    id: `local-account-${timestamp}`,
    studentId,
    platform: draft.platform,
    username: draft.username,
    createdAt: new Date(timestamp).toISOString(),
    updatedAt: new Date(timestamp).toISOString(),
  };
}

function applyRetryToScenario(scenario: OverviewScenario): OverviewScenario {
  const nextScenario = cloneScenario(scenario);
  const baselineScenario = getScenarioBaseline(nextScenario.id);

  if (nextScenario.resources.overview.status === "error") {
    nextScenario.resources = structuredClone(baselineScenario.resources);
    return nextScenario;
  }

  if (nextScenario.resources.analysisProfile.status === "error") {
    nextScenario.resources.analysisProfile = structuredClone(
      baselineScenario.resources.analysisProfile,
    );
  }

  if (nextScenario.resources.lessonPreview.status === "error") {
    nextScenario.resources.lessonPreview = structuredClone(
      baselineScenario.resources.lessonPreview,
    );
  }

  if (nextScenario.resources.performanceTrend.status === "error") {
    nextScenario.resources.performanceTrend = structuredClone(
      baselineScenario.resources.performanceTrend,
    );
  }

  if (nextScenario.resources.progressDetails?.status === "error") {
    nextScenario.resources.progressDetails = structuredClone(
      baselineScenario.resources.progressDetails,
    );
  }

  return nextScenario;
}

export function useStudentOverviewData({
  studentId,
  scenarioId = "populated",
}: UseStudentOverviewDataOptions): StudentOverviewQueryResult {
  const [scenario, setScenario] = useState(() =>
    getScenarioBaseline(scenarioId),
  );
  const [dialogState, setDialogState] = useState(createDefaultDialogState);

  useEffect(() => {
    setScenario(getScenarioBaseline(scenarioId));
    setDialogState(createDefaultDialogState());
  }, [scenarioId, studentId]);

  const status = getStudentOverviewStatus(scenario.resources);

  return {
    studentId,
    scenario,
    dialogState,
    status,
    data:
      status === "ready"
        ? mapStudentOverviewViewModel(scenario.resources)
        : null,
    error:
      status === "error"
        ? (scenario.resources.overview.errorMessage ??
          "The student overview foundation failed to load.")
        : null,
    openDialog: (kind, options) => {
      setDialogState({
        kind,
        editingChessAccountId: options?.editingChessAccountId ?? null,
      });
    },
    closeDialog: () => {
      setDialogState(createDefaultDialogState());
    },
    retry: () => {
      setScenario((current) => applyRetryToScenario(current));
    },
    toggleArchived: () => {
      setScenario((current) => {
        const nextScenario = cloneScenario(current);
        const overview = nextScenario.resources.overview.data;

        if (!overview) {
          return current;
        }

        overview.student.archivedAt = overview.student.archivedAt
          ? null
          : "2026-08-10T12:00:00Z";

        return nextScenario;
      });
    },
    submitAnalyzeGame: (draft: AnalyzeGameDraft) => {
      setScenario((current) => {
        const nextScenario = cloneScenario(current);

        nextScenario.localState = {
          ...nextScenario.localState,
          analyzeGameDraft: draft,
        };

        return nextScenario;
      });
      setDialogState(createDefaultDialogState());
    },
    submitEditStudent: (draft: EditStudentDraft) => {
      setScenario((current) => {
        const nextScenario = cloneScenario(current);
        const overview = nextScenario.resources.overview.data;

        if (!overview) {
          return current;
        }

        overview.student.displayName = draft.displayName;
        overview.student.birthYear = draft.birthYear;
        overview.student.rating = draft.rating;
        overview.student.notes = draft.notes.trim() || null;

        return nextScenario;
      });
      setDialogState(createDefaultDialogState());
    },
    submitChessAccount: (draft, options) => {
      setScenario((current) => {
        const nextScenario = cloneScenario(current);
        const overview = nextScenario.resources.overview.data;

        if (!overview) {
          return current;
        }

        if (options?.accountId) {
          overview.externalAccounts = overview.externalAccounts.map(
            (account) =>
              account.id === options.accountId
                ? {
                    ...account,
                    platform: draft.platform,
                    username: draft.username,
                    updatedAt: "2026-08-10T12:00:00Z",
                  }
                : account,
          );
        } else {
          overview.externalAccounts = [
            ...overview.externalAccounts,
            createExternalAccountRecord(studentId, draft),
          ];
        }

        nextScenario.localState = {
          ...nextScenario.localState,
          chessAccountDraft: draft,
        };

        return nextScenario;
      });
      setDialogState({
        kind: "chess-accounts",
        editingChessAccountId: null,
      });
    },
    removeChessAccount: (accountId) => {
      setScenario((current) => {
        const nextScenario = cloneScenario(current);
        const overview = nextScenario.resources.overview.data;

        if (!overview) {
          return current;
        }

        overview.externalAccounts = overview.externalAccounts.filter(
          (account) => account.id !== accountId,
        );

        return nextScenario;
      });
      setDialogState({
        kind: "chess-accounts",
        editingChessAccountId: null,
      });
    },
    submitCoachNotes: (draft: CoachNotesDraft) => {
      setScenario((current) => {
        const nextScenario = cloneScenario(current);
        const overview = nextScenario.resources.overview.data;

        if (!overview) {
          return current;
        }

        overview.student.notes = draft.notes.trim() || null;

        return nextScenario;
      });
      setDialogState(createDefaultDialogState());
    },
  };
}
