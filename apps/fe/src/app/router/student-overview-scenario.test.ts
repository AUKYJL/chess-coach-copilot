import { describe, expect, it } from "vitest";

import {
  defaultStudentOverviewScenarioId,
  resolveStudentOverviewScenarioId,
} from "./student-overview-scenario";

describe("student overview scenario resolver", () => {
  it("resolves a canonical scenario override in development", () => {
    const searchParams = new URLSearchParams("scenario=analysis-failed");

    expect(
      resolveStudentOverviewScenarioId(searchParams, { DEV: true }),
    ).toBe("analysis-failed");
  });

  it("ignores scenario overrides outside development", () => {
    const searchParams = new URLSearchParams("scenario=analysis-failed");

    expect(
      resolveStudentOverviewScenarioId(searchParams, { DEV: false }),
    ).toBe(defaultStudentOverviewScenarioId);
  });

  it("falls back to the default scenario for unknown ids", () => {
    const searchParams = new URLSearchParams("scenario=unknown-state");

    expect(
      resolveStudentOverviewScenarioId(searchParams, { DEV: true }),
    ).toBe(defaultStudentOverviewScenarioId);
  });
});
