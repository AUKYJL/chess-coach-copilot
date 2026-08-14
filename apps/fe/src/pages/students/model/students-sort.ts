export const STUDENTS_SORT_FIELD = {
  RATING: "rating",
  COMPLETED_ANALYSIS_COUNT: "completedAnalysisCount",
  LAST_ANALYSIS_AT: "lastAnalysisAt",
} as const;

export type StudentsSortField =
  (typeof STUDENTS_SORT_FIELD)[keyof typeof STUDENTS_SORT_FIELD];

export function getStudentsSortField(value: string | undefined) {
  switch (value) {
    case STUDENTS_SORT_FIELD.RATING:
    case STUDENTS_SORT_FIELD.COMPLETED_ANALYSIS_COUNT:
    case STUDENTS_SORT_FIELD.LAST_ANALYSIS_AT:
      return value;
    default:
      return undefined;
  }
}
