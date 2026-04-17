import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { ToastManager } from "../toast-manager";

describe("ToastManager", () => {
  let manager: ToastManager;

  beforeEach(() => {
    manager = new ToastManager({ maxVisible: 3, defaultDuration: 100 });
  });

  afterEach(() => {
    manager.dispose();
  });

  it("shows a toast and returns its id", () => {
    const id = manager.show("Hello", "success");
    expect(typeof id).toBe("number");
    expect(manager.visibleToasts).toHaveLength(1);
    expect(manager.visibleToasts[0].message).toBe("Hello");
    expect(manager.visibleToasts[0].type).toBe("success");
  });

  it("queues toasts when max visible is reached", () => {
    manager.show("Toast 1");
    manager.show("Toast 2");
    manager.show("Toast 3");
    manager.show("Toast 4"); // should be queued
    expect(manager.visibleToasts).toHaveLength(3);
    expect(manager.queuedCount).toBe(1);
  });

  it("promotes from queue when a visible toast is dismissed", () => {
    const id1 = manager.show("Toast 1");
    manager.show("Toast 2");
    manager.show("Toast 3");
    manager.show("Toast 4"); // queued
    expect(manager.visibleToasts).toHaveLength(3);

    manager.dismiss(id1);
    expect(manager.visibleToasts).toHaveLength(3); // 4 promoted
    expect(manager.queuedCount).toBe(0);
    expect(manager.visibleToasts.some((t) => t.message === "Toast 4")).toBe(true);
  });

  it("auto-dismisses after duration", async () => {
    manager.show("Temporary", "success", 50);
    expect(manager.visibleToasts).toHaveLength(1);

    await new Promise((r) => setTimeout(r, 100));
    expect(manager.visibleToasts).toHaveLength(0);
  });

  it("dismissAll clears everything", () => {
    manager.show("A");
    manager.show("B");
    manager.show("C");
    manager.show("D");
    manager.dismissAll();
    expect(manager.visibleToasts).toHaveLength(0);
    expect(manager.queuedCount).toBe(0);
  });

  it("notifies listeners on changes", () => {
    let callCount = 0;
    manager.addListener(() => {
      callCount++;
    });
    manager.show("Test");
    expect(callCount).toBe(1);
    manager.dismiss(manager.visibleToasts[0].id);
    expect(callCount).toBe(2);
  });

  it("replaces newlines with spaces in toast messages (matching amp behavior)", () => {
    manager.show("line1\nline2\rline3");
    // 逆向: BQT.show() uses T.replace(/[\r\n]+/g, " ").trim()
    expect(manager.visibleToasts[0].message).toBe("line1 line2 line3");
  });

  it("does not notify when dismissing a non-existent id", () => {
    // 逆向: BQT.dismiss() only calls _notifyListeners when it finds and removes a toast
    let callCount = 0;
    manager.addListener(() => {
      callCount++;
    });
    manager.dismiss(999); // id that doesn't exist
    expect(callCount).toBe(0);
  });

  it("removes listener via removeListener", () => {
    let callCount = 0;
    const listener = () => {
      callCount++;
    };
    manager.addListener(listener);
    manager.show("A");
    expect(callCount).toBe(1);
    manager.removeListener(listener);
    manager.show("B");
    expect(callCount).toBe(1); // listener was removed, not called again
  });
});
