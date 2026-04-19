/**
 * StatusBar -- 状态栏 StatelessWidget with live state rendering。
 *
 * Renders model name (left), status message (center), and token count (right).
 * Single-line height with mutedText (#565f89), warning (#e0af68), and
 * danger (#f7768e) colors on a surface (#1a1b26) background.
 *
 * 逆向参考: amp-cli-reversed/modules/2731_unknown_yB.js (yB status state machine)
 *           amp-cli-reversed/modules/2730_unknown_GN0.js (GN0/KN0 context thresholds)
 *
 * @module
 */

import type { BuildContext, Widget } from "@flitter/tui";
import {
  Color,
  Column,
  EdgeInsets,
  Expanded,
  Padding,
  RichText,
  Row,
  SizedBox,
  StatelessWidget,
  TextSpan,
  TextStyle,
} from "@flitter/tui";

// ════════════════════════════════════════════════════
//  StatusBarState model
// ════════════════════════════════════════════════════

/**
 * Live state for the status bar.
 *
 * Matches the state signals consumed by amp's yB() status state machine
 * (amp-cli-reversed/modules/2731_unknown_yB.js).
 */
export interface StatusBarState {
  /** Current model display name */
  modelName: string;
  /** Inference lifecycle: idle → running → cancelled */
  inferenceState: "idle" | "running" | "cancelled";
  /** Whether the LLM has begun emitting tokens for the current turn */
  hasStartedStreaming: boolean;
  /** Token usage counters for context-window warnings */
  tokenUsage: { inputTokens: number; outputTokens: number; maxInputTokens: number };
  /** Compaction lifecycle: idle → compacting */
  compactionState: "idle" | "compacting";
  /** Number of tools currently executing */
  runningToolCount: number;
  /** Whether the agent is blocked waiting for user tool-approval */
  waitingForApproval: boolean;
}

// ════════════════════════════════════════════════════
//  Context-window thresholds
// ════════════════════════════════════════════════════

/**
 * Context ratio thresholds for status messages.
 *
 * Simplified from amp's GN0() which varies thresholds by maxInputTokens.
 * We use fixed values that correspond to the mid-tier (400k-900k) bracket.
 *
 * 逆向: amp-cli-reversed/modules/2730_unknown_GN0.js
 */
export const CONTEXT_RECOMMENDATION = 0.6;
export const CONTEXT_WARNING = 0.8;
export const CONTEXT_DANGER = 0.9;

// ════════════════════════════════════════════════════
//  deriveStatusMessage — priority-ordered state machine
// ════════════════════════════════════════════════════

/**
 * Derive the center status message from current state.
 *
 * Priority chain matches amp's yB() (amp-cli-reversed/modules/2731_unknown_yB.js):
 *   compacting → approval → tools (N>1 / N=1) → running+!streaming →
 *   running+streaming → cancelled → context danger → warning → recommendation → null
 *
 * @param state - Current StatusBarState
 * @returns Status message string, or null when nothing to show
 */
export function deriveStatusMessage(state: StatusBarState): string | null {
  // 1. Compaction takes highest priority (amp line 43-46)
  if (state.compactionState === "compacting") {
    return "Auto-compacting...";
  }

  // 2. Waiting for user approval (amp line 54-57)
  if (state.waitingForApproval) {
    return "Waiting for approval...";
  }

  // 3. Tools running — count matters (amp line 62-71)
  if (state.runningToolCount > 1) {
    return `Running ${state.runningToolCount} tools...`;
  }
  if (state.runningToolCount === 1) {
    return "Running tools...";
  }

  // 4. Inference running — streaming vs waiting (amp line 77-89)
  if (state.inferenceState === "running") {
    if (!state.hasStartedStreaming) {
      return "Waiting for response...";
    }
    return "Streaming response...";
  }

  // 5. Cancelled (amp line 91-95)
  if (state.inferenceState === "cancelled") {
    return "Cancelled";
  }

  // 6. Idle context warnings (amp line 96-117, KN0/GN0)
  const { inputTokens, maxInputTokens } = state.tokenUsage;
  if (maxInputTokens > 0) {
    const ratio = inputTokens / maxInputTokens;
    if (ratio >= CONTEXT_DANGER) {
      return "Context near full.";
    }
    if (ratio >= CONTEXT_WARNING) {
      return "High context usage.";
    }
    if (ratio >= CONTEXT_RECOMMENDATION) {
      return "Optimize context.";
    }
  }

  // 7. Nothing to show
  return null;
}

