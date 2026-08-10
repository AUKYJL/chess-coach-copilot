import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderApp } from "@/test/render-app";

describe("Student Overview mock-only boundary", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not issue network requests while rendering or switching canonical scenarios", async () => {
    const user = userEvent.setup();

    renderApp("/students/demo-student?scenario=populated", {
      environment: { DEV: true },
    });

    await user.selectOptions(
      screen.getByLabelText("Scenario"),
      "analysis-failed",
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps Analyze Game validation and submit flows fully local", async () => {
    const user = userEvent.setup();

    renderApp("/students/demo-student?scenario=populated", {
      environment: { DEV: true },
    });

    await user.click(screen.getByRole("button", { name: /Analyze game/i }));
    await user.click(screen.getByLabelText("Annotated PGN"));
    await user.paste(
      '[Event "Training Game"]\n[Result "1-0"]\n\n1. e4 { [%eval 0.18] } e5 { [%eval 0.22] } 2. Nf3 Nc6 1-0',
    );
    await user.click(screen.getByRole("button", { name: "Save locally" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("dialog", { name: "Analyze game" }),
    ).not.toBeInTheDocument();
  });
});
