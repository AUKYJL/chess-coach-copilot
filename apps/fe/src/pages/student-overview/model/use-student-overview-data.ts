import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { $api } from "@/shared/api";

import type {
  StudentOverviewDialogState,
  StudentOverviewQueryResult,
  StudentOverviewResources,
} from "./index";
import {
  getStudentOverviewStatus,
  mapStudentOverviewViewModel,
} from "./mappers";

const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";

type UseStudentOverviewDataOptions = {
  studentId: string;
};

function createDefaultDialogState(): StudentOverviewDialogState {
  return {
    kind: null,
    editingChessAccountId: null,
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.length > 0
  ) {
    return error.message;
  }

  return fallback;
}

function toSectionResource<T>(args: {
  data: T | undefined;
  error: unknown;
  fallbackMessage: string;
  isError: boolean;
  isPending: boolean;
}): {
  data: T | null;
  errorMessage?: string;
  retriable: boolean;
  status: "error" | "loading" | "ready";
} {
  if (args.isError) {
    return {
      status: "error",
      data: args.data ?? null,
      errorMessage: getErrorMessage(args.error, args.fallbackMessage),
      retriable: true,
    };
  }

  if (args.isPending) {
    return {
      status: "loading",
      data: args.data ?? null,
      retriable: false,
    };
  }

  return {
    status: "ready",
    data: args.data ?? null,
    retriable: false,
  };
}

