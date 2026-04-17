import { describe, expect, it } from "bun:test";
import { ErrorDialog } from "../error-dialog.js";

describe("ErrorDialog", () => {
  it("creates with title and description", () => {
    const dialog = new ErrorDialog({
      title: "API Error",
      description: "Failed to connect to the Anthropic API. Check your API key.",
      onDismiss: () => {},
    });
    expect(dialog).toBeDefined();
    expect(dialog.config.title).toBe("API Error");
  });

  it("stores description in config", () => {
    const dialog = new ErrorDialog({
      title: "Network Error",
      description: "Cannot reach server.",
      onDismiss: () => {},
    });
    expect(dialog.config.description).toBe("Cannot reach server.");
  });

  it("stores onDismiss callback in config", () => {
    let dismissed = false;
    const dialog = new ErrorDialog({
      title: "Error",
      description: "Something went wrong.",
      onDismiss: () => {
        dismissed = true;
      },
    });
    dialog.config.onDismiss();
    expect(dismissed).toBe(true);
  });

  it("is a StatefulWidget with createState", () => {
    const dialog = new ErrorDialog({
      title: "Error",
      description: "desc",
      onDismiss: () => {},
    });
    const state = dialog.createState();
    expect(state).toBeDefined();
  });
});
