/**
 * Flitter TUI Container Demo
 *
 * Showcases ContainerRenderObject with various decoration styles:
 *   1. Rounded border (default)
 *   2. Solid/square border
 *   3. Thick border
 *   4. Background color fill
 *   5. Padding + margin combo
 *   6. Border.symmetric (different horizontal/vertical)
 *
 * Run: bun run examples/tui-container-demo.ts
 */

import { Screen, AnsiRenderer } from "../packages/tui/src/screen/index.js";
import { BoxConstraints } from "../packages/tui/src/tree/constraints.js";
import { ContainerRenderObject } from "../packages/tui/src/widgets/container.js";
import { EdgeInsets } from "../packages/tui/src/widgets/edge-insets.js";
import { BorderSide } from "../packages/tui/src/widgets/border-side.js";
import { Border } from "../packages/tui/src/widgets/border.js";
import { BoxDecoration } from "../packages/tui/src/widgets/box-decoration.js";
import { Color } from "../packages/tui/src/screen/color.js";
import { TextStyle } from "../packages/tui/src/screen/text-style.js";

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

function writeText(
  screen: Screen,
  x: number,
  y: number,
  text: string,
  style: TextStyle,
): void {
  for (let i = 0; i < text.length; i++) {
    screen.writeChar(x + i, y, text[i], style);
  }
}

// ---------------------------------------------------------------------------
//  Screen setup — 240x60 standard terminal
// ---------------------------------------------------------------------------

const W = 240;
const H = 60;
const screen = new Screen(W, H);

// Shared label styles
const labelStyle = new TextStyle({ foreground: Color.brightWhite(), bold: true });
const dimStyle = new TextStyle({ foreground: Color.brightBlack() });

// ---------------------------------------------------------------------------
//  Title
// ---------------------------------------------------------------------------

writeText(screen, 2, 0, "Flitter TUI Container Demo", labelStyle);
writeText(screen, 30, 0, "-- decoration showcase", dimStyle);

// ---------------------------------------------------------------------------
//  Row 1 (y=2): Three containers side by side
// ---------------------------------------------------------------------------

// 1. Rounded border (default style)
{
  const side = new BorderSide(Color.cyan(), 1, "rounded");
  const border = Border.all(side);
  const decoration = new BoxDecoration({ border });
  const ro = new ContainerRenderObject(24, 8, undefined, undefined, decoration);
  ro.layout(BoxConstraints.tight(24, 8));
  ro.paint(screen, 2, 2);
  writeText(screen, 4, 3, "1. Rounded border", dimStyle);
  writeText(screen, 4, 5, "  style: rounded", dimStyle);
  writeText(screen, 4, 6, "  width: 1", dimStyle);
  writeText(screen, 4, 7, "  chars: ", dimStyle);
  writeText(screen, 13, 7, "\u256D\u256E\u2570\u256F\u2500\u2502", new TextStyle({ foreground: Color.cyan() }));
}

// 2. Solid/square border
{
  const side = new BorderSide(Color.green(), 1, "solid");
  const border = Border.all(side);
  const decoration = new BoxDecoration({ border });
  const ro = new ContainerRenderObject(24, 8, undefined, undefined, decoration);
  ro.layout(BoxConstraints.tight(24, 8));
  ro.paint(screen, 28, 2);
  writeText(screen, 30, 3, "2. Solid border", dimStyle);
  writeText(screen, 30, 5, "  style: solid", dimStyle);
  writeText(screen, 30, 6, "  width: 1", dimStyle);
  writeText(screen, 30, 7, "  chars: ", dimStyle);
  writeText(screen, 39, 7, "\u250C\u2510\u2514\u2518\u2500\u2502", new TextStyle({ foreground: Color.green() }));
}

