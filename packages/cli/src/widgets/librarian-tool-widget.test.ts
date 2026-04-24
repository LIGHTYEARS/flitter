/**
 * LibrarianToolWidget and LibrarianSubToolWidget unit tests.
 *
 * Validates:
 *  LibrarianToolWidget:
 *   - Extends StatelessWidget
 *   - Default name is "Librarian"
 *   - Custom name respected
 *   - Build returns ExpandableToolHeader
 *   - status passed through to header
 *   - query text rendered in body
 *   - result text rendered in body
 *   - error text rendered in body
 *   - whitespace-only query not rendered
 *   - body empty when no content
 *
 *  LibrarianSubToolWidget:
 *   - Extends StatelessWidget
 *   - All 7 variants map to correct display names
 *   - "read" trailing: shows repo/path
 *   - "read" trailing: shows @range when readRange provided
 *   - "search" trailing: shows pattern + " in repo"
 *   - "glob" trailing: shows pattern + path suffix
 *   - "commit-search" trailing: shows query pattern
 *   - "list" trailing: shows path + " in repo"
 *   - "list" defaults path to "/"
 *   - "list-repos" trailing: joins pattern/org/language
 *   - "diff" trailing: shows base...head
 *   - "diff" trailing: normalizes git refs
 *   - "diff" trailing: appends " in repo" when provided
 *   - status passed through to ExpandableToolHeader
 *   - no trailing when required fields absent
 *
 * Run:
 * ```bash
 * bun test packages/cli/src/widgets/librarian-tool-widget.test.ts
 * ```
 *
 * @module
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { type BuildContext, RichText, StatelessWidget } from "@flitter/tui";
import { ExpandableToolHeader, type ExpandableToolHeaderState } from "./expandable-tool-header.js";
import {
  LibrarianSubToolWidget,
  type LibrarianSubToolWidgetConfig,
  LibrarianToolWidget,
  type LibrarianToolWidgetConfig,
} from "./librarian-tool-widget.js";

// ════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════

const mockContext = {} as BuildContext;

function buildLibrarian(config: LibrarianToolWidgetConfig): unknown {
  return new LibrarianToolWidget(config).build(mockContext);
}

function buildSubTool(config: LibrarianSubToolWidgetConfig): unknown {
  return new LibrarianSubToolWidget(config).build(mockContext);
}

/**
 * Mount an ExpandableToolHeader and run its build().
 * Lets us inspect header text (spinner, icon, title).
 */
function mountAndBuildHeader(tree: unknown): unknown {
  const header = tree as ExpandableToolHeader;
  assert.ok(header instanceof ExpandableToolHeader, "root should be ExpandableToolHeader");

  const state = header.createState() as ExpandableToolHeaderState;
  const mockElement = { markNeedsRebuild: () => {} } as unknown as object;
  (state as unknown as Record<string, unknown>)._widget = header;
  (state as unknown as Record<string, unknown>)._element = mockElement;
  (state as unknown as Record<string, unknown>)._mounted = true;
  state.initState();

  const built = state.build(mockContext);
  state.dispose();
  return built;
}

/**
 * Recursively extract all plain text from a widget tree.
 */
function extractAllText(widget: unknown): string {
  let result = "";
  if (widget instanceof RichText) {
    result += widget.text.toPlainText();
  }
  const w = widget as Record<string, unknown>;
  if (w.data !== undefined) result += w.data as string;
  if (w.children) {
    for (const child of w.children as unknown[]) result += extractAllText(child);
  }
  if (w.child) result += extractAllText(w.child);
  return result;
}

function getHeaderChild(tree: unknown): unknown {
  return (tree as ExpandableToolHeader).config.child;
}

function getHeaderTrailing(tree: unknown): unknown {
  return (tree as ExpandableToolHeader).config.trailing;
}

// ════════════════════════════════════════════════════
//  LibrarianToolWidget tests
// ════════════════════════════════════════════════════

