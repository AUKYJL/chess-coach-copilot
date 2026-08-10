import type {
  ExternalPlatform,
  PerformanceTrendPoint,
  PerformanceTrendResponse,
  StudentAnalysisProfileResponse,
  StudentColor,
  StudentLessonPreviewResponse,
  StudentOverviewResponse,
  StudentProgressResponse,
} from "@/shared/api/student";

export type {
  ExternalAccountRecord,
  ExternalPlatform,
  PerformanceDirection,
  PerformanceTrendPoint,
  PerformanceTrendRange,
  PerformanceTrendResponse,
  ProgressStatus,
  RecentGameRecord,
  RecentGameResult,
  SeverityLevel,
  StudentAnalysisProfileResponse,
  StudentColor,
  StudentLessonDomainFields,
  StudentLessonPreviewResponse,
  StudentOverviewResponse,
  StudentProgressResponse,
} from "@/shared/api/student";

export const studentOverviewScenarioIds = [
  "populated",
  "new-student",
  "early-signal",
  "analysis-processing",
  "analysis-failed",
  "insufficient-progress",
  "archived",
  "section-error",
  "overview-error",
  "loading",
  "missing-optional-identity",
] as const;

export type StudentOverviewScenarioId =
  (typeof studentOverviewScenarioIds)[number];

export type ResourceStatus = "ready" | "loading" | "error";

export type SectionResource<T> = {
  status: ResourceStatus;
  data: T | null;
  errorMessage?: string;
  retriable: boolean;
};
export type SummaryCardTone =
  "neutral" | "info" | "success" | "warning" | "danger";

export type AnalyzeGameDraft = {
  rawPgn: string;
  studentColor: StudentColor;
  sourceLabel: string;
};

export type EditStudentDraft = {
  displayName: string;
  birthYear: number | null;
  rating: number | null;
  notes: string;
};

export type ChessAccountDraft = {
  platform: ExternalPlatform;
  username: string;
};

export type CoachNotesDraft = {
  notes: string;
};

export type StudentOverviewDialogKind =
  "analyze-game" | "edit-student" | "chess-accounts" | "coach-notes";

export type StudentOverviewDialogState = {
  kind: StudentOverviewDialogKind | null;
  editingChessAccountId: string | null;
};

export type OverviewScenarioLocalState = {
  archivedOverride?: boolean;
  retryCounter?: number;
  analyzeGameDraft?: AnalyzeGameDraft;
  editStudentDraft?: EditStudentDraft;
  chessAccountDraft?: ChessAccountDraft;
  coachNotesDraft?: CoachNotesDraft;
  notesDraft?: string;
  sectionDismissals?: string[];
};

export type OverviewScenarioResources = {
  overview: SectionResource<StudentOverviewResponse>;
  analysisProfile: SectionResource<StudentAnalysisProfileResponse>;
  lessonPreview: SectionResource<StudentLessonPreviewResponse>;
  performanceTrend: SectionResource<PerformanceTrendResponse>;
  progressDetails?: SectionResource<StudentProgressResponse>;
};

export type OverviewScenario = {
  id: StudentOverviewScenarioId;
  label: string;
  resources: OverviewScenarioResources;
  artificialDelayMs?: number;
  localState?: OverviewScenarioLocalState;
};

// DERIVED VIEW-MODEL FIELDs
export type StudentHeaderViewModel = {
  id: string;
  displayName: string;
  initials: string;
  breadcrumbLabel: string;
  ratingLabel: string | null;
  birthYearLabel: string | null;
  statusLabel: string;
  isArchived: boolean;
};

export type SummaryCardViewModel = {
  id: "rating" | "analyzed-games" | "main-weakness" | "progress";
  label: string;
  value: string;
  supportingText: string;
  tone: SummaryCardTone;
};

export type ProgressInsightViewModel = {
  title: string;
  summary: string;
  supportingText: string;
};

export type PerformanceTrendViewModel = {
  directionLabel: string;
  tone: SummaryCardTone;
  metricLabel: string;
  rangeLabel: string;
  points: PerformanceTrendPoint[];
};

export type WeaknessProfileViewModel = {
  mainWeakness: string;
  tagCounts: Array<{
    label: string;
    count: number;
  }>;
  severitySummary: Array<{
    label: string;
    count: number;
    tone: SummaryCardTone;
  }>;
  sampleInsight: string | null;
};

export type NextLessonViewModel = {
  title: string;
  rationale: string;
  focusPoints: string[];
  supportingText: string;
};

export type RecentGameRowViewModel = {
  id: string;
  playersLabel: string;
  metaLabel: string;
  openingName: string;
  importedAtLabel: string;
  analysisStateLabel: string;
};

export type MaterialRowViewModel = {
  id: string;
  kind: "Report" | "Homework";
  title: string;
  supportingText: string;
};

export type StudentInformationItem = {
  id: string;
  label: string;
  value: string;
};

export type ChessAccountItem = {
  id: string;
  platformLabel: string;
  username: string;
};

export type CoachNotesViewModel = {
  body: string;
  isEmpty: boolean;
};

// DERIVED VIEW-MODEL FIELD: coach-facing page composition built from transport mocks.
export type StudentOverviewViewModel = {
  student: StudentHeaderViewModel;
  summaryCards: SummaryCardViewModel[];
  progressInsight: ProgressInsightViewModel | null;
  performanceTrend: PerformanceTrendViewModel;
  weaknessProfile: WeaknessProfileViewModel;
  nextLesson: NextLessonViewModel;
  recentGames: RecentGameRowViewModel[];
  recentMaterials: MaterialRowViewModel[];
  studentInformation: StudentInformationItem[];
  chessAccounts: ChessAccountItem[];
  coachNotes: CoachNotesViewModel;
};

export type StudentOverviewQueryStatus = "ready" | "loading" | "error";

export type StudentOverviewQueryResult = {
  studentId: string;
  scenario: OverviewScenario;
  dialogState: StudentOverviewDialogState;
  status: StudentOverviewQueryStatus;
  data: StudentOverviewViewModel | null;
  error: string | null;
  openDialog: (
    kind: StudentOverviewDialogKind,
    options?: { editingChessAccountId?: string | null },
  ) => void;
  closeDialog: () => void;
  retry: () => void;
  toggleArchived: () => void;
  submitAnalyzeGame: (draft: AnalyzeGameDraft) => void;
  submitEditStudent: (draft: EditStudentDraft) => void;
  submitChessAccount: (
    draft: ChessAccountDraft,
    options?: { accountId?: string | null },
  ) => void;
  removeChessAccount: (accountId: string) => void;
  submitCoachNotes: (draft: CoachNotesDraft) => void;
};
