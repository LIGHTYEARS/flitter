// border-builders.ts — Four border overlay builder functions for InputArea rich border.
//
// Each function produces a widget + textWidth for one of InputArea's four border positions.
// Used by the InputArea widget (or its parent) to populate the borderOverlayText array.
//
// Decision references:
//   D-04 — Top-left: context window usage percent + cost + elapsed
//   D-05 — Top-right: agent mode label + skill warning indicator + skill count
//   D-06 — Bottom-left: context-dependent status message (streaming/idle/etc.)
//   D-07 — Bottom-right: shortened cwd + git branch in dim foreground
//
// See MISSING-FEATURES.md §VIII for AMP golden format references.

import { Widget } from '../../../flitter-core/src/framework/widget';
import { Row } from '../../../flitter-core/src/widgets/flex';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { Color } from '../../../flitter-core/src/core/color';
import { MouseRegion } from '../../../flitter-core/src/widgets/mouse-region';
import type { CliTheme } from '../themes/theme-data';
import { agentModeColor } from '../themes';
import {
  formatTokenCount,
  formatElapsed,
  thresholdColor,
  shortenPath,
} from './border-helpers';

// ---------------------------------------------------------------------------
// Shared result type
// ---------------------------------------------------------------------------

/**
 * Return type for all border overlay builders.
 *
 * widget    — the overlay widget to render on the border line.
 * textWidth — approximate character width of the rendered text, used by InputArea
 *             to calculate gap sizes when painting gap-aware border segments.
 *             Computed with string.length (ASCII-safe for all content in these builders).
 *             Wide-character paths in buildBottomRightOverlay use string.length as a
 *             conservative estimate; terminal-accurate width requires wcwidth but the
 *             truncation in shortenPath keeps output within ASCII range in practice.
 */
export interface BorderOverlayResult {
  widget: Widget;
  textWidth: number;
}

// ---------------------------------------------------------------------------
// D-04 — buildTopLeftOverlay: context window usage
// ---------------------------------------------------------------------------

/**
 * Builds the top-left border overlay showing context window usage.
 *
 * Decision D-04 (BORDER-01, BORDER-07):
 *   - Returns null when hasConversation is false (idle, no conversation started).
 *   - Format: "{percent}% of {size}k" with thresholdColor applied to the percent.
 *   - When isProcessing and costUsd > 0: appends " · $X.XXXX" in dim mutedForeground.
 *   - When isProcessing and elapsedMs > 0: appends " · {elapsed}" in dim mutedForeground.
 *
 * @param opts.contextWindowPercent  - Usage as integer 0-100.
 * @param opts.contextWindowSize     - Context window size in tokens.
 * @param opts.costUsd               - Accumulated cost in USD (0 = omit).
 * @param opts.elapsedMs             - Elapsed milliseconds since turn start (0 = omit).
 * @param opts.isProcessing          - Whether a response is currently streaming.
 * @param opts.hasConversation       - Whether a conversation has been started.
 * @param opts.theme                 - Current CLI theme for color resolution.
 */
