// ContextDetailOverlay — Token breakdown overlay for context window usage
//
// Matches AMP's isShowingContextDetailOverlay pattern.
// Shown when clicking the context percentage in the input area border.
// Displays token usage breakdown, progress bar, and cost information.
//
// Key bindings:
//   Escape → dismiss overlay
//
// Modal overlay at CONTEXT_DETAIL priority (50).

import { StatelessWidget, Widget, type BuildContext } from '../../../flitter-core/src/framework/widget';
import { Column, Row } from '../../../flitter-core/src/widgets/flex';
import { Container } from '../../../flitter-core/src/widgets/container';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { Color } from '../../../flitter-core/src/core/color';
import { FocusScope } from '../../../flitter-core/src/widgets/focus-scope';
import { BoxDecoration, Border, BorderSide } from '../../../flitter-core/src/layout/render-decorated';
import { EdgeInsets } from '../../../flitter-core/src/layout/edge-insets';
import { SizedBox } from '../../../flitter-core/src/widgets/sized-box';
import { Center } from '../../../flitter-core/src/widgets/center';
import { BoxConstraints } from '../../../flitter-core/src/core/box-constraints';
import type { KeyEvent, KeyEventResult } from '../../../flitter-core/src/input/events';
import type { UsageInfo } from '../state/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/** Props for the ContextDetailOverlay widget. */
interface ContextDetailOverlayProps {
  /** Current token usage data (may be null if no data yet). */
  usage: UsageInfo | null;
  /** Context window usage percentage (0-100). */
  contextWindowPercent: number;
  /** Callback to dismiss the overlay. */
  onDismiss: () => void;
}

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const BORDER_COLOR = Color.cyan;
const LABEL_COLOR = Color.brightBlack;
const VALUE_COLOR = Color.white;
const MUTED_COLOR = Color.brightBlack;
const KEYBIND_COLOR = Color.blue;
const BAR_FILL_LOW = Color.green;
const BAR_FILL_HIGH = Color.yellow;
const BAR_FILL_CRITICAL = Color.red;
const BAR_EMPTY = Color.brightBlack;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a token count with commas for readability.
 */
function formatTokens(n: number): string {
  return n.toLocaleString('en-US');
}

/**
 * Build a text-based progress bar for the context window fill level.
 * Returns TextSpan children representing the bar.
 */
function buildProgressBar(percent: number, width: number): TextSpan[] {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;

  let fillColor: Color;
  if (percent > 80) fillColor = BAR_FILL_CRITICAL;
  else if (percent > 50) fillColor = BAR_FILL_HIGH;
  else fillColor = BAR_FILL_LOW;

  return [
    new TextSpan({
      text: '\u2588'.repeat(filled),
      style: new TextStyle({ foreground: fillColor }),
    }),
    new TextSpan({
      text: '\u2591'.repeat(empty),
      style: new TextStyle({ foreground: BAR_EMPTY }),
    }),
    new TextSpan({
      text: ` ${percent.toFixed(1)}%`,
      style: new TextStyle({ foreground: VALUE_COLOR }),
    }),
  ];
}

// ---------------------------------------------------------------------------
// ContextDetailOverlay
// ---------------------------------------------------------------------------

/**
 * Context detail overlay showing token usage breakdown.
 *
 * Matches AMP's isShowingContextDetailOverlay state field.
 * Displays input/output token counts, progress bar, and cost.
 *
 * Layout:
 *   FocusScope (autofocus, absorbs all keys)
 *     Center
 *       Container (bordered cyan, padded, maxWidth: 50)
 *         Column
 *           "Context Window" title
 *           Progress bar
 *           Token breakdown rows
 *           Cost row (if available)
 *           Footer hints
 */
export class ContextDetailOverlay extends StatelessWidget {
  private readonly usage: UsageInfo | null;
  private readonly contextWindowPercent: number;
  private readonly onDismiss: () => void;

  constructor(props: ContextDetailOverlayProps) {
    super({});
    this.usage = props.usage;
    this.contextWindowPercent = props.contextWindowPercent;
    this.onDismiss = props.onDismiss;
  }

  build(_context: BuildContext): Widget {
    const side = new BorderSide({
      color: BORDER_COLOR,
      width: 1,
      style: 'rounded',
    });

    const usage = this.usage;
    const children: Widget[] = [];

    // Title
    children.push(
      new Text({
        text: new TextSpan({
          text: 'Context Window',
          style: new TextStyle({ foreground: BORDER_COLOR, bold: true }),
        }),
      }),
    );
    children.push(new SizedBox({ height: 1 }));

    // Progress bar
    children.push(
      new Text({
        text: new TextSpan({
          children: buildProgressBar(this.contextWindowPercent, 30),
        }),
      }),
    );
    children.push(new SizedBox({ height: 1 }));

    if (usage) {
      // Token usage rows
      const rows: [string, string][] = [
        ['Used', `${formatTokens(usage.used)} / ${formatTokens(usage.size)}`],
      ];

      if (usage.inputTokens !== undefined) {
        rows.push(['Input tokens', formatTokens(usage.inputTokens)]);
      }
      if (usage.outputTokens !== undefined) {
        rows.push(['Output tokens', formatTokens(usage.outputTokens)]);
      }

      for (const [label, value] of rows) {
        children.push(
          new Row({
            children: [
              new Text({
                text: new TextSpan({
                  text: `${label}: `,
                  style: new TextStyle({ foreground: LABEL_COLOR }),
                }),
              }),
              new Text({
                text: new TextSpan({
                  text: value,
                  style: new TextStyle({ foreground: VALUE_COLOR }),
                }),
              }),
            ],
          }),
        );
      }

      // Cost row
      if (usage.cost) {
        children.push(new SizedBox({ height: 1 }));
        children.push(
          new Row({
            children: [
              new Text({
                text: new TextSpan({
                  text: 'Cost: ',
                  style: new TextStyle({ foreground: LABEL_COLOR }),
                }),
              }),
              new Text({
                text: new TextSpan({
                  text: `${usage.cost.currency}${usage.cost.amount.toFixed(4)}`,
                  style: new TextStyle({ foreground: VALUE_COLOR }),
                }),
              }),
            ],
          }),
        );
      }
    } else {
      children.push(
        new Text({
          text: new TextSpan({
            text: 'No usage data available',
            style: new TextStyle({ foreground: MUTED_COLOR }),
          }),
        }),
      );
    }

    // Footer
    children.push(new SizedBox({ height: 1 }));
    children.push(
      new Text({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: 'Esc',
              style: new TextStyle({ foreground: KEYBIND_COLOR }),
            }),
            new TextSpan({
              text: ' close',
              style: new TextStyle({ foreground: MUTED_COLOR, dim: true }),
            }),
          ],
        }),
      }),
    );

    return new FocusScope({
      autofocus: true,
      onKey: (event: KeyEvent): KeyEventResult => {
        if (event.key === 'Escape') {
          this.onDismiss();
          return 'handled';
        }
        // Absorb all keys while overlay is shown
        return 'handled';
      },
      child: new Center({
        child: new Container({
          decoration: new BoxDecoration({ border: Border.all(side) }),
          padding: EdgeInsets.symmetric({ horizontal: 2, vertical: 1 }),
          constraints: new BoxConstraints({ maxWidth: 50 }),
          child: new Column({
            mainAxisSize: 'min',
            crossAxisAlignment: 'start',
            children,
          }),
        }),
      }),
    });
  }
}
