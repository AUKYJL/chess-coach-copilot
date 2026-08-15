import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { $api } from "@/shared/api";

import type { AnalysisJobResponse, GameDetailsResponse } from "./api-types";
import {
  mapGameAnalysisHeader,
  mapGameAnalysisPage,
  mapProcessingStatusLabel,
} from "./mappers";
import type {
  GameAnalysisPageViewModel,
  GameAnalysisReportAudience,
  GameAnalysisReportGenerationViewModel,
  GameAnalysisReviewStatus,
} from "./view-model";

const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";
const REPORT_GENERATION_IN_PROGRESS_STATUSES = [
  "PENDING",
  "PARSING",
  "EXTRACTING_ANNOTATIONS",
  "CLASSIFICATION",
  "GENERATING_OUTPUT",
] as const;

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
  generateReport: (audience: GameAnalysisReportAudience) => Promise<void>;
  gameHeader: GameAnalysisPageViewModel["header"] | null;
  reportGeneration: GameAnalysisReportGenerationViewModel | null;
  isRetryingAnalysis: boolean;
  isSavingReview: boolean;
  onRetryAnalysis: () => Promise<void>;
  retryReportGeneration: () => Promise<void>;
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

function isReportJobInProgress(
  status: AnalysisJobResponse["status"] | null | undefined,
): boolean {
  return status
    ? REPORT_GENERATION_IN_PROGRESS_STATUSES.some(
        (inProgressStatus) => inProgressStatus === status,
      )
    : false;
}

function formatReportAudienceLabel(
  audience: GameAnalysisReportAudience | AnalysisJobResponse["reportAudience"],
): string {
  return audience === "PARENT" ? "Отчет для родителя" : "Отчет для тренера";
}

function formatReportJobStatusLabel(
  status: AnalysisJobResponse["status"],
  progressPercent?: number | null,
): string {
  const baseLabel = (() => {
    switch (status) {
      case "PENDING":
        return "Запрос в очереди";
      case "PARSING":
        return "Читаем партию";
      case "EXTRACTING_ANNOTATIONS":
        return "Собираем контекст";
      case "CLASSIFICATION":
        return "Структурируем отчет";
      case "GENERATING_OUTPUT":
        return "Пишем отчет";
      case "COMPLETED":
        return "Отчет готов";
      case "FAILED":
        return "Генерация не удалась";
      default:
        return "Статус неизвестен";
    }
  })();

  if (
    progressPercent !== undefined &&
    progressPercent !== null &&
    isReportJobInProgress(status)
  ) {
    return `${baseLabel} · ${progressPercent}%`;
  }

  return baseLabel;
}

function isJobForAnalysis(
  job: AnalysisJobResponse | null | undefined,
  analysisId: string | null,
): job is AnalysisJobResponse {
  return analysisId !== null && job?.sourceAnalysisId === analysisId;
}

function getRecoveredReportJob(args: {
  analysisId: string | null;
  jobs: AnalysisJobResponse[];
}): AnalysisJobResponse | null {
  if (args.analysisId === null) {
    return null;
  }

  const matchingJobs = args.jobs.filter(
    (job) => job.sourceAnalysisId === args.analysisId,
  );

  if (matchingJobs.length === 0) {
    return null;
  }

  return matchingJobs.toSorted(
    (leftJob, rightJob) =>
      Date.parse(rightJob.createdAt) - Date.parse(leftJob.createdAt),
  )[0];
}