export function buildTopLeftOverlay(opts: {
  contextWindowPercent: number;
  contextWindowSize: number;
  costUsd: number;
  elapsedMs: number;
  isProcessing: boolean;
  hasConversation: boolean;
  theme: CliTheme;
  /** Shell mode status for border indicator ('shell', 'hidden', or null). */
  shellModeStatus?: 'shell' | 'hidden' | null;
}): BorderOverlayResult | null {
  // D-04: Return null when no conversation is active — idle state shows empty border.
  if (!opts.hasConversation && !opts.shellModeStatus) return null;

  const mutedColor = opts.theme.base.mutedForeground;

  // Build text segments and accumulate character count.
  const spans: TextSpan[] = [];
  let textWidth = 0;

  // Shell mode indicator prefix — AMP shows "shell mode" or "shell mode (incognito)"
  // on the top-left border overlay when active.
  if (opts.shellModeStatus) {
    const shellText = opts.shellModeStatus === 'hidden'
      ? 'shell mode (incognito)'
      : 'shell mode';
    const shellColor = opts.shellModeStatus === 'hidden'
      ? (opts.theme.app.shellModeHidden ?? Color.rgb(100, 100, 100))
      : (opts.theme.app.shellMode ?? Color.rgb(0, 200, 200));
    spans.push(new TextSpan({
      text: shellText,
      style: new TextStyle({ foreground: shellColor }),
    }));
    textWidth += shellText.length;

    // Separator before context usage if conversation is active
    if (opts.hasConversation) {
      const sep = ' \u00B7 ';
      spans.push(new TextSpan({
        text: sep,
        style: new TextStyle({ foreground: mutedColor, dim: true }),
      }));
      textWidth += sep.length;
    }
  }

  // Context usage portion — only when conversation is active
  if (opts.hasConversation) {
    const percent = opts.contextWindowPercent;
    const formattedSize = formatTokenCount(opts.contextWindowSize);
    const color = thresholdColor(percent);

    // "{percent}% of {size}" segment — percent colored by threshold.
    const percentText = `${percent}%`;
    const ofText = ` of ${formattedSize}`;
    spans.push(new TextSpan({
      text: percentText,
      style: new TextStyle({ foreground: color, dim: percent < 50 }),
    }));
    spans.push(new TextSpan({
      text: ofText,
      style: new TextStyle({ foreground: mutedColor, dim: true }),
    }));
    textWidth += percentText.length + ofText.length;

    // Optional cost segment — only shown when processing and cost is available.
    if (opts.isProcessing && opts.costUsd > 0) {
      const costText = ` \u00B7 $${opts.costUsd.toFixed(4)}`;
      spans.push(new TextSpan({
        text: costText,
        style: new TextStyle({ foreground: mutedColor, dim: true }),
      }));
      textWidth += costText.length;
    }

    // Optional elapsed segment — only shown when processing and elapsed is available.
    if (opts.isProcessing && opts.elapsedMs > 0) {
      const elapsedText = ` \u00B7 ${formatElapsed(opts.elapsedMs)}`;
      spans.push(new TextSpan({
        text: elapsedText,
        style: new TextStyle({ foreground: mutedColor, dim: true }),
      }));
      textWidth += elapsedText.length;
    }
  }

  if (spans.length === 0) return null;
  const widget = new Text({ text: new TextSpan({ children: spans }) });
  return { widget, textWidth };
}

// ---------------------------------------------------------------------------
// D-05 — buildTopRightOverlay: agent mode + skill count
// ---------------------------------------------------------------------------

/**
 * Builds the top-right border overlay showing agent mode and skill count.
 *
 * Decision D-05 (BORDER-02):
 *   - Format: "{mode}──{!}─{count}─skills"
 *   - mode in agentModeColor (smart → green, rush → gold, else foreground).
 *   - "──" separator in brightBlack (border dim color).
 *   - "!" warning indicator in theme.base.warning — omitted when skillWarningCount is 0.
 *   - "─" separator before skill count.
 *   - Skill count in theme.base.warning when warnings > 0, else theme.base.foreground.
 *   - "─" separator between count and label.
 *   - "skills" label in dim mutedForeground.
 *   - Skill count + "skills" section wrapped in MouseRegion for click handling (BORDER-02).
 *
 * @param opts.mode               - Current agent mode string (e.g. "smart", "rush").
 * @param opts.skillCount         - Total number of loaded skills.
 * @param opts.skillWarningCount  - Number of skills with warnings (0 = no warning indicator).
 * @param opts.onSkillCountClick  - Optional click callback on the skill count section.
 * @param opts.theme              - Current CLI theme for color resolution.
 */
