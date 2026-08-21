import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui";

import type {
  GameAnalysisCriticalMomentViewModel,
  GameAnalysisReplayMoveViewModel,
  GameAnalysisReviewStatus,
} from "../model";

import { CriticalMomentDetails } from "./critical-moment-details";
import { CriticalMomentsPanel } from "./critical-moments-panel";
import { ReplayMovesPanel } from "./replay-moves-panel";
import { SelectedCriticalMovePanel } from "./selected-critical-move-panel";

export type GameAnalysisWorkspaceTab = "all-moves" | "critical-moments";

type GameAnalysisWorkspaceProps = {
  activeTab: GameAnalysisWorkspaceTab;
  criticalMoments: GameAnalysisCriticalMomentViewModel[];
  isDetailOpen: boolean;
  isSubmittingReview: boolean;
  moves: GameAnalysisReplayMoveViewModel[];
  onBackToCriticalMoments: () => void;
  onChangeTab: (tab: GameAnalysisWorkspaceTab) => void;
  onGoToNextMoment: () => void;
  onGoToPreviousMoment: () => void;
  onOpenCriticalMomentDetailsFromAllMoves: () => void;
  onReviewSaved: () => void;
  onSelectMoment: (ply: number) => void;
  onSelectMove: (ply: number) => void;
  onSubmitReview: (input: {
    coachNote: string;
    mistakeId: string;
    status: GameAnalysisReviewStatus;
  }) => Promise<boolean>;
  reviewErrorMessage: string | null;
  selectedPly: number | null;
};

export function GameAnalysisWorkspace({
  activeTab,
  criticalMoments,
  isDetailOpen,
  isSubmittingReview,
  moves,
  onBackToCriticalMoments,
  onChangeTab,
  onGoToNextMoment,
  onGoToPreviousMoment,
  onOpenCriticalMomentDetailsFromAllMoves,
  onReviewSaved,
  onSelectMoment,
  onSelectMove,
  onSubmitReview,
  reviewErrorMessage,
  selectedPly,
}: GameAnalysisWorkspaceProps) {
  const selectedMoment =
    criticalMoments.find((moment) => moment.ply === selectedPly) ?? null;
  const selectedMomentIndex = selectedMoment
    ? criticalMoments.findIndex((moment) => moment.id === selectedMoment.id)
    : -1;

  return (
    <section className="border-border bg-surface xl:h-full xl:min-h-0 flex min-h-[28rem] flex-col overflow-hidden rounded-[28px] border">
      <Tabs
        className="flex min-h-0 flex-1 flex-col"
        onValueChange={(value) =>
          onChangeTab(
            value === "all-moves" ? "all-moves" : "critical-moments",
          )
        }
        value={activeTab}
      >
        <div className="border-border px-4 py-4 border-b">
          <TabsList>
            <TabsTrigger value="critical-moments">
              Критические моменты
            </TabsTrigger>
            <TabsTrigger value="all-moves">Все ходы</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          className={
            isDetailOpen && selectedMoment
              ? "mt-0 flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4 pt-4"
              : "mt-0 min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4"
          }
          value="critical-moments"
        >
          {isDetailOpen && selectedMoment ? (
            <CriticalMomentDetails
              hasNext={selectedMomentIndex < criticalMoments.length - 1}
              hasPrevious={selectedMomentIndex > 0}
              isSubmittingReview={isSubmittingReview}
              moment={selectedMoment}
              momentIndex={selectedMomentIndex}
              momentsCount={criticalMoments.length}
              onBack={onBackToCriticalMoments}
              onGoToNext={onGoToNextMoment}
              onGoToPrevious={onGoToPreviousMoment}
              onReviewSaved={onReviewSaved}
              onSubmitReview={onSubmitReview}
              reviewErrorMessage={reviewErrorMessage}
            />
          ) : (
            <CriticalMomentsPanel
              moments={criticalMoments}
              onSelectPly={onSelectMoment}
              selectedPly={selectedPly}
            />
          )}
        </TabsContent>

        <TabsContent
          className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden"
          value="all-moves"
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4">
            <ReplayMovesPanel
              criticalMoments={criticalMoments}
              moves={moves}
              onSelectPly={onSelectMove}
              selectedPly={selectedPly}
            />
          </div>
          {selectedMoment ? (
            <footer className="border-border shrink-0 border-t px-4 py-3">
              <SelectedCriticalMovePanel
                moment={selectedMoment}
                onOpenDetails={onOpenCriticalMomentDetailsFromAllMoves}
              />
            </footer>
          ) : null}
        </TabsContent>
      </Tabs>
    </section>
  );
}
