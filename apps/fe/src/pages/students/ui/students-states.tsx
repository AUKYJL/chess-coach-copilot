import { UserRound } from "lucide-react";
import type { ReactNode } from "react";

import {
  Button,
  Skeleton,
  TYPOGRAPHY_COLOR,
  Typography,
} from "@/shared/ui";
import { BUTTON_SIZE, BUTTON_VARIANT } from "@/shared/ui/button";

const tableHeaderSkeletonKeys = [
  "header-student",
  "header-rating",
  "header-analyzed",
  "header-weakness",
  "header-analysis",
  "header-status",
];
const tableRowSkeletonKeys = [
  "row-1",
  "row-2",
  "row-3",
  "row-4",
  "row-5",
  "row-6",
];
const mobileSkeletonKeys = ["mobile-1", "mobile-2", "mobile-3", "mobile-4"];

export function StudentsLoadingState() {
  return (
    <div className="overflow-hidden rounded-[28px] border border-border bg-surface shadow-[0_24px_60px_-42px_rgba(32,33,36,0.32)]">
      <div className="hidden md:block">
        <div className="grid grid-cols-[minmax(0,2fr)_110px_140px_180px_140px_110px] gap-0 border-b border-divider px-4 py-3">
          {tableHeaderSkeletonKeys.map((key) => (
            <Skeleton key={key} className="h-4 rounded-full" />
          ))}
        </div>
        <div className="space-y-3 px-4 py-4">
          {tableRowSkeletonKeys.map((key) => (
            <Skeleton key={key} className="h-11 rounded-2xl" />
          ))}
        </div>
      </div>
      <div className="space-y-3 p-4 md:hidden">
        {mobileSkeletonKeys.map((key) => (
          <Skeleton key={key} className="h-24 rounded-[24px]" />
        ))}
      </div>
    </div>
  );
}

export function StudentsEmptyState({
  action,
  description,
  title,
}: {
  action?: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-[28px] border border-border bg-surface px-6 py-14 text-center shadow-[0_24px_60px_-42px_rgba(32,33,36,0.32)]">
      <div className="bg-surface-subtle text-muted-foreground flex size-12 items-center justify-center rounded-full">
        <UserRound className="size-5" />
      </div>
      <div className="space-y-2">
        <h2 className="text-foreground text-xl font-semibold tracking-tight">
          {title}
        </h2>
        <Typography
          className="max-w-md text-sm leading-6"
          color={TYPOGRAPHY_COLOR.SECONDARY}
        >
          {description}
        </Typography>
      </div>
      {action}
    </div>
  );
}

export function StudentsErrorState({
  errorMessage,
  onRetry,
}: {
  errorMessage: string;
  onRetry: () => Promise<void>;
}) {
  return (
    <div className="rounded-[28px] border border-border bg-surface px-6 py-10 shadow-[0_24px_60px_-42px_rgba(32,33,36,0.32)]">
      <div className="space-y-3">
        <h2 className="text-foreground text-xl font-semibold tracking-tight">
          Could not load students
        </h2>
        <Typography color={TYPOGRAPHY_COLOR.SECONDARY}>{errorMessage}</Typography>
        <Button
          onClick={async () => {
            await onRetry();
          }}
          size={BUTTON_SIZE.SM}
          variant={BUTTON_VARIANT.OUTLINE}
        >
          Retry
        </Button>
      </div>
    </div>
  );
}
