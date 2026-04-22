import { describe, expect, it } from "bun:test";

describe("ThreadStateWidget chrome layout", () => {
  it("should not contain separator SizedBox between StatusBar and InputField", async () => {
    const src = await Bun.file("packages/cli/src/widgets/thread-state-widget.ts").text();
    const separatorPattern = /new SizedBox\(\{[\s\S]*?"─"\.repeat/;
    expect(separatorPattern.test(src)).toBe(false);
  });

  it("should not render StatusBar as standalone widget in build()", async () => {
    const src = await Bun.file("packages/cli/src/widgets/thread-state-widget.ts").text();
    const buildBody = src.slice(src.indexOf("build(_context"));
    expect(buildBody).not.toMatch(/new StatusBar\(/);
  });
});
