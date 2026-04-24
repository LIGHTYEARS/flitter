/**
 * ToolboxListWidget — displays all registered toolboxes and their tools.
 *
 * Renders a flat RichText block showing:
 * - Summary line: "N toolbox(es) with K/M tool(s) registered" (bold)
 * - Per toolbox: status icon + bold path + tool count or "discovering N/M..."
 * - Per tool: status icon + colored name + truncated description or error
 *
 * This is a StatelessWidget: it receives pre-resolved toolbox data from the
 * caller and renders it synchronously. (The caller is responsible for
 * subscribing to the toolboxService and rebuilding on changes.)
 *
 * 逆向: chunk-006.js — R0R (StatefulWidget, subscribes to toolboxService)
 * 逆向: chunk-006.js — a0R (State — holds toolboxes[], builds layout)
 *
 * Note: The amp reference uses a StatefulWidget (R0R/a0R) because it owns the
 * toolboxService subscription. Flitter uses StatelessWidget here because the
 * subscription is owned by the parent; the widget only renders given data.
 *
 * 逆向: chunk-001.js:4121 — o9(T, R, a?) pluralize helper
 *
 * @module
 */

import type { BuildContext, Element } from "@flitter/tui";
import { Color, RichText, StatelessWidget, TextSpan, TextStyle } from "@flitter/tui";
import { type AppTheme, AppThemeController } from "./app-theme-controller.js";

// ════════════════════════════════════════════════════
//  Constants
// ════════════════════════════════════════════════════

/**
 * Max chars for tool description before truncation.
 * 逆向: a0R.build — `if (p.length > 50) p = p.slice(0, 47) + "..."`
 */
const DESCRIPTION_MAX_LENGTH = 50;

/**
 * Max chars for tool error before truncation.
 * 逆向: a0R.build — `if (p.length > 40) p = p.slice(0, 37) + "..."`
 */
const ERROR_MAX_LENGTH = 40;

// ════════════════════════════════════════════════════
//  Types
// ════════════════════════════════════════════════════

/**
 * Status of a single tool within a toolbox.
 *
 * 逆向: a0R.statusIcon() — "pending" | "registered" | "failed" | "duplicate"
 */
export type ToolStatus = "pending" | "ready" | "error" | "discovering";

/**
 * A single tool entry within a toolbox.
 *
 * 逆向: a0R.build — l.name, l.status, l.description, l.error
 */
export interface ToolEntry {
  /** Tool name (as registered, e.g. "tb__my_tool"). */
  name: string;
  /**
   * Registration status.
   * Maps to amp's "pending" | "registered" | "failed" | "duplicate".
   * - "pending" → discovering (dotted circle icon, warning color)
   * - "ready" → registered (✓ checkmark icon, toolSuccess color)
   * - "error" → failed (✗ cross icon, toolError color)
   */
  status: ToolStatus;
  /** Optional description (truncated to 50 chars). */
  description?: string;
  /** Optional error message (truncated to 40 chars). */
  error?: string;
}

/**
 * A single toolbox entry.
 *
 * 逆向: a0R.build — c.path, c.discovering, c.tools
 */
export interface ToolboxEntry {
  /** Filesystem path to the toolbox. */
  path: string;
  /**
   * Toolbox status.
   * - "discovering" → still scanning for tools (dotted circle + "discovering N/M...")
   * - "ready" → fully initialized (filled circle icon, toolSuccess color)
   * - "error" → toolbox failed to load
   */
  status: "discovering" | "ready" | "error";
  /** Tools registered in this toolbox. */
  tools: ToolEntry[];
}

/**
 * ToolboxListWidget configuration.
 */
export interface ToolboxListWidgetConfig {
  /**
   * All toolboxes to display.
   * 逆向: a0R.toolboxes (chunk-006.js:21662)
   */
  toolboxes: ToolboxEntry[];
}

// ════════════════════════════════════════════════════
//  Fallback colors
// ════════════════════════════════════════════════════

/** Warning color (for pending/discovering). 逆向: a.warning */
const FALLBACK_WARNING = Color.yellow();
/** Success color (for registered). 逆向: e.toolSuccess */
const FALLBACK_SUCCESS = Color.green();
/** Error color (for failed). 逆向: e.toolError */
const FALLBACK_ERROR = Color.red();
/** Link color (for tool names). 逆向: e.link */
const FALLBACK_LINK = Color.blue();
/** Default foreground. 逆向: a.foreground */
const FALLBACK_FOREGROUND = Color.default();

// ════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════

/**
 * Pluralize a word.
 *
 * 逆向: o9(T, R, a?) — chunk-001.js:4121
 * `function o9(T, R, a = R + "s") { return T === 1 ? R : a; }`
 */
function _pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

/**
 * Normalize whitespace and truncate a string.
 *
 * 逆向: a0R.build — `let p = l.description.replace(/\s+/g, " ").trim()`
 *                    `if (p.length > 50) p = p.slice(0, 47) + "..."`
 */