describe("LibrarianToolWidget", () => {
  it("extends StatelessWidget", () => {
    assert.ok(new LibrarianToolWidget({ status: "done" }) instanceof StatelessWidget);
  });

  it("build() returns ExpandableToolHeader", () => {
    const tree = buildLibrarian({ status: "done" });
    assert.ok(tree instanceof ExpandableToolHeader);
  });

  it("defaults name to 'Librarian'", () => {
    const tree = buildLibrarian({ status: "done" }) as ExpandableToolHeader;
    assert.equal(tree.config.title, "Librarian");
  });

  it("respects custom name", () => {
    const tree = buildLibrarian({ name: "MyLibrarian", status: "done" }) as ExpandableToolHeader;
    assert.equal(tree.config.title, "MyLibrarian");
  });

  it("passes status to ExpandableToolHeader", () => {
    const tree = buildLibrarian({ status: "in-progress" }) as ExpandableToolHeader;
    assert.equal(tree.config.status, "in-progress");
  });

  it("in-progress status shows braille spinner in header", () => {
    const tree = buildLibrarian({ status: "in-progress" });
    const built = mountAndBuildHeader(tree);
    const text = extractAllText(built);
    assert.ok(
      /[\u2800-\u28FF]/.test(text),
      `expected braille spinner, got: ${JSON.stringify(text)}`,
    );
  });

  it("done status shows check icon ✓ in header", () => {
    const tree = buildLibrarian({ status: "done" });
    const built = mountAndBuildHeader(tree);
    const text = extractAllText(built);
    assert.ok(text.includes("\u2713"), `expected ✓, got: ${JSON.stringify(text)}`);
  });

  it("query text is rendered in body", () => {
    const tree = buildLibrarian({ status: "done", query: "find all TypeScript files" });
    const child = getHeaderChild(tree);
    const text = extractAllText(child);
    assert.ok(
      text.includes("find all TypeScript files"),
      `expected query in body: ${JSON.stringify(text)}`,
    );
  });

  it("result text is rendered in body", () => {
    const tree = buildLibrarian({ status: "done", result: "Found 42 files" });
    const child = getHeaderChild(tree);
    const text = extractAllText(child);
    assert.ok(text.includes("Found 42 files"), `expected result in body: ${JSON.stringify(text)}`);
  });

  it("error text is rendered in body", () => {
    const tree = buildLibrarian({ status: "error", error: "Repository not found" });
    const child = getHeaderChild(tree);
    const text = extractAllText(child);
    assert.ok(
      text.includes("Repository not found"),
      `expected error in body: ${JSON.stringify(text)}`,
    );
  });

  it("whitespace-only query is not rendered", () => {
    const tree = buildLibrarian({ status: "done", query: "   " });
    const child = getHeaderChild(tree);
    const text = extractAllText(child);
    assert.equal(
      text.trim(),
      "",
      `expected empty body for whitespace query: ${JSON.stringify(text)}`,
    );
  });

  it("body is empty when no query/result/error", () => {
    const tree = buildLibrarian({ status: "done" });
    const child = getHeaderChild(tree);
    const text = extractAllText(child);
    assert.equal(text.trim(), "", `expected empty body: ${JSON.stringify(text)}`);
  });

  it("query + result both rendered in body", () => {
    const tree = buildLibrarian({
      status: "done",
      query: "search for foo",
      result: "Result: bar",
    });
    const child = getHeaderChild(tree);
    const text = extractAllText(child);
    assert.ok(text.includes("search for foo"), "should include query");
    assert.ok(text.includes("Result: bar"), "should include result");
  });
});

// ════════════════════════════════════════════════════
//  LibrarianSubToolWidget tests
// ════════════════════════════════════════════════════

