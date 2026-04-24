/**
 * ToolboxToolWidget — displays a tb__ toolbox tool invocation.
 *
 * Renders a flat RichText widget (NOT an ExpandableToolHeader) showing:
 * - Header line: braille spinner prefix (in-progress) or "• " bullet (done/error),
 *   bold tool name (tb__ prefix stripped), dim key:value args, exit code suffix.
 * - Status suffix: "(rejected)" or "(cancelled)" as italic text.
 * - Body: in-progress/cancelled progress content, error message, or done output.
 *
 * 逆向: chunk-006.js line 30251 — Z9R (ToolboxToolWidget, StatefulWidget)
 * 逆向: chunk-006.js line 30261 — J9R (State — spinner animation + build)
 * 逆向: modules/1946_unknown_on.js — on(T, R, a) output renderer (truncates to 15 lines)
 * 逆向: modules/1946_unknown_on.js — rx(T) progress extractor
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
 * 逆向: modules/1946_unknown_on.js — `let h = 15`
 */
const OUTPUT_MAX_LINES = 15;

// ════════════════════════════════════════════════════
//  Types
// ════════════════════════════════════════════════════

/** Tool run status values mirroring amp's status enum. */
export type ToolboxToolStatus =
  | "in-progress"
  | "done"
  | "error"
  | "cancelled"
  | "cancellation-requested"
  | "rejected-by-user"
  | "queued"
  | "blocked-on-user";

/**
 * Progress data for streaming output.
 * 逆向: modules/1946_unknown_on.js rx(T) — returns T?.content || undefined
 */
export interface ToolboxToolProgress {
  /** The streaming content string. */
  content?: string;
}

/**
 * ToolboxToolWidget configuration.
 *
 * 逆向: Z9R.props (chunk-006.js:30252)
 *   toolUse = { name, input }
 *   toolRun = { status, result?, error?, exitCode? }
 *   toolProgress = { content? }
 */
export interface ToolboxToolWidgetConfig {
  /**
   * Tool display name — the tb__ prefix will be stripped for display.
   * 逆向: R.name.replace(/^tb__/, "") (chunk-006.js:30293)
   */
  toolName: string;

  /** Tool run status. */
  status: ToolboxToolStatus;

  /**
   * Tool input args as key→value pairs.
   * 逆向: R.input — Object.entries(h).map(([p, _]) => `${p}: ${JSON.stringify(_)}`).join(", ")
   * (chunk-006.js:30301)
   */
  args?: Record<string, unknown>;

  /**
   * Result output for done status.
   * 逆向: a.result.output (chunk-006.js:30347)
   */
  result?: string;

  /**
   * Exit code from the tool run (non-zero = error).
   * 逆向: a.result.exitCode (chunk-006.js:30295-30300)
   * `s = i === "done" && typeof a.result.exitCode === "number" && a.result.exitCode !== 0`
   */
  exitCode?: number;

  /**
   * Error message for error status.
   * 逆向: a.error.message (chunk-006.js:30345)
   */
  error?: string;

