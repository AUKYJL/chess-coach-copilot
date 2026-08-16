export type SemanticTone = "danger" | "neutral" | "success" | "warning";

export type GameAnalysisReviewStatus = "CONFIRMED" | "REJECTED" | "UNREVIEWED";
export type GameAnalysisReportAudience = "COACH" | "PARENT";

export type GameAnalysisHeaderViewModel = {
  breadcrumbs: string[];
  title: string;
  metadata: string[];
  statusLabel: string;
  statusTone: SemanticTone;
};

export type GameAnalysisSummaryStatViewModel = {
  count: number;
  label: string;
  tone: SemanticTone;
};

export type GameAnalysisSummaryViewModel = {
  annotationCoverageLabel: string;
  confidenceLabel: string;
  openingName: string | null;
  overallDiagnosis: string;
  recommendedFocusPoints: string[];
  recommendedLessonTitle: string | null;
  recommendedLessonWhy: string | null;
  reducedConfidenceWarning: string | null;
  stats: GameAnalysisSummaryStatViewModel[];
};

export type GameAnalysisReplayMoveViewModel = {
  actualMove: { from: string; to: string } | null;
  afterFen: string;
  beforeFen: string;
  evaluationAfterLabel: string | null;
  evaluationBeforeLabel: string | null;
  fullMoveNumber: number;
  moveColor: "black" | "white";
  moveLabel: string;
  moveNumber: string;
  ply: number;
  san: string;
};

export type GameAnalysisCriticalMomentViewModel = {
  actualMove: { from: string; to: string } | null;
  bestMove: string | null;
  bestMoveArrow: { from: string; to: string } | null;
  bestLine: string | null;
  beforeFen: string;
  afterFen: string;
  category: string | null;
  coachNote: string;
  comments: string[];
  evaluationAfterLabel: string | null;
  evaluationBeforeLabel: string | null;
  evaluationSwingLabel: string | null;
  explanation: string | null;
  id: string;
  mistakeId: string | null;
  moveLabel: string;
  ply: number;
  reviewStatus: GameAnalysisReviewStatus;
  severityLabel: string;
  severityTone: SemanticTone;
  suggestedFix: string | null;
  summary: string | null;
};

export type GameAnalysisReportCardViewModel = {
  audience: GameAnalysisReportAudience;
  audienceLabel: string;
  description: string;
  inlineError: string | null;
  isManual: boolean;
  primaryAction: GameAnalysisReportCardActionViewModel | null;
  reportId: string | null;
  secondaryAction: GameAnalysisReportCardActionViewModel | null;
  state: "failed" | "idle" | "loading" | "pending" | "ready";
  statusLabel: string;
  title: string;
  tone: SemanticTone;
  updatedAtLabel: string | null;
};

export type GameAnalysisReportCardActionViewModel = {
  disabled: boolean;
  isLoading: boolean;
  kind: "generate" | "open" | "regenerate" | "retry";
  label: string;
};

export type GameAnalysisReportEditorViewModel = {
  audienceLabel: string;
  errorMessage: string | null;
  gameLabel: string;
  isDirty: boolean;
  isSaveDisabled: boolean;
  isSaving: boolean;
  reportId: string;
  successMessage: string | null;
  text: string;
  title: string;
  updatedAtLabel: string;
};

export type GameAnalysisReportConfirmationViewModel = {
  confirmLabel: string;
  description: string;
  isPending: boolean;
  kind: "discard-editor" | "regenerate";
  title: string;
};

export type GameAnalysisReportGenerationViewModel = {
  cards: GameAnalysisReportCardViewModel[];
  confirmation: GameAnalysisReportConfirmationViewModel | null;
  editor: GameAnalysisReportEditorViewModel | null;
};

export type GameAnalysisPageViewModel = {
  criticalMoments: GameAnalysisCriticalMomentViewModel[];
  header: GameAnalysisHeaderViewModel;
  orientation: "black" | "white";
  reportGeneration: GameAnalysisReportGenerationViewModel;
  replay: {
    initialFen: string;
    moveCount: number;
    moves: GameAnalysisReplayMoveViewModel[];
  };
  summary: GameAnalysisSummaryViewModel;
};
