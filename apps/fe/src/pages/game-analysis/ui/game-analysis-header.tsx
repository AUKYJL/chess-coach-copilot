import { LoaderCircle } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  InlineAlert,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
  Textarea,
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
  changeReportDraft: (text: string) => void;
  closeReportConfirmation: () => void;
  confirmReportAction: () => Promise<void>;
  header: GameAnalysisHeaderViewModel;
  onGenerateReport: (audience: GameAnalysisReportAudience) => Promise<void>;
  onOpenReport: (reportId: string) => void;
  onRequestCloseReportEditor: () => void;
  onSaveReport: () => Promise<void>;
  reportGeneration: GameAnalysisReportGenerationViewModel | null;
};

function getCardClasses(tone: "danger" | "neutral" | "success" | "warning") {
  switch (tone) {
    case "danger":
      return "border-danger/15 bg-danger/6";
    case "success":
      return "border-emerald-500/18 bg-emerald-500/6";
    case "warning":
      return "border-[#f0b25f]/25 bg-[#fff8ee]";
    default:
      return "border-border bg-surface-subtle";
  }
}

export function GameAnalysisHeader({
  changeReportDraft,
  closeReportConfirmation,
  confirmReportAction,
  header,
  onGenerateReport,
  onOpenReport,
  onRequestCloseReportEditor,
  onSaveReport,
  reportGeneration,
}: GameAnalysisHeaderProps) {
  const handleCardAction = async (
    audience: GameAnalysisReportAudience,
    reportId: string | null,
    actionKind: "generate" | "open" | "regenerate" | "retry",
  ) => {
    if (actionKind === "open") {
      if (!reportId) {
        return;
      }

      onOpenReport(reportId);
      return;
    }

    await onGenerateReport(audience);
  };

  return (
    <>
      <Card>
        <CardHeader className="gap-3">
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
        </CardHeader>

        <CardContent className="space-y-3 pt-0">
          <div className="grid gap-3 md:grid-cols-2">
            {(reportGeneration?.cards ?? []).map((card) => {
              const primaryAction = card.primaryAction;
              const secondaryAction = card.secondaryAction;

              return (
                <section
                  key={card.audience}
                  className={`rounded-3xl border px-4 py-4 ${getCardClasses(card.tone)}`}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <Typography
                          color={TYPOGRAPHY_COLOR.SECONDARY}
                          variant={TYPOGRAPHY_VARIANT.CAPTION}
                        >
                          {card.audienceLabel}
                        </Typography>
                        <Typography
                          className="text-base font-semibold"
                          variant={TYPOGRAPHY_VARIANT.BODY}
                        >
                          {card.title}
                        </Typography>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {card.isManual ? (
                          <ToneBadge label="Ручная правка" tone="neutral" />
                        ) : null}
                        <ToneBadge label={card.statusLabel} tone={card.tone} />
                      </div>
                    </div>

                    {card.updatedAtLabel ? (
                      <Typography
                        color={TYPOGRAPHY_COLOR.SECONDARY}
                        variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
                      >
                        {card.updatedAtLabel}
                      </Typography>
                    ) : null}

                    <CardDescription>{card.description}</CardDescription>

                    {card.inlineError ? (
                      <InlineAlert>{card.inlineError}</InlineAlert>
                    ) : null}

                    {primaryAction || secondaryAction ? (
                      <div className="flex flex-wrap gap-2">
                        {primaryAction ? (
                          <Button
                            disabled={primaryAction.disabled}
                            onClick={async () => {
                              await handleCardAction(
                                card.audience,
                                card.reportId,
                                primaryAction.kind,
                              );
                            }}
                            size={BUTTON_SIZE.SM}
                          >
                            {primaryAction.isLoading ? (
                              <LoaderCircle
                                aria-hidden="true"
                                className="size-4 animate-spin"
                              />
                            ) : null}
                            {primaryAction.label}
                          </Button>
                        ) : null}

                        {secondaryAction ? (
                          <Button
                            disabled={secondaryAction.disabled}
                            onClick={async () => {
                              await handleCardAction(
                                card.audience,
                                card.reportId,
                                secondaryAction.kind,
                              );
                            }}
                            size={BUTTON_SIZE.SM}
                            variant={BUTTON_VARIANT.OUTLINE}
                          >
                            {secondaryAction.isLoading ? (
                              <LoaderCircle
                                aria-hidden="true"
                                className="size-4 animate-spin"
                              />
                            ) : null}
                            {secondaryAction.label}
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </section>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={reportGeneration?.editor != null}
        onOpenChange={(open) => {
          if (!open) {
            onRequestCloseReportEditor();
          }
        }}
      >
        {reportGeneration?.editor ? (
          <DialogContent className="sm:w-[min(100%-2rem,48rem)]">
            <DialogHeader>
              <DialogTitle>{reportGeneration.editor.title}</DialogTitle>
              <DialogDescription>
                {reportGeneration.editor.audienceLabel} •{" "}
                {reportGeneration.editor.gameLabel} •{" "}
                {reportGeneration.editor.updatedAtLabel}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {reportGeneration.editor.errorMessage ? (
                <InlineAlert>
                  {reportGeneration.editor.errorMessage}
                </InlineAlert>
              ) : null}
              {reportGeneration.editor.successMessage ? (
                <InlineAlert tone="success">
                  {reportGeneration.editor.successMessage}
                </InlineAlert>
              ) : null}

              <Textarea
                className="min-h-80"
                onChange={(event) => {
                  changeReportDraft(event.target.value);
                }}
                value={reportGeneration.editor.text}
              />

              <DialogFooter>
                <Button
                  onClick={onRequestCloseReportEditor}
                  type="button"
                  variant={BUTTON_VARIANT.OUTLINE}
                >
                  Закрыть
                </Button>
                <Button
                  disabled={reportGeneration.editor.isSaveDisabled}
                  onClick={onSaveReport}
                  type="button"
                >
                  {reportGeneration.editor.isSaving
                    ? "Сохраняем..."
                    : "Сохранить"}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>

      <Dialog
        open={reportGeneration?.confirmation != null}
        onOpenChange={(open) => {
          if (!open) {
            closeReportConfirmation();
          }
        }}
      >
        {reportGeneration?.confirmation ? (
          <DialogContent className="sm:w-[min(100%-2rem,30rem)]">
            <DialogHeader>
              <DialogTitle>{reportGeneration.confirmation.title}</DialogTitle>
              <DialogDescription>
                {reportGeneration.confirmation.description}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button
                onClick={closeReportConfirmation}
                type="button"
                variant={BUTTON_VARIANT.OUTLINE}
              >
                Отмена
              </Button>
              <Button
                disabled={reportGeneration.confirmation.isPending}
                onClick={confirmReportAction}
                type="button"
              >
                {reportGeneration.confirmation.confirmLabel}
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}
