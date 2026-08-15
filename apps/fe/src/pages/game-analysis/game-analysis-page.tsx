import { useEffect, useState } from "react";

import { useGameAnalysisData } from "./model";
import {
  CriticalMomentDetails,
  CriticalMomentsPanel,
  GameAnalysisHeader,
  GameAnalysisSkeleton,
  GameAnalysisStateCard,
  GameBoardCard,
  GameSummaryCard,
  ReplayMovesPanel,
  SelectedMoveDetails,
} from "./ui";

type GameAnalysisPageProps = {
  gameId: string;
  studentId: string;
};

export function GameAnalysisPage({ gameId, studentId }: GameAnalysisPageProps) {
  const query = useGameAnalysisData({
    gameId,
    studentId,
  });
  const headerReportGeneration =
    query.page?.reportGeneration ?? query.reportGeneration;
  const [positionMode, setPositionMode] = useState<"after" | "before">(
    "before",
  );
  const [selectedPly, setSelectedPly] = useState<number | null>(null);
  const [boardReversed, setBoardReversed] = useState(false);
  const effectiveSelectedPly = (() => {
    if (!query.page) {
      return null;
    }

    const hasSelectedMove = query.page.replay.moves.some(
      (move) => move.ply === selectedPly,
    );

    if (hasSelectedMove) {
      return selectedPly;
    }

    return (
      query.page.criticalMoments[0]?.ply ??
      query.page.replay.moves[0]?.ply ??
      null
    );
  })();
  const selectedMove =
    query.page?.replay.moves.find(
      (move) => move.ply === effectiveSelectedPly,
    ) ?? null;
  const selectedMoment =
    query.page?.criticalMoments.find(
      (moment) => moment.ply === effectiveSelectedPly,
    ) ?? null;

  useEffect(() => {
    if (selectedPly !== effectiveSelectedPly) {
      setSelectedPly(effectiveSelectedPly);
    }
  }, [effectiveSelectedPly, selectedPly]);

  useEffect(() => {
    setPositionMode("before");
  }, [gameId]);

  useEffect(() => {
    setBoardReversed(query.page?.orientation === "black");
  }, [gameId, query.page?.orientation]);

  if (query.state === "loading") {
    return <GameAnalysisSkeleton />;
  }

  if (query.state === "error") {
    return (
      <div className="space-y-4">
        {query.gameHeader ? (
          <GameAnalysisHeader
            header={query.gameHeader}
            onGenerateReport={query.generateReport}
            onRefreshReport={query.retryPage}
            onRetryReportGeneration={query.retryReportGeneration}
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
            header={query.gameHeader}
            onGenerateReport={query.generateReport}
            onRefreshReport={query.retryPage}
            onRetryReportGeneration={query.retryReportGeneration}
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
            header={query.gameHeader}
            onGenerateReport={query.generateReport}
            onRefreshReport={query.retryPage}
            onRetryReportGeneration={query.retryReportGeneration}
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
            header={query.gameHeader}
            onGenerateReport={query.generateReport}
            onRefreshReport={query.retryPage}
            onRetryReportGeneration={query.retryReportGeneration}
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
        header={query.page.header}
        onGenerateReport={query.generateReport}
        onRefreshReport={query.retryPage}
        onRetryReportGeneration={query.retryReportGeneration}
        reportGeneration={query.page.reportGeneration}
      />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.88fr)_minmax(320px,0.96fr)] xl:items-start">
        <div className="min-w-0">
          <GameBoardCard
            boardReversed={boardReversed}
            initialFen={query.page.replay.initialFen}
            onFlipBoard={() =>
              setBoardReversed((currentValue) => !currentValue)
            }
            onPositionModeChange={setPositionMode}
            positionMode={positionMode}
            selectedMoment={selectedMoment}
            selectedMove={selectedMove}
          />
        </div>

        <div className="min-w-0 space-y-4">
          <ReplayMovesPanel
            criticalMoments={query.page.criticalMoments}
            moves={query.page.replay.moves}
            onSelectPly={setSelectedPly}
            selectedPly={effectiveSelectedPly}
          />

          <CriticalMomentsPanel
            moments={query.page.criticalMoments}
            onSelectPly={setSelectedPly}
            selectedPly={effectiveSelectedPly}
          />
        </div>

        <div className="min-w-0">
          {selectedMoment ? (
            <CriticalMomentDetails
              isSubmittingReview={query.isSavingReview}
              moment={selectedMoment}
              onSubmitReview={query.submitMomentReview}
              reviewErrorMessage={query.reviewErrorMessage}
            />
          ) : selectedMove ? (
            <SelectedMoveDetails move={selectedMove} />
          ) : (
            <GameAnalysisStateCard
              description="У анализа пока нет доступных ходов для синхронизированного реплея."
              title="Реплей недоступен"
            />
          )}
        </div>
      </section>

      <GameSummaryCard summary={query.page.summary} />
    </div>
  );
}
