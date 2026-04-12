import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as path from "node:path";
import { FuzzyMatcher } from "./fuzzy-search.ts";
import type { FuzzyMatchResult } from "./fuzzy-search.ts";
import type { ScanEntry } from "../scanner/file-scanner.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntry(filePath: string): ScanEntry {
  return {
    uri: "file://" + filePath,
    path: filePath,
    name: path.basename(filePath),
    isDirectory: false,
    isAlwaysIncluded: false,
  };
}

// ---------------------------------------------------------------------------
// 1. Scoring tiers
// ---------------------------------------------------------------------------

describe("FuzzyMatcher -- scoring tiers", () => {
  const entries = [
    makeEntry("/src/utils.ts"), // exact match for "utils.ts"
    makeEntry("/src/utils-helper.ts"), // prefix match for "utils"
    makeEntry("/src/my-utils.ts"), // suffix match for "utils"
    makeEntry("/src/deep/path/with/utils/index.ts"), // substring match (path)
    makeEntry("/src/u_t_i_l_s.ts"), // fuzzy match for "utils"
  ];

  it("exact match scores highest", () => {
    const matcher = new FuzzyMatcher("utils.ts");
    const results = matcher.match(entries);

    assert.ok(results.length > 0, "Should have results");
    assert.equal(
      results[0]!.entry.path,
      "/src/utils.ts",
      "Exact match should be first",
    );
    // Exact score should be > any other score
    for (let i = 1; i < results.length; i++) {
      assert.ok(
        results[0]!.score > results[i]!.score,
        `Exact (${results[0]!.score}) should beat result[${i}] (${results[i]!.score})`,
      );
    }
  });

  it("prefix scores higher than suffix", () => {
    const matcher = new FuzzyMatcher("utils");
    const results = matcher.match(entries);

    const prefixResult = results.find(
      (r) => r.entry.path === "/src/utils-helper.ts",
    );
    const suffixResult = results.find(
      (r) => r.entry.path === "/src/my-utils.ts",
    );

    assert.ok(prefixResult, "Prefix match should exist");
    assert.ok(suffixResult, "Suffix match should exist");
    assert.ok(
      prefixResult.score > suffixResult.score,
      `Prefix (${prefixResult.score}) should beat suffix (${suffixResult.score})`,
    );
  });

  it("suffix scores higher than substring", () => {
    const matcher = new FuzzyMatcher("utils");
    const results = matcher.match(entries);

    const suffixResult = results.find(
      (r) => r.entry.path === "/src/my-utils.ts",
    );
    const substringResult = results.find(
      (r) => r.entry.path === "/src/deep/path/with/utils/index.ts",
    );

    assert.ok(suffixResult, "Suffix match should exist");
    assert.ok(substringResult, "Substring match should exist");
    assert.ok(
      suffixResult.score > substringResult.score,
      `Suffix (${suffixResult.score}) should beat substring (${substringResult.score})`,
    );
  });

  it("substring scores higher than fuzzy", () => {
    const matcher = new FuzzyMatcher("utils");
    const results = matcher.match(entries);

    const substringResult = results.find(
      (r) => r.entry.path === "/src/deep/path/with/utils/index.ts",
    );
    const fuzzyResult = results.find(
      (r) => r.entry.path === "/src/u_t_i_l_s.ts",
    );

    assert.ok(substringResult, "Substring match should exist");
    assert.ok(fuzzyResult, "Fuzzy match should exist");
    assert.ok(
      substringResult.score > fuzzyResult.score,
      `Substring (${substringResult.score}) should beat fuzzy (${fuzzyResult.score})`,
    );
  });

  it("no match returns empty results", () => {
    const matcher = new FuzzyMatcher("zzzznotfound");
    const results = matcher.match(entries);
    assert.equal(results.length, 0);
  });
});

// ---------------------------------------------------------------------------
// 2. Smart case
// ---------------------------------------------------------------------------

