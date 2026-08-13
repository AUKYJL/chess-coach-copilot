import type { StudentLessonPreviewResponse } from "@/shared/api/student";

// PLANNED BACKEND: lightweight lesson recommendation preview for Student Overview.
// `recommendedLessonWhy` and `recommendedFocusPoints` exist in the current
// domain model, but are not exposed by today's lightweight analysis-profile response.
export const studentLessonPreviewMock: StudentLessonPreviewResponse = {
  recommendedLessonTitle: "Recognizing opponent threats",
  recommendedLessonWhy:
    "Alexander repeatedly continues with his own plan without checking forcing moves from the opponent.",
  recommendedFocusPoints: [
    "Checks, captures, and threats",
    "Candidate moves before committing",
    "Defensive tactical motifs",
  ],
};