  /**
   * Streaming progress content shown during in-progress and cancelled.
   * 逆向: toolProgress — rx(e) extracts e?.content (modules/1946_unknown_on.js)
   */
  progress?: ToolboxToolProgress;
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
function _getStatusColor(status: ToolboxToolStatus, appTheme?: AppTheme | null): Color {
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
 * Extract progress text from a ToolboxToolProgress object.
 *
 * 逆向: rx(T) in modules/1946_unknown_on.js
 * `return T?.content || void 0`
 */
function _extractProgress(progress?: ToolboxToolProgress): string | undefined {
  return progress?.content || undefined;
}

/**
 * Build output text spans with optional line truncation.
 *
 * 逆向: on(T, R, a) in modules/1946_unknown_on.js
 * - Strips \r, trims trailing whitespace, splits on \n
 * - If > 15 lines: shows "[... N lines truncated ...] " then last 15 lines
 *   When R (done flag) is true, also shows a "View all" link (we skip interactive link)
 * - Each line NOT indented (unlike h2 — on() doesn't add "  " prefix)
 * - All text: dim foreground color
 *
 * Returns an array of TextSpan (children of the root span).
 */
function _buildOutputSpans(text: string, foreground: Color): TextSpan[] {
  if (!text) return [];

  const t = text.replace(/\r/g, "").trimEnd();
  const lines = t.split("\n");
  const style = new TextStyle({ foreground, dim: true });

  if (lines.length > OUTPUT_MAX_LINES) {
    const truncated = lines.length - OUTPUT_MAX_LINES;
    const truncatedLine = `[... ${truncated} lines truncated ...] `;
    const visibleText = `${lines.slice(-OUTPUT_MAX_LINES).join("\n")}\n`;
    return [
      new TextSpan({ text: truncatedLine, style }),
      new TextSpan({ text: visibleText, style }),
    ];
  }

  const joined = `${lines.join("\n")}\n`;
  return [new TextSpan({ text: joined, style })];
}

// ════════════════════════════════════════════════════
//  ToolboxToolWidget
// ════════════════════════════════════════════════════

/**
 * Toolbox tool invocation display widget.
 *
 * 逆向: Z9R (chunk-006.js:30251) — extends NR (StatefulWidget)
 * Has a spinner animation timer managed in state (J9R).
 */
export class ToolboxToolWidget extends StatefulWidget {
  readonly config: ToolboxToolWidgetConfig;

  constructor(config: ToolboxToolWidgetConfig) {
    super();
    this.config = config;
  }

  createState(): ToolboxToolWidgetState {
    return new ToolboxToolWidgetState();
  }
}

// ════════════════════════════════════════════════════
//  ToolboxToolWidgetState
// ════════════════════════════════════════════════════

/**
 * State for ToolboxToolWidget.
 *
 * Manages braille spinner animation while status is "in-progress".
 *
 * 逆向: J9R (chunk-006.js:30261)
 * - _animationTimer: ReturnType<typeof setInterval>
 * - _spinner: new xa() → BrailleSpinner
 * - initState: starts animation if in-progress
 * - didUpdateWidget: starts/stops animation on status change
 * - dispose: stops animation
 */
export class ToolboxToolWidgetState extends State<ToolboxToolWidget> {
  /**
   * Animation timer for stepping the braille spinner.
   * 逆向: J9R._animationTimer (chunk-006.js:30262)
   */
  private _animationTimer: ReturnType<typeof setInterval> | undefined;

  /**
   * Braille spinner automaton.
   * 逆向: J9R._spinner = new xa() (chunk-006.js:30263)
   */
  private _spinner = new BrailleSpinner();

  /**
   * 逆向: J9R.initState (chunk-006.js:30264)
   * Start animation immediately if status is in-progress at mount.
   */
  initState(): void {
    super.initState();
    if (this.widget.config.status === "in-progress") {
      this._startAnimation();
    }
  }

  /**
   * 逆向: J9R.didUpdateWidget (chunk-006.js:30268)
   * Start animation when transitioning into in-progress;
   * stop it when transitioning out.
   */
  didUpdateWidget(oldWidget: ToolboxToolWidget): void {
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
   * 逆向: J9R.dispose (chunk-006.js:30274)
   */
  dispose(): void {
    this._stopAnimation();
    super.dispose();
  }

  /**
   * 逆向: J9R._startAnimation (chunk-006.js:30276)
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
   * 逆向: J9R._stopAnimation (chunk-006.js:30282)
   */
  private _stopAnimation(): void {
    if (this._animationTimer) {
      clearInterval(this._animationTimer);
      this._animationTimer = undefined;
    }
  }

  /**
   * Build the toolbox tool widget.
   *
   * 逆向: J9R.build (chunk-006.js:30286)
   *
   * Key logic:
   *   A = name.replace(/^tb__/, "")  → stripped display name
   *   o = args entries formatted as "key: value" joined with ", "
   *   s = exitCode !== 0 check (non-zero exit)
   *   bullet color: s ? toolError : statusColor
   *   exit code suffix: " (exit code: N)" in italic
   *
   * Returns RichText({ text: TextSpan("", children: spans), selectable: true }).
   *
   * 逆向: return new xT({ text: new G("", void 0, n), selectable: !0 })
   */
  build(context: BuildContext): RichText {
    const { toolName, status, args, result, exitCode, error, progress } = this.widget.config;

    // Resolve AppTheme from context
    let appTheme: AppTheme | null = null;
    try {
      appTheme = AppThemeController.maybeOf(context as unknown as Element);
    } catch {
      // No AppThemeController in ancestor tree — use fallback colors
    }

    const statusColor = _getStatusColor(status, appTheme);
    const foreground = appTheme ? Color.default() : FALLBACK_FOREGROUND;
    const toolErrorColor = appTheme?.toolError ?? FALLBACK_ERROR;
    const toolCancelledColor = appTheme?.toolCancelled ?? FALLBACK_CANCELLED;

    // 逆向: A = R.name.replace(/^tb__/, "")
    const displayName = toolName.replace(/^tb__/, "");

    // 逆向: s = i === "done" && typeof a.result.exitCode === "number" && a.result.exitCode !== 0
    const hasNonZeroExit = status === "done" && typeof exitCode === "number" && exitCode !== 0;

    // 逆向: o = Object.entries(h).map(([p, _]) => `${p}: ${JSON.stringify(_)}`).join(", ")
    let argsStr = "";
    if (args && Object.keys(args).length > 0) {
      argsStr = Object.entries(args)
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join(", ");
    }

    const spans: TextSpan[] = [];

    // ── Header prefix: spinner or "• " bullet ────────────
    // 逆向: chunk-006.js:30303-30315
    if (status === "in-progress") {
      // 逆向: `n.push(new G(`${p} `, new cT({ color: c })))`
      spans.push(
        new TextSpan({
          text: `${this._spinner.toBraille()} `,
          style: new TextStyle({ foreground: statusColor }),
        }),
      );
    } else {
      // 逆向: `let p = new cT({ color: s ? t.app.toolError : c, bold: true })`
      //        `n.push(new G("• ", p))`
      spans.push(
        new TextSpan({
          text: "\u2022 ",
          style: new TextStyle({
            foreground: hasNonZeroExit ? toolErrorColor : statusColor,
            bold: true,
          }),
        }),
      );
    }

    // ── Tool name (bold) ─────────────────────────────────
    // 逆向: `n.push(new G(A, l))` where l = new cT({ color: r.foreground, bold: true })
    spans.push(
      new TextSpan({
        text: displayName,
        style: new TextStyle({ foreground, bold: true }),
      }),
    );

    // ── Args (dim) ───────────────────────────────────────
    // 逆向: `if (o) n.push(new G(" ", void 0)), n.push(new G(o, p))`
    //        p = new cT({ color: r.foreground, dim: true })
    if (argsStr) {
      spans.push(new TextSpan({ text: " " }));
      spans.push(
        new TextSpan({
          text: argsStr,
          style: new TextStyle({ foreground, dim: true }),
        }),
      );
    }

    // ── Exit code suffix ─────────────────────────────────
    // 逆向: chunk-006.js:30320-30330
    // `if (s) { let p = new cT({ italic: true })`
    //   `n.push(new G(" (", p)), n.push(new G("exit code: ", p))`
    //   `n.push(new G(String(a.result.exitCode), p.copyWith({ color: t.app.toolError })))`
    //   `n.push(new G(")", p)) }`
    if (hasNonZeroExit) {
      const italicStyle = new TextStyle({ italic: true });
      spans.push(new TextSpan({ text: " (", style: italicStyle }));
      spans.push(new TextSpan({ text: "exit code: ", style: italicStyle }));
      spans.push(
        new TextSpan({
          text: String(exitCode),
          style: new TextStyle({ foreground: toolErrorColor, italic: true }),
        }),
      );
      spans.push(new TextSpan({ text: ")", style: italicStyle }));
    }

    // ── Status suffix (rejected / cancelled) ─────────────
    // 逆向: chunk-006.js:30332-30338
    if (status === "rejected-by-user") {
      // 逆向: `n.push(new G(" (rejected)", new cT({ dim: true, italic: true })))`
      spans.push(
        new TextSpan({
          text: " (rejected)",
          style: new TextStyle({ dim: true, italic: true }),
        }),
      );
    } else if (status === "cancelled" || status === "cancellation-requested") {
      // 逆向: `n.push(new G(" (cancelled)", new cT({ color: t.app.toolCancelled, italic: true })))`
      spans.push(
        new TextSpan({
          text: " (cancelled)",
          style: new TextStyle({ foreground: toolCancelledColor, italic: true }),
        }),
      );
    }

    // ── Newline after header ─────────────────────────────
    // 逆向: `n.push(new G("\n"))`
    spans.push(new TextSpan({ text: "\n" }));

    // ── Body ─────────────────────────────────────────────
    // 逆向: chunk-006.js:30340-30351
    // `if (i === "error" && a.error.message) n.push(...)`
    // `else if (i === "done") n.push(...on(a.result.output, !0, r))`
    // `else if (i === "cancelled") n.push(...on(rx(e), !0, r))`
    // `else if (i === "in-progress") n.push(...on(rx(e), !1, r))`
    if (status === "error" && error) {
      // 逆向: `n.push(new G(`  Error: ${a.error.message}\n`, new cT({ color: t.app.toolError })))`
      spans.push(
        new TextSpan({
          text: `  Error: ${error}\n`,
          style: new TextStyle({ foreground: toolErrorColor }),
        }),
      );
    } else if (status === "done" && result) {
      spans.push(..._buildOutputSpans(result, foreground));
    } else if ((status === "cancelled" || status === "cancellation-requested") && progress) {
      const progressText = _extractProgress(progress);
      if (progressText) {
        spans.push(..._buildOutputSpans(progressText, foreground));
      }
    } else if (status === "in-progress" && progress) {
      const progressText = _extractProgress(progress);
      if (progressText) {
        spans.push(..._buildOutputSpans(progressText, foreground));
      }
    }

    return new RichText({
      text: new TextSpan({ children: spans }),
    });
  }
}
