import type { ReactNode } from "react";

import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui";

import type { SemanticTone } from "../model";

function getToneClasses(tone: SemanticTone): string {
  switch (tone) {
    case "danger":
      return "border-danger/20 bg-danger/8 text-danger";
    case "success":
      return "border-success/20 bg-success-soft text-success";
    case "warning":
      return "border-[#f0b25f]/20 bg-[#fff2dc] text-[#b86a00]";
    default:
      return "border-border bg-surface-subtle text-muted-foreground";
  }
}

type ToneBadgeProps = {
  children?: ReactNode;
  className?: string;
  label?: string;
  tone: SemanticTone;
};

export function ToneBadge({
  children,
  className,
  label,
  tone,
}: ToneBadgeProps) {
  return (
    <Badge className={cn(getToneClasses(tone), className)}>
      {children ?? label}
    </Badge>
  );
}
