import type { PerformanceTrendResponse } from "@/features/student-overview/model/types";

// PLANNED BACKEND: structured chart transport kept separate from narrative progress copy.
export const studentPerformanceTrendMock: PerformanceTrendResponse = {
  direction: "IMPROVING",
  primaryMetric: "Overall lesson-readiness score",
  range: "90D",
  points: [
    { date: "2026-05-08", value: 1470 },
    { date: "2026-05-22", value: 1488 },
    { date: "2026-06-05", value: 1529 },
    { date: "2026-06-18", value: 1524 },
    { date: "2026-07-02", value: 1568 },
    { date: "2026-07-16", value: 1567 },
    { date: "2026-07-30", value: 1611 },
    { date: "2026-08-07", value: 1672 },
  ],
};
