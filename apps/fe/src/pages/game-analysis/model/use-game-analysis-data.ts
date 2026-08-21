import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import { $api } from "@/shared/api";

import type {
  AnalysisJobResponse,
  GameDetailsResponse,
  ReportResponse,
} from "./api-types";
import {
  mapGameAnalysisHeader,
  mapGameAnalysisPage,
  mapProcessingStatusLabel,
} from "./mappers";
import type {
  GameAnalysisPageViewModel,
  GameAnalysisReportAudience,
  GameAnalysisReportCardActionViewModel,
  GameAnalysisReportCardViewModel,
  GameAnalysisReportConfirmationViewModel,
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
const REPORT_CARD_ORDER = ["COACH", "PARENT"] as const;

type UseGameAnalysisDataOptions = {
  gameId: string;
  studentId: string;
};

type ReportJobsByAudience = Record<
  GameAnalysisReportAudience,
  AnalysisJobResponse | null
>;

type SubmitMomentReviewInput = {
  coachNote: string;
  mistakeId: string;
  status: GameAnalysisReviewStatus;
};

type ReportEditorState = {
  draftText: string;
  errorMessage: string | null;
  initialText: string;
  reportId: string;
  successMessage: string | null;
};

type ReportConfirmationState =
  | {
      kind: "discard-editor";
    }
  | {
      audience: GameAnalysisReportAudience;
      kind: "regenerate";
    }
  | null;

type ReportActionErrorState = {
  audience: GameAnalysisReportAudience;
  message: string;
} | null;

type QueryActions = {
  changeReportDraft: (text: string) => void;
  closeReportConfirmation: () => void;
  confirmReportAction: () => Promise<void>;
  gameHeader: GameAnalysisPageViewModel["header"] | null;
  openReport: (reportId: string) => void;
  reportGeneration: GameAnalysisReportGenerationViewModel | null;
  isRetryingAnalysis: boolean;
  isSavingReview: boolean;
  onRetryAnalysis: () => Promise<void>;
  requestCloseReportEditor: () => void;
  requestGenerateReport: (
    audience: GameAnalysisReportAudience,
  ) => Promise<void>;
  retryPage: () => Promise<void>;
  reviewErrorMessage: string | null;
  saveReport: () => Promise<void>;
  submitMomentReview: (input: SubmitMomentReviewInput) => Promise<boolean>;
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

function isGameAnalysisInProgress(game: GameDetailsResponse) {
  return (
    game.engineEvidenceStatus === "QUEUED" ||
    game.engineEvidenceStatus === "RUNNING" ||
    game.latestAnalysisJobStatus === "PENDING" ||
    game.latestAnalysisJobStatus === "RUNNING" ||
    game.latestAnalysisJobStatus === "PARSING" ||
    game.latestAnalysisJobStatus === "EXTRACTING_ANNOTATIONS" ||
    game.latestAnalysisJobStatus === "CLASSIFICATION" ||
    game.latestAnalysisJobStatus === "GENERATING_OUTPUT"
  );
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

function getJobRecencyValue(dateString: string): number {
  return Date.parse(dateString);
}

function isJobNewerOrSame(
  candidate: AnalysisJobResponse,
  reference: AnalysisJobResponse,
): boolean {
  const createdAtDiff =
    getJobRecencyValue(candidate.createdAt) -
    getJobRecencyValue(reference.createdAt);

  if (createdAtDiff !== 0) {
    return createdAtDiff > 0;
  }

  return (
    getJobRecencyValue(candidate.updatedAt) >=
    getJobRecencyValue(reference.updatedAt)
  );
}

function createEmptyReportJobsByAudience(): ReportJobsByAudience {
  return {
    COACH: null,
    PARENT: null,
  };
}

function getLatestReportJobsByAudience(jobs: AnalysisJobResponse[]) {
  return {
    COACH: jobs.find((job) => job.reportAudience === "COACH") ?? null,
    PARENT: jobs.find((job) => job.reportAudience === "PARENT") ?? null,
  };
}

function getMergedLatestReportJobsByAudience(args: {
  optimisticJobsByAudience: ReportJobsByAudience;
  serverJobsByAudience: ReportJobsByAudience;
}): ReportJobsByAudience {
  const items = createEmptyReportJobsByAudience();

  for (const audience of REPORT_CARD_ORDER) {
    const optimisticJob = args.optimisticJobsByAudience[audience];
    const serverJob = args.serverJobsByAudience[audience];

    if (!optimisticJob) {
      items[audience] = serverJob;
      continue;
    }

    if (!serverJob) {
      items[audience] = optimisticJob;
      continue;
    }

    if (
      serverJob.id === optimisticJob.id ||
      isJobNewerOrSame(serverJob, optimisticJob)
    ) {
      items[audience] = serverJob;
      continue;
    }

    items[audience] = isReportJobInProgress(optimisticJob.status)
      ? optimisticJob
      : serverJob;
  }

  return items;
}

function isReportSyncedWithCompletedJob(args: {
  job: AnalysisJobResponse;
  report: ReportResponse;
}): boolean {
  if (args.job.status !== "COMPLETED") {
    return false;
  }

  if (args.job.reportId) {
    return (
      args.report.id === args.job.reportId &&
      getJobRecencyValue(args.report.updatedAt) >=
        getJobRecencyValue(args.job.createdAt)
    );
  }

  if (args.job.sourceAnalysisId) {
    return (
      args.report.analysisId === args.job.sourceAnalysisId &&
      getJobRecencyValue(args.report.updatedAt) >=
        getJobRecencyValue(args.job.createdAt)
    );
  }

  return (
    getJobRecencyValue(args.report.updatedAt) >=
    getJobRecencyValue(args.job.createdAt)
  );
}

function formatReportAudienceLabel(
  audience: GameAnalysisReportAudience,
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

function formatUpdatedAt(dateString: string): string {
  return `Обновлен ${new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "long",
  }).format(new Date(dateString))}`;
}

function getReportsByAudience(reports: ReportResponse[]) {
  return {
    COACH: reports.find((report) => report.audience === "COACH") ?? null,
    PARENT: reports.find((report) => report.audience === "PARENT") ?? null,
  };
}

function createReportCardAction(args: {
  disabled?: boolean;
  isLoading?: boolean;
  kind: GameAnalysisReportCardActionViewModel["kind"];
  label: string;
}): GameAnalysisReportCardActionViewModel {
  return {
    disabled: args.disabled ?? false,
    isLoading: args.isLoading ?? false,
    kind: args.kind,
    label: args.label,
  };
}

function createIdleReportCard(args: {
  audience: GameAnalysisReportAudience;
  errorMessage: string | null;
  isActionDisabled: boolean;
  isLoading: boolean;
  latestFailedJob: AnalysisJobResponse | null;
}): GameAnalysisReportCardViewModel {
  const audienceLabel = formatReportAudienceLabel(args.audience);
  const failureMessage =
    args.errorMessage ??
    args.latestFailedJob?.failureMessage ??
    "Последняя попытка генерации завершилась ошибкой.";

  if (args.isLoading) {
    return {
      audience: args.audience,
      audienceLabel,
      description: "Загружаем текущее состояние отчета.",
      inlineError: null,
      isManual: false,
      primaryAction: null,
      reportId: null,
      secondaryAction: null,
      state: "loading",
      statusLabel: "Загрузка",
      title: "Проверяем отчет",
      tone: "neutral",
      updatedAtLabel: null,
    };
  }

  if (args.latestFailedJob || args.errorMessage) {
    return {
      audience: args.audience,
      audienceLabel,
      description: "Отчет не был создан. Повторите попытку генерации.",
      inlineError: failureMessage,
      isManual: false,
      primaryAction: createReportCardAction({
        disabled: args.isActionDisabled,
        kind: "retry",
        label: "Повторить",
      }),
      reportId: null,
      secondaryAction: null,
      state: "failed",
      statusLabel: "Ошибка",
      title: `${audienceLabel} не сформирован`,
      tone: "danger",
      updatedAtLabel: null,
    };
  }

  return {
    audience: args.audience,
    audienceLabel,
    description:
      "Сформируйте отчет, чтобы открыть его и при необходимости отредактировать вручную.",
    inlineError: null,
    isManual: false,
    primaryAction: createReportCardAction({
      disabled: args.isActionDisabled,
      kind: "generate",
      label: "Сформировать отчет",
    }),
    reportId: null,
    secondaryAction: null,
    state: "idle",
    statusLabel: "Нет отчета",
    title: `${audienceLabel} пока не создан`,
    tone: "neutral",
    updatedAtLabel: null,
  };
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
  const [reportActionError, setReportActionError] =
    useState<ReportActionErrorState>(null);
  const [pendingGenerateAudience, setPendingGenerateAudience] =
    useState<GameAnalysisReportAudience | null>(null);
  const [optimisticReportJobsByAudience, setOptimisticReportJobsByAudience] =
    useState<ReportJobsByAudience>(createEmptyReportJobsByAudience);
  const [editorState, setEditorState] = useState<ReportEditorState | null>(
    null,
  );
  const [savingReportId, setSavingReportId] = useState<string | null>(null);
  const [confirmationState, setConfirmationState] =
    useState<ReportConfirmationState>(null);
  const previousLatestJobsByAudienceRef = useRef<ReportJobsByAudience>(
    createEmptyReportJobsByAudience(),
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
    refetchInterval: (query) =>
      query.state.data && isGameAnalysisInProgress(query.state.data)
        ? 5000
        : false,
  });
  const gameData = gameQuery.data as GameDetailsResponse | undefined;
  const latestAnalysisId = gameData?.latestAnalysisId ?? null;
  const latestAnalysisJobId = gameData?.latestAnalysisJobId ?? null;
  const latestEngineAnalysisJobId = gameData?.latestEngineAnalysisJobId ?? null;
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
  const updateReportMutation = $api.useMutation(
    "patch",
    "/api/reports/{reportId}",
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
      enabled: hasGameId,
      refetchInterval: (query) =>
        Object.values(
          getMergedLatestReportJobsByAudience({
            optimisticJobsByAudience: optimisticReportJobsByAudience,
            serverJobsByAudience: getLatestReportJobsByAudience(
              query.state.data?.items ?? [],
            ),
          }),
        ).some(
          (job) => job !== null && isReportJobInProgress(job.status),
        )
          ? 5000
          : false,
    },
  );
  const reportsParams = useMemo(
    () => ({
      params: {
        query: {
          gameId: gameId || undefined,
        },
      },
    }),
    [gameId],
  );
  const reportsQuery = $api.useQuery("get", "/api/reports", reportsParams, {
    enabled: hasGameId,
  });

  const reports = useMemo(
    () => reportsQuery.data?.items ?? [],
    [reportsQuery.data?.items],
  );
  const reportJobs = useMemo(
    () => reportJobsQuery.data?.items ?? [],
    [reportJobsQuery.data?.items],
  );
  const reportsByAudience = useMemo(
    () => getReportsByAudience(reports),
    [reports],
  );
  const serverLatestJobsByAudience = useMemo(
    () => getLatestReportJobsByAudience(reportJobs),
    [reportJobs],
  );
  const latestJobsByAudience = useMemo(
    () =>
      getMergedLatestReportJobsByAudience({
        optimisticJobsByAudience: optimisticReportJobsByAudience,
        serverJobsByAudience: serverLatestJobsByAudience,
      }),
    [optimisticReportJobsByAudience, serverLatestJobsByAudience],
  );
  const reportsById = useMemo(() => {
    const items: Record<string, ReportResponse> = {};

    for (const report of reports) {
      items[report.id] = report;
    }

    return items;
  }, [reports]);

  useEffect(() => {
    setPendingGenerateAudience(null);
    setReportActionError(null);
    setOptimisticReportJobsByAudience(createEmptyReportJobsByAudience());
    setEditorState(null);
    setSavingReportId(null);
    setConfirmationState(null);
  }, [latestAnalysisId]);

  useEffect(() => {
    setOptimisticReportJobsByAudience((currentJobs) => {
      let hasChanges = false;
      const nextJobs = { ...currentJobs };

      for (const audience of REPORT_CARD_ORDER) {
        const optimisticJob = currentJobs[audience];

        if (!optimisticJob) {
          continue;
        }

        const serverJob = serverLatestJobsByAudience[audience];

        if (
          (serverJob &&
            (serverJob.id === optimisticJob.id ||
              isJobNewerOrSame(serverJob, optimisticJob)))
        ) {
          nextJobs[audience] = null;
          hasChanges = true;
        }
      }

      return hasChanges ? nextJobs : currentJobs;
    });
  }, [serverLatestJobsByAudience]);

  useEffect(() => {
    const previousLatestJobsByAudience = previousLatestJobsByAudienceRef.current;
    let shouldRefetchReports = false;

    for (const audience of REPORT_CARD_ORDER) {
      const previousJob = previousLatestJobsByAudience[audience];
      const currentJob = latestJobsByAudience[audience];
      const currentReport = reportsByAudience[audience];

      if (
        currentJob?.status === "COMPLETED" &&
        previousJob?.status !== "COMPLETED" &&
        (!currentReport ||
          !isReportSyncedWithCompletedJob({
            job: currentJob,
            report: currentReport,
          }))
      ) {
        shouldRefetchReports = true;
        break;
      }
    }

    previousLatestJobsByAudienceRef.current = latestJobsByAudience;

    if (!shouldRefetchReports) {
      return;
    }

    const refetchPromise = reportsQuery.refetch();

    refetchPromise.catch(() => {
      // Query state surfaces the error; this avoids an unhandled rejection.
    });
  }, [latestJobsByAudience, reportsByAudience, reportsQuery]);

  const currentEditorReport =
    editorState === null ? null : (reportsById[editorState.reportId] ?? null);
  const currentEditorAudience = currentEditorReport?.audience;

  const clearReportActionError = (audience: GameAnalysisReportAudience) => {
    setReportActionError((currentError) =>
      currentError?.audience === audience ? null : currentError,
    );
  };

  const retryPage = async () => {
    setRetryError(null);

    const refetches: Promise<unknown>[] = [
      gameQuery.refetch(),
      reportJobsQuery.refetch(),
      reportsQuery.refetch(),
    ];

    if (latestAnalysisId !== null) {
      refetches.push(analysisQuery.refetch());
    }

    await Promise.all(refetches);
  };

  const onRetryAnalysis = async () => {
    const retryJobId = latestAnalysisJobId ?? latestEngineAnalysisJobId;

    if (!retryJobId) {
      return;
    }

    setRetryError(null);

    try {
      await retryAnalysisMutation.mutateAsync({
        params: {
          path: {
            jobId: retryJobId,
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

  const runGenerateReport = async (audience: GameAnalysisReportAudience) => {
    if (!latestAnalysisId) {
      return;
    }

    clearReportActionError(audience);
    setPendingGenerateAudience(audience);

    try {
      const nextJob = await generateReportMutation.mutateAsync({
        params: {
          path: {
            analysisId: latestAnalysisId,
          },
        },
        body: {
          audience,
        },
      });

      setOptimisticReportJobsByAudience((currentJobs) => ({
        ...currentJobs,
        [audience]: nextJob,
      }));
      setConfirmationState(null);
    } catch (error) {
      setReportActionError({
        audience,
        message: getErrorMessage(
          error,
          "Не удалось запустить генерацию отчета.",
        ),
      });
    } finally {
      setPendingGenerateAudience(null);
    }
  };

  const requestGenerateReport = async (
    audience: GameAnalysisReportAudience,
  ) => {
    if (reportsByAudience[audience]) {
      clearReportActionError(audience);
      setConfirmationState({
        audience,
        kind: "regenerate",
      });
      return;
    }

    await runGenerateReport(audience);
  };

  const openReport = (reportId: string) => {
    const report = reportsById[reportId];

    if (!report) {
      return;
    }

    setConfirmationState(null);
    setEditorState({
      draftText: report.content.text,
      errorMessage: null,
      initialText: report.content.text,
      reportId,
      successMessage: null,
    });
  };

  const closeEditor = () => {
    setEditorState(null);
    setSavingReportId(null);
  };

  const requestCloseReportEditor = () => {
    if (!editorState) {
      return;
    }

    if (editorState.draftText !== editorState.initialText) {
      setConfirmationState({
        kind: "discard-editor",
      });
      return;
    }

    closeEditor();
  };

  const closeReportConfirmation = () => {
    setConfirmationState(null);
  };

  const confirmReportAction = async () => {
    if (!confirmationState) {
      return;
    }

    if (confirmationState.kind === "discard-editor") {
      closeEditor();
      setConfirmationState(null);
      return;
    }

    const audience = confirmationState.audience;

    setConfirmationState(null);
    await runGenerateReport(audience);
  };

  const changeReportDraft = (text: string) => {
    setEditorState((currentState) => {
      if (!currentState) {
        return currentState;
      }

      return {
        ...currentState,
        draftText: text,
        errorMessage: null,
        successMessage: null,
      };
    });
  };

  const saveReport = async () => {
    if (!editorState) {
      return;
    }

    const nextText = editorState.draftText.trim();

    if (!nextText) {
      setEditorState((currentState) =>
        currentState
          ? {
              ...currentState,
              errorMessage: "Текст отчета не может быть пустым.",
              successMessage: null,
            }
          : currentState,
      );
      return;
    }

    setSavingReportId(editorState.reportId);

    try {
      const updatedReport = await updateReportMutation.mutateAsync({
        params: {
          path: {
            reportId: editorState.reportId,
          },
        },
        body: {
          content: {
            text: nextText,
          },
        },
      });

      setEditorState((currentState) =>
        currentState
          ? {
              ...currentState,
              draftText: updatedReport.content.text,
              errorMessage: null,
              initialText: updatedReport.content.text,
              successMessage: "Изменения сохранены.",
            }
          : currentState,
      );
      await reportsQuery.refetch();
    } catch (error) {
      setEditorState((currentState) =>
        currentState
          ? {
              ...currentState,
              errorMessage: getErrorMessage(
                error,
                "Не удалось сохранить изменения отчета.",
              ),
              successMessage: null,
            }
          : currentState,
      );
    } finally {
      setSavingReportId(null);
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

      return true;
    } catch (error) {
      setReviewErrorMessage(
        getErrorMessage(error, "Не удалось сохранить решение тренера."),
      );

      return false;
    }
  };

  const reportGeneration = (() => {
    if (!gameData) {
      return null;
    }

    const cards = REPORT_CARD_ORDER.map((audience) => {
      const report = reportsByAudience[audience];
      const latestJob = latestJobsByAudience[audience];
      const audienceLabel = formatReportAudienceLabel(audience);
      const latestFailedJob = latestJob?.status === "FAILED" ? latestJob : null;
      const cardErrorMessage =
        reportActionError?.audience === audience ? reportActionError.message : null;
      const isSubmittingGenerateRequest =
        pendingGenerateAudience === audience && generateReportMutation.isPending;
      const isGenerating =
        isSubmittingGenerateRequest || isReportJobInProgress(latestJob?.status);
      const isCompletedWaitingForReport =
        latestJob?.status === "COMPLETED" &&
        (!report ||
          !isReportSyncedWithCompletedJob({
            job: latestJob,
            report,
          }));
      const isSavingCurrentAudience =
        updateReportMutation.isPending && currentEditorAudience === audience;
      const isActionDisabled = latestAnalysisId === null || isSavingCurrentAudience;

      if (!report) {
        if (isGenerating || isCompletedWaitingForReport) {
          return {
            audience,
            audienceLabel,
            description:
              latestJob && isReportJobInProgress(latestJob.status)
                ? formatReportJobStatusLabel(
                    latestJob.status,
                    latestJob.progressPercent,
                  )
                : "Отчет готов. Подтягиваем его в карточку.",
            inlineError: null,
            isManual: false,
            primaryAction: createReportCardAction({
              disabled: true,
              isLoading: true,
              kind: "generate",
              label: "Создаем отчет...",
            }),
            reportId: null,
            secondaryAction: null,
            state: "pending" as const,
            statusLabel: "В работе",
            title: `${audienceLabel} создается`,
            tone: "warning" as const,
            updatedAtLabel: null,
          };
        }

        return createIdleReportCard({
          audience,
          errorMessage: cardErrorMessage,
          isActionDisabled,
          isLoading: reportsQuery.isPending,
          latestFailedJob,
        });
      }

      if (isGenerating || isCompletedWaitingForReport) {
        return {
          audience,
          audienceLabel,
          description:
            latestJob && isReportJobInProgress(latestJob.status)
              ? formatReportJobStatusLabel(
                  latestJob.status,
                  latestJob.progressPercent,
                )
              : "Новая версия готова. Обновляем карточку, текущий отчет пока остается доступным.",
          inlineError: null,
          isManual: report.source === "MANUAL",
          primaryAction: createReportCardAction({
            disabled: true,
            isLoading: true,
            kind: "regenerate",
            label: "Создаем отчет...",
          }),
          reportId: report.id,
          secondaryAction: createReportCardAction({
            kind: "open",
            label: "Открыть текущий отчет",
          }),
          state: "pending" as const,
          statusLabel: "В работе",
          title: report.title,
          tone: "warning" as const,
          updatedAtLabel: formatUpdatedAt(report.updatedAt),
        };
      }

      if (latestFailedJob || cardErrorMessage) {
        return {
          audience,
          audienceLabel,
          description:
            "Последняя попытка обновить отчет не удалась. Текущая версия остается доступной.",
          inlineError:
            cardErrorMessage ??
            latestFailedJob?.failureMessage ??
            "Не удалось обновить отчет.",
          isManual: report.source === "MANUAL",
          primaryAction: createReportCardAction({
            kind: "open",
            label: "Открыть текущий отчет",
          }),
          reportId: report.id,
          secondaryAction: createReportCardAction({
            disabled: isActionDisabled,
            kind: "retry",
            label: "Повторить",
          }),
          state: "failed" as const,
          statusLabel: "Ошибка",
          title: report.title,
          tone: "danger" as const,
          updatedAtLabel: formatUpdatedAt(report.updatedAt),
        };
      }

      return {
        audience,
        audienceLabel,
        description:
          report.source === "MANUAL"
            ? "Текст отчета был отредактирован вручную."
            : "Отчет готов к просмотру и редактированию.",
        inlineError: null,
        isManual: report.source === "MANUAL",
        primaryAction: createReportCardAction({
          kind: "open",
          label: "Открыть отчет",
        }),
        reportId: report.id,
        secondaryAction: createReportCardAction({
          disabled: isActionDisabled,
          kind: "regenerate",
          label: "Пересоздать",
        }),
        state: "ready" as const,
        statusLabel: "Готов",
        title: report.title,
        tone: "success" as const,
        updatedAtLabel: formatUpdatedAt(report.updatedAt),
      };
    });

    const editor =
      editorState && currentEditorReport
        ? {
            audienceLabel: formatReportAudienceLabel(
              currentEditorReport.audience,
            ),
            errorMessage: editorState.errorMessage,
            gameLabel: mapGameAnalysisHeader({
              game: gameData,
              statusLabel:
                latestAnalysisJobStatus === null
                  ? "Анализ недоступен"
                  : mapProcessingStatusLabel(gameData),
              statusTone:
                latestAnalysisJobStatus === "FAILED"
                  ? "danger"
                  : latestAnalysisId !== null
                    ? "success"
                    : "neutral",
            }).title,
            isDirty: editorState.draftText !== editorState.initialText,
            isSaveDisabled:
              editorState.draftText.trim().length === 0 ||
              editorState.draftText === editorState.initialText ||
              (updateReportMutation.isPending &&
                savingReportId === editorState.reportId),
            isSaving:
              updateReportMutation.isPending &&
              savingReportId === editorState.reportId,
            reportId: editorState.reportId,
            successMessage: editorState.successMessage,
            text: editorState.draftText,
            title: currentEditorReport.title,
            updatedAtLabel: formatUpdatedAt(currentEditorReport.updatedAt),
          }
        : null;

    const confirmation: GameAnalysisReportConfirmationViewModel | null =
      confirmationState === null
        ? null
        : confirmationState.kind === "discard-editor"
          ? {
              confirmLabel: "Выйти без сохранения",
              description:
                "Есть несохраненные изменения. Выйти без сохранения?",
              isPending: false,
              kind: "discard-editor",
              title: "Закрыть отчет",
            }
          : {
              confirmLabel: "Пересоздать отчет",
              description:
                "Текущий отчет будет заменен новой AI-версией. Продолжить?",
              isPending:
                generateReportMutation.isPending &&
                pendingGenerateAudience === confirmationState.audience,
              kind: "regenerate",
              title: "Пересоздать отчет",
            };

    return {
      cards,
      confirmation,
      editor,
    };
  })();

  const queryActions: QueryActions = {
    changeReportDraft,
    closeReportConfirmation,
    confirmReportAction,
    gameHeader: null,
    openReport,
    reportGeneration,
    isRetryingAnalysis: retryAnalysisMutation.isPending,
    isSavingReview: reviewMutation.isPending,
    onRetryAnalysis,
    requestCloseReportEditor,
    requestGenerateReport,
    retryPage,
    reviewErrorMessage,
    saveReport,
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

    if (!reportGeneration) {
      return {
        ...queryActions,
        gameHeader: loadingHeader,
        state: "loading",
        page: null,
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

  if (gameData.engineEvidenceStatus === "FAILED") {
    return {
      ...queryActions,
      gameHeader: mapGameAnalysisHeader({
        game: gameData,
        statusLabel: "Ошибка Stockfish",
        statusTone: "danger",
      }),
      state: "failed",
      page: null,
      errorMessage:
        retryError ?? "Stockfish не смог завершить анализ этой партии.",
    };
  }

  if (
    gameData.engineEvidenceStatus === "QUEUED" ||
    gameData.engineEvidenceStatus === "RUNNING"
  ) {
    const isQueued = gameData.engineEvidenceStatus === "QUEUED";

    return {
      ...queryActions,
      gameHeader: mapGameAnalysisHeader({
        game: gameData,
        statusLabel: isQueued ? "Stockfish в очереди" : "Stockfish анализирует",
        statusTone: "warning",
      }),
      state: "processing",
      page: null,
      statusTitle: isQueued
        ? "Stockfish ожидает запуска"
        : "Stockfish анализирует партию",
      statusDescription:
        "Критические моменты и рекомендации появятся после завершения анализа движком.",
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
    latestAnalysisJobStatus === "RUNNING" ||
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
