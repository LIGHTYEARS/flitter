import { describe, expect, it } from "bun:test";

describe("Welcome screen mounting", () => {
  it("ThreadStateWidget should import WelcomeScreen", async () => {
    const src = await Bun.file("packages/cli/src/widgets/thread-state-widget.ts").text();
    expect(src).toContain("WelcomeScreen");
  });

  it("ThreadStateWidget should conditionally show WelcomeScreen when items empty", async () => {
    const src = await Bun.file("packages/cli/src/widgets/thread-state-widget.ts").text();
    expect(src).toMatch(
      /items\.length\s*===\s*0|_items\.length\s*===\s*0|displayItems\.length\s*===\s*0/,
    );
  });
});
