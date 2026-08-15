import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { $api } from "@/shared/api";

import type { GameDetailsResponse } from "./api-types";
import {
  mapGameAnalysisHeader,
  mapGameAnalysisPage,
  mapProcessingStatusLabel,
} from "./mappers";
import type {
  GameAnalysisPageViewModel,
  GameAnalysisReviewStatus,
} from "./view-model";

const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";

type UseGameAnalysisDataOptions = {
  gameId: string;
  studentId: string;
};

type SubmitMomentReviewInput = {
  coachNote: string;
  mistakeId: string;
  status: GameAnalysisReviewStatus;
};

type QueryActions = {
  gameHeader: GameAnalysisPageViewModel["header"] | null;
  isRetryingAnalysis: boolean;
  isSavingReview: boolean;
  onRetryAnalysis: () => Promise<void>;
  retryPage: () => Promise<void>;
  reviewErrorMessage: string | null;
  submitMomentReview: (input: SubmitMomentReviewInput) => Promise<void>;
};

type GameAnalysisQueryResult =
  | ({
      errorMessage?: never;
      page: null;
      state: "loading";
      statusDescription?: never;
      statusTitle?: never;
    } & QueryActions)
  | ({
      errorMessage: string;
      page: null;
      state: "error" | "failed" | "unavailable";
      statusDescription?: never;
      statusTitle?: never;
    } & QueryActions)
  | ({
      errorMessage?: never;
      page: null;
      state: "processing";
      statusDescription: string;
      statusTitle: string;
    } & QueryActions)
  | ({
      errorMessage?: never;
      page: GameAnalysisPageViewModel;
      state: "no-critical-moments" | "ready";
      statusDescription?: never;
      statusTitle?: never;
    } & QueryActions);

