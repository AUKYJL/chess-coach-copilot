import type { PerformanceTrendPoint } from "./api-types";

export type SummaryCardTone =
  "neutral" | "info" | "success" | "warning" | "danger";

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
  kind: "Отчёт" | "Домашнее задание";
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