function _truncate(text: string, maxLength: number): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length > maxLength) {
    return `${normalized.slice(0, maxLength - 3)}...`;
  }
  return normalized;
}

/**
 * Get the status icon and color for a tool.
 *
 * 逆向: a0R.statusIcon(T) (chunk-006.js:21670-21693)
 * - "pending"    → { icon: "◌", color: warning }
 * - "registered" → { icon: "✓", color: toolSuccess }
 * - "failed"     → { icon: "✗", color: toolError }
 * - "duplicate"  → { icon: "◇", color: warning }
 * - default      → { icon: "?", color: foreground }
 *
 * Flitter mapping: "ready" → "registered", "error" → "failed"
 */
function _toolStatusIcon(
  status: ToolStatus,
  appTheme?: AppTheme | null,
): { icon: string; color: Color } {
  const successColor = appTheme?.toolSuccess ?? FALLBACK_SUCCESS;
  const errorColor = appTheme?.toolError ?? FALLBACK_ERROR;
  const warningColor = appTheme?.waiting ?? FALLBACK_WARNING;
  const foreground = FALLBACK_FOREGROUND;

  switch (status) {
    case "pending":
    case "discovering":
      // 逆向: "pending" → { icon: "◌", color: a.warning }
      return { icon: "\u25CC", color: warningColor };
    case "ready":
      // 逆向: "registered" → { icon: "✓", color: e.toolSuccess }
      return { icon: "\u2713", color: successColor };
    case "error":
      // 逆向: "failed" → { icon: "✗", color: e.toolError }
      return { icon: "\u2717", color: errorColor };
    default:
      return { icon: "?", color: foreground };
  }
}

// ════════════════════════════════════════════════════
//  ToolboxListWidget
// ════════════════════════════════════════════════════

/**
 * Displays all registered toolboxes and their tools.
 *
 * Stateless because it renders pre-resolved data. The parent is responsible
 * for subscribing to service updates and passing new config on change.
 *
 * 逆向: R0R (StatefulWidget) / a0R (State) — chunk-006.js:21651-21793
 */
export class ToolboxListWidget extends StatelessWidget {
  readonly config: ToolboxListWidgetConfig;

  constructor(config: ToolboxListWidgetConfig) {
    super();
    this.config = config;
  }

