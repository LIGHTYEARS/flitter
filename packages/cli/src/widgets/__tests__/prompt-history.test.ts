import { beforeEach, describe, expect, it } from "bun:test";
import { PromptHistory } from "../prompt-history";

describe("PromptHistory", () => {
  let history: PromptHistory;

  beforeEach(() => {
    history = new PromptHistory({ maxEntries: 100 });
  });

  it("starts empty with no navigation available", () => {
    expect(history.canGoBack()).toBe(false);
    expect(history.canGoForward()).toBe(false);
  });

  it("records submitted prompts", () => {
    history.push("first prompt");
    history.push("second prompt");
    expect(history.entries).toEqual(["first prompt", "second prompt"]);
  });

  it("navigates back through history", () => {
    history.push("first");
    history.push("second");
    history.push("third");

    history.startNavigation("current draft");
    expect(history.goBack()).toBe("third");
    expect(history.goBack()).toBe("second");
    expect(history.goBack()).toBe("first");
    expect(history.goBack()).toBe("first"); // stays at oldest
  });

  it("navigates forward after going back", () => {
    history.push("first");
    history.push("second");

    history.startNavigation("draft");
    history.goBack(); // "second"
    history.goBack(); // "first"
    expect(history.goForward()).toBe("second");
    expect(history.goForward()).toBe("draft"); // back to draft
    expect(history.goForward()).toBe("draft"); // stays at draft
  });

  it("preserves the original draft when navigating", () => {
    history.push("old");
    history.startNavigation("my current text");
    history.goBack(); // "old"
    expect(history.goForward()).toBe("my current text");
  });

  it("deduplicates consecutive identical entries", () => {
    history.push("same");
    history.push("same");
    expect(history.entries).toEqual(["same"]);
  });

  it("respects maxEntries", () => {
    const small = new PromptHistory({ maxEntries: 3 });
    small.push("a");
    small.push("b");
    small.push("c");
    small.push("d"); // "a" should be evicted
    expect(small.entries).toEqual(["b", "c", "d"]);
  });
});
