import { getPerformanceDirectionTone, getSeverityTone } from "./semantic-tones";
import type {
  ChessAccountItem,
  MaterialRowViewModel,
  NextLessonViewModel,
  OverviewScenarioResources,
  PerformanceDirection,
  PerformanceTrendViewModel,
  ProgressInsightViewModel,
  RecentGameRecord,
  RecentGameRowViewModel,
  StudentOverviewQueryStatus,
  StudentOverviewResponse,
  StudentOverviewViewModel,
} from "./types";

const weaknessLabels: Record<string, string> = {
  MISSED_OPPONENT_THREAT: "Missed opponent threats",
  CALCULATION_DEPTH: "Shallow calculation",
  KING_SAFETY: "King safety",
};

const jobStatusLabels: Record<string, string> = {
  PENDING: "Waiting",
  PARSING: "Reading game",
  EXTRACTING_ANNOTATIONS: "Finding key positions",
  CLASSIFICATION: "Identifying patterns",
  GENERATING_OUTPUT: "Preparing recommendations",
  COMPLETED: "Ready",
  FAILED: "Analysis failed",
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
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatCount(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function directionToLabel(direction: PerformanceDirection) {
  switch (direction) {
    case "IMPROVING":
      return "Improving";
    case "DECLINING":
      return "Declining";
    case "STABLE":
      return "Stable";
    default:
      return "Unknown";
  }
}

function humanizeWeaknessTag(value: string | null) {
  if (!value) {
    return "Not enough data";
  }

  return weaknessLabels[value] ?? titleCase(value);
}

function jobStatusToLabel(status: string | null) {
  if (!status) {
    return "Awaiting review";
  }

  return jobStatusLabels[status] ?? titleCase(status);
}

function getPlayersLabel(game: RecentGameRecord) {
  return `${game.whitePlayerName ?? "White"} vs ${game.blackPlayerName ?? "Black"}`;
}

function getGameMetaLabel(game: RecentGameRecord) {
  const segments = [
    game.studentColor === "WHITE" ? "White" : "Black",
    game.rawResult ?? null,
    game.site,
  ].filter(Boolean);

  return segments.join(" · ");
}

function getOpeningLabel(game: RecentGameRecord) {
  if (game.openingHeader && game.ecoCode) {
    return `${game.openingHeader} · ${game.ecoCode}`;
  }

  return game.openingHeader ?? game.ecoCode ?? "Opening pending";
}

export function getAnalyzedGamesCount(resources: OverviewScenarioResources) {
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
  resources: OverviewScenarioResources,
): ProgressInsightViewModel | null {
  const latestProgress = resources.overview.data?.latestProgress;
  const progressResource = resources.progressDetails;
  const progressDetails = progressResource?.data;
  const progressSnapshot = progressDetails?.snapshot;

  if (progressResource?.status === "loading") {
    return {
      title: "Progress insight",
      summary:
        "The latest annotated game is still being processed, so the narrative summary is not ready yet.",
      supportingText:
        "Progress insight will appear after local analysis finishes.",
    };
  }

  if (progressResource?.status === "error") {
    return {
      title: "Progress insight",
      summary:
        progressResource.errorMessage ??
        "The narrative progress summary is unavailable in this local review state.",
      supportingText: "Use Retry locally to rebuild the mock-only section.",
    };
  }

  if (
    progressSnapshot &&
    (!latestProgress || progressSnapshot.id === latestProgress.id)
  ) {
    return {
      title: "Progress insight",
      summary: progressSnapshot.summary.summary,
      supportingText: `Based on ${formatCount(progressSnapshot.analysisCount, "analysis")} · Updated ${formatDate(progressSnapshot.updatedAt)}`,
    };
  }

  if (progressDetails?.status === "not-enough-data") {
    return {
      title: "Progress insight",
      summary:
        "Not enough annotated games are available yet to describe a reliable student trend.",
      supportingText: `${progressDetails.availableAnalysisCount}/${progressDetails.requiredAnalysisCount} analyzed games available`,
    };
  }

  if (latestProgress) {
    return {
      title: "Progress insight",
      summary:
        "Recent analysis snapshots are available, but the richer narrative summary is not required for this transport yet.",
      supportingText: `Latest snapshot captured ${formatDate(latestProgress.createdAt)}`,
    };
  }

  if (!latestProgress) {
    return {
      title: "Progress insight",
      summary:
        "A narrative progress summary will appear here once a recent analysis snapshot is available.",
      supportingText:
        "This prototype keeps progress copy separate from chart data.",
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
      kind: "Report" as const,
      title: report.title,
      supportingText: `${report.audience === "COACH" ? "Coach" : "Parent"} · ${formatDate(report.createdAt)}`,
    })),
    ...overview.recentHomework.map((homework) => ({
      createdAt: homework.createdAt,
      id: homework.id,
      kind: "Homework" as const,
      title: homework.title,
      supportingText: formatDate(homework.createdAt),
    })),
  ]
    .toSorted((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map(({ createdAt: _createdAt, ...item }) => item);
}

// DERIVED VIEW-MODEL FIELD: chart-only data stays isolated from narrative progress insight.
export function mapPerformanceTrendToViewModel(
  resources: OverviewScenarioResources,
): PerformanceTrendViewModel {
  const performanceTrend = resources.performanceTrend.data;
  const direction = performanceTrend?.direction ?? "UNKNOWN";

  return {
    directionLabel: directionToLabel(direction),
    tone: getPerformanceDirectionTone(direction),
    metricLabel: performanceTrend?.primaryMetric ?? "Trend unavailable",
    rangeLabel: performanceTrend?.range ?? "90D",
    points: performanceTrend?.points ?? [],
  };
}

function mapStudentInformation(resources: OverviewScenarioResources) {
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
            label: "Rating",
            value: String(overview.student.rating),
          },
        ]
      : []),
    ...(overview.student.birthYear !== null
      ? [
          {
            id: "born",
            label: "Born",
            value: String(overview.student.birthYear),
          },
        ]
      : []),
    {
      id: "analyzed-games",
      label: "Analyzed games",
      value:
        analyzedGamesCount !== null ? String(analyzedGamesCount) : "No data",
    },
    {
      id: "last-analysis",
      label: "Last analysis",
      value: overview.latestProgress
        ? formatDate(overview.latestProgress.createdAt)
        : "Not yet available",
    },
  ];
}

