/**
 * ReplToolWidget — displays REPL tool invocation results.
 *
 * Renders a flat RichText widget (NOT an ExpandableToolHeader) showing:
 * - Header line: spinner or "> " prefix, "REPL [binary [args]]" name,
 *   optional objective, and optional status suffix.
 * - Body: in-progress transcript lines, error message, or done result.
 *
 * 逆向: chunk-006.js line 30152 — V9R (ReplToolWidget, StatefulWidget)
 * 逆向: chunk-006.js line 30162 — X9R (State — spinner animation + build)
 * 逆向: modules/1945_unknown_h2.js — h2(T, R) output renderer (truncates to 10 lines)
 *
 * @module
 */

import type { BuildContext, Element } from "@flitter/tui";
import {
  BrailleSpinner,
  Color,
  RichText,
  State,
  StatefulWidget,
  TextSpan,
  TextStyle,
} from "@flitter/tui";
import { type AppTheme, AppThemeController } from "./app-theme-controller.js";

// ════════════════════════════════════════════════════
//  Constants
// ════════════════════════════════════════════════════

/**
 * Maximum output lines shown before truncation.
 * 逆向: modules/1945_unknown_h2.js — `let t = 10`
 */
const OUTPUT_MAX_LINES = 10;

// ════════════════════════════════════════════════════
//  Types
// ════════════════════════════════════════════════════

/** Tool run status values mirroring amp's status enum. */
export type ReplToolStatus =
  | "in-progress"
  | "done"
  | "error"
  | "cancelled"
  | "cancellation-requested"
  | "rejected-by-user"
  | "queued"
  | "blocked-on-user";

/**
 * A single transcript entry (input command or output text).
 * 逆向: chunk-006.js:30222 — `for (let o of l.transcript) if (o.type === "input")`
 */
export interface TranscriptEntry {
  type: "input" | "output";
  content: string;
}

/**
 * ReplToolWidget configuration.
 *
 * 逆向: V9R.props (chunk-006.js:30153)
 *   toolUse.input = { binary, args, objective }
 *   toolRun = { status, progress?, error?, result? }
 */
export interface ReplToolWidgetConfig {
  /** Tool run status. */
  status: ReplToolStatus;
  /**
   * REPL binary name (e.g. "python", "node").
   * 逆向: r.binary (chunk-006.js:30196)
   */
  binary?: string;
  /**
   * Arguments passed to the binary.
   * 逆向: r.args (chunk-006.js:30195) — joined with space
   */
  args?: string[];
  /**
   * Objective/description shown in dim quotes.
   * 逆向: r.objective (chunk-006.js:30200)
   */
  objective?: string;
  /**
   * Result output for done status.
   * 逆向: a.result (chunk-006.js:30244)
   */
  result?: string;
  /**
   * Error message for error status.
   * 逆向: a.error.message (chunk-006.js:30241)
   */
  error?: string;
  /**
   * Transcript entries for in-progress status with progress.
   * 逆向: a.progress.transcript (chunk-006.js:30220)
   */
  transcript?: TranscriptEntry[];
}

// ════════════════════════════════════════════════════
//  Fallback colors (used when no AppTheme in context)
// ════════════════════════════════════════════════════

/** In-progress status: blue. 逆向: qr("in-progress") → app.toolRunning */
const FALLBACK_RUNNING = Color.blue();
/** Done status: green. 逆向: qr("done") → app.toolSuccess */
const FALLBACK_SUCCESS = Color.green();
/** Error status: red. 逆向: qr("error") → app.toolError */
const FALLBACK_ERROR = Color.red();
/** Cancelled/rejected: yellow. 逆向: qr("cancelled") → app.toolCancelled */
const FALLBACK_CANCELLED = Color.yellow();
/** Foreground: terminal default. 逆向: t.foreground */
const FALLBACK_FOREGROUND = Color.default();
/** Command color: yellow. 逆向: e.app.command */
const FALLBACK_COMMAND = Color.yellow();

// ════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════

/**
 * Map a status to its status color.
 *
 * 逆向: qr(a.status, $R.of(T)) (modules/2821_unknown_qr.js)
 * - done → toolSuccess
 * - error → toolError
 * - in-progress → toolRunning
 * - cancelled/rejected → toolCancelled
 * - queued/blocked → waiting (fallback toolRunning)
 */
function _getStatusColor(status: ReplToolStatus, appTheme?: AppTheme | null): Color {
  switch (status) {
    case "done":
      return appTheme?.toolSuccess ?? FALLBACK_SUCCESS;
    case "error":
      return appTheme?.toolError ?? FALLBACK_ERROR;
    case "in-progress":
      return appTheme?.toolRunning ?? FALLBACK_RUNNING;
    case "cancelled":
    case "cancellation-requested":
    case "rejected-by-user":
      return appTheme?.toolCancelled ?? FALLBACK_CANCELLED;
    case "queued":
    case "blocked-on-user":
      return appTheme?.waiting ?? FALLBACK_RUNNING;
  }
}

