export const WEAKNESS_TAG_LABELS: Record<string, string> = {
  MISSED_FORK: "Пропущенная вилка",
  MISSED_PIN: "Пропущенная связка",
  MISSED_DOUBLE_ATTACK: "Пропущенное двойное нападение",
  MISSED_DISCOVERED_ATTACK: "Пропущенное вскрытое нападение",
  MISSED_MATE: "Пропущенный мат",
  ALLOWED_MATE: "Допущенный мат",
  HANGING_PIECE: "Оставленная под боем фигура",
  MISSED_CAPTURE: "Пропущенное взятие",
  BAD_CAPTURE: "Неудачное взятие",
  MISSED_OPPONENT_THREAT: "Пропущенная угроза соперника",
  OPENED_LINE: "Неоправданное вскрытие линии",
  UNKNOWN_TACTICAL_ERROR: "Тактическая ошибка",
  KING_SAFETY: "Безопасность короля",
  DELAYED_CASTLING: "Запоздалая рокировка",
  POOR_DEVELOPMENT: "Плохое развитие",
  EARLY_QUEEN: "Ранний вывод ферзя",
  BAD_TRADE: "Неудачный размен",
  POOR_CONVERSION: "Слабая реализация перевеса",
  OPENING_STRATEGY: "Дебютная стратегия",
  PAWN_STRUCTURE: "Пешечная структура",
  ENDGAME_TECHNIQUE: "Эндшпильная техника",
  UNKNOWN_STRATEGIC_ERROR: "Стратегическая ошибка",
  TIME_MANAGEMENT: "Управление временем",
  CALCULATION_DEPTH: "Глубина расчета",
  TUNNEL_VISION: "Туннельное зрение",
  MATERIAL_GREED: "Материальная жадность",
  LOW_BOARD_AWARENESS: "Слабое видение доски",
  INSUFFICIENT_ANNOTATION_DATA: "Недостаточно данных из аннотаций",
  REDUCED_CONFIDENCE: "Пониженная уверенность вывода",
};

function titleCaseEnumLikeValue(value: string): string {
  return value
    .toLowerCase()
    .split(/[_-]+/g)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function formatWeaknessTag(value: string | null): string {
  if (!value) {
    return "Недостаточно данных";
  }

  return WEAKNESS_TAG_LABELS[value] ?? titleCaseEnumLikeValue(value);
}
