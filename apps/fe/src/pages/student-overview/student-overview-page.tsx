import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";

import {
  getStudentOverviewScenarioOptions,
  resolveStudentOverviewScenarioId,
  useStudentOverviewData,
} from "./model";
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
  ScenarioSwitcher,
  SectionErrorState,
  SectionSkeletonCard,
  StudentHeader,
  StudentOverviewSkeleton,
  StudentContextPanel,
  SummaryCards,
  WeaknessProfileSection,
} from "./ui";

const isDevelopmentEnvironment = import.meta.env.DEV;
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
  const { studentId = "demo-student" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const scenarioId = resolveStudentOverviewScenarioId(
    searchParams,
    isDevelopmentEnvironment,
  );
  const scenarioOptions = getStudentOverviewScenarioOptions();
  const query = useStudentOverviewData({ studentId, scenarioId });
  const overview = query.scenario.resources.overview.data;
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
  const analyzeGameDraft = useMemo(
    () =>
      query.scenario.localState?.analyzeGameDraft ?? defaultAnalyzeGameDraft,
    [query.scenario.localState?.analyzeGameDraft],
  );
  const chessAccountDraft = useMemo(() => {
    if (editingAccount) {
      return {
        platform: editingAccount.platform,
        username: editingAccount.username,
      };
    }

    return query.scenario.localState?.chessAccountDraft ?? defaultChessAccountDraft;
  }, [editingAccount, query.scenario.localState?.chessAccountDraft]);
  const coachNotesDraft = useMemo(
    () => ({
      notes: overview?.student.notes ?? "",
    }),
    [overview?.student.notes],
  );

  if (query.status === "error") {
    return (
      <OverviewErrorState
        description={query.error ?? ""}
        onRetry={query.retry}
      />
    );
  }

  if (query.status === "loading" || !query.data) {
    return <StudentOverviewSkeleton />;
  }

  return (
    <div className="space-y-5 md:space-y-6 xl:space-y-8">
      {isDevelopmentEnvironment ? (
        <ScenarioSwitcher
          scenarioId={scenarioId}
          options={scenarioOptions}
          onScenarioChange={(nextScenarioId) => {
            const nextSearchParams = new URLSearchParams(searchParams);

            nextSearchParams.set("scenario", nextScenarioId);
            setSearchParams(nextSearchParams);
          }}
        />
      ) : null}

      <StudentHeader
        student={query.data.student}
        onAnalyzeGame={() => query.openDialog("analyze-game")}
        onOpenChessAccounts={() => query.openDialog("chess-accounts")}
        onEditStudent={() => query.openDialog("edit-student")}
        onToggleArchived={query.toggleArchived}
      />
      <OverviewTabs />
      <SummaryCards cards={query.data.summaryCards} />

      <section className="grid gap-5 md:gap-6 xl:grid-cols-[minmax(0,1.62fr)_minmax(320px,0.94fr)]">
        <div className="order-1 min-w-0 xl:col-start-1">
          {query.scenario.resources.performanceTrend.status === "error" ? (
            <SectionErrorState
              title="Performance trend unavailable"
              description={
                query.scenario.resources.performanceTrend.errorMessage ??
                "The trend section failed to load."
              }
              onRetry={query.retry}
            />
          ) : query.scenario.resources.performanceTrend.status ===
            "loading" ? (
            <SectionSkeletonCard
              title="Performance trend loading"
              lines={5}
              tall
            />
          ) : (
            <PerformanceTrendSection trend={query.data.performanceTrend} />
          )}
        </div>

        <div className="order-2 min-w-0 xl:col-start-2 xl:row-span-2">
          <RecentGamesSection games={query.data.recentGames} />
        </div>

        <div className="order-3 min-w-0 xl:col-start-1">
          <ProgressInsightSection insight={query.data.progressInsight} />
        </div>

        <div className="order-4 min-w-0 xl:col-start-1">
          <div className="grid gap-5 md:gap-6 lg:grid-cols-2">
            {query.scenario.resources.analysisProfile.status === "error" ? (
              <SectionErrorState
                title="Weakness profile unavailable"
                description={
                  query.scenario.resources.analysisProfile.errorMessage ??
                  "The weakness profile section failed to load."
                }
                onRetry={query.retry}
              />
            ) : query.scenario.resources.analysisProfile.status ===
              "loading" ? (
              <SectionSkeletonCard title="Weakness profile loading" lines={6} />
            ) : (
              <WeaknessProfileSection profile={query.data.weaknessProfile} />
            )}

            {query.scenario.resources.lessonPreview.status === "error" ? (
              <SectionErrorState
                title="Next lesson unavailable"
                description={
                  query.scenario.resources.lessonPreview.errorMessage ??
                  "The next lesson section failed to load."
                }
                onRetry={query.retry}
              />
            ) : query.scenario.resources.lessonPreview.status === "loading" ? (
              <SectionSkeletonCard title="Next lesson loading" lines={6} />
            ) : (
              <NextLessonSection lesson={query.data.nextLesson} />
            )}
          </div>
        </div>

        <div className="order-5 min-w-0 xl:col-start-1">
          <RecentMaterialsSection materials={query.data.recentMaterials} />
        </div>

        <div className="order-6 min-w-0 xl:col-start-2">
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
        draft={analyzeGameDraft}
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
