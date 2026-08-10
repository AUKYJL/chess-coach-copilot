import { render, screen } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");

  return {
    ...actual,
    ResponsiveContainer: ({
      children,
    }: {
      children: React.ReactElement<{ height?: number; width?: number }>;
    }) =>
      React.isValidElement(children)
        ? React.cloneElement(children, {
            height: 256,
            width: 520,
          })
        : null,
  };
});

import { PerformanceTrendSection } from "./performance-trend-section";

describe("PerformanceTrendSection", () => {
  it("renders a line chart with axis labels and visible dots for populated data", () => {
    const { container } = render(
      <PerformanceTrendSection
        trend={{
          directionLabel: "Improving",
          metricLabel: "Overall lesson-readiness score",
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
          rangeLabel: "90D",
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Performance trend" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Overall lesson-readiness score · 90D"),
    ).toBeInTheDocument();
    expect(screen.getByText("Improving")).toBeInTheDocument();
    expect(screen.getByText("May 8")).toBeInTheDocument();
    expect(screen.getByText("Aug 7")).toBeInTheDocument();
    expect(container.querySelector(".recharts-line-curve")).not.toBeNull();
    expect(container.querySelectorAll(".recharts-dot")).toHaveLength(8);
  });

  it("keeps the empty state copy when there are no trend points", () => {
    const { container } = render(
      <PerformanceTrendSection
        trend={{
          directionLabel: "Unknown",
          metricLabel: "Trend unavailable",
          points: [],
          rangeLabel: "90D",
        }}
      />,
    );

    expect(
      screen.getByText("Trend data is not available yet for this scenario."),
    ).toBeInTheDocument();
    expect(screen.getByText("Trend unavailable")).toBeInTheDocument();
    expect(container.querySelector(".recharts-wrapper")).toBeNull();
  });
});
