import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderApp } from "@/test/render-app";

describe("StudentOverviewPage", () => {
  it("renders the populated overview route with the approved US1 sections", () => {
    renderApp("/students/demo-student?scenario=populated");

    expect(
      screen.getByRole("heading", { level: 1, name: "Alexander Ivanov" }),
    ).toBeInTheDocument();

    expect(screen.getByRole("tab", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Games" })).toBeInTheDocument();
    expect(screen.getAllByTestId("summary-card")).toHaveLength(4);

    expect(
      screen.getByRole("heading", { name: "Performance trend" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Progress insight" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Weakness profile" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Recent games" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Recent materials" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Student information" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Recognizing opponent threats"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Alexander is leaving fewer pieces undefended than earlier in the summer/i,
      ),
    ).toBeInTheDocument();
  });

  it("omits optional identity fields cleanly in the missing-optional-identity scenario", () => {
    renderApp("/students/demo-student?scenario=missing-optional-identity");

    const header = screen
      .getByRole("heading", {
        level: 1,
        name: "Sasha Moroz",
      })
      .closest("header");
    const informationCard = screen
      .getByRole("heading", { name: "Student information" })
      .closest("div");

    expect(header).not.toBeNull();
    expect(informationCard).not.toBeNull();
    expect(
      within(header as HTMLElement).queryByText(/Born/i),
    ).not.toBeInTheDocument();
    expect(
      within(header as HTMLElement).queryByText(/rating/i),
    ).not.toBeInTheDocument();
    expect(
      within(informationCard as HTMLElement).queryByText("Rating"),
    ).not.toBeInTheDocument();
    expect(
      within(informationCard as HTMLElement).queryByText("Born"),
    ).not.toBeInTheDocument();
  });

  it("renders the loading scenario as a skeleton instead of falling into the route error boundary", () => {
    renderApp("/students/demo-student?scenario=loading");

    expect(screen.getAllByText(/loading/i).length).toBeGreaterThan(0);
    expect(
      screen.queryByText(/student overview foundation data is incomplete/i),
    ).not.toBeInTheDocument();
  });

  it("keeps dialog entrypoints route-scoped on the populated page", async () => {
    const user = userEvent.setup();

    renderApp("/students/demo-student?scenario=populated");

    await user.click(screen.getByRole("button", { name: /Analyze game/i }));
    expect(
      screen.getByRole("dialog", { name: "Analyze game" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await user.click(screen.getByRole("button", { name: "Manage" }));
    expect(
      screen.getByRole("dialog", { name: "Chess accounts" }),
    ).toBeInTheDocument();
  });
});
