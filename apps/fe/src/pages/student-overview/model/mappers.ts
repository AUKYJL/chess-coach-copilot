import type {
  PerformanceDirection,
  RecentGameRecord,
  StudentOverviewResponse,
} from "./api-types";
import type {
  ChessAccountItem,
  MaterialRowViewModel,
  NextLessonViewModel,
  PerformanceTrendViewModel,
  ProgressInsightViewModel,
  RecentGameRowViewModel,
  StudentOverviewQueryStatus,
  StudentOverviewResources,
  StudentOverviewViewModel,
} from "./index";
import { getPerformanceDirectionTone, getSeverityTone } from "./semantic-tones";

const weaknessLabels: Record<string, string> = {
  MISSED_OPPONENT_THREAT: "Пропущенные угрозы соперника",
  CALCULATION_DEPTH: "Поверхностный расчёт",
  KING_SAFETY: "Безопасность короля",
};

const jobStatusLabels: Record<string, string> = {
  PENDING: "Ожидание",
  PARSING: "Читаем партию",
  EXTRACTING_ANNOTATIONS: "Ищем ключевые позиции",
  CLASSIFICATION: "Определяем паттерны",
  GENERATING_OUTPUT: "Готовим рекомендации",
  COMPLETED: "Готово",
  FAILED: "Анализ не выполнен",
};

const severityLabels: Record<string, string> = {
  INACCURACY: "Неточность",
  MISTAKE: "Ошибка",
  BLUNDER: "Грубая ошибка",
  MATE: "Мат",
};

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatRussianCount(
  count: number,
  one: string,
  few: string,
  many: string,
) {
  const normalizedCount = Math.abs(count) % 100;
  const lastDigit = normalizedCount % 10;

  if (normalizedCount >= 11 && normalizedCount <= 19) {
    return `${count} ${many}`;
  }

  if (lastDigit === 1) {
    return `${count} ${one}`;
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return `${count} ${few}`;
  }

  return `${count} ${many}`;
}

function formatAnalysisCount(count: number) {
  return formatRussianCount(count, "анализ", "анализа", "анализов");
}

function formatAnalyzedGameCount(count: number) {
  return formatRussianCount(
    count,
    "разобранной партии",
    "разобранных партий",
    "разобранных партий",
  );
}

function getProgressSummaryText(summary: Record<string, unknown>) {
  return typeof summary.summary === "string" && summary.summary.length > 0
    ? summary.summary
    : "Подробное описание прогресса пока недоступно.";
}

function directionToLabel(direction: PerformanceDirection) {
  switch (direction) {
    case "IMPROVING":
      return "Растёт";
    case "DECLINING":
      return "Снижается";
    case "STABLE":
      return "Стабильно";
    default:
      return "Нет данных";
  }
}

function humanizeWeaknessTag(value: string | null) {
  if (!value) {
    return "Недостаточно данных";
  }

  return weaknessLabels[value] ?? titleCase(value);
}

function humanizeSeverity(value: string) {
  return severityLabels[value] ?? titleCase(value);
}

function jobStatusToLabel(status: string | null) {
  if (!status) {
    return "Ожидает разбора";
  }

  return jobStatusLabels[status] ?? titleCase(status);
}

function getPlayersLabel(game: RecentGameRecord) {
  return `${game.whitePlayerName ?? "Белые"} - ${game.blackPlayerName ?? "Чёрные"}`;
}

function getGameMetaLabel(game: RecentGameRecord) {
  const segments = [
    game.studentColor === "WHITE" ? "Белыми" : "Чёрными",
    game.rawResult ?? null,
    game.site,
  ].filter(Boolean);

  return segments.join(" · ");
}

function getOpeningLabel(game: RecentGameRecord) {
  if (game.openingHeader && game.ecoCode) {
    return `${game.openingHeader} · ${game.ecoCode}`;
  }

  return game.openingHeader ?? game.ecoCode ?? "Дебют не указан";
}

