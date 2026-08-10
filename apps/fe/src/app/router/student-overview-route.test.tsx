import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderApp } from "@/test/render-app";

describe("StudentOverviewRoute", () => {
  it("shows the scenario selector only in development and respects canonical overrides there", () => {
    renderApp("/students/demo-student?scenario=analysis-failed", {
      environment: { DEV: true },
    });

    expect(screen.getByLabelText("Scenario")).toBeInTheDocument();
    expect(
      screen.getAllByText(/trend unavailable until analysis succeeds/i).length,
    ).toBeGreaterThan(0);
  });

  it("hides the scenario selector outside development and ignores overrides", () => {
    renderApp("/students/demo-student?scenario=analysis-failed", {
      environment: { DEV: false },
    });

    expect(screen.queryByLabelText("Scenario")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Alexander Ivanov" }),
    ).toBeInTheDocument();
  });

  it("switches scenarios immediately from local mock state without an artificial loading delay", async () => {
    const user = userEvent.setup();

    renderApp("/students/demo-student?scenario=populated", {
      environment: { DEV: true },
    });

    await user.selectOptions(
      screen.getByLabelText("Scenario"),
      "missing-optional-identity",
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Sasha Moroz" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/student overview failed to load/i),
    ).not.toBeInTheDocument();
  });
});
