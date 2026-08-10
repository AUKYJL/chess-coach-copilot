import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderApp } from "@/test/render-app";

describe("StudentOverviewPage", () => {
  it("renders the populated overview route with the approved US1 sections", () => {
    renderApp("/students/demo-student?scenario=populated");

    expect(
      screen.getByRole("heading", { level: 1, name: "Alexander Ivanov" }),
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText("Student workspace sections"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: "Overview" }),
    ).not.toBeInTheDocument();
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

    await user.click(screen.getByRole("button", { name: "More actions" }));
    await user.click(screen.getByRole("menuitem", { name: "Chess accounts" }));
    expect(
      screen.getByRole("dialog", { name: "Chess accounts" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Done" }));

    await user.click(screen.getByRole("button", { name: "Manage" }));
    expect(
      screen.getByRole("dialog", { name: "Chess accounts" }),
    ).toBeInTheDocument();
  });

  it("resets local student overview state when the route studentId changes within the same scenario", async () => {
    const user = userEvent.setup();
    const { router } = renderApp("/students/student-a?scenario=populated");

    await user.click(screen.getByRole("button", { name: "More actions" }));
    await user.click(screen.getByText("Edit student"));
    await user.clear(screen.getByLabelText("Student name"));
    await user.type(screen.getByLabelText("Student name"), "Edited Student A");
    await user.clear(screen.getByLabelText("Coach notes"));
    await user.type(screen.getByLabelText("Coach notes"), "Route-local note");
    await user.click(screen.getByRole("button", { name: "Save locally" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Edited Student A" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Route-local note")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "More actions" }));
    await user.click(screen.getByRole("menuitem", { name: "Chess accounts" }));
    expect(
      screen.getByRole("dialog", { name: "Chess accounts" }),
    ).toBeInTheDocument();

    await act(async () => {
      await router.navigate("/students/student-b?scenario=populated");
    });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "Alexander Ivanov" }),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText("Route-local note")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Chess accounts" }),
      ).not.toBeInTheDocument();
    });
  });

  it("renders truthful progress copy for the analysis-processing scenario", () => {
    renderApp("/students/demo-student?scenario=analysis-processing");

    expect(
      screen.getByText(
        /the latest annotated game is still being processed, so the narrative summary is not ready yet/i,
      ),
    ).toBeInTheDocument();
  });

  it("renders the section-error progress insight truthfully", () => {
    renderApp("/students/demo-student?scenario=section-error");

    expect(
      screen.getByText(
        "Progress insight is temporarily unavailable in this review state.",
      ),
    ).toBeInTheDocument();
  });

  it("disables unavailable section controls instead of leaving dead affordances", () => {
    renderApp("/students/demo-student?scenario=early-signal");

    screen.getAllByRole("button", { name: "View all" }).forEach((button) => {
      expect(button).toBeDisabled();
    });
    expect(
      screen.getByRole("button", { name: "Full analysis" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "View analysis" }),
    ).toBeDisabled();
  });
});
