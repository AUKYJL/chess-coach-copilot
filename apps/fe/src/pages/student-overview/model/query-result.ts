import type {
  AnalyzeGameDraft,
  ChessAccountDraft,
  CoachNotesDraft,
  EditStudentDraft,
  StudentOverviewDialogKind,
  StudentOverviewDialogState,
} from "./dialog-state";
import type {
  OverviewScenario,
  StudentOverviewQueryStatus,
} from "./resource-state";
import type { StudentOverviewViewModel } from "./view-model";

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