function getErrorMessage(error: unknown, fallback: string): string {
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

export function useGameAnalysisData({
  gameId,
  studentId,
}: UseGameAnalysisDataOptions): GameAnalysisQueryResult {
  const queryClient = useQueryClient();
  const [retryError, setRetryError] = useState<string | null>(null);
  const [reviewErrorMessage, setReviewErrorMessage] = useState<string | null>(
    null,
  );
  const hasGameId = gameId.length > 0;
  const gameParams = {
    params: {
      path: {
        gameId: gameId || EMPTY_UUID,
      },
    },
  };
  const gameQuery = $api.useQuery("get", "/api/games/{gameId}", gameParams, {
    enabled: hasGameId,
  });
  const gameData = gameQuery.data as GameDetailsResponse | undefined;
  const latestAnalysisId = gameData?.latestAnalysisId ?? null;
  const latestAnalysisJobId = gameData?.latestAnalysisJobId ?? null;
  const latestAnalysisJobStatus = gameData?.latestAnalysisJobStatus ?? null;
  const analysisParams = useMemo(
    () => ({
      params: {
        path: {
          analysisId: latestAnalysisId ?? EMPTY_UUID,
        },
      },
    }),
    [latestAnalysisId],
  );
  const analysisQuery = $api.useQuery(
    "get",
    "/api/analysis/{analysisId}",
    analysisParams,
    {
      enabled: hasGameId && latestAnalysisId !== null,
    },
  );
  const analysisQueryKey =
    latestAnalysisId === null
      ? null
      : $api.queryOptions("get", "/api/analysis/{analysisId}", analysisParams)
          .queryKey;
  const retryAnalysisMutation = $api.useMutation(
    "post",
    "/api/analysis/jobs/{jobId}/retry",
  );
  const reviewMutation = $api.useMutation(
    "patch",
    "/api/analysis/mistakes/{mistakeId}/review",
  );

  const retryPage = async () => {
    setRetryError(null);
    await gameQuery.refetch();

    if (latestAnalysisId !== null) {
      await analysisQuery.refetch();
    }
  };

  const onRetryAnalysis = async () => {
    if (!latestAnalysisJobId) {
      return;
    }

    setRetryError(null);

    try {
      await retryAnalysisMutation.mutateAsync({
        params: {
          path: {
            jobId: latestAnalysisJobId,
          },
        },
      });
      await retryPage();
    } catch (error) {
      setRetryError(
        getErrorMessage(error, "Не удалось перезапустить анализ партии."),
      );
    }
  };

  const submitMomentReview = async ({
    coachNote,
    mistakeId,
    status,
  }: SubmitMomentReviewInput) => {
    setReviewErrorMessage(null);

    try {
      await reviewMutation.mutateAsync({
        params: {
          path: {
            mistakeId,
          },
        },
        body: {
          status,
          coachNote,
        },
      });

      if (analysisQueryKey) {
        await queryClient.invalidateQueries({
          queryKey: analysisQueryKey,
        });
      }
    } catch (error) {
      setReviewErrorMessage(
        getErrorMessage(error, "Не удалось сохранить решение тренера."),
      );
    }
  };

  const queryActions: QueryActions = {
    gameHeader: null,
    isRetryingAnalysis: retryAnalysisMutation.isPending,
    isSavingReview: reviewMutation.isPending,
    onRetryAnalysis,
    retryPage,
    reviewErrorMessage,
    submitMomentReview,
  };

  if (!studentId || !gameId) {
    return {
      ...queryActions,
      state: "error",
      page: null,
      errorMessage: "В маршруте отсутствует идентификатор ученика или партии.",
    };
  }

  if (gameQuery.isPending || !hasGameId) {
    return {
      ...queryActions,
      state: "loading",
      page: null,
    };
  }

  if (gameQuery.isError || !gameData) {
    return {
      ...queryActions,
      state: "error",
      page: null,
      errorMessage: getErrorMessage(
        gameQuery.error,
        "Не удалось загрузить данные партии.",
      ),
    };
  }

  if (gameData.studentId !== studentId) {
    return {
      ...queryActions,
      state: "error",
      page: null,
      errorMessage: "Эта партия не относится к текущему ученику.",
    };
  }

  if (latestAnalysisId !== null) {
    const loadingHeader = mapGameAnalysisHeader({
      game: gameData,
      statusLabel: "Анализ готовится",
      statusTone: "warning",
    });

    if (analysisQuery.isPending) {
      return {
        ...queryActions,
        gameHeader: loadingHeader,
        state: "loading",
        page: null,
      };
    }

    if (analysisQuery.isError || !analysisQuery.data) {
      return {
        ...queryActions,
        gameHeader: mapGameAnalysisHeader({
          game: gameData,
          statusLabel: "Не удалось загрузить анализ",
          statusTone: "danger",
        }),
        state: "error",
        page: null,
        errorMessage: getErrorMessage(
          analysisQuery.error,
          "Не удалось загрузить разбор партии.",
        ),
      };
    }

    const page = mapGameAnalysisPage({
      game: gameData,
      analysis: analysisQuery.data,
    });

    return {
      ...queryActions,
      gameHeader: page.header,
      state:
        page.criticalMoments.length === 0 ? "no-critical-moments" : "ready",
      page,
    };
  }

  if (latestAnalysisJobStatus === "FAILED") {
    return {
      ...queryActions,
      gameHeader: mapGameAnalysisHeader({
        game: gameData,
        statusLabel: "Анализ не удался",
        statusTone: "danger",
      }),
      state: "failed",
      page: null,
      errorMessage: retryError ?? "Мы не смогли завершить анализ этой партии.",
    };
  }

  if (
    latestAnalysisJobStatus === "PENDING" ||
    latestAnalysisJobStatus === "PARSING" ||
    latestAnalysisJobStatus === "EXTRACTING_ANNOTATIONS" ||
    latestAnalysisJobStatus === "CLASSIFICATION" ||
    latestAnalysisJobStatus === "GENERATING_OUTPUT" ||
    latestAnalysisJobStatus === "COMPLETED"
  ) {
    return {
      ...queryActions,
      gameHeader: mapGameAnalysisHeader({
        game: gameData,
        statusLabel: mapProcessingStatusLabel(gameData),
        statusTone: "warning",
      }),
      state: "processing",
      page: null,
      statusTitle: "Анализируем партию",
      statusDescription:
        "Критические моменты и рекомендации появятся здесь, как только обработка завершится.",
    };
  }

  return {
    ...queryActions,
    gameHeader: mapGameAnalysisHeader({
      game: gameData,
      statusLabel: "Анализ недоступен",
      statusTone: "neutral",
    }),
    state: "unavailable",
    page: null,
    errorMessage: "Для этой партии пока нет доступного анализа.",
  };
}
