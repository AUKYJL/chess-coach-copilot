import type { PerformanceDirection, SeverityLevel } from "./api-types";

import type { SummaryCardTone } from "./view-model";

export const toneChipClasses: Record<SummaryCardTone, string> = {
  neutral: "bg-surface-subtle text-muted-foreground",
  info: "bg-info-soft text-accent",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

export function getPerformanceDirectionTone(
  direction: PerformanceDirection,
): SummaryCardTone {
  switch (direction) {
    case "IMPROVING":
      return "success";
    case "DECLINING":
      return "warning";
    case "STABLE":
      return "info";
    default:
      return "neutral";
  }
}

export function getSeverityTone(severity: SeverityLevel): SummaryCardTone {
  switch (severity) {
    case "INACCURACY":
      return "info";
    case "MISTAKE":
      return "warning";
    case "BLUNDER":
    case "MATE":
      return "danger";
    default:
      return "neutral";
  }
}
