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
 * @property state - Live StatusBarState driving the status bar content
 */
export interface StatusBarConfig {
  /** Live state for the status bar */
  state: StatusBarState;
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
//  StatusBar Widget
// ════════════════════════════════════════════════════

/**
 * StatusBar -- live status bar widget.
 *
 * Layout: [model name] [spacer] [status message?] [spacer] [token count]
 *
 * Status message color is context-aware:
 * - Danger threshold → DANGER_COLOR (#f7768e), bold
 * - Warning threshold → WARNING_COLOR (#e0af68)
 * - Normal → MUTED_TEXT_COLOR (#565f89)
 *
 * 逆向: amp-cli-reversed/modules/2731_unknown_yB.js
 */
export class StatusBar extends StatelessWidget {
  /** Widget 配置 */
  readonly config: StatusBarConfig;

  /**
   * 创建 StatusBar。
   *
   * @param config - 状态栏配置
   */
  constructor(config: StatusBarConfig) {
    super();
    this.config = config;
  }

  /**
   * 构建子 Widget 树。
   *
   * Layout: Padding > Row:
   * - Left: model name (RichText, muted color)
   * - Spacer (Expanded)
   * - Center: optional status message (colored by severity)
   * - Spacer (Expanded)
   * - Right: token count (RichText, muted color)
   *
   * @param _context - 构建上下文
   * @returns Widget 树
   */
  build(_context: BuildContext): Widget {
    const { state } = this.config;

    const mutedStyle = new TextStyle({
      foreground: MUTED_TEXT_COLOR,
    });

    // Derive status message and its style
    const statusMessage = deriveStatusMessage(state);
    const statusStyle = this._statusStyle(state);

    // Calculate total token count for display
    const totalTokens = state.tokenUsage.inputTokens + state.tokenUsage.outputTokens;

    const children: Widget[] = [
      // Left: model name
      new RichText({
        text: new TextSpan({
          text: state.modelName,
          style: mutedStyle,
        }),
      }),
      // Left spacer
      new Expanded({
        child: new SizedBox({ width: 0, height: 1 }),
      }),
    ];

    // Center: optional status message
    if (statusMessage !== null) {
      children.push(
        new RichText({
          text: new TextSpan({
            text: statusMessage,
            style: statusStyle,
          }),
        }),
      );
      // Right spacer (only needed if we have a center message)
      children.push(
        new Expanded({
          child: new SizedBox({ width: 0, height: 1 }),
        }),
      );
    }

    // Right: token count
    children.push(
      new RichText({
        text: new TextSpan({
          text: `${totalTokens} tokens`,
          style: mutedStyle,
        }),
      }),
    );

    return new Padding({
      padding: EdgeInsets.symmetric({ horizontal: 2 }),
      child: new Row({ children }),
    });
  }

  /**
   * Determine the TextStyle for the status message based on context severity.
   *
   * 逆向: amp context threshold coloring from yB() result types
   */
  private _statusStyle(state: StatusBarState): TextStyle {
    const { inputTokens, maxInputTokens } = state.tokenUsage;

    if (maxInputTokens > 0) {
      const ratio = inputTokens / maxInputTokens;

      if (ratio >= CONTEXT_DANGER) {
        return new TextStyle({
          foreground: DANGER_COLOR,
          bold: true,
        });
      }
      if (ratio >= CONTEXT_WARNING) {
        return new TextStyle({
          foreground: WARNING_COLOR,
        });
      }
    }

    return new TextStyle({
      foreground: MUTED_TEXT_COLOR,
    });
  }
}