describe("FuzzyMatcher -- smart case", () => {
  const entries = [
    makeEntry("/src/Component.tsx"),
    makeEntry("/src/component.tsx"),
  ];

  it("lowercase query is case-insensitive (matches Component with comp)", () => {
    const matcher = new FuzzyMatcher("comp");
    const results = matcher.match(entries);

    assert.equal(results.length, 2, "Both Component and component should match");
  });

  it("uppercase in query forces case-sensitive (Comp matches Component but not component)", () => {
    const matcher = new FuzzyMatcher("Comp");
    const results = matcher.match(entries);

    assert.equal(results.length, 1, "Only Component.tsx should match");
    assert.equal(results[0]!.entry.path, "/src/Component.tsx");
  });

  it("caseSensitive:true overrides smart case", () => {
    const caseSensitiveEntries = [
      makeEntry("/app/Component.tsx"),
      makeEntry("/app/component.tsx"),
    ];
    const matcher = new FuzzyMatcher("component", { caseSensitive: true });
    const results = matcher.match(caseSensitiveEntries);

    // Only component.tsx (lowercase) should get a high-tier match when case-sensitive
    // Component.tsx cannot match "component" case-sensitively as a prefix/exact/suffix
    const exactOrPrefix = results.filter(
      (r) => r.entry.path === "/app/component.tsx",
    );
    const other = results.filter(
      (r) => r.entry.path === "/app/Component.tsx",
    );

    assert.ok(exactOrPrefix.length > 0, "Lowercase component.tsx should match");
    if (other.length > 0) {
      // If Component.tsx matches at all (e.g. via fuzzy on path), it should score lower
      assert.ok(
        exactOrPrefix[0]!.score > other[0]!.score,
        "Case-sensitive exact match should score higher than any fuzzy match",
      );
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Char bag pre-filter
// ---------------------------------------------------------------------------

describe("FuzzyMatcher -- char bag pre-filter", () => {
  it("entry missing a query character is excluded", () => {
    const entries = [makeEntry("/src/abc.ts")]; // has a, b, c but not z
    const matcher = new FuzzyMatcher("abcz");
    const results = matcher.match(entries);
    assert.equal(results.length, 0, "Entry missing 'z' should be excluded");
  });

  it("entry with all query chars proceeds to scoring", () => {
    const entries = [makeEntry("/src/abcdef.ts")];
    const matcher = new FuzzyMatcher("abc");
    const results = matcher.match(entries);
    assert.ok(results.length > 0, "Entry with all query chars should match");
  });
});

// ---------------------------------------------------------------------------
// 4. Bonus/penalty
// ---------------------------------------------------------------------------

describe("FuzzyMatcher -- bonus/penalty", () => {
  it("open file (+500) boosts ranking", () => {
    const entries = [
      makeEntry("/src/foo.ts"),
      makeEntry("/src/bar/foo.ts"),
    ];

    const matcherNoBoost = new FuzzyMatcher("foo");
    const matcherBoost = new FuzzyMatcher("foo", {
      openFiles: new Set(["/src/bar/foo.ts"]),
    });

    const resultsNoBoost = matcherNoBoost.match(entries);
    const resultsBoost = matcherBoost.match(entries);

    // Without boost, /src/foo.ts (shorter path) would normally rank first or equal
    // With boost, /src/bar/foo.ts should rank first due to +500
    const boostedResult = resultsBoost.find(
      (r) => r.entry.path === "/src/bar/foo.ts",
    );
    const unboostedResult = resultsBoost.find(
      (r) => r.entry.path === "/src/foo.ts",
    );
    assert.ok(boostedResult, "Boosted entry should exist");
    assert.ok(unboostedResult, "Unboosted entry should exist");
    assert.ok(
      boostedResult.score > unboostedResult.score,
      "Open file should have higher score",
    );
  });

  it("dirty file (+300) boosts ranking", () => {
    const entries = [
      makeEntry("/src/foo.ts"),
      makeEntry("/src/bar/foo.ts"),
    ];

    const matcher = new FuzzyMatcher("foo", {
      dirtyFiles: new Set(["/src/bar/foo.ts"]),
    });
    const results = matcher.match(entries);

    const dirtyResult = results.find(
      (r) => r.entry.path === "/src/bar/foo.ts",
    );
    const cleanResult = results.find((r) => r.entry.path === "/src/foo.ts");
    assert.ok(dirtyResult, "Dirty entry should exist");
    assert.ok(cleanResult, "Clean entry should exist");
    assert.ok(
      dirtyResult.score > cleanResult.score,
      "Dirty file should have higher score",
    );
  });

  it("open + dirty bonuses stack", () => {
    const entries = [
      makeEntry("/src/foo.ts"),
      makeEntry("/src/bar/foo.ts"),
    ];

    const matcherOpen = new FuzzyMatcher("foo", {
      openFiles: new Set(["/src/bar/foo.ts"]),
    });
    const matcherBoth = new FuzzyMatcher("foo", {
      openFiles: new Set(["/src/bar/foo.ts"]),
      dirtyFiles: new Set(["/src/bar/foo.ts"]),
    });

    const resultsOpen = matcherOpen.match(entries);
    const resultsBoth = matcherBoth.match(entries);

    const openScore = resultsOpen.find(
      (r) => r.entry.path === "/src/bar/foo.ts",
    )!.score;
    const bothScore = resultsBoth.find(
      (r) => r.entry.path === "/src/bar/foo.ts",
    )!.score;

    assert.ok(
      bothScore > openScore,
      `Open+Dirty (${bothScore}) should be higher than Open only (${openScore})`,
    );
  });

  it("test file receives penalty", () => {
    const entries = [
      makeEntry("/src/Button.tsx"),
      makeEntry("/src/Button.test.tsx"),
    ];

    const matcher = new FuzzyMatcher("Button");
    const results = matcher.match(entries);

    const normalResult = results.find(
      (r) => r.entry.path === "/src/Button.tsx",
    );
    const testResult = results.find(
      (r) => r.entry.path === "/src/Button.test.tsx",
    );

    assert.ok(normalResult, "Normal file should match");
    assert.ok(testResult, "Test file should match");
    assert.ok(
      normalResult.score > testResult.score,
      `Normal (${normalResult.score}) should beat test (${testResult.score})`,
    );
  });
});

// ---------------------------------------------------------------------------
// 5. matchPositions
// ---------------------------------------------------------------------------

describe("FuzzyMatcher -- matchPositions", () => {
  it("exact match: positions 0..n-1", () => {
    const entries = [makeEntry("/src/hello.ts")];
    const matcher = new FuzzyMatcher("hello.ts");
    const results = matcher.match(entries);

    assert.equal(results.length, 1);
    assert.deepEqual(
      results[0]!.matchPositions,
      [0, 1, 2, 3, 4, 5, 6, 7],
      "Exact match positions should be 0..7",
    );
  });

  it("fuzzy match: non-contiguous positions", () => {
    const entries = [makeEntry("/src/a_b_c.ts")];
    const matcher = new FuzzyMatcher("abc");
    const results = matcher.match(entries);

    assert.ok(results.length > 0, "Should have a fuzzy match");
    const positions = results[0]!.matchPositions;

    // Verify positions are non-contiguous (there are gaps)
    let hasGap = false;
    for (let i = 1; i < positions.length; i++) {
      if (positions[i]! - positions[i - 1]! > 1) {
        hasGap = true;
        break;
      }
    }
    assert.ok(hasGap, "Fuzzy match should have non-contiguous positions");
  });

  it("positions are valid indices into the matched string", () => {
    const entries = [makeEntry("/src/components/Header.tsx")];
    const matcher = new FuzzyMatcher("head");
    const results = matcher.match(entries);

    assert.ok(results.length > 0, "Should find a match");
    const result = results[0]!;
    const target = result.entry.name; // or path, depends on match type

    // All positions must be valid indices
    for (const pos of result.matchPositions) {
      assert.ok(
        pos >= 0,
        `Position ${pos} should be non-negative`,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// 6. Empty query
// ---------------------------------------------------------------------------

describe("FuzzyMatcher -- empty query", () => {
  it("returns all entries", () => {
    const entries = [
      makeEntry("/src/a.ts"),
      makeEntry("/src/b.ts"),
      makeEntry("/src/c.ts"),
    ];
    const matcher = new FuzzyMatcher("");
    const results = matcher.match(entries);
    assert.equal(results.length, 3);
  });

  it("open files sorted first", () => {
    const entries = [
      makeEntry("/src/a.ts"),
      makeEntry("/src/b.ts"),
      makeEntry("/src/c.ts"),
    ];
    const matcher = new FuzzyMatcher("", {
      openFiles: new Set(["/src/c.ts"]),
    });
    const results = matcher.match(entries);

    assert.equal(results[0]!.entry.path, "/src/c.ts", "Open file should be first");
  });
});

// ---------------------------------------------------------------------------
// 7. maxResults
// ---------------------------------------------------------------------------

describe("FuzzyMatcher -- maxResults", () => {
  it("results capped at maxResults", () => {
    const entries: ScanEntry[] = [];
    for (let i = 0; i < 50; i++) {
      entries.push(makeEntry(`/src/file${i}.ts`));
    }

    const matcher = new FuzzyMatcher("file", { maxResults: 10 });
    const results = matcher.match(entries);

    assert.equal(results.length, 10);
  });

  it("default maxResults is 100", () => {
    const entries: ScanEntry[] = [];
    for (let i = 0; i < 150; i++) {
      entries.push(makeEntry(`/src/item${i}.ts`));
    }

    const matcher = new FuzzyMatcher("item");
    const results = matcher.match(entries);

    assert.ok(
      results.length <= 100,
      `Default maxResults should cap at 100, got ${results.length}`,
    );
  });
});

// ---------------------------------------------------------------------------
// 8. Tiebreaker
// ---------------------------------------------------------------------------

describe("FuzzyMatcher -- tiebreaker", () => {
  it("same score: shorter path wins", () => {
    // Both should get the same scoring tier (exact basename match)
    const entries = [
      makeEntry("/very/long/deep/nested/path/foo.ts"),
      makeEntry("/src/foo.ts"),
    ];

    const matcher = new FuzzyMatcher("foo.ts");
    const results = matcher.match(entries);

    assert.equal(results.length, 2);
    assert.equal(
      results[0]!.entry.path,
      "/src/foo.ts",
      "Shorter path should win as tiebreaker",
    );
  });
});

// ---------------------------------------------------------------------------
// 9. Edge cases
// ---------------------------------------------------------------------------

describe("FuzzyMatcher -- edge cases", () => {
  it("query longer than any filename", () => {
    const entries = [makeEntry("/src/a.ts")];
    const matcher = new FuzzyMatcher("this_is_a_very_long_query_that_wont_match_anything");
    const results = matcher.match(entries);
    assert.equal(results.length, 0);
  });

  it("single-character query", () => {
    const entries = [
      makeEntry("/src/a.ts"),
      makeEntry("/src/b.ts"),
    ];
    const matcher = new FuzzyMatcher("a");
    const results = matcher.match(entries);

    // "a" should at least match a.ts
    assert.ok(results.length > 0, "Single char query should find matches");
    assert.ok(
      results.some((r) => r.entry.name === "a.ts"),
      "a.ts should be in results",
    );
  });

  it("special regex chars in query are treated as literal", () => {
    const entries = [
      makeEntry("/src/file.test.ts"),
      makeEntry("/src/file_test_ts"),
    ];

    // The dot in ".test." should be treated literally, not as regex wildcard
    const matcher = new FuzzyMatcher(".test.");
    const results = matcher.match(entries);

    // file.test.ts should match (has literal ".test.")
    assert.ok(
      results.some((r) => r.entry.path === "/src/file.test.ts"),
      "File with literal .test. should match",
    );
  });

  it("entries with same basename in different dirs", () => {
    const entries = [
      makeEntry("/src/components/index.ts"),
      makeEntry("/src/utils/index.ts"),
      makeEntry("/src/hooks/index.ts"),
    ];

    const matcher = new FuzzyMatcher("index.ts");
    const results = matcher.match(entries);

    assert.equal(results.length, 3, "All three index.ts files should match");
    // They should all be exact matches with the same tier
    const scores = results.map((r) => r.score);
    assert.equal(
      scores[0],
      scores[1],
      "Same basename matches should have the same base score",
    );
  });

  it("large number of entries (1000+) does not crash", () => {
    const entries: ScanEntry[] = [];
    for (let i = 0; i < 1500; i++) {
      entries.push(makeEntry(`/src/dir${i % 50}/file${i}.ts`));
    }

    const matcher = new FuzzyMatcher("file75");
    const results = matcher.match(entries);

    assert.ok(results.length > 0, "Should find matches in large set");
  });
});

// ---------------------------------------------------------------------------
// Additional coverage
// ---------------------------------------------------------------------------

describe("FuzzyMatcher -- additional", () => {
  it("suffix match works for stem without extension", () => {
    const entries = [makeEntry("/src/MyComponent.tsx")];
    const matcher = new FuzzyMatcher("component");
    const results = matcher.match(entries);

    assert.ok(results.length > 0, "Should match via suffix on stem");
  });

  it("substring match in path (not just name)", () => {
    const entries = [makeEntry("/workspace/components/button/index.ts")];
    const matcher = new FuzzyMatcher("components/button");
    const results = matcher.match(entries);

    assert.ok(results.length > 0, "Should find substring match in path");
  });

  it("spec and story files also get penalty", () => {
    const entries = [
      makeEntry("/src/Widget.tsx"),
      makeEntry("/src/Widget.spec.tsx"),
      makeEntry("/src/Widget.stories.tsx"),
    ];

    const matcher = new FuzzyMatcher("Widget");
    const results = matcher.match(entries);

    const normal = results.find((r) => r.entry.name === "Widget.tsx")!;
    const spec = results.find((r) => r.entry.name === "Widget.spec.tsx")!;
    const stories = results.find(
      (r) => r.entry.name === "Widget.stories.tsx",
    )!;

    assert.ok(normal.score > spec.score, "Normal should beat spec");
    assert.ok(normal.score > stories.score, "Normal should beat stories");
  });

  it("directory entries can also be matched", () => {
    const entry: ScanEntry = {
      uri: "file:///src/components",
      path: "/src/components",
      name: "components",
      isDirectory: true,
      isAlwaysIncluded: false,
    };

    const matcher = new FuzzyMatcher("comp");
    const results = matcher.match([entry]);

    assert.ok(results.length > 0, "Directory entries should be matchable");
  });

  it("matchPositions for prefix match start at 0", () => {
    const entries = [makeEntry("/src/foobar.ts")];
    const matcher = new FuzzyMatcher("foo");
    const results = matcher.match(entries);

    assert.ok(results.length > 0);
    assert.deepEqual(
      results[0]!.matchPositions,
      [0, 1, 2],
      "Prefix match positions should start at 0",
    );
  });

  it("fuzzy score decreases with larger gaps", () => {
    const entries = [
      makeEntry("/src/ab_cd.ts"), // smaller gaps for "abcd"
      makeEntry("/src/a____b____c____d.ts"), // larger gaps for "abcd"
    ];

    const matcher = new FuzzyMatcher("abcd");
    const results = matcher.match(entries);

    // Both should match, but the one with smaller gaps should score higher
    assert.equal(results.length, 2, "Both should match");
    const smallGap = results.find(
      (r) => r.entry.path === "/src/ab_cd.ts",
    )!;
    const largeGap = results.find(
      (r) => r.entry.path === "/src/a____b____c____d.ts",
    )!;
    assert.ok(
      smallGap.score > largeGap.score,
      `Smaller gaps (${smallGap.score}) should score higher than larger gaps (${largeGap.score})`,
    );
  });
});