export function useStudentOverviewData({
  studentId,
}: UseStudentOverviewDataOptions): StudentOverviewQueryResult {
  const queryClient = useQueryClient();
  const [dialogState, setDialogState] = useState(createDefaultDialogState);
  const hasStudentId = studentId.length > 0;
  const studentPathParams = useMemo(
    () => ({
      params: {
        path: {
          studentId: studentId || EMPTY_UUID,
        },
      },
    }),
    [studentId],
  );
  const overviewQueryKey = $api.queryOptions(
    "get",
    "/api/students/{studentId}/overview",
    studentPathParams,
  ).queryKey;
  const analysisProfileQueryKey = $api.queryOptions(
    "get",
    "/api/students/{studentId}/analysis-profile",
    studentPathParams,
  ).queryKey;
  const performanceTrendQueryKey = $api.queryOptions(
    "get",
    "/api/students/{studentId}/performance-trend",
    studentPathParams,
  ).queryKey;
  const progressQueryKey = $api.queryOptions(
    "get",
    "/api/students/{studentId}/progress",
    studentPathParams,
  ).queryKey;
  const overviewQuery = $api.useQuery(
    "get",
    "/api/students/{studentId}/overview",
    studentPathParams,
    {
      enabled: hasStudentId,
    },
  );
  const analysisProfileQuery = $api.useQuery(
    "get",
    "/api/students/{studentId}/analysis-profile",
    studentPathParams,
    {
      enabled: hasStudentId,
    },
  );
  const performanceTrendQuery = $api.useQuery(
    "get",
    "/api/students/{studentId}/performance-trend",
    studentPathParams,
    {
      enabled: hasStudentId,
    },
  );
  const progressQuery = $api.useQuery(
    "get",
    "/api/students/{studentId}/progress",
    studentPathParams,
    {
      enabled: hasStudentId,
    },
  );
  const latestAnalysisId = overviewQuery.data?.recentAnalyses[0]?.id ?? null;
  const lessonPreviewPathParams = useMemo(
    () => ({
      params: {
        path: {
          analysisId: latestAnalysisId ?? EMPTY_UUID,
        },
      },
    }),
    [latestAnalysisId],
  );
  const lessonPreviewQuery = $api.useQuery(
    "get",
    "/api/analysis/{analysisId}",
    lessonPreviewPathParams,
    {
      enabled: hasStudentId && latestAnalysisId !== null,
    },
  );
  const updateStudentMutation = $api.useMutation(
    "patch",
    "/api/students/{studentId}",
  );
  const archiveStudentMutation = $api.useMutation(
    "post",
    "/api/students/{studentId}/archive",
  );
  const createExternalAccountMutation = $api.useMutation(
    "post",
    "/api/students/{studentId}/external-accounts",
  );
  const updateExternalAccountMutation = $api.useMutation(
    "patch",
    "/api/students/{studentId}/external-accounts/{externalAccountId}",
  );
  const removeExternalAccountMutation = $api.useMutation(
    "delete",
    "/api/students/{studentId}/external-accounts/{externalAccountId}",
  );
  const importPgnMutation = $api.useMutation(
    "post",
    "/api/students/{studentId}/imports/pgn",
  );

  useEffect(() => {
    setDialogState(createDefaultDialogState());
  }, [studentId]);

  const resources = useMemo<StudentOverviewResources>(() => {
    const overview = toSectionResource({
      data: overviewQuery.data,
      error: overviewQuery.error,
      fallbackMessage: "Не удалось загрузить данные ученика.",
      isError: overviewQuery.isError,
      isPending: overviewQuery.isPending,
    });
    const analysisProfile = toSectionResource({
      data: analysisProfileQuery.data,
      error: analysisProfileQuery.error,
      fallbackMessage: "Не удалось загрузить профиль слабых сторон.",
      isError: analysisProfileQuery.isError,
      isPending: analysisProfileQuery.isPending,
    });
    const performanceTrend = toSectionResource({
      data: performanceTrendQuery.data,
      error: performanceTrendQuery.error,
      fallbackMessage: "Не удалось загрузить динамику результатов.",
      isError: performanceTrendQuery.isError,
      isPending: performanceTrendQuery.isPending,
    });
    const progressDetails = toSectionResource({
      data: progressQuery.data,
      error: progressQuery.error,
      fallbackMessage: "Сейчас недоступно описание прогресса.",
      isError: progressQuery.isError,
      isPending: progressQuery.isPending,
    });
    const lessonPreview =
      latestAnalysisId === null && overview.status === "ready"
        ? {
            status: "ready" as const,
            data: null,
            retriable: false,
          }
        : toSectionResource({
            data: lessonPreviewQuery.data,
            error: lessonPreviewQuery.error,
            fallbackMessage: "Не удалось загрузить следующий урок.",
            isError: lessonPreviewQuery.isError,
            isPending: lessonPreviewQuery.isPending,
          });

    return {
      overview,
      analysisProfile,
      lessonPreview,
      performanceTrend,
      progressDetails,
    };
  }, [
    analysisProfileQuery.data,
    analysisProfileQuery.error,
    analysisProfileQuery.isError,
    analysisProfileQuery.isPending,
    latestAnalysisId,
    lessonPreviewQuery.data,
    lessonPreviewQuery.error,
    lessonPreviewQuery.isError,
    lessonPreviewQuery.isPending,
    overviewQuery.data,
    overviewQuery.error,
    overviewQuery.isError,
    overviewQuery.isPending,
    performanceTrendQuery.data,
    performanceTrendQuery.error,
    performanceTrendQuery.isError,
    performanceTrendQuery.isPending,
    progressQuery.data,
    progressQuery.error,
    progressQuery.isError,
    progressQuery.isPending,
  ]);
  const status = getStudentOverviewStatus(resources);

  async function invalidateOverview() {
    await queryClient.invalidateQueries({
      queryKey: overviewQueryKey,
    });
  }

  async function invalidatePgnDependentQueries() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: overviewQueryKey,
      }),
      queryClient.invalidateQueries({
        queryKey: analysisProfileQueryKey,
      }),
      queryClient.invalidateQueries({
        queryKey: performanceTrendQueryKey,
      }),
      queryClient.invalidateQueries({
        queryKey: progressQueryKey,
      }),
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === "get" &&
          query.queryKey[1] === "/api/analysis/{analysisId}",
      }),
    ]);
  }

  return {
    studentId,
    resources,
    dialogState,
    status,
    data: status === "ready" ? mapStudentOverviewViewModel(resources) : null,
    error:
      status === "error"
        ? (resources.overview.errorMessage ??
          "Не удалось загрузить данные ученика.")
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
    retryOverview: async () => {
      await overviewQuery.refetch();
    },
    retryAnalysisProfile: async () => {
      await analysisProfileQuery.refetch();
    },
    retryPerformanceTrend: async () => {
      await performanceTrendQuery.refetch();
    },
    retryLessonPreview: async () => {
      if (latestAnalysisId === null) {
        return;
      }

      await lessonPreviewQuery.refetch();
    },
    toggleArchived: async () => {
      const student = overviewQuery.data?.student;

      if (!student) {
        return;
      }

      await archiveStudentMutation.mutateAsync({
        ...studentPathParams,
        body: {
          archived: student.archivedAt === null,
        },
      });
      await invalidateOverview();
    },
    submitAnalyzeGame: async (draft) => {
      await importPgnMutation.mutateAsync({
        ...studentPathParams,
        body: {
          rawPgn: draft.rawPgn,
          studentColor: draft.studentColor,
          sourceLabel: draft.sourceLabel || undefined,
        },
      });
      await invalidatePgnDependentQueries();
      setDialogState(createDefaultDialogState());
    },
    submitEditStudent: async (draft) => {
      const body = {
        displayName: draft.displayName,
        birthYear: draft.birthYear ?? undefined,
        rating: draft.rating ?? undefined,
        notes: draft.notes || undefined,
      };

      await updateStudentMutation.mutateAsync({
        ...studentPathParams,
        body,
      });
      await invalidateOverview();
      setDialogState(createDefaultDialogState());
    },
    submitChessAccount: async (draft, options) => {
      if (options?.accountId) {
        await updateExternalAccountMutation.mutateAsync({
          params: {
            path: {
              studentId: studentId || EMPTY_UUID,
              externalAccountId: options.accountId,
            },
          },
          body: {
            platform: draft.platform,
            username: draft.username,
          },
        });
      } else {
        await createExternalAccountMutation.mutateAsync({
          ...studentPathParams,
          body: {
            platform: draft.platform,
            username: draft.username,
          },
        });
      }

      await invalidateOverview();
      setDialogState({
        kind: "chess-accounts",
        editingChessAccountId: null,
      });
    },
    removeChessAccount: async (accountId) => {
      await removeExternalAccountMutation.mutateAsync({
        params: {
          path: {
            studentId: studentId || EMPTY_UUID,
            externalAccountId: accountId,
          },
        },
      });
      await invalidateOverview();
      setDialogState({
        kind: "chess-accounts",
        editingChessAccountId: null,
      });
    },
    submitCoachNotes: async (draft) => {
      await updateStudentMutation.mutateAsync({
        ...studentPathParams,
        body: {
          notes: draft.notes || undefined,
        },
      });
      await invalidateOverview();
      setDialogState(createDefaultDialogState());
    },
  };
}
