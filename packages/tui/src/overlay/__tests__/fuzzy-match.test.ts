import { describe, expect, it } from "bun:test";
import { fuzzyMatch } from "../fuzzy-match.js";

describe("fuzzyMatch", () => {
  it("empty query matches everything with score 1.0", () => {
    const result = fuzzyMatch("", "anything");
    expect(result.matches).toBe(true);
    expect(result.score).toBe(1.0);
  });

  it("exact match scores near 1.0", () => {
    const result = fuzzyMatch("abc", "abc");
    expect(result.matches).toBe(true);
    expect(result.score).toBeGreaterThan(0.9);
  });

  it("camelCase boundary match scores above threshold", () => {
    const result = fuzzyMatch("fb", "FooBar");
    expect(result.matches).toBe(true);
    expect(result.score).toBeGreaterThan(0.15);
  });

  it("word boundary match scores above threshold", () => {
    const result = fuzzyMatch("gp", "git push");
    expect(result.matches).toBe(true);
    expect(result.score).toBeGreaterThan(0.15);
  });

  it("no match scores below threshold", () => {
    const result = fuzzyMatch("xyz", "FooBar");
    expect(result.matches).toBe(false);
    expect(result.score).toBeLessThanOrEqual(0.15);
  });

  it("case-insensitive matching", () => {
    const result = fuzzyMatch("foo", "FooBar");
    expect(result.matches).toBe(true);
    expect(result.score).toBeGreaterThan(0.5);
  });

  it("multi-word query scores via word averaging", () => {
    const multiWord = fuzzyMatch("git pu", "git push");
    const abbreviated = fuzzyMatch("gp", "git push");
    expect(multiWord.matches).toBe(true);
    expect(abbreviated.matches).toBe(true);
    expect(multiWord.score).toBeGreaterThan(abbreviated.score);
  });

  it("consecutive characters score higher than scattered", () => {
    const consecutive = fuzzyMatch("foo", "foobar");
    const scattered = fuzzyMatch("fbr", "foobar");
    expect(consecutive.score).toBeGreaterThan(scattered.score);
  });

  it("word-boundary match scores higher than mid-word", () => {
    const boundary = fuzzyMatch("gp", "git push");
    const midWord = fuzzyMatch("it", "git push");
    expect(boundary.score).toBeGreaterThan(midWord.score);
  });

  it("handles empty label gracefully", () => {
    const result = fuzzyMatch("abc", "");
    expect(result.matches).toBe(false);
  });

  it("query longer than label does not match", () => {
    const result = fuzzyMatch("abcdef", "abc");
    expect(result.matches).toBe(false);
  });
});