describe("LibrarianSubToolWidget", () => {
  it("extends StatelessWidget", () => {
    assert.ok(
      new LibrarianSubToolWidget({ variant: "read", status: "done" }) instanceof StatelessWidget,
    );
  });

  it("build() returns ExpandableToolHeader", () => {
    const tree = buildSubTool({ variant: "read", status: "done" });
    assert.ok(tree instanceof ExpandableToolHeader);
  });

  // ── Display names ──────────────────────────────────

  it("variant 'read' maps to display name 'Read'", () => {
    const tree = buildSubTool({ variant: "read", status: "done" }) as ExpandableToolHeader;
    assert.equal(tree.config.title, "Read");
  });

  it("variant 'search' maps to display name 'Search'", () => {
    const tree = buildSubTool({ variant: "search", status: "done" }) as ExpandableToolHeader;
    assert.equal(tree.config.title, "Search");
  });

  it("variant 'glob' maps to display name 'Glob'", () => {
    const tree = buildSubTool({ variant: "glob", status: "done" }) as ExpandableToolHeader;
    assert.equal(tree.config.title, "Glob");
  });

  it("variant 'list' maps to display name 'List'", () => {
    const tree = buildSubTool({ variant: "list", status: "done" }) as ExpandableToolHeader;
    assert.equal(tree.config.title, "List");
  });

  it("variant 'list-repos' maps to display name 'List Repositories'", () => {
    const tree = buildSubTool({ variant: "list-repos", status: "done" }) as ExpandableToolHeader;
    assert.equal(tree.config.title, "List Repositories");
  });

  it("variant 'commit-search' maps to display name 'Commit Search'", () => {
    const tree = buildSubTool({ variant: "commit-search", status: "done" }) as ExpandableToolHeader;
    assert.equal(tree.config.title, "Commit Search");
  });

  it("variant 'diff' maps to display name 'Diff'", () => {
    const tree = buildSubTool({ variant: "diff", status: "done" }) as ExpandableToolHeader;
    assert.equal(tree.config.title, "Diff");
  });

  // ── Status ─────────────────────────────────────────

  it("passes status to ExpandableToolHeader", () => {
    const tree = buildSubTool({ variant: "search", status: "in-progress" }) as ExpandableToolHeader;
    assert.equal(tree.config.status, "in-progress");
  });

  it("error status shows ✕ icon in header", () => {
    const tree = buildSubTool({ variant: "glob", status: "error" });
    const built = mountAndBuildHeader(tree);
    const text = extractAllText(built);
    assert.ok(text.includes("\u2715"), `expected ✕, got: ${JSON.stringify(text)}`);
  });

  // ── Read variant ───────────────────────────────────

  it("read: trailing shows 'repo/path' text", () => {
    const tree = buildSubTool({
      variant: "read",
      status: "done",
      path: "/src/index.ts",
      repo: "owner/myrepo",
    });
    const trailing = getHeaderTrailing(tree);
    const text = extractAllText(trailing);
    assert.ok(
      text.includes("owner/myrepo/src/index.ts"),
      `expected repo/path in trailing: ${JSON.stringify(text)}`,
    );
  });

  it("read: strips leading slash from path", () => {
    const tree = buildSubTool({
      variant: "read",
      status: "done",
      path: "/src/utils.ts",
      repo: "org/repo",
    });
    const trailing = getHeaderTrailing(tree);
    const text = extractAllText(trailing);
    // Should not have double slash
    assert.ok(!text.includes("//"), `should not have double slash: ${JSON.stringify(text)}`);
    assert.ok(text.includes("src/utils.ts"), `expected stripped path: ${JSON.stringify(text)}`);
  });

  it("read: shows @range annotation when readRange provided", () => {
    const tree = buildSubTool({
      variant: "read",
      status: "done",
      path: "README.md",
      repo: "org/repo",
      readRange: [10, 50],
    });
    const trailing = getHeaderTrailing(tree);
    const text = extractAllText(trailing);
    assert.ok(text.includes("@10-50"), `expected @range, got: ${JSON.stringify(text)}`);
  });

  it("read: no trailing when path/repo absent", () => {
    const tree = buildSubTool({ variant: "read", status: "done" }) as ExpandableToolHeader;
    assert.equal(tree.config.trailing, undefined);
  });

  it("read: strips github.com prefix from repo", () => {
    const tree = buildSubTool({
      variant: "read",
      status: "done",
      path: "README.md",
      repo: "https://github.com/owner/repo",
    });
    const trailing = getHeaderTrailing(tree);
    const text = extractAllText(trailing);
    assert.ok(
      !text.includes("https://github.com"),
      `should strip github prefix: ${JSON.stringify(text)}`,
    );
    assert.ok(text.includes("owner/repo"), `expected stripped repo, got: ${JSON.stringify(text)}`);
  });

  // ── Search / Glob / CommitSearch variants ──────────

  it("search: trailing shows pattern", () => {
    const tree = buildSubTool({
      variant: "search",
      status: "done",
      pattern: "TODO:",
    });
    const trailing = getHeaderTrailing(tree);
    const text = extractAllText(trailing);
    assert.ok(text.includes("TODO:"), `expected pattern: ${JSON.stringify(text)}`);
  });

  it("search: trailing shows 'in repo' when repo provided", () => {
    const tree = buildSubTool({
      variant: "search",
      status: "done",
      pattern: "console.log",
      repo: "org/myrepo",
    });
    const trailing = getHeaderTrailing(tree);
    const text = extractAllText(trailing);
    assert.ok(text.includes("in org/myrepo"), `expected 'in repo': ${JSON.stringify(text)}`);
  });

  it("glob: trailing shows filePattern + path suffix", () => {
    const tree = buildSubTool({
      variant: "glob",
      status: "done",
      pattern: "**/*.test.ts",
      repo: "org/repo",
      path: "/src",
    });
    const trailing = getHeaderTrailing(tree);
    const text = extractAllText(trailing);
    assert.ok(text.includes("**/*.test.ts"), `expected file pattern: ${JSON.stringify(text)}`);
    assert.ok(text.includes("src"), `expected path suffix: ${JSON.stringify(text)}`);
  });

  it("commit-search: trailing shows query pattern", () => {
    const tree = buildSubTool({
      variant: "commit-search",
      status: "done",
      pattern: "fix: auth",
    });
    const trailing = getHeaderTrailing(tree);
    const text = extractAllText(trailing);
    assert.ok(text.includes("fix: auth"), `expected commit query: ${JSON.stringify(text)}`);
  });

  it("search: no trailing when no pattern and no repo", () => {
    const tree = buildSubTool({ variant: "search", status: "done" }) as ExpandableToolHeader;
    assert.equal(tree.config.trailing, undefined);
  });

  // ── List variant ───────────────────────────────────

  it("list: trailing shows path", () => {
    const tree = buildSubTool({
      variant: "list",
      status: "done",
      path: "/packages",
    });
    const trailing = getHeaderTrailing(tree);
    const text = extractAllText(trailing);
    assert.ok(text.includes("/packages"), `expected path: ${JSON.stringify(text)}`);
  });

  it("list: defaults path to '/' when not provided", () => {
    const tree = buildSubTool({ variant: "list", status: "done" });
    const trailing = getHeaderTrailing(tree);
    const text = extractAllText(trailing);
    assert.ok(text.includes("/"), `expected '/' default: ${JSON.stringify(text)}`);
  });

  it("list: trailing shows 'in repo' when repo provided", () => {
    const tree = buildSubTool({
      variant: "list",
      status: "done",
      path: "/src",
      repo: "owner/project",
    });
    const trailing = getHeaderTrailing(tree);
    const text = extractAllText(trailing);
    assert.ok(text.includes("in owner/project"), `expected 'in repo': ${JSON.stringify(text)}`);
  });

  // ── List Repositories variant ───────────────────────

  it("list-repos: trailing shows pattern", () => {
    const tree = buildSubTool({
      variant: "list-repos",
      status: "done",
      pattern: "flitter",
    });
    const trailing = getHeaderTrailing(tree);
    const text = extractAllText(trailing);
    assert.ok(text.includes("flitter"), `expected pattern: ${JSON.stringify(text)}`);
  });

  it("list-repos: trailing includes org: prefix", () => {
    const tree = buildSubTool({
      variant: "list-repos",
      status: "done",
      pattern: "myrepo",
      org: "myorg",
    });
    const trailing = getHeaderTrailing(tree);
    const text = extractAllText(trailing);
    assert.ok(text.includes("org:myorg"), `expected org filter: ${JSON.stringify(text)}`);
  });

  it("list-repos: trailing includes language: prefix", () => {
    const tree = buildSubTool({
      variant: "list-repos",
      status: "done",
      language: "TypeScript",
    });
    const trailing = getHeaderTrailing(tree);
    const text = extractAllText(trailing);
    assert.ok(
      text.includes("language:TypeScript"),
      `expected language filter: ${JSON.stringify(text)}`,
    );
  });

  it("list-repos: no trailing when no filters provided", () => {
    const tree = buildSubTool({ variant: "list-repos", status: "done" }) as ExpandableToolHeader;
    assert.equal(tree.config.trailing, undefined);
  });

  // ── Diff variant ────────────────────────────────────

  it("diff: trailing shows 'base...head'", () => {
    const tree = buildSubTool({
      variant: "diff",
      status: "done",
      base: "main",
      head: "feature/auth",
    });
    const trailing = getHeaderTrailing(tree);
    const text = extractAllText(trailing);
    assert.ok(
      text.includes("main...feature/auth"),
      `expected base...head: ${JSON.stringify(text)}`,
    );
  });

  it("diff: normalizes SHA refs to 7 chars", () => {
    const tree = buildSubTool({
      variant: "diff",
      status: "done",
      base: "abc1234567890",
      head: "def9876543210",
    });
    const trailing = getHeaderTrailing(tree);
    const text = extractAllText(trailing);
    assert.ok(
      text.includes("abc1234...def9876"),
      `expected truncated SHAs: ${JSON.stringify(text)}`,
    );
  });

  it("diff: normalizes refs/heads/ prefix", () => {
    const tree = buildSubTool({
      variant: "diff",
      status: "done",
      base: "refs/heads/main",
      head: "refs/heads/feature",
    });
    const trailing = getHeaderTrailing(tree);
    const text = extractAllText(trailing);
    assert.ok(
      text.includes("main...feature"),
      `expected stripped ref prefix: ${JSON.stringify(text)}`,
    );
  });

  it("diff: shows 'in repo' when repo provided", () => {
    const tree = buildSubTool({
      variant: "diff",
      status: "done",
      base: "main",
      head: "dev",
      repo: "https://github.com/owner/repo",
    });
    const trailing = getHeaderTrailing(tree);
    const text = extractAllText(trailing);
    assert.ok(text.includes("in owner/repo"), `expected 'in repo': ${JSON.stringify(text)}`);
  });

  it("diff: no trailing when base or head absent", () => {
    const tree = buildSubTool({
      variant: "diff",
      status: "done",
      base: "main",
    }) as ExpandableToolHeader;
    assert.equal(tree.config.trailing, undefined);
  });
});
