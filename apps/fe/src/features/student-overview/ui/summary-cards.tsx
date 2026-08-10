import { TrendingUp } from "lucide-react";

import { cn } from "@/shared/lib/cn";
import { Card, CardContent, CardHeader } from "@/shared/ui";

import { toneChipClasses } from "../model/semantic-tones";
import type { SummaryCardViewModel } from "../model/types";

type SummaryCardsProps = {
  cards: SummaryCardViewModel[];
};

export function SummaryCards({ cards }: SummaryCardsProps) {
  return (
    <section
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
      aria-label="Summary cards"
    >
      {cards.map((card) => (
        <Card
          key={card.id}
          data-testid="summary-card"
          className="bg-surface-card border-0 shadow-none"
        >
          <CardHeader className="gap-4 pb-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-muted-foreground text-sm font-medium">
                {card.label}
              </p>
              {card.id === "progress" ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                    toneChipClasses[card.tone],
                  )}
                >
                  <TrendingUp className="size-3" />
                  {card.value}
                </span>
              ) : null}
            </div>
            <div className="space-y-2">
              <p className="text-foreground text-[2rem] leading-none font-semibold tracking-tight">
                {card.value}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm leading-5">
              {card.supportingText}
            </p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
