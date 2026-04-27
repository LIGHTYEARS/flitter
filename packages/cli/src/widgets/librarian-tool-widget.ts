/**
 * LibrarianToolWidget — displays Librarian subagent tool results.
 *
 * The Librarian is a subagent that performs repository/code search tasks.
 * This module contains two widget types:
 *
 *   1. LibrarianToolWidget — top-level Librarian subagent, mirrors the Oracle
 *      pattern (shared subagent renderer via ExpandableToolHeader with body
 *      containing query text and result text).
 *
 *   2. LibrarianSubToolWidget — individual Librarian sub-operations (read,
 *      search, glob, list, commit-search, diff, list-repos). Each variant
 *      shows its own name + pattern/path detail in the header.
 *
 * 逆向: modules/1472_tui_components/layout_widgets.js
 *   - buildLibrarianTool()       lines 2104-2120  — top-level (uses qv/L9R)
 *   - buildLibrarianReadTool()   lines 2391-2396  — T8R
 *   - buildLibrarianSearchTool() lines 2397-2404  — TD w/ patternField:"pattern"
 *   - buildLibrarianGlobTool()   lines 2405-2412  — TD w/ patternField:"filePattern"
 *   - buildLibrarianListDirectoryTool() lines 2413-2418 — R8R
 *   - buildLibrarianListRepositoriesTool() lines 2419-2424 — a8R
 *   - buildLibrarianCommitSearchTool() lines 2425-2432 — TD w/ patternField:"query"
 *   - buildLibrarianDiffTool()   lines 2433-2438  — e8R
 *
 * 逆向: chunk-006.js (implementations)
 *   - T8R  lines 30348-30392  — Read: shows "{repo}/{path} @range" as hyperlink-style
 *   - TD   lines 30394-30438  — Search/Glob/CommitSearch: pattern in command color + "in repo/path" dim
 *   - R8R  lines 30440-30475  — List: path in command color + "in repo" dim
 *   - a8R  lines 30477-30511  — ListRepositories: pattern/org/language joined as command text
 *   - e8R  lines 30513-30553  — Diff: base...head in command color + "in repo" dim
 *
 * @module librarian-tool-widget
 */

import type { BuildContext, Widget } from "@flitter/tui";
import {
  Color,
  Column,
  Container,
  EdgeInsets,
  RichText,
  StatelessWidget,
  TextSpan,
  TextStyle,
} from "@flitter/tui";
import { ExpandableToolHeader, type ToolStatus } from "./expandable-tool-header.js";

// ════════════════════════════════════════════════════
//  Shared color constants
// ════════════════════════════════════════════════════

/**
 * Color for command/pattern text in sub-tool headers.
 * 逆向: TD.build() — new cT({ color: r.app.command })
 */
const COMMAND_COLOR = Color.rgb(0x98, 0xbb, 0x6c); // greenish, matches amp's command color

/**
 * Dim foreground for secondary text ("in repo", path suffixes).
 * 逆向: TD.build() — new cT({ color: h.foreground, dim: true })
 */
const DIM_COLOR = Color.default();

// ════════════════════════════════════════════════════
//  Variant name map
// ════════════════════════════════════════════════════

/** All supported LibrarianSubToolWidget variant identifiers. */
export type LibrarianVariant =
  | "read"
  | "search"
  | "glob"
  | "list"
  | "list-repos"
  | "commit-search"
  | "diff";

/**
 * Maps variant identifiers to their display names shown in the header.
 *
 * 逆向: individual build methods — name: "Read", "Search", "Glob", "List",
 *   "List Repositories", "Commit Search", "Diff"
 */
const VARIANT_DISPLAY_NAMES: Record<LibrarianVariant, string> = {
  read: "Read",
  search: "Search",
  glob: "Glob",
  list: "List",
  "list-repos": "List Repositories",
  "commit-search": "Commit Search",
  diff: "Diff",
};

// ════════════════════════════════════════════════════
//  LibrarianToolWidget (top-level subagent)
// ════════════════════════════════════════════════════

/**
 * Configuration for LibrarianToolWidget (top-level subagent).
 *
 * 逆向: buildLibrarianTool() lines 2104-2120
 *   - name: "Librarian"
 *   - inputSection from toolUse.input.query (string)
 *   - outputSection from toolRun.result (for done/in-progress)
 */
