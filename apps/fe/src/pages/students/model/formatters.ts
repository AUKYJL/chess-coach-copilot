import type { StudentListItem } from "./api-types";

const weaknessLabels: Record<string, string> = {
  MISSED_OPPONENT_THREAT: "Пропущенные угрозы соперника",
  CALCULATION_DEPTH: "Поверхностный расчёт",
  KING_SAFETY: "Безопасность короля",
};

const shortDateFormatter = new Intl.DateTimeFormat("ru-RU", {
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
    return "Недостаточно данных";
  }

  return (
    weaknessLabels[value] ??
    value
      .toLowerCase()
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

export function formatLastAnalysis(value: string | null) {
  if (!value) {
    return "Не анализировалась";
  }

  const date = new Date(value);

  if (isSameLocalDay(date, new Date())) {
    return "Сегодня";
  }

  return shortDateFormatter.format(date);
}

export function formatStatusLabel(archivedAt: string | null) {
  return archivedAt ? "В архиве" : "Активный";
}
