import { describe, expect, it } from "vitest";

import { formatWeaknessTag } from "./format-weakness-tag";

describe("formatWeaknessTag", () => {
  it("returns a fallback copy for null values", () => {
    expect(formatWeaknessTag(null)).toBe("Недостаточно данных");
  });

  it("formats known weakness tags with approved chess terminology", () => {
    expect(formatWeaknessTag("MISSED_FORK")).toBe("Пропущенная вилка");
    expect(formatWeaknessTag("CALCULATION_DEPTH")).toBe("Глубина расчета");
  });

  it("falls back to title-cased enum-like strings for unknown values", () => {
    expect(formatWeaknessTag("FUTURE_CUSTOM_TAG")).toBe("Future Custom Tag");
  });
});