export interface LibrarianToolWidgetConfig {
  /**
   * Display name (defaults to "Librarian").
   * 逆向: buildLibrarianTool() — name: "Librarian"
   */
  name?: string;

  /**
   * Current execution status.
   * 逆向: qv (shared subagent renderer) — toolRun.status
   */
  status: ToolStatus;

  /**
   * Query text shown in body (the user's search query).
   * 逆向: buildLibrarianTool() — inputSection: typeof R.input.query === "string"
   */
  query?: string;

  /**
   * Result text shown in body once available.
   * 逆向: buildLibrarianTool() — outputSection: t && typeof t === "string" ? { content: t }
   *   where t = status === "done" || "in-progress" ? result : undefined
   */
  result?: string;

  /**
   * Error message (flitter extension — amp uses result field directly).
   */
  error?: string;
}

/**
 * LibrarianToolWidget — renders the top-level Librarian subagent tool run.
 *
 * Uses the same ExpandableToolHeader + body Column pattern as OracleToolWidget.
 *
 * 逆向: buildLibrarianTool() → qv (same as OracleTool's L9R)
 *   M9R (Oracle) and the Librarian top-level wrapper both use qv as the
 *   shared subagent renderer.
 */
export class LibrarianToolWidget extends StatelessWidget {
  readonly config: LibrarianToolWidgetConfig;

  constructor(config: LibrarianToolWidgetConfig) {
    super();
    this.config = config;
  }

  /**
   * Build the Librarian top-level widget tree.
   *
   * 逆向: qv (L9R).build() — Column([ExpandableToolHeader, Padding(body)])
   *   body = Column([query?, result?]) with horizontal padding 2
   */
  build(_context: BuildContext): Widget {
    const { name = "Librarian", status, query, result, error } = this.config;

    // ── Build body children ──
    // 逆向: L9R.build() — A array populated with Z3 (markdown) widgets
    const bodyChildren: Widget[] = [];

    // Query input section
    // 逆向: buildLibrarianTool() — inputSection: typeof R.input.query === "string" ? { content: R.input.query }
    if (query && query.trim().length > 0) {
      bodyChildren.push(_makeTextWidget(query));
    }

    // Result/output section
    // 逆向: buildLibrarianTool() — outputSection: t && typeof t === "string" ? { content: t }
    if (result && result.trim().length > 0) {
      bodyChildren.push(_makeTextWidget(result));
    }

    // Error section (flitter extension)
    if (error && error.trim().length > 0) {
      bodyChildren.push(_makeErrorWidget(error));
    }

    // ── Assemble body ──
    // 逆向: L9R.build() — uR(padding: TR(2,0,2,0)) wrapping Column(A)
    const hasBody = bodyChildren.length > 0;

    const bodyWidget = hasBody
      ? (new Container({
          padding: EdgeInsets.symmetric({ horizontal: 2 }),
          child: new Column({
            crossAxisAlignment: "start",
            mainAxisSize: "min",
            children: bodyChildren,
          }) as unknown as Widget,
        }) as unknown as Widget)
      : (_makeShrink() as unknown as Widget);

    // ── Header via ExpandableToolHeader ──
    // 逆向: L9R.build() — x3({ name, status, children: detail })
    return new ExpandableToolHeader({
      title: name,
      status,
      child: bodyWidget,
    }) as unknown as Widget;
  }
}

// ════════════════════════════════════════════════════
//  LibrarianSubToolWidget (per-operation widget)
// ════════════════════════════════════════════════════

/**
 * Configuration for LibrarianSubToolWidget.
 *
 * Covers all 7 Librarian sub-operation variants.
 * Not all fields apply to every variant — each variant uses a subset.
 *
 * Field-to-variant mapping (from amp source):
 *
 * | variant        | amp class | relevant fields                    |
 * |----------------|-----------|-------------------------------------|
 * | read           | T8R       | path, repo, readRange               |
 * | search         | TD        | pattern (patternField="pattern")    |
 * | glob           | TD        | pattern (patternField="filePattern") |
 * | list           | R8R       | path, repo                          |
 * | list-repos     | a8R       | pattern (as query), org, language   |
 * | commit-search  | TD        | pattern (patternField="query")      |
 * | diff           | e8R       | base, head, repo                    |
 */
