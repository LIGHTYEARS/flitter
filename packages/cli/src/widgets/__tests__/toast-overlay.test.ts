import { describe, expect, it } from "bun:test";
import { ToastManager } from "../toast-manager.js";
import { ToastOverlay } from "../toast-overlay.js";

describe("ToastOverlay", () => {
  it("creates with a ToastManager instance", () => {
    const manager = new ToastManager();
    const overlay = new ToastOverlay({ manager });
    expect(overlay).toBeDefined();
    manager.dispose();
  });
});
