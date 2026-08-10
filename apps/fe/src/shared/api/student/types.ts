// CURRENT BACKEND: foundational Student Overview transport contracts.
export type StudentColor = "WHITE" | "BLACK";
export type ExternalPlatform = "LICHESS" | "CHESS_COM";
export type RecentGameResult = "WIN" | "LOSS" | "DRAW" | "UNKNOWN";
export type PerformanceDirection =
  | "IMPROVING"
  | "STABLE"
  | "DECLINING"
  | "UNKNOWN";
export type PerformanceTrendRange = "30D" | "90D" | "180D" | "ALL";
export type ProgressStatus = "ready" | "not-enough-data";
export type SeverityLevel =
  | "INACCURACY"
  | "MISTAKE"
  | "BLUNDER"
  | "MATE"
  | "UNKNOWN";

// CURRENT BACKEND: GET /api/students/{studentId}/overview.
export type StudentOverviewStudentRecord = {
  id: string;
  coachAccountId: string;
  displayName: string;
  rating: number | null;
  birthYear: number | null;
  notes: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StudentOverviewStats = {
  analysisCount: number | null;
  gameCount: number;
  reportCount: number;
  homeworkCount: number;
};

export type LatestProgressReference = {
  id: string;
  analysisCount: number;
  createdAt: string;
};

export type ExternalAccountRecord = {
  id: string;
  studentId: string;
  platform: ExternalPlatform;
  username: string;
  createdAt: string;
  updatedAt: string;
};

export type RecentGameRecord = {
  id: string;
  sourceLabel: string | null;
  studentColor: StudentColor;
  event: string | null;
  site: string | null;
  whitePlayerName: string | null;
  blackPlayerName: string | null;
  openingHeader: string | null;
  ecoCode: string | null;
  rawResult: string | null;
  derivedResult: RecentGameResult;
  plyCount: number | null;
  importedAt: string;
  latestAnalysisJobStatus: string | null;
  latestAnalysisJobId: string | null;
  latestAnalysisId: string | null;
};

export type RecentAnalysisRecord = {
  id: string;
  analysisJobId: string;
  gameId: string;
  mainWeaknessTag: string | null;
  recommendedLessonTitle: string | null;
  createdAt: string;
};

export type RecentReportRecord = {
  id: string;
  analysisId: string;
  title: string;
  audience: "COACH" | "PARENT";
  createdAt: string;
};

export type RecentHomeworkRecord = {
  id: string;
  analysisId: string;
  title: string;
  createdAt: string;
};

export type StudentOverviewResponse = {
  student: StudentOverviewStudentRecord;
  externalAccounts: ExternalAccountRecord[];
  stats: StudentOverviewStats;
  latestProgress: LatestProgressReference | null;
  recentGames: RecentGameRecord[];
  recentAnalyses: RecentAnalysisRecord[];
  recentReports: RecentReportRecord[];
  recentHomework: RecentHomeworkRecord[];
};

// CURRENT BACKEND: GET /api/students/{studentId}/analysis-profile.
export type WeaknessTagCount = {
  tag: string;
  count: number;
};

export type SeverityCount = {
  severity: SeverityLevel;
  count: number;
};

export type SampleMistakeRecord = {
  id: string;
  analysisId: string;
  gameId: string;
  severity: SeverityLevel;
  category: string;
  explanation: string;
  suggestedFix: string | null;
};

export type StudentAnalysisProfileResponse = {
  analysisCountUsed: number | null;
  mainWeaknessTag: string | null;
  secondaryWeaknessTags: string[];
  tagCounts: WeaknessTagCount[];
  severityCounts: SeverityCount[];
  sampleMistakes: SampleMistakeRecord[];
  recommendedLessonTitle: string | null;
};

// CURRENT DOMAIN FIELDS NOT EXPOSED BY CURRENT lightweight analysis-profile response.
export type StudentLessonDomainFields = {
  recommendedLessonWhy: string | null;
  recommendedFocusPoints: string[];
};

// PLANNED BACKEND lightweight recommendation preview for Student Overview mocks.
export type StudentLessonPreviewResponse = {
  recommendedLessonTitle: string | null;
} & StudentLessonDomainFields;

// PLANNED BACKEND: structured chart transport kept separate from narrative progress.
export type PerformanceTrendPoint = {
  date: string;
  value: number;
};

export type PerformanceTrendResponse = {
  direction: PerformanceDirection;
  primaryMetric: string;
  range: PerformanceTrendRange;
  points: PerformanceTrendPoint[];
};

// CURRENT BACKEND: optional detailed progress payload.
export type ProgressSnapshot = {
  id: string;
  studentId: string;
  analysisCount: number;
  summary: {
    summary: string;
  };
  promptVersion: string;
  model: string;
  createdAt: string;
  updatedAt: string;
};

export type StudentProgressResponse = {
  status: ProgressStatus;
  requiredAnalysisCount: number;
  availableAnalysisCount: number;
  snapshot: ProgressSnapshot | null;
};