export function getAnalyzedGamesCount(resources: StudentOverviewResources) {
  const overviewCount = resources.overview.data?.stats.analysisCount;

  if (typeof overviewCount === "number") {
    return overviewCount;
  }

  const analysisCount = resources.analysisProfile.data?.analysisCountUsed;

  if (typeof analysisCount === "number") {
    return analysisCount;
  }

  return null;
}

export function getStudentInitials(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  const [firstPart] = parts;

  if (parts.length === 1) {
    return (firstPart ?? "?").slice(0, 1).toUpperCase();
  }

  const lastPart = parts.at(-1) ?? "";

  return `${(firstPart ?? "").slice(0, 1)}${lastPart.slice(0, 1)}`.toUpperCase();
}

// DERIVED VIEW-MODEL FIELD: narrative progress copy remains separate from chart mapping.
export function mapProgressInsightToViewModel(
  resources: StudentOverviewResources,
): ProgressInsightViewModel | null {
  const latestProgress = resources.overview.data?.latestProgress;
  const progressResource = resources.progressDetails;
  const progressDetails = progressResource?.data;
  const progressSnapshot = progressDetails?.snapshot;

  if (progressResource?.status === "loading") {
    return {
      title: "Прогресс",
      summary:
        "Последняя аннотированная партия ещё обрабатывается, поэтому описание прогресса пока не готово.",
      supportingText: "Описание прогресса появится после завершения анализа.",
    };
  }

  if (progressResource?.status === "error") {
    return {
      title: "Прогресс",
      summary:
        progressResource.errorMessage ??
        "Сейчас описание прогресса недоступно.",
      supportingText:
        "Нажмите «Повторить», чтобы запросить свежую сводку ещё раз.",
    };
  }

  if (
    progressSnapshot &&
    (!latestProgress || progressSnapshot.id === latestProgress.id)
  ) {
    return {
      title: "Прогресс",
      summary: getProgressSummaryText(progressSnapshot.summary),
      supportingText: `На основе ${formatAnalysisCount(progressSnapshot.analysisCount)} · Обновлено ${formatDate(progressSnapshot.updatedAt)}`,
    };
  }

  if (progressDetails?.status === "not-enough-data") {
    return {
      title: "Прогресс",
      summary:
        "Пока недостаточно аннотированных партий, чтобы надёжно описать динамику ученика.",
      supportingText: `${progressDetails.availableAnalysisCount}/${progressDetails.requiredAnalysisCount} партий с анализом доступно`,
    };
  }

  if (latestProgress) {
    return {
      title: "Прогресс",
      summary:
        "Свежие срезы анализа уже есть, но расширенное текстовое описание для этого ответа пока не требуется.",
      supportingText: `Последний срез получен ${formatDate(latestProgress.createdAt)}`,
    };
  }

  if (!latestProgress) {
    return {
      title: "Прогресс",
      summary:
        "Описание прогресса появится здесь, когда станет доступен свежий срез анализа.",
      supportingText:
        "Текстовый прогресс отображается отдельно от данных графика.",
    };
  }

  return null;
}

// DERIVED VIEW-MODEL FIELD: coach-friendly recent game rows from CURRENT BACKEND transport.
export function mapRecentGamesToViewModel(
  overview: StudentOverviewResponse,
): RecentGameRowViewModel[] {
  return overview.recentGames.map((game) => ({
    id: game.id,
    playersLabel: getPlayersLabel(game),
    metaLabel: getGameMetaLabel(game),
    openingName: getOpeningLabel(game),
    importedAtLabel: formatDate(game.importedAt),
    analysisStateLabel: jobStatusToLabel(game.latestAnalysisJobStatus),
  }));
}

