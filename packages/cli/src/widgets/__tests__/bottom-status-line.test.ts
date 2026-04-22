import { describe, expect, it } from "bun:test";

describe("BottomStatusLine", () => {
  it("module should export BottomStatusLine class", async () => {
    const mod = await import("../bottom-status-line.js");
    expect(mod.BottomStatusLine).toBeDefined();
  });

  it("wave spinner frames should match amp reference", async () => {
    const mod = await import("../bottom-status-line.js");
    expect(mod.WAVE_FRAMES).toEqual([" ", "\u223C", "\u2248", "\u224B", "\u2248", "\u223C"]);
  });

  it("deriveBottomStatus should map inference states correctly", async () => {
    const mod = await import("../bottom-status-line.js");
    expect(mod.deriveBottomStatus("running", false)).toBe("Waiting for response...");
    expect(mod.deriveBottomStatus("running", true)).toBe("Streaming response...");
    expect(mod.deriveBottomStatus("idle", false)).toBeNull();
  });

  it("deriveBottomStatus should show 'Running tools...' when tools are active", async () => {
    const mod = await import("../bottom-status-line.js");
    expect(mod.deriveBottomStatus("running", true, 2)).toBe("Running tools...");
  });

  it("deriveBottomStatus should show 'Waiting for approval...' when approval pending", async () => {
    const mod = await import("../bottom-status-line.js");
    expect(mod.deriveBottomStatus("running", true, 0, true)).toBe("Waiting for approval...");
  });
});