export function buildTopRightOverlay(opts: {
  mode: string;
  skillCount: number;
  skillWarningCount: number;
  anthropicSpeed?: 'standard' | 'fast';
  openAISpeed?: 'standard' | 'fast';
  onSkillCountClick?: () => void;
  theme: CliTheme;
}): BorderOverlayResult {
  const mutedColor = opts.theme.base.mutedForeground;
  const borderDimColor = Color.brightBlack;
  const warningColor = opts.theme.base.warning;
  const modeColor = agentModeColor(opts.mode, opts.theme);
  const hasWarning = opts.skillWarningCount > 0;
  const skillColor = hasWarning ? warningColor : opts.theme.base.foreground;

  // AMP speed suffix logic: smart+anthropic.fast → "+fast(6x$)", deep/internal+openai.fast → "+fast(2x$)"
  const isAnthropicFast = opts.mode === 'smart' && opts.anthropicSpeed === 'fast';
  const isOpenAIFast = (opts.mode === 'deep' || opts.mode === 'internal') && opts.openAISpeed === 'fast';
  const speedSuffix = isAnthropicFast ? '+fast(6x$)' : isOpenAIFast ? '+fast(2x$)' : undefined;

  // Mode label segment — with optional speed suffix in warning color.
  const modeSpan = speedSuffix
    ? new Text({
        text: new TextSpan({
          children: [
            new TextSpan({ text: opts.mode, style: new TextStyle({ foreground: modeColor }) }),
            new TextSpan({ text: speedSuffix, style: new TextStyle({ foreground: warningColor }) }),
          ],
        }),
      })
    : new Text({
        text: new TextSpan({
          text: opts.mode,
          style: new TextStyle({ foreground: modeColor }),
        }),
      });

  // "──" separator after mode.
  const sep1Span = new Text({
    text: new TextSpan({
      text: '\u2500\u2500',
      style: new TextStyle({ foreground: borderDimColor }),
    }),
  });

  // Warning indicator "!" — only present when skillWarningCount > 0.
  const warningSpan = hasWarning ? new Text({
    text: new TextSpan({
      text: '!',
      style: new TextStyle({ foreground: warningColor }),
    }),
  }) : null;

  // "─" separator before skill count (always present).
  const sep2Span = new Text({
    text: new TextSpan({
      text: '\u2500',
      style: new TextStyle({ foreground: borderDimColor }),
    }),
  });

  // Skill count + "─" + "skills" — wrapped in MouseRegion for clickability.
  const countText = `${opts.skillCount}`;
  const countWidget = new Text({
    text: new TextSpan({
      text: countText,
      style: new TextStyle({ foreground: skillColor }),
    }),
  });

  const sep3Span = new Text({
    text: new TextSpan({
      text: '\u2500',
      style: new TextStyle({ foreground: borderDimColor }),
    }),
  });

  const skillsLabelWidget = new Text({
    text: new TextSpan({
      text: 'skills',
      style: new TextStyle({ foreground: mutedColor, dim: true }),
    }),
  });

  // Wrap skill count + separators + label in MouseRegion for BORDER-02 click handling.
  const clickableSection = new MouseRegion({
    onClick: opts.onSkillCountClick ? () => opts.onSkillCountClick!() : undefined,
    child: new Row({
      mainAxisSize: 'min',
      children: [countWidget, sep3Span, skillsLabelWidget],
    }),
  });

  // Compose all sections into a Row.
  const children: Widget[] = [modeSpan, sep1Span];
  if (warningSpan) children.push(warningSpan);
  children.push(sep2Span);
  children.push(clickableSection);

  const widget = new Row({ mainAxisSize: 'min', children });

  // Compute textWidth: mode + optional speedSuffix + "──" + optional "!" + "─" + count + "─" + "skills"
  let textWidth = opts.mode.length + (speedSuffix ? speedSuffix.length : 0) + 2; // mode + suffix + "──"
  if (hasWarning) textWidth += 1;        // "!"
  textWidth += 1;                        // "─"
  textWidth += countText.length;         // count digits
  textWidth += 1;                        // "─"
  textWidth += 6;                        // "skills"

  return { widget, textWidth };
}

// ---------------------------------------------------------------------------
// D-06 — buildBottomLeftOverlay: contextual status message
// ---------------------------------------------------------------------------