export function useGameAnalysisData({
  gameId,
  studentId,
}: UseGameAnalysisDataOptions): GameAnalysisQueryResult {
  const queryClient = useQueryClient();
  const [isRefreshingPage, setIsRefreshingPage] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [reviewErrorMessage, setReviewErrorMessage] = useState<string | null>(
    null,
  );
  const [reportGenerationErrorMessage, setReportGenerationErrorMessage] =
    useState<string | null>(null);
  const [reportJob, setReportJob] = useState<AnalysisJobResponse | null>(null);
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
  const generateReportMutation = $api.useMutation(
    "post",
    "/api/analysis/{analysisId}/reports/generate",
  );
  const retryReportMutation = $api.useMutation(
    "post",
    "/api/analysis/jobs/{jobId}/retry",
  );
  const reviewMutation = $api.useMutation(
    "patch",
    "/api/analysis/mistakes/{mistakeId}/review",
  );
  const reportJobsParams = useMemo(
    () => ({
      params: {
        query: {
          gameId: gameId || undefined,
          jobType: "REPORT_GENERATION" as const,
          limit: 20,
        },
      },
    }),
    [gameId],
  );
  const reportJobsQuery = $api.useQuery(
    "get",
    "/api/analysis/jobs",
    reportJobsParams,
    {
      enabled: hasGameId && latestAnalysisId !== null,
    },
  );
  const recoveredReportJob = getRecoveredReportJob({
    analysisId: latestAnalysisId,
    jobs: reportJobsQuery.data?.items ?? [],
  });
  const localReportJob = isJobForAnalysis(reportJob, latestAnalysisId)
    ? reportJob
    : null;
  const trackedReportJobId =
    localReportJob?.id ?? recoveredReportJob?.id ?? null;
  const reportJobStatusParams = useMemo(
    () => ({
      params: {
        path: {
          jobId: trackedReportJobId ?? EMPTY_UUID,
        },
      },
    }),
    [trackedReportJobId],
  );
  const reportJobStatusQuery = $api.useQuery(
    "get",
    "/api/analysis/jobs/{jobId}",
    reportJobStatusParams,
    {
      enabled: trackedReportJobId !== null,
      refetchInterval: (query) => {
        const currentJob = query.state.data;
        const currentStatus =
          currentJob?.status ?? reportJob?.status ?? recoveredReportJob?.status;

        return isReportJobInProgress(currentStatus) ? 2000 : false;
      },
    },
  );
  const trackedReportJob = isJobForAnalysis(
    reportJobStatusQuery.data,
    latestAnalysisId,
  )
    ? reportJobStatusQuery.data
    : null;
  const currentReportJob =
    trackedReportJob ?? localReportJob ?? recoveredReportJob ?? null;
  const generatedReportId =
    currentReportJob?.status === "COMPLETED" ? currentReportJob.reportId : null;
  const reportParams = useMemo(
    () => ({
      params: {
        path: {
          reportId: generatedReportId ?? EMPTY_UUID,
        },
      },
    }),
    [generatedReportId],
  );
  const reportQuery = $api.useQuery(
    "get",
    "/api/reports/{reportId}",
    reportParams,
    {
      enabled: generatedReportId !== null,
    },
  );

  useEffect(() => {
    setReportJob(null);
    setReportGenerationErrorMessage(null);
  }, [latestAnalysisId]);

  useEffect(() => {
    if (reportJobStatusQuery.data) {
      setReportJob(reportJobStatusQuery.data);
    }
  }, [reportJobStatusQuery.data]);

  const retryPage = async () => {
    setRetryError(null);
    setIsRefreshingPage(true);

    try {
      const refetches: Promise<unknown>[] = [gameQuery.refetch()];

      if (latestAnalysisId !== null) {
        refetches.push(analysisQuery.refetch(), reportJobsQuery.refetch());
      }

      if (trackedReportJobId !== null) {
        refetches.push(reportJobStatusQuery.refetch());
      }

      if (generatedReportId !== null) {
        refetches.push(reportQuery.refetch());
      }

      await Promise.all(refetches);
    } finally {
      setIsRefreshingPage(false);
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

  const generateReport = async (audience: GameAnalysisReportAudience) => {
    if (!latestAnalysisId) {
      return;
    }

    setReportGenerationErrorMessage(null);

    try {
      const createdJob = await generateReportMutation.mutateAsync({
        params: {
          path: {
            analysisId: latestAnalysisId,
          },
        },
        body: {
          audience,
        },
      });

      setReportJob(createdJob);
      await reportJobsQuery.refetch();
    } catch (error) {
      setReportGenerationErrorMessage(
        getErrorMessage(error, "Не удалось запустить генерацию отчета."),
      );
    }
  };

  const retryReportGeneration = async () => {
    if (!currentReportJob?.id || currentReportJob.status !== "FAILED") {
      return;
    }

    setReportGenerationErrorMessage(null);

    try {
      const retriedJob = await retryReportMutation.mutateAsync({
        params: {
          path: {
            jobId: currentReportJob.id,
          },
        },
      });

      setReportJob(retriedJob);
      await reportJobsQuery.refetch();
    } catch (error) {
      setReportGenerationErrorMessage(
        getErrorMessage(error, "Не удалось перезапустить генерацию отчета."),
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

  const reportGeneration = (() => {
    if (latestAnalysisId === null && currentReportJob === null) {
      return null;
    }

    const isBusy =
      generateReportMutation.isPending ||
      retryReportMutation.isPending ||
      isReportJobInProgress(currentReportJob?.status);
    const audienceLabel =
      currentReportJob?.reportAudience === null
        ? null
        : formatReportAudienceLabel(
            currentReportJob?.reportAudience ?? "COACH",
          );
    const status = (() => {
      if (currentReportJob === null) {
        return null;
      }

      if (isReportJobInProgress(currentReportJob.status)) {
        return {
          action: {
            kind: "none" as const,
            label: null,
          },
          state: "pending" as const,
          tone: "warning" as const,
          label: "В работе",
          title: audienceLabel
            ? `${audienceLabel} формируется`
            : "Формируем отчет",
          description: `${formatReportJobStatusLabel(currentReportJob.status, currentReportJob.progressPercent)}. Новые запросы будут доступны после завершения текущей генерации.`,
          reportId: null,
          reportTitle: null,
        };
      }

      if (currentReportJob.status === "FAILED") {
        return {
          action: {
            kind: "retry-generation" as const,
            label: "Повторить",
          },
          state: "failed" as const,
          tone: "danger" as const,
          label: "Ошибка",
          title: audienceLabel
            ? `${audienceLabel} не сформирован`
            : "Не удалось сформировать отчет",
          description:
            currentReportJob.failureMessage ||
            "Мы не смогли завершить генерацию отчета.",
          reportId: null,
          reportTitle: null,
        };
      }

      if (currentReportJob.status !== "COMPLETED") {
        return null;
      }

      if (!currentReportJob.reportId) {
        return {
          action: {
            kind: "none" as const,
            label: null,
          },
          state: "failed" as const,
          tone: "danger" as const,
          label: "Ошибка",
          title: "Отчет завершился без результата",
          description:
            "Генерация завершилась, но сервер не вернул идентификатор отчета.",
          reportId: null,
          reportTitle: null,
        };
      }

      if (reportQuery.isPending) {
        return {
          action: {
            kind: "none" as const,
            label: null,
          },
          state: "pending" as const,
          tone: "warning" as const,
          label: "Загружаем",
          title: "Отчет готов, загружаем детали",
          description: `Получили результат генерации. Загружаем карточку отчета ${currentReportJob.reportId}.`,
          reportId: currentReportJob.reportId,
          reportTitle: null,
        };
      }

      if (reportQuery.isError || !reportQuery.data) {
        return {
          action: {
            kind: "refresh-report" as const,
            label: "Обновить",
          },
          state: "failed" as const,
          tone: "danger" as const,
          label: "Ошибка",
          title: "Отчет сформирован, но детали недоступны",
          description: `Сервер вернул id ${currentReportJob.reportId}, но загрузить сам отчет не удалось.`,
          reportId: currentReportJob.reportId,
          reportTitle: null,
        };
      }

      return {
        action: {
          kind: "none" as const,
          label: null,
        },
        state: "success" as const,
        tone: "success" as const,
        label: "Готов",
        title: reportQuery.data.title,
        description: `${formatReportAudienceLabel(reportQuery.data.audience)} готов. ID отчета: ${reportQuery.data.id}.`,
        reportId: reportQuery.data.id,
        reportTitle: reportQuery.data.title,
      };
    })();

    return {
      activeJobId: currentReportJob?.id ?? null,
      errorMessage: reportGenerationErrorMessage,
      isActionPending:
        retryReportMutation.isPending ||
        (status?.action.kind === "refresh-report" && isRefreshingPage),
      isDisabled: latestAnalysisId === null || isBusy,
      status,
    };
  })();

  const queryActions: QueryActions = {
    generateReport,
    gameHeader: null,
    reportGeneration,
    isRetryingAnalysis: retryAnalysisMutation.isPending,
    isSavingReview: reviewMutation.isPending,
    onRetryAnalysis,
    retryReportGeneration,
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
      reportGeneration,
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
