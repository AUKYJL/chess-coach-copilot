import { Link } from "@tanstack/react-router";
import { ArrowRight, Clock3, SquareArrowOutUpRight } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
  Typography,
} from "@/shared/ui";
import { BUTTON_SIZE, BUTTON_VARIANT, Button } from "@/shared/ui/button";

import type { RecentGameRowViewModel } from "../model";

type RecentGamesSectionProps = {
  games: RecentGameRowViewModel[];
  studentId: string;
};

export function RecentGamesSection({
  games,
  studentId,
}: RecentGamesSectionProps) {
  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex items-center justify-between gap-4">
          <CardTitle>Последние партии</CardTitle>
          <Button variant={BUTTON_VARIANT.GHOST} size={BUTTON_SIZE.SM} disabled>
            Все партии
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {games.length > 0 ? (
          games.map((game, index) => (
            <div key={game.id} className="space-y-4">
              <Link
                className="group block space-y-2 rounded-[22px] transition-colors focus-visible:outline-none"
                params={{
                  gameId: game.id,
                  studentId,
                }}
                to="/students/$studentId/games/$gameId"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-foreground group-hover:text-accent text-sm font-semibold transition-colors">
                    {game.playersLabel}
                  </p>
                  <SquareArrowOutUpRight className="text-muted-foreground group-hover:text-accent size-4 shrink-0 transition-colors" />
                </div>
                <Typography
                  color={TYPOGRAPHY_COLOR.SECONDARY}
                  variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
                >
                  {game.metaLabel}
                </Typography>
                <Typography variant={TYPOGRAPHY_VARIANT.BODY_SMALL}>
                  {game.openingName}
                </Typography>
                <div className="text-muted-foreground flex items-center justify-between gap-3 text-xs tracking-[0.18em] uppercase">
                  <span>{game.importedAtLabel}</span>
                  <span className="flex items-center gap-1.5">
                    <Clock3 className="size-3.5" />
                    {game.analysisStateLabel}
                  </span>
                </div>
              </Link>
              {index < games.length - 1 ? <Separator /> : null}
            </div>
          ))
        ) : (
          <div className="border-border bg-surface-card rounded-[22px] border px-4 py-4">
            <p className="text-foreground text-sm font-semibold">
              Пока нет последних партий
            </p>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              Импортируйте первую аннотированную партию, чтобы начать историю
              анализа.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
