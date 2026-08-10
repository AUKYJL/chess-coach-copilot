import {
  isStudentOverviewScenarioId,
  studentOverviewScenarioIds,
  type StudentOverviewScenarioId,
} from "@/features/student-overview";

export const defaultStudentOverviewScenarioId: StudentOverviewScenarioId =
  "populated";

export type StudentOverviewEnvironment = {
  DEV: boolean;
};

export function isStudentOverviewDevelopmentEnvironment(
  environment: StudentOverviewEnvironment,
) {
  return environment.DEV;
}

export function resolveStudentOverviewScenarioId(
  searchParams: URLSearchParams,
  environment: StudentOverviewEnvironment,
): StudentOverviewScenarioId {
  if (!isStudentOverviewDevelopmentEnvironment(environment)) {
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
