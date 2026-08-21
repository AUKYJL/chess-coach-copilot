import { useEffect, useEffectEvent, useState } from "react";

import { useGameAnalysisData } from "./model";
import {
  type ReplayNavigationAction,
  getReplayNavigationAction,
} from "./model/replay-keyboard-shortcuts";
import {
  GameAnalysisHeader,
  GameAnalysisSkeleton,
  GameAnalysisStateCard,
  type GameAnalysisWorkspaceTab,
  GameAnalysisWorkspace,
  GameBoardCard,
  GameSummaryCard,
} from "./ui";

type GameAnalysisPageProps = {
  gameId: string;
  studentId: string;
};

type CriticalMomentDetailOrigin = "all-moves" | "critical-moments" | null;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    Boolean(target.closest("input, textarea, select"))
  );
}

export function GameAnalysisPage({ gameId, studentId }: GameAnalysisPageProps) {
  const query = useGameAnalysisData({
    gameId,
    studentId,
  });
  const headerReportGeneration =
    query.page?.reportGeneration ?? query.reportGeneration;
  const [selectedPly, setSelectedPly] = useState<number | null>(null);
  const [boardReversed, setBoardReversed] = useState(false);
  const [workspaceTab, setWorkspaceTab] =
    useState<GameAnalysisWorkspaceTab>("critical-moments");
  const [criticalMomentDetailOrigin, setCriticalMomentDetailOrigin] =
    useState<CriticalMomentDetailOrigin>(null);
  const replayMoves = query.page?.replay.moves ?? [];
  const effectiveSelectedPly = (() => {
    if (!query.page) {
      return null;
    }

    const hasSelectedMove = replayMoves.some(
      (move) => move.ply === selectedPly,
    );

    if (hasSelectedMove) {
      return selectedPly;
    }

    return query.page.criticalMoments[0]?.ply ?? replayMoves[0]?.ply ?? null;
  })();
  const selectedMoveIndex =
    effectiveSelectedPly === null
      ? -1
      : replayMoves.findIndex((move) => move.ply === effectiveSelectedPly);
  const selectedMove =
    selectedMoveIndex >= 0 ? replayMoves[selectedMoveIndex] : null;
  const selectedMoment =
    query.page?.criticalMoments.find(
      (moment) => moment.ply === effectiveSelectedPly,
    ) ?? null;
  const firstMove = replayMoves[0] ?? null;
  const lastMove = replayMoves.at(-1) ?? null;
  const previousMove =
    selectedMoveIndex > 0 ? replayMoves[selectedMoveIndex - 1] : null;
  const nextMove =
    selectedMoveIndex >= 0 && selectedMoveIndex < replayMoves.length - 1
      ? replayMoves[selectedMoveIndex + 1]
      : null;
  const selectedMomentIndex = query.page
    ? query.page.criticalMoments.findIndex(
        (moment) => moment.ply === effectiveSelectedPly,
      )
    : -1;

  const goToStart = () => {
    if (firstMove) {
      setSelectedPly(firstMove.ply);
    }
  };

  const goToEnd = () => {
    if (lastMove) {
      setSelectedPly(lastMove.ply);
    }
  };

  const goToPrevious = () => {
    if (previousMove) {
      setSelectedPly(previousMove.ply);
    }
  };

  const goToNext = () => {
    if (nextMove) {
      setSelectedPly(nextMove.ply);
    }
  };

  const selectCriticalMoment = (ply: number) => {
    setSelectedPly(ply);
    setCriticalMomentDetailOrigin("critical-moments");
  };

  const openCriticalMomentDetailsFromAllMoves = () => {
    setWorkspaceTab("critical-moments");
    setCriticalMomentDetailOrigin("all-moves");
  };

  const backFromCriticalMomentDetails = () => {
    if (criticalMomentDetailOrigin) {
      setWorkspaceTab(criticalMomentDetailOrigin);
    }

    setCriticalMomentDetailOrigin(null);
  };

  const goToPreviousCriticalMoment = () => {
    if (!query.page || selectedMomentIndex <= 0) {
      return;
    }

    setSelectedPly(query.page.criticalMoments[selectedMomentIndex - 1].ply);
  };

  const goToNextCriticalMoment = () => {
    if (
      !query.page ||
      selectedMomentIndex < 0 ||
      selectedMomentIndex >= query.page.criticalMoments.length - 1
    ) {
      return;
    }

    setSelectedPly(query.page.criticalMoments[selectedMomentIndex + 1].ply);
  };

  const goToNextUnreviewedCriticalMoment = () => {
    if (!query.page || selectedMomentIndex < 0) {
      return;
    }

    const nextMoment = query.page.criticalMoments
      .slice(selectedMomentIndex + 1)
      .find((moment) => moment.reviewStatus === "UNREVIEWED");

    if (nextMoment) {
      setSelectedPly(nextMoment.ply);
    }
  };
  const handleReplayNavigation = useEffectEvent(
    (navigationAction: ReplayNavigationAction) => {
      switch (navigationAction) {
        case "start":
          goToStart();
          return;
        case "end":
          goToEnd();
          return;
        case "previous":
          goToPrevious();
          return;
        case "next":
          goToNext();
          return;
      }
    },
  );

  useEffect(() => {
    if (selectedPly !== effectiveSelectedPly) {
      setSelectedPly(effectiveSelectedPly);
    }
  }, [effectiveSelectedPly, selectedPly]);

  useEffect(() => {
    setBoardReversed(query.page?.orientation === "black");
  }, [gameId, query.page?.orientation]);

  useEffect(() => {
    setSelectedPly(null);
    setWorkspaceTab("critical-moments");
    setCriticalMomentDetailOrigin(null);
  }, [gameId]);

  useEffect(() => {
    if (!query.page || replayMoves.length === 0) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      if (isEditableTarget(event.target)) {
        return;
      }

      const navigationAction = getReplayNavigationAction(event);

      if (!navigationAction) {
        return;
      }

      event.preventDefault();
      handleReplayNavigation(navigationAction);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [query.page, replayMoves.length]);

  if (query.state === "loading") {
    return <GameAnalysisSkeleton />;
  }

  if (query.state === "error") {
    return (
      <div className="space-y-4">
        {query.gameHeader ? (
          <GameAnalysisHeader
            changeReportDraft={query.changeReportDraft}
            closeReportConfirmation={query.closeReportConfirmation}
            confirmReportAction={query.confirmReportAction}
            header={query.gameHeader}
            onGenerateReport={query.requestGenerateReport}
            onOpenReport={query.openReport}
            onRequestCloseReportEditor={query.requestCloseReportEditor}
            onSaveReport={query.saveReport}
            reportGeneration={headerReportGeneration}
          />
        ) : null}
        <GameAnalysisStateCard
          actionLabel="Повторить"
          description={query.errorMessage}
          onAction={query.retryPage}
          title="Не удалось открыть разбор партии"
          tone="danger"
        />
      </div>
    );
  }

  if (query.state === "processing") {
    return (
      <div className="space-y-4">
        {query.gameHeader ? (
          <GameAnalysisHeader
            changeReportDraft={query.changeReportDraft}
            closeReportConfirmation={query.closeReportConfirmation}
            confirmReportAction={query.confirmReportAction}
            header={query.gameHeader}
            onGenerateReport={query.requestGenerateReport}
            onOpenReport={query.openReport}
            onRequestCloseReportEditor={query.requestCloseReportEditor}
            onSaveReport={query.saveReport}
            reportGeneration={headerReportGeneration}
          />
        ) : null}
        <GameAnalysisStateCard
          description={query.statusDescription}
          isLoading
          title={query.statusTitle}
        />
      </div>
    );
  }

  if (query.state === "failed") {
    return (
      <div className="space-y-4">
        {query.gameHeader ? (
          <GameAnalysisHeader
            changeReportDraft={query.changeReportDraft}
            closeReportConfirmation={query.closeReportConfirmation}
            confirmReportAction={query.confirmReportAction}
            header={query.gameHeader}
            onGenerateReport={query.requestGenerateReport}
            onOpenReport={query.openReport}
            onRequestCloseReportEditor={query.requestCloseReportEditor}
            onSaveReport={query.saveReport}
            reportGeneration={headerReportGeneration}
          />
        ) : null}
        <GameAnalysisStateCard
          actionLabel="Повторить анализ"
          description={query.errorMessage}
          isSubmitting={query.isRetryingAnalysis}
          onAction={query.onRetryAnalysis}
          onSecondaryAction={query.retryPage}
          secondaryActionLabel="Обновить"
          title="Анализ завершился ошибкой"
          tone="danger"
        />
      </div>
    );
  }

  if (query.state === "unavailable" || !query.page) {
    return (
      <div className="space-y-4">
        {query.gameHeader ? (
          <GameAnalysisHeader
            changeReportDraft={query.changeReportDraft}
            closeReportConfirmation={query.closeReportConfirmation}
            confirmReportAction={query.confirmReportAction}
            header={query.gameHeader}
            onGenerateReport={query.requestGenerateReport}
            onOpenReport={query.openReport}
            onRequestCloseReportEditor={query.requestCloseReportEditor}
            onSaveReport={query.saveReport}
            reportGeneration={headerReportGeneration}
          />
        ) : null}
        <GameAnalysisStateCard
          actionLabel="Обновить"
          description={query.errorMessage}
          onAction={query.retryPage}
          title="Анализ пока недоступен"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-5">
      <GameAnalysisHeader
        changeReportDraft={query.changeReportDraft}
        closeReportConfirmation={query.closeReportConfirmation}
        confirmReportAction={query.confirmReportAction}
        header={query.page.header}
        onGenerateReport={query.requestGenerateReport}
        onOpenReport={query.openReport}
        onRequestCloseReportEditor={query.requestCloseReportEditor}
        onSaveReport={query.saveReport}
        reportGeneration={query.page.reportGeneration}
      />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,1fr)] xl:items-stretch">
        <div className="min-w-0 xl:h-full">
          <GameBoardCard
            boardReversed={boardReversed}
            initialFen={query.page.replay.initialFen}
            isEndDisabled={selectedMove?.ply === lastMove?.ply}
            isNextDisabled={!nextMove}
            isPreviousDisabled={!previousMove}
            isStartDisabled={selectedMove?.ply === firstMove?.ply}
            onFlipBoard={() =>
              setBoardReversed((currentValue) => !currentValue)
            }
            onGoToEnd={goToEnd}
            onGoToNext={goToNext}
            onGoToPrevious={goToPrevious}
            onGoToStart={goToStart}
            selectedMoment={selectedMoment}
            selectedMove={selectedMove}
          />
        </div>

        <div className="min-w-0 xl:h-full xl:[contain:size]">
          <GameAnalysisWorkspace
            activeTab={workspaceTab}
            criticalMoments={query.page.criticalMoments}
            isDetailOpen={criticalMomentDetailOrigin !== null}
            isSubmittingReview={query.isSavingReview}
            moves={query.page.replay.moves}
            onBackToCriticalMoments={backFromCriticalMomentDetails}
            onChangeTab={setWorkspaceTab}
            onGoToNextMoment={goToNextCriticalMoment}
            onGoToPreviousMoment={goToPreviousCriticalMoment}
            onReviewSaved={goToNextUnreviewedCriticalMoment}
            onOpenCriticalMomentDetailsFromAllMoves={
              openCriticalMomentDetailsFromAllMoves
            }
            onSelectMoment={selectCriticalMoment}
            onSelectMove={setSelectedPly}
            onSubmitReview={query.submitMomentReview}
            reviewErrorMessage={query.reviewErrorMessage}
            selectedPly={effectiveSelectedPly}
          />
        </div>
      </section>

      <GameSummaryCard summary={query.page.summary} />
    </div>
  );
}