// DERIVED VIEW-MODEL FIELD: merged recent materials rows from CURRENT BACKEND reports and homework.
export function mapRecentMaterialsToViewModel(
  overview: StudentOverviewResponse,
): MaterialRowViewModel[] {
  return [
    ...overview.recentReports.map((report) => ({
      createdAt: report.createdAt,
      id: report.id,
      kind: "Отчёт" as const,
      title: report.title,
      supportingText: `${report.audience === "COACH" ? "Тренер" : "Родитель"} · ${formatDate(report.createdAt)}`,
    })),
    ...overview.recentHomework.map((homework) => ({
      createdAt: homework.createdAt,
      id: homework.id,
      kind: "Домашнее задание" as const,
      title: homework.title,
      supportingText: formatDate(homework.createdAt),
    })),
  ]
    .toSorted((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map(({ createdAt: _createdAt, ...item }) => item);
}

// DERIVED VIEW-MODEL FIELD: chart-only data stays isolated from narrative progress insight.
export function mapPerformanceTrendToViewModel(
  resources: StudentOverviewResources,
): PerformanceTrendViewModel {
  const performanceTrend = resources.performanceTrend.data;
  const direction = performanceTrend?.direction ?? "UNKNOWN";

  return {
    directionLabel: directionToLabel(direction),
    tone: getPerformanceDirectionTone(direction),
    metricLabel:
      performanceTrend?.primaryMetric ?? "Данные динамики недоступны",
    rangeLabel: performanceTrend?.range ?? "90D",
    points: performanceTrend?.points ?? [],
  };
}

function mapStudentInformation(resources: StudentOverviewResources) {
  const overview = resources.overview.data;

  if (!overview) {
    return [];
  }

  const analyzedGamesCount = getAnalyzedGamesCount(resources);

  return [
    ...(overview.student.rating !== null
      ? [
          {
            id: "rating",
            label: "Рейтинг",
            value: String(overview.student.rating),
          },
        ]
      : []),
    ...(overview.student.birthYear !== null
      ? [
          {
            id: "born",
            label: "Год рождения",
            value: String(overview.student.birthYear),
          },
        ]
      : []),
    {
      id: "analyzed-games",
      label: "Партии с анализом",
      value:
        analyzedGamesCount !== null ? String(analyzedGamesCount) : "Нет данных",
    },
    {
      id: "last-analysis",
      label: "Последний анализ",
      value: overview.latestProgress
        ? formatDate(overview.latestProgress.createdAt)
        : "Пока нет",
    },
  ];
}

function mapChessAccounts(
  resources: StudentOverviewResources,
): ChessAccountItem[] {
  return (
    resources.overview.data?.externalAccounts.map((account) => ({
      id: account.id,
      platformLabel: account.platform === "CHESS_COM" ? "Chess.com" : "Lichess",
      username: account.username,
    })) ?? []
  );
}

function mapNextLesson(
  resources: StudentOverviewResources,
): NextLessonViewModel {
  const lessonResource = resources.lessonPreview;
  const analysisProfile = resources.analysisProfile.data;
  const analyzedGamesCount = getAnalyzedGamesCount(resources);
  const recommendedLessonTitle =
    lessonResource.data?.recommendedLessonTitle ??
    analysisProfile?.recommendedLessonTitle;

  if (lessonResource.status === "loading") {
    return {
      title: "Анализ ещё обрабатывается",
      rationale:
        "Последняя импортированная партия ещё разбирается, поэтому точная рекомендация пока не готова.",
      focusPoints: [],
      supportingText: "Ждём результат последнего анализа",
    };
  }

  if (lessonResource.status === "error") {
    return {
      title: "Фокус урока недоступен",
      rationale:
        lessonResource.errorMessage ??
        "В этом состоянии просмотра не удалось загрузить рекомендацию для урока.",
      focusPoints: [],
      supportingText:
        "Повторите, когда рекомендация для урока снова станет доступна",
    };
  }

  return {
    title: recommendedLessonTitle ?? "Тема урока появится после анализа",
    rationale:
      lessonResource.data?.recommendedLessonWhy ??
      (recommendedLessonTitle
        ? "В текущих данных уже есть тема урока, но подробное объяснение пока не передаётся."
        : "По последним партиям пока не хватает устойчивого паттерна для надёжной рекомендации по уроку."),
    focusPoints: lessonResource.data?.recommendedFocusPoints ?? [],
    supportingText:
      analyzedGamesCount !== null
        ? `На основе ${formatAnalyzedGameCount(analyzedGamesCount)}`
        : "На основе ограниченного числа анализов",
  };
}

export function getStudentOverviewStatus(
  resources: StudentOverviewResources,
): StudentOverviewQueryStatus {
  if (resources.overview.status === "error") {
    return "error";
  }

  if (resources.overview.status === "loading") {
    return "loading";
  }

  return "ready";
}

export function mapStudentOverviewViewModel(
  resources: StudentOverviewResources,
): StudentOverviewViewModel {
  const overview = resources.overview.data;
  const analysisProfile = resources.analysisProfile.data;
  const performanceTrendTransport = resources.performanceTrend.data;
  const sampleMistake = analysisProfile?.sampleMistakes.at(0);

  if (!overview) {
    throw new Error("Не удалось собрать данные карточки ученика.");
  }

  const analyzedGamesCount = getAnalyzedGamesCount(resources);
  const performanceTrend = mapPerformanceTrendToViewModel(resources);
  const progressLabel = performanceTrend.directionLabel;
  const mainWeaknessLabel = humanizeWeaknessTag(
    analysisProfile?.mainWeaknessTag ?? null,
  );

  return {
    student: {
      id: overview.student.id,
      displayName: overview.student.displayName,
      initials: getStudentInitials(overview.student.displayName),
      breadcrumbLabel: `Ученики / ${overview.student.displayName}`,
      ratingLabel:
        overview.student.rating !== null
          ? `Рейтинг ${overview.student.rating}`
          : null,
      birthYearLabel:
        overview.student.birthYear !== null
          ? `Год рождения ${overview.student.birthYear}`
          : null,
      statusLabel: overview.student.archivedAt
        ? "Ученик в архиве"
        : "Активный ученик",
      isArchived: Boolean(overview.student.archivedAt),
    },
    summaryCards: [
      {
        id: "rating",
        label: "Текущий рейтинг",
        value:
          overview.student.rating !== null
            ? String(overview.student.rating)
            : "Не указан",
        supportingText: "Текущий рейтинг ученика",
        tone: "neutral",
      },
      {
        id: "analyzed-games",
        label: "Партии с анализом",
        value:
          analyzedGamesCount !== null
            ? String(analyzedGamesCount)
            : "Нет данных",
        supportingText: overview.latestProgress
          ? `Последний анализ ${formatDate(overview.latestProgress.createdAt)}`
          : "Пока нет свежего среза прогресса",
        tone: "neutral",
      },
      {
        id: "main-weakness",
        label: "Главная слабость",
        value: mainWeaknessLabel,
        supportingText:
          analyzedGamesCount !== null
            ? `Замечено в ${formatAnalyzedGameCount(analyzedGamesCount)}`
            : "Ждём, пока накопится достаточно разобранных партий",
        tone: "neutral",
      },
      {
        id: "progress",
        label: "Прогресс",
        value: progressLabel,
        supportingText: performanceTrendTransport
          ? `${performanceTrendTransport.primaryMetric} · ${performanceTrendTransport.range}`
          : "Для этого состояния данные динамики недоступны",
        tone: getPerformanceDirectionTone(
          performanceTrendTransport?.direction ?? "UNKNOWN",
        ),
      },
    ],
    progressInsight: mapProgressInsightToViewModel(resources),
    performanceTrend,
    weaknessProfile: {
      mainWeakness: mainWeaknessLabel,
      tagCounts: (analysisProfile?.tagCounts ?? []).map((item) => ({
        label: humanizeWeaknessTag(item.tag),
        count: item.count,
      })),
      severitySummary: (analysisProfile?.severityCounts ?? []).map((item) => ({
        label: humanizeSeverity(item.severity),
        count: item.count,
        tone: getSeverityTone(item.severity),
      })),
      sampleInsight: sampleMistake?.suggestedFix ?? null,
    },
    nextLesson: mapNextLesson(resources),
    recentGames: mapRecentGamesToViewModel(overview),
    recentMaterials: mapRecentMaterialsToViewModel(overview),
    studentInformation: mapStudentInformation(resources),
    chessAccounts: mapChessAccounts(resources),
    coachNotes: {
      body:
        overview.student.notes ?? "Заметок тренера по этому ученику пока нет.",
      isEmpty: overview.student.notes === null,
    },
  };
}