/**
 * Builds the bottom-left border overlay showing the current processing status.
 *
 * Decision D-06 (BORDER-03, BORDER-07):
 *   - Returns null when idle (no active processing state) — D-06: "Idle: empty".
 *   - Streaming (isStreaming): "Esc to cancel" — "Esc" in theme.app.keybind (blue),
 *     " to cancel" in dim mutedForeground. Per BORDER-07 keybind styling.
 *   - Interrupted: "Stream interrupted" in theme.base.warning (yellow).
 *   - ExecutingCommand: "Executing command..." in dim mutedForeground.
 *   - RunningShell: "Running shell..." in dim mutedForeground.
 *   - AutoCompacting: "Auto-compacting..." in dim mutedForeground.
 *   - HandingOff: "Handing off..." in dim mutedForeground.
 *   - Generic processing: "Streaming response..." in dim mutedForeground.
 *   - Optional statusMessage override: renders in dim mutedForeground.
 *
 * Priority order follows getFooterText() from border-helpers.ts but with
 * rich text rendering and special-cased "Esc to cancel" for streaming.
 *
 * @param opts.isProcessing       - Whether any processing is happening.
 * @param opts.isStreaming         - Whether actively streaming a response (shows Esc hint).
 * @param opts.isInterrupted       - Whether the stream was interrupted.
 * @param opts.isExecutingCommand  - Whether a tool command is executing.
 * @param opts.isRunningShell      - Whether a shell command is running.
 * @param opts.isAutoCompacting    - Whether auto-compaction is in progress.
 * @param opts.isHandingOff        - Whether handing off to a subagent.
 * @param opts.statusMessage       - Optional custom status message override.
 * @param opts.theme               - Current CLI theme for color resolution.
 */
