export const studentOverviewScenarioIds = [
  "populated",
  "new-student",
  "early-signal",
  "analysis-processing",
  "analysis-failed",
  "insufficient-progress",
  "archived",
  "section-error",
  "overview-error",
  "loading",
  "missing-optional-identity",
] as const;

export type StudentOverviewScenarioId =
  (typeof studentOverviewScenarioIds)[number];

export const defaultStudentOverviewScenarioId: StudentOverviewScenarioId =
  "populated";

export function isStudentOverviewScenarioId(
  value: string,
): value is StudentOverviewScenarioId {
  return studentOverviewScenarioIds.some((scenarioId) => scenarioId === value);
}

export function isStudentOverviewDevelopmentEnvironment(
  isDevelopmentEnvironment: boolean,
) {
  return isDevelopmentEnvironment;
}

export function resolveStudentOverviewScenarioId(
  searchParams: URLSearchParams,
  isDevelopmentEnvironment: boolean,
): StudentOverviewScenarioId {
  if (!isStudentOverviewDevelopmentEnvironment(isDevelopmentEnvironment)) {
    return defaultStudentOverviewScenarioId;
  }

  const scenarioId = searchParams.get("scenario");

  if (scenarioId && isStudentOverviewScenarioId(scenarioId)) {
    return scenarioId;
  }

  return defaultStudentOverviewScenarioId;
}

export function getStudentOverviewScenarioOptions() {
  return studentOverviewScenarioIds.map((scenarioId) => ({
    id: scenarioId,
    label: scenarioId,
  }));
}