export interface LibrarianSubToolWidgetConfig {
  /** Which Librarian sub-operation this widget represents. */
  variant: LibrarianVariant;

  /** Current execution status. */
  status: ToolStatus;

  /**
   * Pattern / query string (search, glob, commit-search, list-repos).
   * 逆向: TD.build() — c[patternField], a8R pattern field
   */
  pattern?: string;

  /**
   * File or directory path (read, list).
   * 逆向: T8R.build() — h.path; R8R.build() — h.path || "/"
   */
  path?: string;

  /**
   * Repository identifier (URL or "owner/repo").
   * 逆向: T8R, TD, R8R, e8R — h.repository
   */
  repo?: string;

  /**
   * Line range for read tool: [startLine, endLine].
   * 逆向: T8R.build() — h.read_range (Array) → " @start-end"
   */
  readRange?: [number, number];

  /**
   * Organization filter for list-repos.
   * 逆向: a8R.build() — t.organization → "org:${h}"
   */
  org?: string;

  /**
   * Language filter for list-repos.
   * 逆向: a8R.build() — t.language → "language:${i}"
   */
  language?: string;

  /**
   * Base ref for diff (commit SHA, branch, or ref).
   * 逆向: e8R.build() — h.base → EgT(h.base)
   */
  base?: string;

  /**
   * Head ref for diff.
   * 逆向: e8R.build() — h.head → EgT(h.head)
   */
  head?: string;

  /**
   * Result text shown in body (not currently rendered in header variants,
   * kept for future expansion).
   */
  result?: string;
}

/**
 * LibrarianSubToolWidget — renders one of the 7 Librarian sub-operations.
 *
 * All variants use x3 (ExpandableToolHeader) with a children array that
 * contains the pattern/path detail as styled text spans.
 *
 * 逆向: TD, T8R, R8R, a8R, e8R all return:
 *   new x3({ name, status, children: [detail widget] })
 */
export class LibrarianSubToolWidget extends StatelessWidget {
  readonly config: LibrarianSubToolWidgetConfig;

  constructor(config: LibrarianSubToolWidgetConfig) {
    super();
    this.config = config;
  }

  /**
   * Build the sub-tool widget.
   *
   * Delegates to a variant-specific builder that constructs the trailing
   * detail text widget (shown in the ExpandableToolHeader's `trailing` prop).
   */
  build(_context: BuildContext): Widget {
    const { variant, status } = this.config;
    const displayName = VARIANT_DISPLAY_NAMES[variant];
    const trailing = this._buildTrailing();

    // Body widget — currently a shrink placeholder since sub-tools don't
    // show expanded body content in amp's implementation.
    // 逆向: T8R/TD/R8R/a8R/e8R all return x3({ name, status, children })
    //   x3 renders children as trailing content in the header row.
    const bodyWidget = _makeShrink() as unknown as Widget;

    return new ExpandableToolHeader({
      title: displayName,
      status,
      trailing: trailing ?? undefined,
      child: bodyWidget,
    }) as unknown as Widget;
  }

  /**
   * Build the trailing detail widget for the header row.
   *
   * Each variant formats its inputs differently:
   *
   * - read:          "{repo}/{path} @start-end"
   * - search/glob/commit-search: "{pattern} in {repo}/{path}"
   * - list:          "{path} in {repo}"
   * - list-repos:    "{pattern} org:{org} language:{lang}"
   * - diff:          "{base}...{head} in {repo}"
   */
  private _buildTrailing(): Widget | null {
    switch (this.config.variant) {
      case "read":
        return this._buildReadTrailing();
      case "search":
      case "glob":
      case "commit-search":
        return this._buildPatternTrailing();
      case "list":
        return this._buildListTrailing();
      case "list-repos":
        return this._buildListReposTrailing();
      case "diff":
        return this._buildDiffTrailing();
    }
  }

