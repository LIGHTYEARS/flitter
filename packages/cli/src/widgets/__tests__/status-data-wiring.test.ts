import { describe, expect, it } from "bun:test";

describe("StatusBar data wiring", () => {
  it("ThreadStateWidgetConfig should include cwdDisplay field", async () => {
    const src = await Bun.file("packages/cli/src/widgets/thread-state-widget.ts").text();
    expect(src).toContain("cwdDisplay");
  });

  it("ThreadStateWidgetConfig should include gitBranch field", async () => {
    const src = await Bun.file("packages/cli/src/widgets/thread-state-widget.ts").text();
    expect(src).toContain("gitBranch");
  });

  it("ThreadStateWidgetConfig should include modeName field", async () => {
    const src = await Bun.file("packages/cli/src/widgets/thread-state-widget.ts").text();
    expect(src).toMatch(/modeName\??\s*:\s*string/);
  });

  it("ThreadStateWidgetConfig should include skillCount field", async () => {
    const src = await Bun.file("packages/cli/src/widgets/thread-state-widget.ts").text();
    expect(src).toContain("skillCount");
  });

  it("interactive.ts should pass cwdDisplay to ThreadStateWidget", async () => {
    const src = await Bun.file("packages/cli/src/modes/interactive.ts").text();
    expect(src).toContain("cwdDisplay");
  });

  it("interactive.ts should pass gitBranch to ThreadStateWidget", async () => {
    const src = await Bun.file("packages/cli/src/modes/interactive.ts").text();
    expect(src).toContain("gitBranch");
  });
});