export function buildBottomLeftOverlay(opts: {
  isProcessing: boolean;
  isStreaming: boolean;
  isInterrupted: boolean;
  isExecutingCommand: boolean;
  isRunningShell: boolean;
  isAutoCompacting: boolean;
  isHandingOff: boolean;
  statusMessage?: string;
  theme: CliTheme;
  /** 是否有正在运行或等待显示的 bash invocations。 */
  isRunningBashInvocations?: boolean;
  /** 是否正在确认取消处理（二次 Esc 确认状态）。 */
  isConfirmingCancelProcessing?: boolean;
}): BorderOverlayResult | null {
  const mutedColor = opts.theme.base.mutedForeground;
  const keybindColor = opts.theme.app.keybind;
  const warningColor = opts.theme.base.warning;

  // D-06: Interrupted state — yellow warning.
  if (opts.isInterrupted) {
    const text = 'Stream interrupted';
    return {
      widget: new Text({
        text: new TextSpan({
          text,
          style: new TextStyle({ foreground: warningColor }),
        }),
      }),
      textWidth: text.length,
    };
  }

  // AMP: isConfirmingCancelProcessing → "Esc again to cancel"（二次 Esc 确认取消）
  if (opts.isConfirmingCancelProcessing) {
    const escText = 'Esc';
    const cancelText = ' again to cancel';
    return {
      widget: new Text({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: escText,
              style: new TextStyle({ foreground: keybindColor }),
            }),
            new TextSpan({
              text: cancelText,
              style: new TextStyle({ foreground: mutedColor, dim: true }),
            }),
          ],
        }),
      }),
      textWidth: escText.length + cancelText.length,
    };
  }

  // D-06: Streaming — "Esc to cancel" with BORDER-07 keybind coloring.
  if (opts.isStreaming) {
    const escText = 'Esc';
    const cancelText = ' to cancel';
    return {
      widget: new Text({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: escText,
              style: new TextStyle({ foreground: keybindColor }),
            }),
            new TextSpan({
              text: cancelText,
              style: new TextStyle({ foreground: mutedColor, dim: true }),
            }),
          ],
        }),
      }),
      textWidth: escText.length + cancelText.length,
    };
  }

  // D-06: Executing command sub-state.
  if (opts.isExecutingCommand) {
    const text = 'Executing command...';
    return {
      widget: new Text({
        text: new TextSpan({
          text,
          style: new TextStyle({ foreground: mutedColor, dim: true }),
        }),
      }),
      textWidth: text.length,
    };
  }

  // D-06: Running shell sub-state.
  if (opts.isRunningShell) {
    const text = 'Running shell...';
    return {
      widget: new Text({
        text: new TextSpan({
          text,
          style: new TextStyle({ foreground: mutedColor, dim: true }),
        }),
      }),
      textWidth: text.length,
    };
  }

  // AMP: bash invocations 运行中且非 streaming 时显示 "Esc to cancel"
  if (opts.isRunningBashInvocations && !opts.isStreaming) {
    const escText = 'Esc';
    const cancelText = ' to cancel';
    return {
      widget: new Text({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: escText,
              style: new TextStyle({ foreground: keybindColor }),
            }),
            new TextSpan({
              text: cancelText,
              style: new TextStyle({ foreground: mutedColor, dim: true }),
            }),
          ],
        }),
      }),
      textWidth: escText.length + cancelText.length,
    };
  }

  // D-06: Auto-compacting sub-state.
  if (opts.isAutoCompacting) {
    const text = 'Auto-compacting...';
    return {
      widget: new Text({
        text: new TextSpan({
          text,
          style: new TextStyle({ foreground: mutedColor, dim: true }),
        }),
      }),
      textWidth: text.length,
    };
  }

  // D-06: Handing off sub-state.
  if (opts.isHandingOff) {
    const text = 'Handing off...';
    return {
      widget: new Text({
        text: new TextSpan({
          text,
          style: new TextStyle({ foreground: mutedColor, dim: true }),
        }),
      }),
      textWidth: text.length,
    };
  }

  // Generic processing (isProcessing but none of the above sub-states).
  if (opts.isProcessing) {
    const text = 'Streaming response...';
    return {
      widget: new Text({
        text: new TextSpan({
          text,
          style: new TextStyle({ foreground: mutedColor, dim: true }),
        }),
      }),
      textWidth: text.length,
    };
  }

  // Optional custom status message override (e.g. tool result, copy highlight).
  if (opts.statusMessage) {
    return {
      widget: new Text({
        text: new TextSpan({
          text: opts.statusMessage,
          style: new TextStyle({ foreground: mutedColor, dim: true }),
        }),
      }),
      textWidth: opts.statusMessage.length,
    };
  }

  // D-06: Idle — return null (no overlay, empty border segment).
  return null;
}

// ---------------------------------------------------------------------------
// D-07 — buildBottomRightOverlay: cwd + git branch
// ---------------------------------------------------------------------------

/**
 * Builds the bottom-right border overlay showing the working directory and git branch.
 *
 * Decision D-07 (BORDER-04):
 *   - Format: "{shortenedCwd} ({gitBranch})" when branch is set.
 *   - Format: "{shortenedCwd}" when no branch is available.
 *   - shortenPath(cwd) replaces HOME prefix with "~" and truncates long paths from left.
 *   - All text in dim theme.base.mutedForeground — matches AMP's golden dim cwd display.
 *
 * @param opts.cwd        - Absolute current working directory path.
 * @param opts.gitBranch  - Optional git branch name (omitted from output when undefined).
 * @param opts.theme      - Current CLI theme for color resolution.
 */
export function buildBottomRightOverlay(opts: {
  cwd: string;
  gitBranch?: string;
  theme: CliTheme;
}): BorderOverlayResult {
  const mutedColor = opts.theme.base.mutedForeground;
  const shortened = shortenPath(opts.cwd);
  const displayText = opts.gitBranch
    ? `${shortened} (${opts.gitBranch})`
    : shortened;

  const widget = new Text({
    text: new TextSpan({
      text: displayText,
      style: new TextStyle({ foreground: mutedColor, dim: true }),
    }),
  });

  // textWidth uses string.length — ASCII-safe since shortenPath truncates to 40 chars max
  // using only ASCII "..." prefix and HOME-replaced "~" path separator.
  return { widget, textWidth: displayText.length };
}
