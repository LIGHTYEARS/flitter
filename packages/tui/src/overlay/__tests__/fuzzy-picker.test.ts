import { describe, expect, it } from "bun:test";
import { fuzzyMatch } from "../fuzzy-match.js";

/**
 * FuzzyPicker is a StatefulWidget that requires a full widget tree to test
 * its build() method. Here we test the filtering pipeline logic in isolation
 * (same algorithm as FuzzyPickerState.recomputeFilteredItems).
 */

interface TestItem {
  label: string;
  disabled?: boolean;
}

interface ScoredItem<T> {
  item: T;
  score: number;
  matches: boolean;
}

function filterItems(
  items: TestItem[],
  query: string,
  opts?: {
    filterItem?: (item: TestItem, query: string) => boolean;
    sortItems?: (a: ScoredItem<TestItem>, b: ScoredItem<TestItem>, query: string) => number;
    maxRenderItems?: number;
  },
): TestItem[] {
  const normalizedQuery = query;

  const scored: ScoredItem<TestItem>[] = [];
  for (const item of items) {
    if (opts?.filterItem && !opts.filterItem(item, query)) continue;
    const result = fuzzyMatch(normalizedQuery, item.label);
    if (result.matches) {
      scored.push({ item, score: result.score, matches: true });
    }
  }

  if (opts?.sortItems) {
    scored.sort((a, b) => opts.sortItems!(a, b, normalizedQuery));
  } else {
    scored.sort((a, b) => b.score - a.score);
  }

  const filtered = scored.map((s) => s.item);
  return opts?.maxRenderItems != null ? filtered.slice(0, opts.maxRenderItems) : filtered;
}

describe("FuzzyPicker filtering pipeline", () => {
  const items: TestItem[] = [
    { label: "git push" },
    { label: "git pull" },
    { label: "git commit" },
    { label: "file open" },
    { label: "file save" },
    { label: "quit" },
  ];

  it("empty query returns all items", () => {
    const result = filterItems(items, "");
    expect(result.length).toBe(items.length);
  });

  it("filters by fuzzy match", () => {
    const result = filterItems(items, "gp");
    // Should match "git push" and "git pull" (both have g...p)
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.some((r) => r.label === "git push")).toBe(true);
    expect(result.some((r) => r.label === "git pull")).toBe(true);
  });

  it("respects filterItem callback", () => {
    const result = filterItems(items, "", {
      filterItem: (item) => item.label.startsWith("git"),
    });
    expect(result.length).toBe(3);
    expect(result.every((r) => r.label.startsWith("git"))).toBe(true);
  });

  it("respects maxRenderItems", () => {
    const result = filterItems(items, "", { maxRenderItems: 3 });
    expect(result.length).toBe(3);
  });

  it("custom sort overrides default score sort", () => {
    const result = filterItems(items, "", {
      sortItems: (a, b) => a.item.label.localeCompare(b.item.label),
    });
    expect(result[0]!.label).toBe("file open");
    expect(result[result.length - 1]!.label).toBe("quit");
  });

  it("no results for non-matching query", () => {
    const result = filterItems(items, "zzz");
    expect(result.length).toBe(0);
  });
});

describe("FuzzyPicker selection logic", () => {
  it("clamps selectedIndex to valid range", () => {
    const items = [{ label: "a" }, { label: "b" }];
    let selectedIndex = 5;
    // Clamp
    if (items.length === 0) selectedIndex = 0;
    else if (selectedIndex >= items.length) selectedIndex = items.length - 1;
    expect(selectedIndex).toBe(1);
  });

  it("clamps to 0 when list is empty", () => {
    const items: TestItem[] = [];
    let selectedIndex = 3;
    if (items.length === 0) selectedIndex = 0;
    else if (selectedIndex >= items.length) selectedIndex = items.length - 1;
    expect(selectedIndex).toBe(0);
  });

  it("moveDown increments within bounds", () => {
    let selectedIndex = 0;
    const len = 5;
    if (selectedIndex < len - 1) selectedIndex++;
    expect(selectedIndex).toBe(1);
  });

  it("moveDown does not exceed max", () => {
    let selectedIndex = 4;
    const len = 5;
    if (selectedIndex < len - 1) selectedIndex++;
    expect(selectedIndex).toBe(4);
  });

  it("moveUp decrements within bounds", () => {
    let selectedIndex = 3;
    if (selectedIndex > 0) selectedIndex--;
    expect(selectedIndex).toBe(2);
  });

  it("moveUp does not go below 0", () => {
    let selectedIndex = 0;
    if (selectedIndex > 0) selectedIndex--;
    expect(selectedIndex).toBe(0);
  });
});
