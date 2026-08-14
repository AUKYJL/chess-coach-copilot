import type { ExternalPlatform, StudentColor } from "./api-types";

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
  | "analyze-game"
  | "edit-student"
  | "chess-accounts"
  | "coach-notes";

export type StudentOverviewDialogState = {
  kind: StudentOverviewDialogKind | null;
  editingChessAccountId: string | null;
};
