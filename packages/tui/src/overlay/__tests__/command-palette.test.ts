import { describe, expect, it } from "bun:test";
import type { ScoredItem } from "../fuzzy-picker.js";

/**
 * Test the CommandPalette sort comparator logic in isolation.
 * This is the same algorithm as CommandPaletteState._sortCommands.
 */

interface TestCommand {
  label: string;
  category?: string;
  priority?: number;
}

function sortCommands(
  a: ScoredItem<TestCommand>,
  b: ScoredItem<TestCommand>,
  normalizedQuery: string,
): number {
  // 1. Exact noun/verb match
  const aCat = a.item.category?.toLowerCase() ?? "";
  const bCat = b.item.category?.toLowerCase() ?? "";
  const aLabel = a.item.label.toLowerCase();
  const bLabel = b.item.label.toLowerCase();

  const aExact = aCat === normalizedQuery || aLabel === normalizedQuery;
  const bExact = bCat === normalizedQuery || bLabel === normalizedQuery;
  if (aExact && !bExact) return -1;
  if (!aExact && bExact) return 1;

  // 2. Fuzzy score
  if (b.score !== a.score) return b.score - a.score;

  // 3. Priority
  const aPri = a.item.priority ?? 0;
  const bPri = b.item.priority ?? 0;
  return bPri - aPri;
}

describe("CommandPalette sort comparator", () => {
  it("exact category match ranks first", () => {
    const a: ScoredItem<TestCommand> = {
      item: { label: "push", category: "git", priority: 0 },
      score: 0.5,
      matches: true,
    };
    const b: ScoredItem<TestCommand> = {
      item: { label: "open", category: "file", priority: 0 },
      score: 0.8,
      matches: true,
    };
    expect(sortCommands(a, b, "git")).toBeLessThan(0);
  });

  it("exact label match ranks first", () => {
    const a: ScoredItem<TestCommand> = {
      item: { label: "quit", priority: 0 },
      score: 0.5,
      matches: true,
    };
    const b: ScoredItem<TestCommand> = {
      item: { label: "quick save", priority: 0 },
      score: 0.8,
      matches: true,
    };
    expect(sortCommands(a, b, "quit")).toBeLessThan(0);
  });

  it("higher score wins when no exact match", () => {
    const a: ScoredItem<TestCommand> = {
      item: { label: "push", category: "git" },
      score: 0.6,
      matches: true,
    };
    const b: ScoredItem<TestCommand> = {
      item: { label: "pull", category: "git" },
      score: 0.8,
      matches: true,
    };
    expect(sortCommands(a, b, "gi")).toBeGreaterThan(0); // b wins (higher score)
  });

  it("higher priority wins when scores equal", () => {
    const a: ScoredItem<TestCommand> = {
      item: { label: "push", priority: 10 },
      score: 0.5,
      matches: true,
    };
    const b: ScoredItem<TestCommand> = {
      item: { label: "pull", priority: 5 },
      score: 0.5,
      matches: true,
    };
    expect(sortCommands(a, b, "p")).toBeLessThan(0); // a wins (higher priority)
  });
});
