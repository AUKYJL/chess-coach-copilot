import { Profiler } from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { createTestRouter } from "@/app/router";
import { renderApp } from "@/test/render-app";

type StudentOverviewCommitSnapshot = {
  heading: string | null;
  hasRouteLocalNote: boolean;
  hasChessAccountsDialog: boolean;
};

function captureStudentOverviewCommit(): StudentOverviewCommitSnapshot {
  const dialogText =
    document.querySelector('[role="dialog"]')?.textContent ?? "";

  return {
    heading: document.querySelector("h1")?.textContent ?? null,
    hasRouteLocalNote: (document.body.textContent ?? "").includes(
      "Route-local note",
    ),
    hasChessAccountsDialog: dialogText.includes("Chess accounts"),
  };
}

function renderProfiledApp(
  initialEntry: string,
  environment: { DEV: boolean } = { DEV: true },
) {
  const commits: StudentOverviewCommitSnapshot[] = [];
  const router = createTestRouter([initialEntry], environment);

  render(
    <Profiler
      id="student-overview-route"
      onRender={() => {
        commits.push(captureStudentOverviewCommit());
      }}
    >
      <RouterProvider router={router} />
    </Profiler>,
  );

  return { commits, router };
}

describe("StudentOverviewRoute", () => {
  it("keeps the desktop sidebar pinned to the viewport instead of stretching with page content", () => {
    const { container } = renderApp("/students/demo-student?scenario=populated", {
      environment: { DEV: true },
    });

    const sidebar = container.querySelector("aside");
    const main = container.querySelector("main");
    const mainContent = container.querySelector("main > div > div");

    expect(sidebar).not.toBeNull();
    expect(sidebar).toHaveClass(
      "xl:fixed",
      "xl:inset-y-0",
      "xl:left-0",
      "xl:h-screen",
      "xl:h-dvh",
      "xl:w-60",
    );
    expect(sidebar).not.toHaveClass("xl:self-start", "xl:sticky", "xl:top-0");

    expect(main).not.toBeNull();
    expect(main).toHaveClass("xl:pl-60");

    expect(mainContent).not.toBeNull();
    expect(mainContent).toHaveClass("mx-auto", "w-full", "max-w-[1280px]");
  });

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

  it("commits student route changes with fresh state on the first render", async () => {
    const user = userEvent.setup();
    const { commits, router } = renderProfiledApp(
      "/students/student-a?scenario=populated",
    );

    await user.click(screen.getByRole("button", { name: "More actions" }));
    await user.click(screen.getByText("Edit student"));
    await user.clear(screen.getByLabelText("Student name"));
    await user.type(screen.getByLabelText("Student name"), "Edited Student A");
    await user.clear(screen.getByLabelText("Coach notes"));
    await user.type(screen.getByLabelText("Coach notes"), "Route-local note");
    await user.click(screen.getByRole("button", { name: "Save locally" }));

    await user.click(screen.getByRole("button", { name: "More actions" }));
    await user.click(screen.getByRole("menuitem", { name: "Chess accounts" }));
    expect(
      screen.getByRole("dialog", { name: "Chess accounts" }),
    ).toBeInTheDocument();

    commits.length = 0;

    await act(async () => {
      await router.navigate("/students/student-b?scenario=populated");
    });

    expect(commits.length).toBeGreaterThan(0);
    expect(commits[0]).toEqual({
      heading: "Alexander Ivanov",
      hasRouteLocalNote: false,
      hasChessAccountsDialog: false,
    });
    expect(
      commits.every(
        (commit) =>
          commit.heading === "Alexander Ivanov" &&
          !commit.hasRouteLocalNote &&
          !commit.hasChessAccountsDialog,
      ),
    ).toBe(true);
  });

  it("commits scenario changes with fresh scenario-local state on the first render", async () => {
    const user = userEvent.setup();
    const { commits } = renderProfiledApp(
      "/students/demo-student?scenario=populated",
    );

    await user.click(screen.getByRole("button", { name: "More actions" }));
    await user.click(screen.getByText("Edit student"));
    await user.clear(screen.getByLabelText("Student name"));
    await user.type(screen.getByLabelText("Student name"), "Edited Student A");
    await user.clear(screen.getByLabelText("Coach notes"));
    await user.type(screen.getByLabelText("Coach notes"), "Route-local note");
    await user.click(screen.getByRole("button", { name: "Save locally" }));

    await user.click(screen.getByRole("button", { name: "More actions" }));
    await user.click(screen.getByRole("menuitem", { name: "Chess accounts" }));
    expect(
      screen.getByRole("dialog", { name: "Chess accounts" }),
    ).toBeInTheDocument();

    commits.length = 0;

    await user.selectOptions(
      screen.getByLabelText("Scenario"),
      "missing-optional-identity",
    );

    expect(commits.length).toBeGreaterThan(0);
    expect(commits[0]).toEqual({
      heading: "Sasha Moroz",
      hasRouteLocalNote: false,
      hasChessAccountsDialog: false,
    });
    expect(
      commits.every(
        (commit) =>
          commit.heading === "Sasha Moroz" &&
          !commit.hasRouteLocalNote &&
          !commit.hasChessAccountsDialog,
      ),
    ).toBe(true);
  });
});