/**
 * Build output text spans with 2-space indent and optional line truncation.
 *
 * 逆向: h2(T, R) in modules/1945_unknown_h2.js
 * - Strips \r, trims trailing whitespace, splits on \n
 * - If > 10 lines: shows "[... N lines truncated ...]" then last 10 lines
 * - Each line indented with 2 spaces
 * - All text: dim foreground color
 *
 * Returns an array of TextSpan (children of the root span).
 */
function _buildOutputSpans(text: string, foreground: Color): TextSpan[] {
  if (!text) return [];

  const lines = text.replace(/\r/g, "").trimEnd().split("\n");
  const style = new TextStyle({ foreground, dim: true });

  if (lines.length > OUTPUT_MAX_LINES) {
    const truncated = lines.length - OUTPUT_MAX_LINES;
    const truncatedLine = `  [... ${truncated} lines truncated ...]\n`;
    const visibleText = `${lines
      .slice(-OUTPUT_MAX_LINES)
      .map((l) => `  ${l}`)
      .join("\n")}\n`;
    return [
      new TextSpan({ text: truncatedLine, style }),
      new TextSpan({ text: visibleText, style }),
    ];
  }

  const indented = `${lines.map((l) => `  ${l}`).join("\n")}\n`;
  return [new TextSpan({ text: indented, style })];
}

// ════════════════════════════════════════════════════
//  ReplToolWidget
// ════════════════════════════════════════════════════

/**
 * REPL tool invocation display widget.
 *
 * 逆向: V9R (chunk-006.js:30152) — extends NR (StatefulWidget)
 * Has a spinner animation timer managed in state (X9R).
 */
export class ReplToolWidget extends StatefulWidget {
  readonly config: ReplToolWidgetConfig;

  constructor(config: ReplToolWidgetConfig) {
    super();
    this.config = config;
  }

  createState(): ReplToolWidgetState {
    return new ReplToolWidgetState();
  }
}

// ════════════════════════════════════════════════════
//  ReplToolWidgetState
// ════════════════════════════════════════════════════

/**
 * State for ReplToolWidget.
 *
 * Manages braille spinner animation while status is "in-progress".
 *
 * 逆向: X9R (chunk-006.js:30162)
 * - _animationTimer: ReturnType<typeof setInterval>
 * - _spinner: new xa() → BrailleSpinner
 * - initState: starts animation if in-progress
 * - didUpdateWidget: starts/stops animation on status change
 * - dispose: stops animation
 */
export class ReplToolWidgetState extends State<ReplToolWidget> {
  /**
   * Animation timer for stepping the braille spinner.
   * 逆向: X9R._animationTimer (chunk-006.js:30163)
   */
  private _animationTimer: ReturnType<typeof setInterval> | undefined;

  /**
   * Braille spinner automaton.
   * 逆向: X9R._spinner = new xa() (chunk-006.js:30164)
   */
  private _spinner = new BrailleSpinner();

  /**
   * 逆向: X9R.initState (chunk-006.js:30165)
   * Start animation immediately if status is in-progress at mount.
   */
  initState(): void {
    super.initState();
    if (this.widget.config.status === "in-progress") {
      this._startAnimation();
    }
  }

  /**
   * 逆向: X9R.didUpdateWidget (chunk-006.js:30169)
   * Start animation when transitioning into in-progress;
   * stop it when transitioning out.
   */
  didUpdateWidget(oldWidget: ReplToolWidget): void {
    super.didUpdateWidget(oldWidget);
    const wasInProgress = oldWidget.config.status === "in-progress";
    const isInProgress = this.widget.config.status === "in-progress";
    if (!wasInProgress && isInProgress) {
      this._startAnimation();
    } else if (wasInProgress && !isInProgress) {
      this._stopAnimation();
    }
  }

  /**
   * 逆向: X9R.dispose (chunk-006.js:30175)
   */
  dispose(): void {
    this._stopAnimation();
    super.dispose();
  }

  /**
   * 逆向: X9R._startAnimation (chunk-006.js:30177)
   * Steps spinner at 200ms intervals.
   */
  private _startAnimation(): void {
    this._animationTimer = setInterval(() => {
      this.setState(() => {
        this._spinner.step();
      });
    }, 200);
  }

  /**
   * 逆向: X9R._stopAnimation (chunk-006.js:30183)
   */
  private _stopAnimation(): void {
    if (this._animationTimer) {
      clearInterval(this._animationTimer);
      this._animationTimer = undefined;
    }
  }

