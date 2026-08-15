/* oxlint-disable react/only-export-components */
import { createFileRoute } from "@tanstack/react-router";

import { GameAnalysisPage } from "@/pages/game-analysis";

export const Route = createFileRoute(
  "/_authenticated/students/$studentId/games/$gameId",
)({
  component: GameAnalysisRoute,
});

function GameAnalysisRoute() {
  const { gameId, studentId } = Route.useParams();

  return <GameAnalysisPage gameId={gameId} studentId={studentId} />;
}
