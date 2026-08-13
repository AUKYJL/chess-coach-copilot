import type { StudentProgressResponse } from "@/shared/api/student";

// CURRENT BACKEND: optional detailed progress payload used only when overview.latestProgress is insufficient.
export const studentProgressMock: StudentProgressResponse = {
  status: "ready",
  requiredAnalysisCount: 3,
  availableAnalysisCount: 48,
  snapshot: {
    id: "7f27d89c-fddf-4bb0-a6a9-a1a61e5c4a11",
    studentId: "a74d8969-0949-4c7b-a386-c9d39ddaa321",
    analysisCount: 48,
    summary: {
      summary:
        "Alexander is leaving fewer pieces undefended than earlier in the summer, but recognition of opponent threats is still the clearest recurring issue.",
    },
    promptVersion: "test-v1",
    model: "fake-llm",
    createdAt: "2026-08-07T17:30:00Z",
    updatedAt: "2026-08-07T17:30:00Z",
  },
};
