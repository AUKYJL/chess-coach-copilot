import type {
  AnalyzeGameDraft,
  ChessAccountDraft,
  CoachNotesDraft,
  EditStudentDraft,
  StudentOverviewDialogKind,
  StudentOverviewDialogState,
} from "./dialog-state";
import type {
  StudentOverviewQueryStatus,
  StudentOverviewResources,
} from "./resource-state";
import type { StudentOverviewViewModel } from "./view-model";

export type StudentOverviewQueryResult = {
  studentId: string;
  resources: StudentOverviewResources;
  dialogState: StudentOverviewDialogState;
  status: StudentOverviewQueryStatus;
  data: StudentOverviewViewModel | null;
  error: string | null;
  openDialog: (
    kind: StudentOverviewDialogKind,
    options?: { editingChessAccountId?: string | null },
  ) => void;
  closeDialog: () => void;
  retryOverview: () => Promise<void>;
  retryAnalysisProfile: () => Promise<void>;
  retryPerformanceTrend: () => Promise<void>;
  retryLessonPreview: () => Promise<void>;
  toggleArchived: () => Promise<void>;
  submitAnalyzeGame: (draft: AnalyzeGameDraft) => Promise<void>;
  submitEditStudent: (draft: EditStudentDraft) => Promise<void>;
  submitChessAccount: (
    draft: ChessAccountDraft,
    options?: { accountId?: string | null },
  ) => Promise<void>;
  removeChessAccount: (accountId: string) => Promise<void>;
  submitCoachNotes: (draft: CoachNotesDraft) => Promise<void>;
};