  /**
   * Build the toolbox list widget.
   *
   * 逆向: a0R.build (chunk-006.js:21694-21793)
   *
   * Empty state: "No toolboxes found." in dim text.
   * Non-empty: summary + per-toolbox blocks + per-tool lines.
   *
   * Returns RichText({ text: TextSpan("", children: spans) }).
   * Amp wraps with I3 (a Scrollable), but flitter returns plain RichText.
   */
  build(context: BuildContext): RichText {
    const { toolboxes } = this.config;

    // Resolve AppTheme
    let appTheme: AppTheme | null = null;
    try {
      appTheme = AppThemeController.maybeOf(context as unknown as Element);
    } catch {
      // No AppThemeController in tree — use fallbacks
    }

    // ── Empty state ──────────────────────────────────────
    // 逆向: `if (this.toolboxes.length === 0) return new xT({ text: new G("No toolboxes found.", new cT({ dim: true })) })`
    if (toolboxes.length === 0) {
      return new RichText({
        text: new TextSpan({
          text: "No toolboxes found.",
          style: new TextStyle({ dim: true }),
        }),
      });
    }

    const successColor = appTheme?.toolSuccess ?? FALLBACK_SUCCESS;
    const errorColor = appTheme?.toolError ?? FALLBACK_ERROR;
    const warningColor = appTheme?.waiting ?? FALLBACK_WARNING;
    const linkColor = appTheme?.link ?? FALLBACK_LINK;
    const spans: TextSpan[] = [];

    // ── Summary line ─────────────────────────────────────
    // 逆向: `let r = this.toolboxes.length`
    //        `let h = this.toolboxes.reduce((c, s) => c + s.tools.length, 0)`
    //        `let i = this.toolboxes.reduce((c, s) => c + s.tools.filter(A => A.status === "registered").length, 0)`
    //        `t.push(new G(`${r} ${o9(r, "toolbox")} with ${i}/${h} ${o9(h, "tool")} registered\n\n`, new cT({ bold: true })))`
    const totalToolboxes = toolboxes.length;
    const totalTools = toolboxes.reduce((sum, tb) => sum + tb.tools.length, 0);
    const registeredTools = toolboxes.reduce(
      (sum, tb) => sum + tb.tools.filter((t) => t.status === "ready").length,
      0,
    );

    spans.push(
      new TextSpan({
        text: `${totalToolboxes} ${_pluralize(totalToolboxes, "toolbox", "toolboxes")} with ${registeredTools}/${totalTools} ${_pluralize(totalTools, "tool")} registered\n\n`,
        style: new TextStyle({ bold: true }),
      }),
    );

    // ── Per-toolbox blocks ───────────────────────────────
    // 逆向: chunk-006.js:21724-21793
    for (const tb of toolboxes) {
      const toolCount = tb.tools.length;
      const readyCount = tb.tools.filter((t) => t.status === "ready").length;

      if (tb.status === "discovering") {
        // 逆向: `if (c.discovering) ...`
        //   `t.push(new G("◌ ", new cT({ color: a.warning })))`
        //   `t.push(new G(c.path, new cT({ bold: true })))`
        //   `t.push(new G(` discovering ${l}/${s}...\n`, new cT({ dim: true })))`
        //   where l = tools with status !== "pending"
        const discoveredCount = tb.tools.filter(
          (t) => t.status !== "pending" && t.status !== "discovering",
        ).length;
        spans.push(
          new TextSpan({
            text: "\u25CC ",
            style: new TextStyle({ foreground: warningColor }),
          }),
        );
        spans.push(
          new TextSpan({
            text: tb.path,
            style: new TextStyle({ bold: true }),
          }),
        );
        spans.push(
          new TextSpan({
            text: ` discovering ${discoveredCount}/${toolCount}...\n`,
            style: new TextStyle({ dim: true }),
          }),
        );
      } else {
        // 逆向: `t.push(new G("● ", new cT({ color: e.toolSuccess })))`
        //        `t.push(new G(c.path, new cT({ bold: true })))`
        //        `if (s > 0) t.push(new G(` ${A}/${s} ${o9(s, "tool")}\n`, new cT({ dim: true })))`
        //        `else t.push(new G("\n"))`
        const bulletColor = tb.status === "error" ? errorColor : successColor;
        spans.push(
          new TextSpan({
            text: "\u25CF ",
            style: new TextStyle({ foreground: bulletColor }),
          }),
        );
        spans.push(
          new TextSpan({
            text: tb.path,
            style: new TextStyle({ bold: true }),
          }),
        );
        if (toolCount > 0) {
          spans.push(
            new TextSpan({
              text: ` ${readyCount}/${toolCount} ${_pluralize(toolCount, "tool")}\n`,
              style: new TextStyle({ dim: true }),
            }),
          );
        } else {
          spans.push(new TextSpan({ text: "\n" }));
        }
      }

      // ── Per-tool lines ───────────────────────────────────
      // 逆向: chunk-006.js:21757-21793
      if (tb.tools.length === 0) {
        // 逆向: `t.push(new G("  └─ No tools available\n", new cT({ dim: true })))`
        spans.push(
          new TextSpan({
            text: "  \u2514\u2500 No tools available\n",
            style: new TextStyle({ dim: true }),
          }),
        );
      } else {
        for (const tool of tb.tools) {
          const { icon, color: iconColor } = _toolStatusIcon(tool.status, appTheme);

          // 逆向: `t.push(new G(`  ${o} `, new cT({ color: n })))`
          spans.push(
            new TextSpan({
              text: `  ${icon} `,
              style: new TextStyle({ foreground: iconColor }),
            }),
          );

          // 逆向: `t.push(new G(l.name, new cT({ color: l.status === "pending" ? a.warning : e.link })))`
          const nameColor =
            tool.status === "pending" || tool.status === "discovering" ? warningColor : linkColor;
          spans.push(
            new TextSpan({
              text: tool.name,
              style: new TextStyle({ foreground: nameColor }),
            }),
          );

          // Status suffix or description
          // 逆向: `if (l.status === "pending") t.push(new G(" discovering...", new cT({ dim: true })))`
          //        `else if (l.description) { let p = ... truncate ... t.push(new G(` ${p}`, new cT({ dim: true }))) }`
          if (tool.status === "pending" || tool.status === "discovering") {
            spans.push(
              new TextSpan({
                text: " discovering...",
                style: new TextStyle({ dim: true }),
              }),
            );
          } else if (tool.description) {
            const desc = _truncate(tool.description, DESCRIPTION_MAX_LENGTH);
            spans.push(
              new TextSpan({
                text: ` ${desc}`,
                style: new TextStyle({ dim: true }),
              }),
            );
          }

          // Error suffix
          // 逆向: `if (l.error) { let p = ... truncate 40 ... t.push(new G(` ${p}`, new cT({ color: e.toolError }))) }`
          if (tool.error) {
            const errText = _truncate(tool.error, ERROR_MAX_LENGTH);
            spans.push(
              new TextSpan({
                text: ` ${errText}`,
                style: new TextStyle({ foreground: errorColor }),
              }),
            );
          }

          spans.push(new TextSpan({ text: "\n" }));
        }
      }

      // 逆向: `t.push(new G("\n"))` — blank line after each toolbox
      spans.push(new TextSpan({ text: "\n" }));
    }

    return new RichText({
      text: new TextSpan({ children: spans }),
    });
  }
}
