import { MoreHorizontal } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
  Typography,
} from "@/shared/ui";
import { BUTTON_SIZE, BUTTON_VARIANT, Button } from "@/shared/ui/button";

import type { GameAnalysisHeaderViewModel } from "../model";

import { ToneBadge } from "./tone-badge";

type GameAnalysisHeaderProps = {
  header: GameAnalysisHeaderViewModel;
};

export function GameAnalysisHeader({ header }: GameAnalysisHeaderProps) {
  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <Typography
              color={TYPOGRAPHY_COLOR.SECONDARY}
              variant={TYPOGRAPHY_VARIANT.CAPTION}
            >
              {header.breadcrumbs.join(" / ")}
            </Typography>
            <div className="space-y-2">
              <h1 className="text-foreground text-2xl font-semibold tracking-tight">
                {header.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Typography
                  color={TYPOGRAPHY_COLOR.SECONDARY}
                  variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
                >
                  {header.metadata.join(" • ")}
                </Typography>
                <ToneBadge label={header.statusLabel} tone={header.statusTone} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button disabled size={BUTTON_SIZE.SM}>
              Сформировать отчет
            </Button>
            <Button
              disabled
              size={BUTTON_SIZE.ICON}
              variant={BUTTON_VARIANT.OUTLINE}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0" />
    </Card>
  );
}
