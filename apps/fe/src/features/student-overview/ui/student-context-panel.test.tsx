import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderApp } from "@/test/render-app";

describe("StudentContextPanel", () => {
  it("supports local-only add, edit, and remove flows for chess accounts", async () => {
    const user = userEvent.setup();

    renderApp("/students/demo-student?scenario=populated");

    await user.click(screen.getByRole("button", { name: "Manage" }));
    const dialog = screen.getByRole("dialog", { name: "Chess accounts" });
    expect(dialog).toBeInTheDocument();

    await user.click(
      within(dialog).getAllByRole("button", { name: "Edit" })[0]!,
    );
    await user.clear(within(dialog).getByLabelText("Username"));
    await user.type(
      within(dialog).getByLabelText("Username"),
      "alexander_ivanov_local",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Update locally" }),
    );

    await user.clear(within(dialog).getByLabelText("Username"));
    await user.type(
      within(dialog).getByLabelText("Username"),
      "new_local_account",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Add locally" }),
    );

    await user.click(
      within(dialog).getAllByRole("button", { name: "Remove" })[1]!,
    );
    await user.click(within(dialog).getByRole("button", { name: "Done" }));

    expect(screen.getByText("alexander_ivanov_local")).toBeInTheDocument();
    expect(screen.getByText("new_local_account")).toBeInTheDocument();
    expect(screen.queryByText("alexander-ivanov")).not.toBeInTheDocument();
  });

  it("supports local-only coach notes cancel and save flows", async () => {
    const user = userEvent.setup();

    renderApp("/students/demo-student?scenario=populated");

    const originalNotes = screen.getByText(
      /Alexander is more patient in equal positions now/i,
    );
    expect(originalNotes).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.clear(screen.getByLabelText("Notes"));
    await user.type(
      screen.getByLabelText("Notes"),
      "This should disappear after cancel.",
    );
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(
      screen.queryByText("This should disappear after cancel."),
    ).not.toBeInTheDocument();
    expect(originalNotes).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.clear(screen.getByLabelText("Notes"));
    await user.type(
      screen.getByLabelText("Notes"),
      "Use a full threat scan before every attack.",
    );
    await user.click(screen.getByRole("button", { name: "Save locally" }));

    expect(
      screen.getByText("Use a full threat scan before every attack."),
    ).toBeInTheDocument();
  });
});