  /**
   * Build the REPL tool widget.
   *
   * 逆向: X9R.build (chunk-006.js:30187)
   *
   * Header spans assembled inline, then body spans appended.
   * Returns RichText({ text: TextSpan("", children: spans), selectable: true }).
   *
   * 逆向: return new xT({ text: new G("", void 0, c), selectable: true })
   */
  build(context: BuildContext): RichText {
    const { status, binary, args, objective, result, error, transcript } = this.widget.config;

    // Resolve AppTheme from context (falls back to hardcoded colors in tests/isolation)
    let appTheme: AppTheme | null = null;
    try {
      appTheme = AppThemeController.maybeOf(context as unknown as Element);
    } catch {
      // No AppThemeController in ancestor tree — use fallback colors
    }

    const statusColor = _getStatusColor(status, appTheme);
    const foreground = FALLBACK_FOREGROUND;
    const commandColor = appTheme?.command ?? FALLBACK_COMMAND;
    const toolCancelledColor = appTheme?.toolCancelled ?? FALLBACK_CANCELLED;
    const toolErrorColor = appTheme?.toolError ?? FALLBACK_ERROR;

    const spans: TextSpan[] = [];

    // ── Header prefix: spinner or "> " ──────────────────
    // 逆向: chunk-006.js:30194-30205
    if (status === "in-progress") {
      // 逆向: `let l = this._spinner.toBraille(); c.push(new G(`${l} `, new cT({ color: i })))`
      spans.push(
        new TextSpan({
          text: `${this._spinner.toBraille()} `,
          style: new TextStyle({ foreground: statusColor }),
        }),
      );
    } else {
      // 逆向: `c.push(new G("> ", new cT({ color: i, bold: true })))`
      spans.push(
        new TextSpan({
          text: "> ",
          style: new TextStyle({ foreground: statusColor, bold: true }),
        }),
      );
    }

    // ── Tool name: "REPL" or "REPL binary args" ─────────
    // 逆向: chunk-006.js:30206
    //   `let s = r.args?.length ? `${r.binary ?? ""} ${r.args.join(" ")}`.trim() : r.binary ?? ""`
    //   `c.push(new G(s ? `REPL ${s}` : "REPL", new cT({ color: t.foreground, bold: true })))`
    const binaryAndArgs =
      args && args.length > 0 ? `${binary ?? ""} ${args.join(" ")}`.trim() : (binary ?? "");
    const toolLabel = binaryAndArgs ? `REPL ${binaryAndArgs}` : "REPL";
    spans.push(
      new TextSpan({
        text: toolLabel,
        style: new TextStyle({ foreground, bold: true }),
      }),
    );

    // ── Objective (dim, in quotes) ───────────────────────
    // 逆向: chunk-006.js:30211 — `if (r.objective) c.push(new G(` "${r.objective}"`, A))`
    // A = new cT({ color: t.foreground, dim: true })
    if (objective) {
      spans.push(
        new TextSpan({
          text: ` "${objective}"`,
          style: new TextStyle({ foreground, dim: true }),
        }),
      );
    }

    // ── Status suffix (rejected / cancelled) ────────────
    // 逆向: chunk-006.js:30212-30218
    if (status === "rejected-by-user") {
      // 逆向: `c.push(new G(" (rejected)", new cT({ dim: true, italic: true })))`
      spans.push(
        new TextSpan({
          text: " (rejected)",
          style: new TextStyle({ dim: true, italic: true }),
        }),
      );
    } else if (status === "cancelled" || status === "cancellation-requested") {
      // 逆向: `c.push(new G(" (cancelled)", new cT({ color: e.app.toolCancelled, italic: true })))`
      spans.push(
        new TextSpan({
          text: " (cancelled)",
          style: new TextStyle({ foreground: toolCancelledColor, italic: true }),
        }),
      );
    }

    // ── Newline after header ─────────────────────────────
    // 逆向: `c.push(new G("\n"))`
    spans.push(new TextSpan({ text: "\n" }));

    // ── Body ─────────────────────────────────────────────
    if (status === "in-progress" && transcript && transcript.length > 0) {
      // 逆向: chunk-006.js:30220-30234
      // Transcript: input entries get "  > " prefix + dim content line;
      // output entries rendered via h2(o.content, t)
      const dimStyle = new TextStyle({ foreground, dim: true });
      for (const entry of transcript) {
        if (entry.type === "input") {
          if (entry.content) {
            // 逆向: `c.push(new G("  > ", new cT({ color: e.app.command })))`
            // 逆向: `c.push(new G(`${o.content}\n`, A))`
            spans.push(
              new TextSpan({
                text: "  > ",
                style: new TextStyle({ foreground: commandColor }),
              }),
            );
            spans.push(new TextSpan({ text: `${entry.content}\n`, style: dimStyle }));
          }
        } else {
          // output entry → h2 rendering
          spans.push(..._buildOutputSpans(entry.content, foreground));
        }
      }
    } else if (status === "error" && error) {
      // 逆向: chunk-006.js:30241 — `c.push(new G(`  Error: ${a.error.message}\n`, new cT({ color: e.app.toolError })))`
      spans.push(
        new TextSpan({
          text: `  Error: ${error}\n`,
          style: new TextStyle({ foreground: toolErrorColor }),
        }),
      );
    } else if (status === "done" && result) {
      // 逆向: chunk-006.js:30244 — `c.push(...h2(a.result, t))`
      spans.push(..._buildOutputSpans(result, foreground));
    }

    return new RichText({
      text: new TextSpan({ children: spans }),
      selectable: true,
    });
  }
}
