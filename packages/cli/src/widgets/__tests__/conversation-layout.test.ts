import { describe, expect, it } from "bun:test";

describe("Conversation layout", () => {
  it("should wrap conversation area in Padding with left:2", async () => {
    const src = await Bun.file("packages/cli/src/widgets/thread-state-widget.ts").text();
    expect(src).toContain("Padding");
    expect(src).toMatch(/left:\s*2/);
  });

  it("should NOT have 'Assistant: ' prefix in conversation-view", async () => {
    const src = await Bun.file("packages/cli/src/widgets/conversation-view.ts").text();
    expect(src).not.toMatch(/assistant.*prefix:\s*"Assistant/);
  });

  it("should render individual activity tools with file paths", async () => {
    const src = await Bun.file("packages/cli/src/widgets/conversation-view.ts").text();
    expect(src).toMatch(/action\.path|action\.detail|toolDetail/);
  });
});
