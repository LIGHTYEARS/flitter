// HeaderBar — streaming status display above InputArea.
//
// Shows contextual streaming information:
//   - Processing/Streaming: WaveSpinner + token usage % + cost + elapsed
//   - Streaming (no usage data): WaveSpinner + "Streaming..." (dim)
//   - Interrupted: "⚠ Response interrupted" (yellow)
//   - Idle: SizedBox height:1 (empty row preserving layout)
//
// Ported from flitter-amp's BottomGrid.buildTopLeft() + formatUsageDisplay().
// Phase 20-03 will wire theme colors via CliThemeProvider.

import { StatelessWidget, Widget } from '../../../flitter-core/src/framework/widget';
import { Row } from '../../../flitter-core/src/widgets/flex';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { Color } from '../../../flitter-core/src/core/color';
import { Padding } from '../../../flitter-core/src/widgets/padding';
import { EdgeInsets } from '../../../flitter-core/src/layout/edge-insets';
import { SizedBox } from '../../../flitter-core/src/widgets/sized-box';
import { WaveSpinner } from '../../../flitter-core/src/widgets/wave-spinner';
import type { UsageInfo } from '../state/types';

// ---------------------------------------------------------------------------
// Module-level helpers
// ---------------------------------------------------------------------------

/**
 * Auto-scale a token count to k/M with 1 decimal place.
 * Returns a compact human-readable string (e.g. "1.2k", "3.5M", "42").
 */
export function formatTokenCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}k`;
  }
  return `${count}`;
}

/**
 * Formats elapsed milliseconds into a compact duration string.
 * <60s → "12s", ≥60s → "1m 23s", ≥3600s → "1h 2m".
 */
export function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min < 60) return `${min}m ${sec}s`;
  const hr = Math.floor(min / 60);
  const remainMin = min % 60;
  return `${hr}h ${remainMin}m`;
}

/**
 * Returns threshold color for context window usage percentage.
 * <50% → blue (dim), 50-80% → yellow, >80% → red.
 */
export function thresholdColor(percent: number): Color {
  if (percent > 80) return Color.red;
  if (percent >= 50) return Color.yellow;
  return Color.blue;
}

// ---------------------------------------------------------------------------
// HeaderBar Props
// ---------------------------------------------------------------------------

export interface HeaderBarProps {
  isProcessing: boolean;
  isInterrupted: boolean;
  tokenUsage: UsageInfo | null;
  costUsd: number;
  elapsedMs: number;
  contextWindowUsagePercent?: number;
}

// ---------------------------------------------------------------------------
// HeaderBar Widget
// ---------------------------------------------------------------------------

/**
 * Streaming status header displayed above InputArea.
 *
 * During streaming with token usage: WaveSpinner + "XX% of YYk · $0.0012 · 3s"
 * During streaming without usage: WaveSpinner + "Streaming..." (dim)
 * When interrupted: "⚠ Response interrupted" (yellow)
 * When idle: SizedBox height:1 (preserves layout spacing)
 */
export class HeaderBar extends StatelessWidget {
  private readonly isProcessing: boolean;
  private readonly isInterrupted: boolean;
  private readonly tokenUsage: UsageInfo | null;
  private readonly costUsd: number;
  private readonly elapsedMs: number;
  private readonly contextWindowUsagePercent: number | undefined;

  constructor(props: HeaderBarProps) {
    super({});
    this.isProcessing = props.isProcessing;
    this.isInterrupted = props.isInterrupted;
    this.tokenUsage = props.tokenUsage;
    this.costUsd = props.costUsd;
    this.elapsedMs = props.elapsedMs;
    this.contextWindowUsagePercent = props.contextWindowUsagePercent;
  }

  build(): Widget {
    const mutedColor = Color.brightBlack;

    if (this.isInterrupted) {
      return new Padding({
        padding: EdgeInsets.symmetric({ horizontal: 1 }),
        child: new Text({
          text: new TextSpan({
            children: [
              new TextSpan({
                text: '⚠ ',
                style: new TextStyle({ foreground: Color.yellow }),
              }),
              new TextSpan({
                text: 'Response interrupted',
                style: new TextStyle({ foreground: Color.yellow }),
              }),
            ],
          }),
        }),
      });
    }

    if (this.isProcessing) {
      const streamingLabel = this.contextWindowUsagePercent && this.contextWindowUsagePercent > 80
        ? `Streaming... (context: ${this.contextWindowUsagePercent}%)`
        : 'Streaming...';

      const statusText = this.tokenUsage
        ? this.formatUsageDisplay(mutedColor)
        : new Text({
            text: new TextSpan({
              text: streamingLabel,
              style: new TextStyle({ foreground: mutedColor, dim: true }),
            }),
          });

      return new Padding({
        padding: EdgeInsets.symmetric({ horizontal: 1 }),
        child: new Row({
          mainAxisSize: 'min',
          children: [
            new WaveSpinner(),
            new Text({
              text: new TextSpan({
                text: ' ',
                style: new TextStyle({ foreground: mutedColor }),
              }),
            }),
            statusText,
          ],
        }),
      });
    }

    return new SizedBox({ height: 1 });
  }

  /**
   * Formats token usage into a rich Text widget with threshold coloring.
   * Format: "{percent}% of {formatted}k · ${cost} · {elapsed}"
   */
  private formatUsageDisplay(mutedColor: Color): Widget {
    const usage = this.tokenUsage!;
    const used = usage.used;
    const size = usage.size;
    const percent = size > 0 ? Math.round((used / size) * 100) : 0;
    const formattedSize = formatTokenCount(size);
    const color = thresholdColor(percent);

    const spans: TextSpan[] = [];

    spans.push(new TextSpan({
      text: `${percent}%`,
      style: new TextStyle({ foreground: color, dim: percent < 50 }),
    }));

    spans.push(new TextSpan({
      text: ` of ${formattedSize}`,
      style: new TextStyle({ foreground: mutedColor, dim: true }),
    }));

    const cost = this.costUsd || (usage.cost?.amount ?? 0);
    if (cost > 0) {
      const currency = usage.cost?.currency ?? '$';
      spans.push(new TextSpan({
        text: ` · ${currency}${cost.toFixed(4)}`,
        style: new TextStyle({ foreground: mutedColor, dim: true }),
      }));
    }

    if (this.elapsedMs > 0) {
      spans.push(new TextSpan({
        text: ` · ${formatElapsed(this.elapsedMs)}`,
        style: new TextStyle({ foreground: mutedColor, dim: true }),
      }));
    }

    return new Text({
      text: new TextSpan({ children: spans }),
    });
  }
}