function mapChessAccounts(
  resources: OverviewScenarioResources,
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
  resources: OverviewScenarioResources,
): NextLessonViewModel {
  if (resources.analysisProfile.status === "loading") {
    return {
      title: "Analysis is still processing",
      rationale:
        "The latest imported game is still being parsed, so a focused recommendation is not ready yet.",
      focusPoints: [
        "Wait for the annotated review to finish",
        "Keep the last imported game in context",
      ],
      supportingText: "Local-only mock processing state",
    };
  }

  if (resources.analysisProfile.status === "error") {
    return {
      title: "Lesson focus unavailable",
      rationale:
        resources.analysisProfile.errorMessage ??
        "The lesson recommendation failed to load in this review state.",
      focusPoints: ["Retry locally to restore the recommendation"],
      supportingText: "Local-only retry available",
    };
  }

  const analysisProfile = resources.analysisProfile.data;
  const sampleMistake = analysisProfile?.sampleMistakes.at(0);
  const analyzedGamesCount = getAnalyzedGamesCount(resources);

  return {
    title:
      analysisProfile?.recommendedLessonTitle ??
      "Lesson focus available after analysis",
    rationale:
      sampleMistake?.explanation ??
      "Recent games still need a clearer pattern before a focused lesson recommendation becomes reliable.",
    focusPoints:
      analyzedGamesCount === 0
        ? ["Add the first annotated game to unlock a targeted lesson focus"]
        : [
            "Checks, captures, and threats",
            "Candidate moves before committing",
            "Defensive tactical motifs",
          ],
    supportingText:
      analyzedGamesCount !== null
        ? `Based on ${formatCount(analyzedGamesCount, "analyzed game")}`
        : "Based on limited available analysis",
  };
}

export function getStudentOverviewStatus(
  resources: OverviewScenarioResources,
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
  resources: OverviewScenarioResources,
): StudentOverviewViewModel {
  const overview = resources.overview.data;
  const analysisProfile = resources.analysisProfile.data;
  const performanceTrendTransport = resources.performanceTrend.data;
  const sampleMistake = analysisProfile?.sampleMistakes.at(0);

  if (!overview) {
    throw new Error("Student Overview foundation data is incomplete.");
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
      breadcrumbLabel: `Students / ${overview.student.displayName}`,
      ratingLabel:
        overview.student.rating !== null
          ? `${overview.student.rating} rating`
          : null,
      birthYearLabel:
        overview.student.birthYear !== null
          ? `Born ${overview.student.birthYear}`
          : null,
      statusLabel: overview.student.archivedAt
        ? "Archived student"
        : "Active student",
      isArchived: Boolean(overview.student.archivedAt),
    },
    summaryCards: [
      {
        id: "rating",
        label: "Current rating",
        value:
          overview.student.rating !== null
            ? String(overview.student.rating)
            : "Not set",
        supportingText: "Current student rating",
        tone: "neutral",
      },
      {
        id: "analyzed-games",
        label: "Analyzed games",
        value:
          analyzedGamesCount !== null ? String(analyzedGamesCount) : "No data",
        supportingText: overview.latestProgress
          ? `Last analysis ${formatDate(overview.latestProgress.createdAt)}`
          : "No latest progress snapshot yet",
        tone: "neutral",
      },
      {
        id: "main-weakness",
        label: "Main weakness",
        value: mainWeaknessLabel,
        supportingText:
          analyzedGamesCount !== null
            ? `Seen across ${formatCount(analyzedGamesCount, "analyzed game")}`
            : "Waiting for enough reviewed games",
        tone: "neutral",
      },
      {
        id: "progress",
        label: "Progress",
        value: progressLabel,
        supportingText: performanceTrendTransport
          ? `${performanceTrendTransport.primaryMetric} · ${performanceTrendTransport.range}`
          : "Trend data is not available for this state",
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
        label: titleCase(item.severity),
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
        overview.student.notes ??
        "No coach notes have been captured for this student yet.",
      isEmpty: overview.student.notes === null,
    },
  };
}
