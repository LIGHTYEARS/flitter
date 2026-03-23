// scroll-demo.ts — Demonstrates scrollable content with SingleChildScrollView.
//
// Run with: bun run examples/scroll-demo.ts
//
// This example demonstrates:
// - SingleChildScrollView for scrollable content
// - Expanded to fill available vertical space
// - Column with many children (50 items)
// - Row for horizontal layout within list items
// - Dynamic content generation with Array.from()
// - SizedBox for spacing between elements
// - Color alternation for visual clarity

import { runApp, WidgetsBinding } from '../src/framework/binding';
import { Column, Row } from '../src/widgets/flex';
import { Expanded } from '../src/widgets/flexible';
import { Text } from '../src/widgets/text';
import { SizedBox } from '../src/widgets/sized-box';
import { Padding } from '../src/widgets/padding';
import { Divider } from '../src/widgets/divider';
import { SingleChildScrollView } from '../src/widgets/scroll-view';
import { TextSpan } from '../src/core/text-span';
import { TextStyle } from '../src/core/text-style';
import { Color } from '../src/core/color';
import { EdgeInsets } from '../src/layout/edge-insets';

// ---------------------------------------------------------------------------
// Build the scrollable list
// ---------------------------------------------------------------------------

// Number of items to generate
const ITEM_COUNT = 50;

// Alternating colors for visual distinction
const itemColors = [Color.green, Color.cyan, Color.yellow, Color.magenta, Color.white];

export function buildScrollDemo() {
  // Generate 50 list items
  const items = Array.from({ length: ITEM_COUNT }, (_, i) => {
    const index = i + 1;
    const color = itemColors[i % itemColors.length]!;

    return new Padding({
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      child: new Row({
        mainAxisAlignment: 'start',
        children: [
          // Index number with fixed-width formatting
          new Text({
            text: new TextSpan({
              text: `${String(index).padStart(3, ' ')}.`,
              style: new TextStyle({ dim: true }),
            }),
          }),
          new SizedBox({ width: 1 }),
          // Item content with alternating color
          new Text({
            text: new TextSpan({
              text: `Item #${index} - Sample scrollable content`,
              style: new TextStyle({ foreground: color }),
            }),
          }),
        ],
      }),
    });
  });

  return new Column({
    mainAxisAlignment: 'start',
    crossAxisAlignment: 'stretch',
    children: [
      // Header
      new Padding({
        padding: EdgeInsets.symmetric({ horizontal: 1 }),
        child: new Text({
          text: new TextSpan({
            text: 'Scroll Demo - Use arrow keys to scroll',
            style: new TextStyle({ bold: true, foreground: Color.cyan }),
          }),
        }),
      }),
      new Divider(),
      // Scrollable content area fills remaining space
      new Expanded({
        child: new SingleChildScrollView({
          child: new Column({
            mainAxisSize: 'min',
            crossAxisAlignment: 'start',
            children: items,
          }),
        }),
      }),
    ],
  });
}

// Export for testing
export const app = buildScrollDemo();

// Only run the app when executed directly
if (typeof process !== 'undefined' && !process.env.BUN_TEST) {
  runApp(app, { output: process.stdout });
}
