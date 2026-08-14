import { ArrowRight, Clock3 } from "lucide-react";

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
};

export function RecentGamesSection({ games }: RecentGamesSectionProps) {
  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex items-center justify-between gap-4">
          <CardTitle>Recent games</CardTitle>
          <Button variant={BUTTON_VARIANT.GHOST} size={BUTTON_SIZE.SM} disabled>
            View all
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {games.length > 0 ? (
          games.map((game, index) => (
            <div key={game.id} className="space-y-4">
              <div className="space-y-2">
                <p className="text-foreground text-sm font-semibold">
                  {game.playersLabel}
                </p>
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
              </div>
              {index < games.length - 1 ? <Separator /> : null}
            </div>
          ))
        ) : (
          <div className="border-border bg-surface-card rounded-[22px] border px-4 py-4">
            <p className="text-foreground text-sm font-semibold">
              No recent games yet
            </p>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              Import the first annotated game to start building the analysis
              trail.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
