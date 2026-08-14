import type { StudentListItem } from "./api-types";

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function isSameLocalDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function formatStudentInitials(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatRating(value: number | null) {
  return value === null ? "—" : String(value);
}

export function formatAnalyzedGames(value: number) {
  return String(value);
}

export function formatWeaknessTag(value: StudentListItem["mainWeaknessTag"]) {
  if (!value) {
    return "Not enough data";
  }

  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatLastAnalysis(value: string | null) {
  if (!value) {
    return "Not analyzed";
  }

  const date = new Date(value);

  if (isSameLocalDay(date, new Date())) {
    return "Today";
  }

  return shortDateFormatter.format(date);
}

export function formatStatusLabel(archivedAt: string | null) {
  return archivedAt ? "Archived" : "Active";
}
