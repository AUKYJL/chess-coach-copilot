import { useMemo } from "react";
import { useParams } from "react-router-dom";

import { useStudentOverviewData } from "./model";
import {
  AnalyzeGameDialog,
  ChessAccountsDialog,
  CoachNotesDialog,
  EditStudentDialog,
  NextLessonSection,
  OverviewErrorState,
  OverviewTabs,
  PerformanceTrendSection,
  ProgressInsightSection,
  RecentGamesSection,
  RecentMaterialsSection,
  SectionErrorState,
  SectionSkeletonCard,
  StudentHeader,
  StudentOverviewSkeleton,
  StudentContextPanel,
  SummaryCards,
  WeaknessProfileSection,
} from "./ui";

const defaultAnalyzeGameDraft = {
  rawPgn: "",
  studentColor: "WHITE" as const,
  sourceLabel: "",
};
const defaultChessAccountDraft = {
  platform: "LICHESS" as const,
  username: "",
};

export function StudentOverviewPage() {
  const { studentId } = useParams();
  const routeStudentId = studentId ?? "";
  const query = useStudentOverviewData({ studentId: routeStudentId });
  const overview = query.resources.overview.data;
  const editingAccount = useMemo(
    () =>
      overview?.externalAccounts.find(
        (account) => account.id === query.dialogState.editingChessAccountId,
      ) ?? null,
    [overview?.externalAccounts, query.dialogState.editingChessAccountId],
  );
  const editStudentDraft = useMemo(
    () => ({
      displayName: overview?.student.displayName ?? "",
      birthYear: overview?.student.birthYear ?? null,
      rating: overview?.student.rating ?? null,
      notes: overview?.student.notes ?? "",
    }),
    [
      overview?.student.birthYear,
      overview?.student.displayName,
      overview?.student.notes,
      overview?.student.rating,
    ],
  );
  const chessAccountDraft = useMemo(() => {
    if (editingAccount) {
      return {
        platform: editingAccount.platform,
        username: editingAccount.username,
      };
    }

    return defaultChessAccountDraft;
  }, [editingAccount]);
  const coachNotesDraft = useMemo(
    () => ({
      notes: overview?.student.notes ?? "",
    }),
    [overview?.student.notes],
  );

  if (!studentId) {
    return (
      <OverviewErrorState
        description="Student ID is missing from the route."
        onRetry={async () => {}}
      />
    );
  }

  if (query.status === "error") {
    return (
      <OverviewErrorState
        description={query.error ?? ""}
        onRetry={query.retryOverview}
      />
    );
  }

  if (query.status === "loading" || !query.data) {
    return <StudentOverviewSkeleton />;
  }

  return (
    <div className="space-y-4 md:space-y-5 xl:space-y-6">
      <StudentHeader
        student={query.data.student}
        onAnalyzeGame={() => query.openDialog("analyze-game")}
        onOpenChessAccounts={() => query.openDialog("chess-accounts")}
        onEditStudent={() => query.openDialog("edit-student")}
        onToggleArchived={query.toggleArchived}
      />
      <OverviewTabs />
      <SummaryCards cards={query.data.summaryCards} />

      <section className="grid gap-4 md:gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(360px,0.96fr)] xl:items-start">
        <div className="min-w-0 space-y-4 md:space-y-5">
          {query.resources.performanceTrend.status === "error" ? (
            <SectionErrorState
              title="Performance trend unavailable"
              description={
                query.resources.performanceTrend.errorMessage ??
                "The trend section failed to load."
              }
              onRetry={query.retryPerformanceTrend}
            />
          ) : query.resources.performanceTrend.status === "loading" ? (
            <SectionSkeletonCard
              title="Performance trend loading"
              lines={5}
              tall
            />
          ) : (
            <PerformanceTrendSection trend={query.data.performanceTrend} />
          )}

          <ProgressInsightSection insight={query.data.progressInsight} />

          <div className="grid gap-4 md:gap-5 lg:grid-cols-2">
            {query.resources.analysisProfile.status === "error" ? (
              <SectionErrorState
                title="Weakness profile unavailable"
                description={
                  query.resources.analysisProfile.errorMessage ??
                  "The weakness profile section failed to load."
                }
                onRetry={query.retryAnalysisProfile}
              />
            ) : query.resources.analysisProfile.status === "loading" ? (
              <SectionSkeletonCard title="Weakness profile loading" lines={6} />
            ) : (
              <WeaknessProfileSection profile={query.data.weaknessProfile} />
            )}

            {query.resources.lessonPreview.status === "error" ? (
              <SectionErrorState
                title="Next lesson unavailable"
                description={
                  query.resources.lessonPreview.errorMessage ??
                  "The next lesson section failed to load."
                }
                onRetry={query.retryLessonPreview}
              />
            ) : query.resources.lessonPreview.status === "loading" ? (
              <SectionSkeletonCard title="Next lesson loading" lines={6} />
            ) : (
              <NextLessonSection lesson={query.data.nextLesson} />
            )}
          </div>

          <RecentMaterialsSection materials={query.data.recentMaterials} />
        </div>

        <div className="min-w-0 space-y-4 md:space-y-5">
          <RecentGamesSection games={query.data.recentGames} />
          <StudentContextPanel
            accounts={query.data.chessAccounts}
            coachNotes={query.data.coachNotes}
            studentInformation={query.data.studentInformation}
            onOpenChessAccounts={() => query.openDialog("chess-accounts")}
            onOpenCoachNotes={() => query.openDialog("coach-notes")}
          />
        </div>
      </section>

      <AnalyzeGameDialog
        open={query.dialogState.kind === "analyze-game"}
        draft={defaultAnalyzeGameDraft}
        onOpenChange={(open) => {
          if (!open) {
            query.closeDialog();
          }
        }}
        onSubmit={query.submitAnalyzeGame}
      />

      <EditStudentDialog
        open={query.dialogState.kind === "edit-student"}
        draft={editStudentDraft}
        onOpenChange={(open) => {
          if (!open) {
            query.closeDialog();
          }
        }}
        onSubmit={query.submitEditStudent}
      />

      <ChessAccountsDialog
        open={query.dialogState.kind === "chess-accounts"}
        accounts={query.data.chessAccounts}
        editingAccountId={query.dialogState.editingChessAccountId}
        draft={chessAccountDraft}
        onOpenChange={(open) => {
          if (!open) {
            query.closeDialog();
          }
        }}
        onSubmit={(draft, accountId) =>
          query.submitChessAccount(draft, { accountId })
        }
        onEditAccount={(accountId) =>
          query.openDialog("chess-accounts", {
            editingChessAccountId: accountId || null,
          })
        }
        onRemoveAccount={query.removeChessAccount}
      />

      <CoachNotesDialog
        open={query.dialogState.kind === "coach-notes"}
        draft={coachNotesDraft}
        onOpenChange={(open) => {
          if (!open) {
            query.closeDialog();
          }
        }}
        onSubmit={query.submitCoachNotes}
      />
    </div>
  );
}
