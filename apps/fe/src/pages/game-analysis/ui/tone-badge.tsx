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
  label: string;
  tone: SemanticTone;
};

export function ToneBadge({ label, tone }: ToneBadgeProps) {
  return <Badge className={getToneClasses(tone)}>{label}</Badge>;
}
