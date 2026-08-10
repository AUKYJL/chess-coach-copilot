import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderApp } from "@/test/render-app";

const annotatedPgn =
  '[Event "Training Game"]\n[Site "Lichess"]\n[Result "1-0"]\n\n1. e4 { [%eval 0.18] } e5 { [%eval 0.22] } 2. Nf3 Nc6 1-0';

const plainPgn =
  '[Event "Training Game"]\n[Site "Lichess"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 1-0';

const proseCommentPgn =
  '[Event "Training Game"]\n[Site "Lichess"]\n[Result "1-0"]\n\n1. e4 { Interesting game. } e5 2. Nf3 Nc6 1-0';

describe("StudentActions", () => {
  it("renders the Analyze Game dialog and validates annotated PGN only", async () => {
    const user = userEvent.setup();

    renderApp("/students/demo-student?scenario=populated");

    await user.click(screen.getByRole("button", { name: /Analyze game/i }));
    expect(
      screen.getByRole("dialog", { name: "Analyze game" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save locally" }));
    expect(screen.getByText("Annotated PGN is required.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Annotated PGN"), "1. e4 e5");
    await user.click(screen.getByRole("button", { name: "Save locally" }));
    expect(
      screen.getByText(
        "Enter a valid PGN with headers, move text, and a result.",
      ),
    ).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Annotated PGN"));
    await user.click(screen.getByLabelText("Annotated PGN"));
    await user.paste(plainPgn);
    await user.click(screen.getByRole("button", { name: "Save locally" }));
    expect(
      screen.getByText(
        /Only annotated PGN with engine evaluation or a mistake marker plus best-line variation is supported in this prototype/i,
      ),
    ).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Annotated PGN"));
    await user.click(screen.getByLabelText("Annotated PGN"));
    await user.paste(proseCommentPgn);
    await user.click(screen.getByRole("button", { name: "Save locally" }));
    expect(
      screen.getByText(
        /Only annotated PGN with engine evaluation or a mistake marker plus best-line variation is supported in this prototype/i,
      ),
    ).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Annotated PGN"));
    await user.click(screen.getByLabelText("Annotated PGN"));
    await user.paste(annotatedPgn);
    await user.click(screen.getByRole("button", { name: "Save locally" }));

    expect(
      screen.queryByRole("dialog", { name: "Analyze game" }),
    ).not.toBeInTheDocument();
  });

  it("renders the Edit Student dialog, validates required fields, and mutates locally", async () => {
    const user = userEvent.setup();

    renderApp("/students/demo-student?scenario=populated");

    await user.click(screen.getByRole("button", { name: "More actions" }));
    await user.click(screen.getByText("Edit student"));

    await user.clear(screen.getByLabelText("Student name"));
    await user.click(screen.getByRole("button", { name: "Save locally" }));
    expect(screen.getByText("Student name is required.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Student name"), "Alex Ivanov");
    await user.clear(screen.getByLabelText("Birth year"));
    await user.type(screen.getByLabelText("Birth year"), "1800");
    await user.click(screen.getByRole("button", { name: "Save locally" }));
    expect(
      screen.getByText("Birth year must be between 1900 and 2100."),
    ).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Birth year"));
    await user.type(screen.getByLabelText("Birth year"), "1900");
    await user.clear(screen.getByLabelText("Rating"));
    await user.type(screen.getByLabelText("Rating"), "1705");
    await user.clear(screen.getByLabelText("Coach notes"));
    await user.type(
      screen.getByLabelText("Coach notes"),
      "Updated from the edit dialog.",
    );
    await user.click(screen.getByRole("button", { name: "Save locally" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Alex Ivanov" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1900")).toBeInTheDocument();
    expect(
      screen.getByText("Updated from the edit dialog."),
    ).toBeInTheDocument();
  });

  it("archives and restores the student locally from the overflow menu", async () => {
    const user = userEvent.setup();

    renderApp("/students/demo-student?scenario=populated");

    await user.click(screen.getByRole("button", { name: "More actions" }));
    await user.click(screen.getByText("Archive student"));
    expect(screen.getByText("Archived student")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "More actions" }));
    await user.click(screen.getByText("Restore student"));
    expect(screen.getByText("Active student")).toBeInTheDocument();
  });

  it("opens Chess accounts from the header overflow menu", async () => {
    const user = userEvent.setup();

    renderApp("/students/demo-student?scenario=populated");

    await user.click(screen.getByRole("button", { name: "More actions" }));
    await user.click(screen.getByRole("menuitem", { name: "Chess accounts" }));

    expect(
      screen.getByRole("dialog", { name: "Chess accounts" }),
    ).toBeInTheDocument();
  });
});