// 3. Thick border
{
  const side = new BorderSide(Color.yellow(), 2, "solid");
  const border = Border.all(side);
  const decoration = new BoxDecoration({ border });
  const ro = new ContainerRenderObject(24, 8, undefined, undefined, decoration);
  ro.layout(BoxConstraints.tight(24, 8));
  ro.paint(screen, 54, 2);
  writeText(screen, 56, 3, "3. Thick border", dimStyle);
  writeText(screen, 56, 5, "  style: solid", dimStyle);
  writeText(screen, 56, 6, "  width: 2", dimStyle);
  writeText(screen, 56, 7, "  chars: ", dimStyle);
  writeText(screen, 65, 7, "\u250F\u2513\u2517\u251B\u2501\u2503", new TextStyle({ foreground: Color.yellow() }));
}

// ---------------------------------------------------------------------------
//  Row 2 (y=11): Three more containers
// ---------------------------------------------------------------------------

// 4. Background color fill
{
  const side = new BorderSide(Color.white(), 1, "rounded");
  const border = Border.all(side);
  const decoration = new BoxDecoration({ color: Color.blue(), border });
  const ro = new ContainerRenderObject(24, 8, undefined, undefined, decoration);
  ro.layout(BoxConstraints.tight(24, 8));
  ro.paint(screen, 2, 11);
  const textOnBg = new TextStyle({ foreground: Color.brightWhite(), background: Color.blue() });
  writeText(screen, 4, 12, "4. Background fill", textOnBg);
  writeText(screen, 4, 14, "  bg: Color.blue()", textOnBg);
  writeText(screen, 4, 15, "  border: white", textOnBg);
  writeText(screen, 4, 16, "  rounded corners", textOnBg);
}

// 5. Padding + Margin combo
{
  const side = new BorderSide(Color.magenta(), 1, "rounded");
  const border = Border.all(side);
  const decoration = new BoxDecoration({ border });
  const padding = EdgeInsets.all(1);
  const margin = EdgeInsets.only({ left: 1, top: 1 });
  // Total size = inner + padding*2 + border*2 + margin
  // We give it 24x8 tight constraints; it will use them
  const ro = new ContainerRenderObject(undefined, undefined, padding, margin, decoration);
  ro.layout(BoxConstraints.tight(24, 8));
  ro.paint(screen, 28, 11);
  writeText(screen, 32, 14, "5. Pad+Margin", dimStyle);
  writeText(screen, 32, 15, "pad:all(1)", dimStyle);
  writeText(screen, 32, 16, "margin:l1,t1", dimStyle);
}

// 6. Border.symmetric — different horizontal and vertical
{
  const hSide = new BorderSide(Color.red(), 2, "solid");
  const vSide = new BorderSide(Color.cyan(), 1, "solid");
  const border = Border.symmetric({ horizontal: hSide, vertical: vSide });
  const decoration = new BoxDecoration({ color: Color.rgb(30, 30, 40), border });
  const ro = new ContainerRenderObject(24, 8, undefined, undefined, decoration);
  ro.layout(BoxConstraints.tight(24, 8));
  ro.paint(screen, 54, 11);
  const textOnDark = new TextStyle({ foreground: Color.brightCyan(), background: Color.rgb(30, 30, 40) });
  writeText(screen, 56, 12, "6. Symmetric", textOnDark);
  writeText(screen, 56, 14, "  h: red thick", textOnDark);
  writeText(screen, 56, 15, "  v: cyan thin", textOnDark);
  writeText(screen, 56, 16, "  solid corners", textOnDark);
}

// ---------------------------------------------------------------------------
//  Footer
// ---------------------------------------------------------------------------

writeText(screen, 2, 20, "Each box is a ContainerRenderObject with BoxDecoration.", dimStyle);
writeText(screen, 2, 21, "Border chars auto-selected by (width, style) combination.", dimStyle);
writeText(screen, 2, 22, "Run: bun run examples/tui-container-demo.ts", new TextStyle({ foreground: Color.green() }));

// ---------------------------------------------------------------------------
//  Render to stdout
// ---------------------------------------------------------------------------

const renderer = new AnsiRenderer();
const output = renderer.renderFull(screen);
process.stdout.write(output + "\n");