// ════════════════════════════════════════════════════
//  StatusBarConfig
// ════════════════════════════════════════════════════

/**
 * StatusBar configuration.
 *
 * Core: `state` drives the status message state machine and token counts.
 * Extended: cost, context percent, mode, skills, cwd for amp-style bordered layout.
 *
 * 逆向: chunk-006.js:37696-37768 (prompt bar overlay composition)
 */
export interface StatusBarConfig {
  /** Live state for the status bar */
  state: StatusBarState;
  /** Estimated USD cost for the session (null if unknown)
   * 逆向: chunk-004.js:24684-24703 (AP cost formatting) */
  estimatedUSD?: number | null;
  /** Context window usage as percentage 0-100 (null if unknown) */
  contextWindowPercent?: number | null;
  /** Maximum context window tokens (for shorthand display, e.g., 300000)
   * 逆向: chunk-004.js:24704-24708 (XM token formatting) */
  contextWindowMax?: number | null;
  /** Active mode name (e.g., "smart", "fast") */
  modeName?: string;
  /** Number of available skills
   * 逆向: chunk-006.js:37846-37867 (skills count in prompt bar) */
  skillCount?: number;
  /** Current working directory display string
   * 逆向: chunk-006.js:37949-37963 (bottom-right cwd + git branch) */
  cwdDisplay?: string;
  /** Git branch name */
  gitBranch?: string;
}

// ════════════════════════════════════════════════════
//  颜色常量
// ════════════════════════════════════════════════════

/** mutedText 色 (#565f89) */
const MUTED_TEXT_COLOR = Color.rgb(0x56, 0x5f, 0x89);

/** surface 色 (#1a1b26) -- 状态栏背景 */
const _SURFACE_COLOR = Color.rgb(0x1a, 0x1b, 0x26);

/** Warning color (#e0af68) -- Tokyo Night warning/amber */
const WARNING_COLOR = Color.rgb(0xe0, 0xaf, 0x68);

/** Danger color (#f7768e) -- Tokyo Night error/danger red */
const DANGER_COLOR = Color.rgb(0xf7, 0x76, 0x8e);

// ════════════════════════════════════════════════════
//  Helpers: formatTokenCount, formatCostUSD
// ════════════════════════════════════════════════════

/**
 * Format a token count into a human-readable shorthand.
 *
 * 逆向: chunk-004.js:24704-24708 (XM function)
 */
export function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return n.toString();
}

/**
 * Format a USD cost for display.
 *
 * 逆向: chunk-004.js:24684-24703 (AP function, simplified)
 */
function formatCostUSD(usd: number): string {
  if (usd % 1 === 0) return `$${usd}`;
  return `$${usd.toFixed(2)}`;
}

// ════════════════════════════════════════════════════
//  StatusBar Widget
// ════════════════════════════════════════════════════

/**
 * StatusBar -- amp-style box-drawing bordered status bar.
 *
 * Top row:  ╭─{percent}% of {maxTokens} · ${cost}──...──{mode}──!─{skills}─skills─╮
 * Middle:   │ {modelName}  {statusMessage}  {tokenCount} tokens │
 * Bottom:   ╰──...──{cwdDisplay} ({gitBranch})─╯
 *
 * 逆向: chunk-006.js:37696-37768 (prompt bar overlay composition)
 * 逆向: chunk-006.js:36749-36759 (buildDisplayText for cwd + branch)
 * 逆向: amp-cli-reversed/modules/2731_unknown_yB.js (status state machine)
 */
export class StatusBar extends StatelessWidget {
  /** Widget 配置 */
  readonly config: StatusBarConfig;

  constructor(config: StatusBarConfig) {
    super();
    this.config = config;
  }

