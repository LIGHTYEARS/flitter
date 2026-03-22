// stack-layers.ts — Stack + Positioned overlay demo.
//
// Run with: bun run examples/stack-layers.ts
//
// This example demonstrates:
// - Stack widget for layered content
// - Positioned widget for corner overlays
// - Background layer with decoration
// - Centered overlay text
// - Z-order demonstration (later children render on top)

import { runApp, WidgetsBinding } from '../src/framework/binding';
import { Column } from '../src/widgets/flex';
import { Text } from '../src/widgets/text';
import { SizedBox } from '../src/widgets/sized-box';
import { Padding } from '../src/widgets/padding';
import { Container } from '../src/widgets/container';
import { Center } from '../src/widgets/center';
import { Divider } from '../src/widgets/divider';
import { Stack } from '../src/widgets/stack';
import { Positioned } from '../src/widgets/stack';
import { TextSpan } from '../src/core/text-span';
import { TextStyle } from '../src/core/text-style';
import { Color } from '../src/core/color';
import { EdgeInsets } from '../src/layout/edge-insets';
import { BoxDecoration, Border, BorderSide } from '../src/layout/render-decorated';
import type { Widget } from '../src/framework/widget';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function label(content: string, style?: TextStyle): Text {
  return new Text({
    text: new TextSpan({
      text: content,
      style: style ?? new TextStyle(),
    }),
  });
}

function heading(content: string): Text {
  return label(content, new TextStyle({ bold: true, foreground: Color.cyan }));
}

// ---------------------------------------------------------------------------
// Demo 1: Basic Stack with positioned corners
// ---------------------------------------------------------------------------

function buildCornerOverlays(): Widget {
  return new Container({
    width: 50,
    height: 12,
    decoration: new BoxDecoration({
      border: Border.all(new BorderSide({ color: Color.white, style: 'solid' })),
    }),
    child: new Stack({
      fit: 'expand',
      children: [
        // Background layer: fill with dim dots pattern
        new Container({
          decoration: new BoxDecoration({ color: Color.blue }),
        }),

        // Top-left corner badge
        new Positioned({
          left: 1,
          top: 0,
          child: label('[TL]', new TextStyle({ bold: true, foreground: Color.green })),
        }),

        // Top-right corner badge
        new Positioned({
          right: 1,
          top: 0,
          child: label('[TR]', new TextStyle({ bold: true, foreground: Color.yellow })),
        }),

        // Bottom-left corner badge
        new Positioned({
          left: 1,
          bottom: 0,
          child: label('[BL]', new TextStyle({ bold: true, foreground: Color.red })),
        }),

        // Bottom-right corner badge
        new Positioned({
          right: 1,
          bottom: 0,
          child: label('[BR]', new TextStyle({ bold: true, foreground: Color.magenta })),
        }),

        // Center overlay
        new Positioned({
          left: 15,
          top: 5,
          child: label('[ CENTER OVERLAY ]', new TextStyle({
            bold: true,
            foreground: Color.cyan,
            inverse: true,
          })),
        }),
      ],
    }),
  });
}

// ---------------------------------------------------------------------------
// Demo 2: Z-order demonstration
// ---------------------------------------------------------------------------

function buildZOrderDemo(): Widget {
  // Three overlapping boxes showing z-order (last child on top)
  return new Container({
    width: 40,
    height: 8,
    decoration: new BoxDecoration({
      border: Border.all(new BorderSide({ color: Color.brightBlack, style: 'solid' })),
    }),
    child: new Stack({
      fit: 'expand',
      children: [
        // Layer 1 (bottom): red box at (0, 0)
        new Positioned({
          left: 0,
          top: 0,
          child: new Container({
            width: 18,
            height: 4,
            decoration: new BoxDecoration({ color: Color.red }),
            child: label(' Layer 1 (bottom)', new TextStyle({ bold: true })),
          }),
        }),

        // Layer 2 (middle): green box at (6, 2)
        new Positioned({
          left: 6,
          top: 2,
          child: new Container({
            width: 18,
            height: 4,
            decoration: new BoxDecoration({ color: Color.green }),
            child: label(' Layer 2 (middle)', new TextStyle({ bold: true })),
          }),
        }),

        // Layer 3 (top): blue box at (12, 4)
        new Positioned({
          left: 12,
          top: 4,
          child: new Container({
            width: 18,
            height: 3,
            decoration: new BoxDecoration({ color: Color.blue }),
            child: label(' Layer 3 (top)', new TextStyle({ bold: true })),
          }),
        }),
      ],
    }),
  });
}

// ---------------------------------------------------------------------------
// Demo 3: Status badge overlay
// ---------------------------------------------------------------------------

function buildStatusOverlay(): Widget {
  return new Container({
    width: 40,
    height: 6,
    decoration: new BoxDecoration({
      border: Border.all(new BorderSide({ color: Color.cyan, style: 'rounded' })),
    }),
    child: new Stack({
      fit: 'expand',
      children: [
        // Main content
        new Positioned({
          left: 2,
          top: 1,
          child: new Column({
            mainAxisSize: 'min',
            crossAxisAlignment: 'start',
            children: [
              label('Server Status', new TextStyle({ bold: true, foreground: Color.white })),
              label('All systems operational', new TextStyle({ dim: true })),
            ],
          }),
        }),

        // Status badge in top-right
        new Positioned({
          right: 2,
          top: 1,
          child: new Container({
            decoration: new BoxDecoration({ color: Color.green }),
            child: label(' ONLINE ', new TextStyle({ bold: true })),
          }),
        }),

        // Version in bottom-right
        new Positioned({
          right: 2,
          bottom: 0,
          child: label('v2.1.0', new TextStyle({ dim: true })),
        }),
      ],
    }),
  });
}

// ---------------------------------------------------------------------------
// Build the full stack layers demo
// ---------------------------------------------------------------------------

export function buildStackLayers() {
  return new Padding({
    padding: EdgeInsets.all(1),
    child: new Column({
      mainAxisAlignment: 'start',
      crossAxisAlignment: 'start',
      children: [
        heading('Stack + Positioned Demo'),
        new Divider(),

        // Demo 1: Corner overlays
        label(' Corner Overlays:', new TextStyle({ bold: true })),
        new SizedBox({ height: 1 }),
        buildCornerOverlays(),
        new Divider(),

        // Demo 2: Z-order
        label(' Z-Order (last child on top):', new TextStyle({ bold: true })),
        new SizedBox({ height: 1 }),
        buildZOrderDemo(),
        new Divider(),

        // Demo 3: Status badge
        label(' Status Badge Overlay:', new TextStyle({ bold: true })),
        new SizedBox({ height: 1 }),
        buildStatusOverlay(),
      ],
    }),
  });
}

// Export the widget tree for testing
export const app = buildStackLayers();

// Only run the app when executed directly
if (typeof process !== 'undefined' && !process.env.BUN_TEST) {
  runApp(app).then(binding => binding.setOutput(process.stdout));
}
