import { ChevronDown, MoreHorizontal } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  InlineAlert,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
  Typography,
} from "@/shared/ui";
import { BUTTON_SIZE, BUTTON_VARIANT, Button } from "@/shared/ui/button";

import type {
  GameAnalysisHeaderViewModel,
  GameAnalysisReportAudience,
  GameAnalysisReportGenerationViewModel,
} from "../model";

import { ToneBadge } from "./tone-badge";

type GameAnalysisHeaderProps = {
  header: GameAnalysisHeaderViewModel;
  onGenerateReport: (audience: GameAnalysisReportAudience) => Promise<void>;
  onRefreshReport: () => Promise<void>;
  onRetryReportGeneration: () => Promise<void>;
  reportGeneration: GameAnalysisReportGenerationViewModel | null;
};

export function GameAnalysisHeader({
  header,
  onGenerateReport,
  onRefreshReport,
  onRetryReportGeneration,
  reportGeneration,
}: GameAnalysisHeaderProps) {
  const reportErrorMessage = reportGeneration?.errorMessage ?? null;
  const isReportActionPending = reportGeneration?.isActionPending ?? false;
  const reportStatus = reportGeneration?.status ?? null;
  const reportAction = reportStatus?.action ?? null;
  const reportStatusClasses =
    reportStatus?.tone === "danger"
      ? "border-danger/15 bg-danger/6"
      : reportStatus?.tone === "success"
        ? "border-emerald-500/20 bg-emerald-500/6"
        : "border-border bg-surface-subtle";

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
                <ToneBadge
                  label={header.statusLabel}
                  tone={header.statusTone}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  disabled={reportGeneration?.isDisabled ?? true}
                  size={BUTTON_SIZE.SM}
                  variant={BUTTON_VARIANT.SECONDARY}
                >
                  Сформировать отчет
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={async () => {
                    await onGenerateReport("COACH");
                  }}
                >
                  Отчет для тренера
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    await onGenerateReport("PARENT");
                  }}
                >
                  Отчет для родителя
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
      {reportErrorMessage || reportStatus ? (
        <CardContent className="space-y-3 pt-0">
          {reportErrorMessage ? (
            <InlineAlert>{reportErrorMessage}</InlineAlert>
          ) : null}

          {reportStatus ? (
            <div
              className={`rounded-2xl border px-4 py-3 ${reportStatusClasses}`}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Typography
                      className="text-sm font-semibold"
                      variant={TYPOGRAPHY_VARIANT.BODY}
                    >
                      {reportStatus.title}
                    </Typography>
                    <ToneBadge
                      label={reportStatus.label}
                      tone={reportStatus.tone}
                    />
                  </div>
                  <CardDescription>{reportStatus.description}</CardDescription>
                  {reportStatus.reportId ? (
                    <Typography
                      color={TYPOGRAPHY_COLOR.SECONDARY}
                      variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
                    >
                      ID отчета:{" "}
                      <span className="font-mono">{reportStatus.reportId}</span>
                    </Typography>
                  ) : null}
                </div>

                {reportAction?.kind !== "none" && reportAction?.label ? (
                  <Button
                    disabled={isReportActionPending}
                    onClick={
                      reportAction.kind === "refresh-report"
                        ? onRefreshReport
                        : onRetryReportGeneration
                    }
                    size={BUTTON_SIZE.SM}
                    variant={BUTTON_VARIANT.OUTLINE}
                  >
                    {reportAction.label}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </CardContent>
      ) : (
        <CardContent className="pt-0" />
      )}
    </Card>
  );
}
