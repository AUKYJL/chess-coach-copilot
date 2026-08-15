import { AlertCircle, LoaderCircle } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
  Typography,
} from "@/shared/ui";
import { BUTTON_SIZE, BUTTON_VARIANT, Button } from "@/shared/ui/button";

type GameAnalysisStateCardProps = {
  actionLabel?: string;
  description: string;
  isLoading?: boolean;
  isSubmitting?: boolean;
  onAction?: () => Promise<void>;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => Promise<void>;
  title: string;
  tone?: "danger" | "neutral";
};

export function GameAnalysisStateCard({
  actionLabel,
  description,
  isLoading = false,
  isSubmitting = false,
  onAction,
  onSecondaryAction,
  secondaryActionLabel,
  title,
  tone = "neutral",
}: GameAnalysisStateCardProps) {
  const toneClasses =
    tone === "danger"
      ? "border-danger/15 bg-danger/6"
      : "border-border bg-surface-subtle";

  return (
    <Card className={toneClasses}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          {isLoading ? (
            <LoaderCircle className="text-accent size-5 animate-spin" />
          ) : (
            <AlertCircle
              className={
                tone === "danger"
                  ? "text-danger size-5"
                  : "text-muted-foreground size-5"
              }
            />
          )}
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Typography
          color={TYPOGRAPHY_COLOR.SECONDARY}
          variant={TYPOGRAPHY_VARIANT.BODY}
        >
          {description}
        </Typography>

        {actionLabel && onAction ? (
          <div className="flex flex-wrap gap-2">
            <Button disabled={isSubmitting} onClick={onAction} size={BUTTON_SIZE.SM}>
              {actionLabel}
            </Button>
            {secondaryActionLabel && onSecondaryAction ? (
              <Button
                onClick={onSecondaryAction}
                size={BUTTON_SIZE.SM}
                variant={BUTTON_VARIANT.OUTLINE}
              >
                {secondaryActionLabel}
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
