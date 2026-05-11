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

  it("deriveBottomStatus should show 'Running N tools...' when multiple tools are active", async () => {
    const mod = await import("../bottom-status-line.js");
    expect(mod.deriveBottomStatus("running", true, 2)).toBe("Running 2 tools...");
    expect(mod.deriveBottomStatus("running", true, 1)).toBe("Running tools...");
  });

  it("deriveBottomStatus should show 'Waiting for approval...' when approval pending", async () => {
    const mod = await import("../bottom-status-line.js");
    expect(mod.deriveBottomStatus("running", true, 0, true)).toBe("Waiting for approval...");
  });

  // ── Bug: 工具在跑但 inferenceState 已经变 idle 时状态行消失 ──
  // 逆向: yB() 中 interactionState === "tool-running" 的优先级高于 inferenceState
  // 逆向: AB() 中 tool_use/running_tools 状态下 inferenceState = "idle"

  it("deriveBottomStatus should show 'Running tools...' even when inferenceState is idle", async () => {
    const mod = await import("../bottom-status-line.js");
    // Subagent 场景: inference:complete 后工具仍在跑
    expect(mod.deriveBottomStatus("idle", false, 1)).toBe("Running tools...");
  });

  it("deriveBottomStatus should show tool count when multiple tools running and inference idle", async () => {
    const mod = await import("../bottom-status-line.js");
    expect(mod.deriveBottomStatus("idle", false, 3)).toBe("Running 3 tools...");
  });

  it("deriveBottomStatus should show 'Waiting for approval...' when inference idle but approval pending", async () => {
    const mod = await import("../bottom-status-line.js");
    expect(mod.deriveBottomStatus("idle", false, 0, true)).toBe("Waiting for approval...");
  });

  it("deriveBottomStatus priority: approval > tools > inference", async () => {
    const mod = await import("../bottom-status-line.js");
    // approval 优先于 tools
    expect(mod.deriveBottomStatus("running", true, 2, true)).toBe("Waiting for approval...");
    // tools 优先于 streaming
    expect(mod.deriveBottomStatus("running", true, 1, false)).toBe("Running tools...");
  });
});
