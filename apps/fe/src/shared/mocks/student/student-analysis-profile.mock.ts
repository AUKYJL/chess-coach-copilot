import type { StudentAnalysisProfileResponse } from "@/features/student-overview/model/types";

// CURRENT BACKEND: endpoint-shaped mock for GET /api/students/{studentId}/analysis-profile.
export const studentAnalysisProfileMock: StudentAnalysisProfileResponse = {
  analysisCountUsed: 48,
  mainWeaknessTag: "MISSED_OPPONENT_THREAT",
  secondaryWeaknessTags: ["CALCULATION_DEPTH", "KING_SAFETY"],
  tagCounts: [
    { tag: "MISSED_OPPONENT_THREAT", count: 18 },
    { tag: "CALCULATION_DEPTH", count: 12 },
    { tag: "KING_SAFETY", count: 9 },
  ],
  severityCounts: [
    { severity: "BLUNDER", count: 7 },
    { severity: "MISTAKE", count: 12 },
    { severity: "INACCURACY", count: 19 },
  ],
  sampleMistakes: [
    {
      id: "537b2368-abd8-421b-a7c4-0bd3d45ca395",
      analysisId: "3d65b6bb-79de-4d93-b387-911e7dbe93ba",
      gameId: "846710e0-46ec-4bde-bef4-9fd035cfd8ff",
      severity: "MISTAKE",
      category: "calculation",
      explanation:
        "Alexander repeatedly continues with his own plan without checking the opponent's forcing replies first.",
      suggestedFix:
        "Pause before each pawn push and scan for checks, captures, and direct threats from the opponent.",
    },
  ],
  recommendedLessonTitle: "Recognizing opponent threats",
};