  /**
   * Build trailing for "read" variant (T8R).
   *
   * 逆向: T8R.build() lines 30370-30386
   *   Shows "{repo-stripped}/{path}" as underlined link text + " @start-end" dim
   *   path normalization: strip leading "/"
   *   repo normalization: strip "https://github.com/"
   */
  private _buildReadTrailing(): Widget | null {
    const { path, repo, readRange } = this.config;
    if (!path || !repo) return null;

    const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
    const normalizedRepo = repo.replace(/^https?:\/\/github\.com\//, "");
    const linkText = `${normalizedRepo}/${normalizedPath}`;

    const spans: TextSpan[] = [];

    // Link-style text (underlined, command color)
    // 逆向: T8R — H3({ uri, text, style: { color: e.app.fileReference, dim: true, underline: true } })
    spans.push(
      new TextSpan({
        text: linkText,
        style: new TextStyle({ foreground: COMMAND_COLOR, underline: true }),
      }),
    );

    // Optional range annotation
    // 逆向: T8R — if (s && Array.isArray(s)) push(" @${s[0]}-${s[1]}")
    if (readRange) {
      spans.push(
        new TextSpan({
          text: ` @${readRange[0]}-${readRange[1]}`,
          style: new TextStyle({ foreground: DIM_COLOR, dim: true }),
        }),
      );
    }

    return new RichText({
      text: new TextSpan({ children: spans }),
    }) as unknown as Widget;
  }

  /**
   * Build trailing for "search", "glob", "commit-search" variants (TD).
   *
   * 逆向: TD.build() lines 30418-30432
   *   pattern in command color
   *   " in {repo-stripped}" dim
   *   "/{path-stripped}" dim (if path present alongside repo)
   */
  private _buildPatternTrailing(): Widget | null {
    const { pattern, repo, path } = this.config;
    const spans: TextSpan[] = [];

    // Pattern text in command color
    // 逆向: if (s) o.push(new G(s, new cT({ color: r.app.command })))
    if (pattern) {
      spans.push(
        new TextSpan({
          text: pattern,
          style: new TextStyle({ foreground: COMMAND_COLOR }),
        }),
      );
    }

    // Repository + optional path suffix in dim
    // 逆向: if (A) { push(" in {stripped-repo}"); if (l) push("/{stripped-path}") }
    if (repo) {
      const strippedRepo = repo.replace(/^https?:\/\/github\.com\//, "");
      spans.push(
        new TextSpan({
          text: ` in ${strippedRepo}`,
          style: new TextStyle({ foreground: DIM_COLOR, dim: true }),
        }),
      );
      if (path) {
        const strippedPath = path.startsWith("/") ? path.slice(1) : path;
        spans.push(
          new TextSpan({
            text: `/${strippedPath}`,
            style: new TextStyle({ foreground: DIM_COLOR, dim: true }),
          }),
        );
      }
    }

    if (spans.length === 0) return null;

    return new RichText({
      text: new TextSpan({ children: spans }),
    }) as unknown as Widget;
  }

  /**
   * Build trailing for "list" variant (R8R).
   *
   * 逆向: R8R.build() lines 30459-30468
   *   path (or "/") in command color
   *   " in {repo}" dim
   */
  private _buildListTrailing(): Widget | null {
    const { path, repo } = this.config;
    const displayPath = path ?? "/";
    const spans: TextSpan[] = [];

    // Path in command color
    // 逆向: if (c) s.push(new G(c, new cT({ color: e.app.command })))
    spans.push(
      new TextSpan({
        text: displayPath,
        style: new TextStyle({ foreground: COMMAND_COLOR }),
      }),
    );

    // Repo in dim
    // 逆向: if (i) s.push(new G(` in ${i}`, r))
    if (repo) {
      spans.push(
        new TextSpan({
          text: ` in ${repo}`,
          style: new TextStyle({ foreground: DIM_COLOR, dim: true }),
        }),
      );
    }

    return new RichText({
      text: new TextSpan({ children: spans }),
    }) as unknown as Widget;
  }

  /**
   * Build trailing for "list-repos" variant (a8R).
   *
   * 逆向: a8R.build() lines 30490-30503
   *   Joins: [pattern, "org:{org}", "language:{lang}"] as space-separated command color text
   */
  private _buildListReposTrailing(): Widget | null {
    const { pattern, org, language } = this.config;
    const parts: string[] = [];

    // 逆向: if (r) s.push(r); if (h) s.push(`org:${h}`); if (i) s.push(`language:${i}`)
    if (pattern) parts.push(pattern);
    if (org) parts.push(`org:${org}`);
    if (language) parts.push(`language:${language}`);

    if (parts.length === 0) return null;

    return new RichText({
      text: new TextSpan({
        text: parts.join(" "),
        style: new TextStyle({ foreground: COMMAND_COLOR }),
      }),
    }) as unknown as Widget;
  }

  /**
   * Build trailing for "diff" variant (e8R).
   *
   * 逆向: e8R.build() lines 30532-30542
   *   "{normalizedBase}...{normalizedHead}" in command color
   *   " in {repo-stripped}" dim
   *
   * normalizeRef() matches amp's EgT function:
   *   - strip refs/heads/ or refs/tags/ prefix
   *   - truncate commit SHA to 7 chars, preserving ^ prefix and suffix
   */
  private _buildDiffTrailing(): Widget | null {
    const { base, head, repo } = this.config;
    if (!base || !head) return null;

    const spans: TextSpan[] = [];

    // 逆向: push(`${EgT(h.base)}...${EgT(h.head)}`, command color)
    spans.push(
      new TextSpan({
        text: `${_normalizeRef(base)}...${_normalizeRef(head)}`,
        style: new TextStyle({ foreground: COMMAND_COLOR }),
      }),
    );

    // 逆向: if (h.repository) push(` in ${stripped}`, dim)
    if (repo) {
      const strippedRepo = repo.replace(/^https?:\/\/github\.com\//, "");
      spans.push(
        new TextSpan({
          text: ` in ${strippedRepo}`,
          style: new TextStyle({ foreground: DIM_COLOR, dim: true }),
        }),
      );
    }

    return new RichText({
      text: new TextSpan({ children: spans }),
    }) as unknown as Widget;
  }
}

// ════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════

/**
 * Normalize a git ref for display.
 *
 * Matches amp's EgT function (modules/2849_unknown_EgT.js):
 *   - Empty/null → ""
 *   - refs/heads/foo or refs/tags/foo → "foo"
 *   - Commit SHA (7-40 hex chars, optional ^ prefix and ^N/~N suffix) → truncate to 7
 *   - Otherwise return as-is
 *
 * 逆向: EgT (modules/2849_unknown_EgT.js lines 1-13)
 */
function _normalizeRef(ref: string): string {
  if (!ref) return "";

  // refs/heads/<name> or refs/tags/<name>
  const refMatch = ref.match(/^refs\/(heads|tags)\/(.+)$/);
  if (refMatch) return refMatch[2] ?? "";

  // Commit SHA with optional ^ prefix and ^N/~N suffix
  const shaMatch = ref.match(/^(\^)?([0-9a-f]{7,40})(\^\d+|\^+|~\d*)?$/i);
  if (shaMatch) {
    const prefix = shaMatch[1] ?? "";
    const sha = shaMatch[2] ?? "";
    const suffix = shaMatch[3] ?? "";
    return prefix + sha.slice(0, 7) + suffix;
  }

  return ref;
}

/**
 * Create a plain text body widget.
 *
 * 逆向: Z3({ markdown: content }) — in flitter we use RichText until MarkdownText lands
 */
function _makeTextWidget(text: string): Widget {
  return new RichText({
    text: new TextSpan({
      text,
      style: new TextStyle({ foreground: Color.default() }),
    }),
    selectable: true,
  }) as unknown as Widget;
}

/**
 * Create a red-tinted error text widget.
 *
 * Flitter extension — amp surfaces errors through the result field.
 */
function _makeErrorWidget(text: string): Widget {
  return new RichText({
    text: new TextSpan({
      text,
      style: new TextStyle({ foreground: Color.indexed(1) }), // red
    }),
  }) as unknown as Widget;
}

/**
 * Return a zero-size shrink placeholder widget.
 *
 * 逆向: L9R.build() — XT.shrink() → SizedBox(0) when body is empty
 */
function _makeShrink(): Widget {
  return new RichText({
    text: new TextSpan({
      text: "",
      style: new TextStyle({ foreground: Color.default() }),
    }),
  }) as unknown as Widget;
}
