import { ArrowRight, Clock3 } from "lucide-react";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
} from "@/shared/ui";

import type { RecentGameRowViewModel } from "../model/types";

type RecentGamesSectionProps = {
  games: RecentGameRowViewModel[];
};

export function RecentGamesSection({ games }: RecentGamesSectionProps) {
  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex items-center justify-between gap-4">
          <CardTitle>Recent games</CardTitle>
          <Button variant="ghost" size="sm">
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
                <p className="text-foreground text-sm font-semibold">{game.playersLabel}</p>
                <p className="text-muted-foreground text-sm">{game.metaLabel}</p>
                <p className="text-foreground text-sm">{game.openingName}</p>
                <div className="text-muted-foreground flex items-center justify-between gap-3 text-xs uppercase tracking-[0.18em]">
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
          <div className="bg-surface-card rounded-[22px] px-4 py-4">
            <p className="text-foreground text-sm font-semibold">
              No recent games yet
            </p>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              Import the first annotated game to start building the analysis trail.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