  build(_context: BuildContext): Widget {
    const { state, estimatedUSD, contextWindowPercent, contextWindowMax, modeName, skillCount, cwdDisplay, gitBranch } =
      this.config;

    const mutedStyle = new TextStyle({ foreground: MUTED_TEXT_COLOR });
    const borderStyle = new TextStyle({ foreground: MUTED_TEXT_COLOR });

    // ── Derive status message from state machine ──
    const statusMessage = deriveStatusMessage(state);
    const statusStyle = this._statusStyle(state);
    const totalTokens = state.tokenUsage.inputTokens + state.tokenUsage.outputTokens;

    // ── Context color based on threshold ──
    // 逆向: chunk-006.js:23585-23586
    const pct = contextWindowPercent ?? null;
    let contextColor = MUTED_TEXT_COLOR;
    if (pct !== null) {
      if (pct > 95) contextColor = DANGER_COLOR;
      else if (pct > 80) contextColor = WARNING_COLOR;
    }
    const contextStyle = new TextStyle({ foreground: contextColor });

    // ── Top border left segment: "{percent}% of {max} · ${cost}" ──
    // 逆向: chunk-004.js:24704-24708 (XM), chunk-004.js:24684-24703 (AP)
    let leftSegment = "";
    if (pct !== null && contextWindowMax != null) {
      leftSegment = `${Math.round(pct)}% of ${formatTokenCount(contextWindowMax)}`;
      if (estimatedUSD != null) {
        leftSegment += ` \u00B7 ${formatCostUSD(estimatedUSD)}`;
      }
    }

    // ── Top border right segment: "{mode}──!─{skills}─skills" ──
    // 逆向: chunk-006.js:37846-37867
    let rightSegment = "";
    if (modeName) {
      rightSegment = modeName;
      if (skillCount != null && skillCount >= 0) {
        rightSegment += `\u2500\u2500!\u2500${skillCount}\u2500${skillCount === 1 ? "skill" : "skills"}`;
      }
    }

    // ── Bottom-right: "{cwd} ({branch})" ──
    // 逆向: chunk-006.js:37949-37963, 36749-36759
    let bottomRight = "";
    if (cwdDisplay) {
      bottomRight = cwdDisplay;
      if (gitBranch) bottomRight += ` (${gitBranch})`;
    } else if (gitBranch) {
      bottomRight = `(${gitBranch})`;
    }

    // ── Top border row ──
    const topRow = new Row({
      children: [
        new RichText({
          text: new TextSpan({
            text: `\u256D\u2500${leftSegment}`,
            style: leftSegment ? contextStyle : borderStyle,
          }),
        }),
        new Expanded({ child: new RichText({ text: new TextSpan({ text: "\u2500", style: borderStyle }) }) }),
        new RichText({
          text: new TextSpan({ text: `${rightSegment}\u2500\u256E`, style: borderStyle }),
        }),
      ],
    });

    // ── Middle content row ──
    const middleChildren: Widget[] = [
      new RichText({ text: new TextSpan({ text: "\u2502 ", style: borderStyle }) }),
      new RichText({ text: new TextSpan({ text: state.modelName, style: mutedStyle }) }),
      new Expanded({ child: new SizedBox({ width: 0, height: 1 }) }),
    ];
    if (statusMessage !== null) {
      middleChildren.push(new RichText({ text: new TextSpan({ text: statusMessage, style: statusStyle }) }));
      middleChildren.push(new Expanded({ child: new SizedBox({ width: 0, height: 1 }) }));
    }
    middleChildren.push(new RichText({ text: new TextSpan({ text: `${totalTokens} tokens`, style: mutedStyle }) }));
    middleChildren.push(new RichText({ text: new TextSpan({ text: " \u2502", style: borderStyle }) }));
    const middleRow = new Row({ children: middleChildren });

    // ── Bottom border row ──
    const bottomRow = new Row({
      children: [
        new RichText({ text: new TextSpan({ text: "\u2570\u2500", style: borderStyle }) }),
        new Expanded({ child: new RichText({ text: new TextSpan({ text: "\u2500", style: borderStyle }) }) }),
        new RichText({
          text: new TextSpan({
            text: bottomRight ? `${bottomRight}\u2500\u256F` : "\u256F",
            style: mutedStyle,
          }),
        }),
      ],
    });

    return new Column({ mainAxisSize: "min", children: [topRow, middleRow, bottomRow] as Widget[] });
  }

  /**
   * Determine the TextStyle for the status message based on context severity.
   * 逆向: amp context threshold coloring from yB() result types
   */
  private _statusStyle(state: StatusBarState): TextStyle {
    const { inputTokens, maxInputTokens } = state.tokenUsage;
    if (maxInputTokens > 0) {
      const ratio = inputTokens / maxInputTokens;
      if (ratio >= CONTEXT_DANGER) return new TextStyle({ foreground: DANGER_COLOR, bold: true });
      if (ratio >= CONTEXT_WARNING) return new TextStyle({ foreground: WARNING_COLOR });
    }
    return new TextStyle({ foreground: MUTED_TEXT_COLOR });
  }
}
