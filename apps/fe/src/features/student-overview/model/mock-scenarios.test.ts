import { describe, expect, it } from "vitest";

import { getStudentOverviewScenario } from "./mock-scenarios";
import { studentOverviewScenarioIds } from "./types";

describe("student overview mock scenarios", () => {
  it("covers every canonical scenario id", () => {
    expect(studentOverviewScenarioIds).toHaveLength(11);
    expect(
      studentOverviewScenarioIds.map((id) => getStudentOverviewScenario(id).id),
    ).toEqual(studentOverviewScenarioIds);
  });

  it("returns cloned scenario data so local mutation does not leak across callers", () => {
    const firstScenario = getStudentOverviewScenario("populated");

    if (!firstScenario.resources.overview.data) {
      throw new Error("Expected populated overview data.");
    }

    firstScenario.resources.overview.data.student.displayName =
      "Mutated locally";

    const secondScenario = getStudentOverviewScenario("populated");

    expect(secondScenario.resources.overview.data?.student.displayName).toBe(
      "Alexander Ivanov",
    );
  });

  it("keeps scenario resources rooted in endpoint-shaped transport data", () => {
    const scenario = getStudentOverviewScenario("populated");

    expect(scenario.resources.overview.data).toMatchObject({
      student: expect.any(Object),
      externalAccounts: expect.any(Array),
      recentGames: expect.any(Array),
      recentReports: expect.any(Array),
      recentHomework: expect.any(Array),
    });
    expect(scenario.resources.analysisProfile.data).toMatchObject({
      analysisCountUsed: expect.any(Number),
      tagCounts: expect.any(Array),
      sampleMistakes: expect.any(Array),
    });
  });
});
