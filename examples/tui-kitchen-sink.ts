/**
 * TUI Kitchen Sink — Full Widget Showcase.
 *
 * A comprehensive demo combining all @flitter/tui widget categories
 * in a single 240x60 screen. Left side: layout + decoration widgets.
 * Right side: text + interactive + scroll APIs.
 *
 * Run: bun run examples/tui-kitchen-sink.ts
 *
 * @module
 */

import { Screen } from "../packages/tui/src/screen/screen.js";
import { AnsiRenderer } from "../packages/tui/src/screen/ansi-renderer.js";
import { BoxConstraints } from "../packages/tui/src/tree/constraints.js";
import { Color } from "../packages/tui/src/screen/color.js";
import { TextStyle } from "../packages/tui/src/screen/text-style.js";
import { ContainerRenderObject } from "../packages/tui/src/widgets/container.js";
import { EdgeInsets } from "../packages/tui/src/widgets/edge-insets.js";
import { BorderSide } from "../packages/tui/src/widgets/border-side.js";
import { Border } from "../packages/tui/src/widgets/border.js";
import { BoxDecoration } from "../packages/tui/src/widgets/box-decoration.js";
import { RenderPositionedBox } from "../packages/tui/src/widgets/align.js";
import { RenderParagraph } from "../packages/tui/src/widgets/rich-text.js";
import { TextSpan } from "../packages/tui/src/widgets/text-span.js";
import { RenderViewport } from "../packages/tui/src/widgets/viewport.js";
import { ScrollController } from "../packages/tui/src/scroll/scroll-controller.js";
import { RenderMouseRegion } from "../packages/tui/src/widgets/mouse-region.js";

// ════════════════════════════════════════════════════
//  Helper
// ════════════════════════════════════════════════════

function writeText(
  screen: Screen,
  x: number,
  y: number,
  text: string,
  style: TextStyle = TextStyle.NORMAL,
): void {
  for (let i = 0; i < text.length && x + i < screen.width; i++) {
    screen.writeChar(x + i, y, text[i], style);
  }
}

// ════════════════════════════════════════════════════
//  Setup
// ════════════════════════════════════════════════════

const W = 240;
const H = 60;
const screen = new Screen(W, H);

const titleStyle = new TextStyle({ foreground: Color.cyan(), bold: true });
const sectionStyle = new TextStyle({ foreground: Color.yellow(), bold: true });
const dimStyle = new TextStyle({ dim: true });

// ════════════════════════════════════════════════════
//  Title Bar
// ════════════════════════════════════════════════════

// Title bar background
const titleDeco = new BoxDecoration({ color: Color.rgb(30, 60, 100) });
const titleRO = new ContainerRenderObject(W, 1, undefined, undefined, titleDeco);
titleRO.layout(BoxConstraints.tight(W, 1));
titleRO.paint(screen, 0, 0);
writeText(screen, 2, 0, "╸ Flitter TUI Kitchen Sink — All Widget Categories ╺", titleStyle);

// ════════════════════════════════════════════════════
//  Left Panel — Layout & Decoration (cols 0-38)
// ════════════════════════════════════════════════════

// Left panel border
const leftBorder = Border.all(new BorderSide(Color.brightBlack(), 1, "solid"));
const leftDeco = new BoxDecoration({ border: leftBorder });
const leftRO = new ContainerRenderObject(39, 22, undefined, undefined, leftDeco);
leftRO.layout(BoxConstraints.tight(39, 22));
leftRO.paint(screen, 0, 1);

writeText(screen, 2, 2, "Layout & Decoration", sectionStyle);

// --- Border Styles ---
writeText(screen, 2, 3, "Border styles:", dimStyle);

// Rounded border
const roundedSide = new BorderSide(Color.cyan(), 1, "rounded");
const roundedBorder = Border.all(roundedSide);
const roundedDeco = new BoxDecoration({ color: Color.rgb(20, 40, 50), border: roundedBorder });
const roundedRO = new ContainerRenderObject(11, 3, undefined, undefined, roundedDeco);
roundedRO.layout(BoxConstraints.tight(11, 3));
roundedRO.paint(screen, 2, 4);
writeText(screen, 3, 5, " rounded ", new TextStyle({ foreground: Color.cyan() }));

// Solid border
const solidSide = new BorderSide(Color.green(), 1, "solid");
const solidBorder = Border.all(solidSide);
const solidDeco = new BoxDecoration({ color: Color.rgb(20, 40, 20), border: solidBorder });
const solidRO = new ContainerRenderObject(11, 3, undefined, undefined, solidDeco);
solidRO.layout(BoxConstraints.tight(11, 3));
solidRO.paint(screen, 14, 4);
writeText(screen, 15, 5, "  solid  ", new TextStyle({ foreground: Color.green() }));

// Thick border
const thickSide = new BorderSide(Color.yellow(), 2, "solid");
const thickBorder = Border.all(thickSide);
const thickDeco = new BoxDecoration({ color: Color.rgb(40, 40, 20), border: thickBorder });
const thickRO = new ContainerRenderObject(11, 3, undefined, undefined, thickDeco);
thickRO.layout(BoxConstraints.tight(11, 3));
thickRO.paint(screen, 26, 4);
writeText(screen, 27, 5, "  thick  ", new TextStyle({ foreground: Color.yellow() }));

// --- Padding + Margin ---
writeText(screen, 2, 8, "Padding & Margin:", dimStyle);

const padBorder = Border.all(new BorderSide(Color.magenta(), 1, "rounded"));
const padDeco = new BoxDecoration({ color: Color.rgb(40, 20, 40), border: padBorder });
const padRO = new ContainerRenderObject(
  35, 4,
  EdgeInsets.symmetric({ horizontal: 2, vertical: 1 }),
  undefined,
  padDeco,
);
padRO.layout(BoxConstraints.tight(35, 4));
padRO.paint(screen, 2, 9);
writeText(screen, 5, 10, "padding: sym(h:2, v:1)", new TextStyle({ foreground: Color.magenta() }));
writeText(screen, 5, 11, "← 2 cols padding each side →", dimStyle);

// --- Align / Center ---
writeText(screen, 2, 14, "Align (center):", dimStyle);

const alignBorder = Border.all(new BorderSide(Color.brightBlack(), 1, "solid"));
const alignDeco = new BoxDecoration({ border: alignBorder });
const outerBox = new ContainerRenderObject(35, 5, undefined, undefined, alignDeco);
const innerDeco = new BoxDecoration({ color: Color.blue() });
const innerBox = new ContainerRenderObject(9, 1, undefined, undefined, innerDeco);

// Use RenderPositionedBox to center inner inside outer
const centerRO = new RenderPositionedBox();
centerRO.adoptChild(innerBox);
outerBox.adoptChild(centerRO);
outerBox.layout(BoxConstraints.tight(35, 5));
outerBox.paint(screen, 2, 15);
writeText(screen, 15, 17, " centered ", new TextStyle({ foreground: Color.white(), background: Color.blue() }));

// --- Background Colors ---
writeText(screen, 2, 21, "Colors: ", dimStyle);
const colors = [Color.red(), Color.green(), Color.blue(), Color.cyan(), Color.magenta(), Color.yellow()];
for (let i = 0; i < colors.length; i++) {
  const clrDeco = new BoxDecoration({ color: colors[i] });
  const clrRO = new ContainerRenderObject(4, 1, undefined, undefined, clrDeco);
  clrRO.layout(BoxConstraints.tight(4, 1));
  clrRO.paint(screen, 10 + i * 5, 21);
}

// ════════════════════════════════════════════════════
//  Right Panel — Text, Interactive, Scroll (cols 39-79)
// ════════════════════════════════════════════════════

const rightBorder = Border.all(new BorderSide(Color.brightBlack(), 1, "solid"));
const rightDeco = new BoxDecoration({ border: rightBorder });
const rightRO = new ContainerRenderObject(41, 22, undefined, undefined, rightDeco);
rightRO.layout(BoxConstraints.tight(41, 22));
rightRO.paint(screen, 39, 1);

writeText(screen, 41, 2, "Text, Interactive & Scroll", sectionStyle);

// --- Text Styles ---
writeText(screen, 41, 4, "Text styles:", dimStyle);

const textStyles = [
  { label: "Bold", style: new TextStyle({ bold: true }) },
  { label: "Italic", style: new TextStyle({ italic: true }) },
  { label: "Under", style: new TextStyle({ underline: true }) },
  { label: "Dim", style: new TextStyle({ dim: true }) },
  { label: "Strike", style: new TextStyle({ strikethrough: true }) },
];

let tx = 41;
for (const ts of textStyles) {
  writeText(screen, tx, 5, ts.label, ts.style);
  tx += ts.label.length + 1;
}

// --- RichText (via RenderParagraph) ---
writeText(screen, 41, 7, "RichText:", dimStyle);
const richSpan = new TextSpan({
  children: [
    new TextSpan({ text: "Hello ", style: new TextStyle({ foreground: Color.white() }) }),
    new TextSpan({ text: "colorful ", style: new TextStyle({ foreground: Color.red(), bold: true }) }),
    new TextSpan({ text: "world!", style: new TextStyle({ foreground: Color.cyan(), underline: true }) }),
  ],
});
const rp = new RenderParagraph(richSpan);
rp.layout(BoxConstraints.loose(38, 1));
rp.paint(screen, 41, 8);

// --- MouseRegion buttons ---
writeText(screen, 41, 10, "MouseRegion (click targets):", dimStyle);

const btnSpecs = [
  { label: "OK", color: Color.green() },
  { label: "Cancel", color: Color.red() },
  { label: "Help", color: Color.blue() },
];

let bx = 41;
for (const btn of btnSpecs) {
  const btnBorder = Border.all(new BorderSide(Color.white(), 1, "rounded"));
  const btnDeco = new BoxDecoration({ color: btn.color, border: btnBorder });
  const w = btn.label.length + 4;
  const btnRO = new ContainerRenderObject(w, 3, EdgeInsets.symmetric({ horizontal: 1 }), undefined, btnDeco);
  btnRO.layout(BoxConstraints.tight(w, 3));
  btnRO.paint(screen, bx, 11);
  writeText(screen, bx + 2, 12, btn.label, new TextStyle({ foreground: Color.white(), bold: true }));
  bx += w + 1;
}

// --- Viewport / Scroll ---
writeText(screen, 41, 15, "Viewport (scroll=2):", dimStyle);

const vpBorderSide = new BorderSide(Color.cyan(), 1, "rounded");
const vpBorder2 = Border.all(vpBorderSide);
const vpDeco2 = new BoxDecoration({ border: vpBorder2 });
const vpFrame = new ContainerRenderObject(38, 6, undefined, undefined, vpDeco2);
vpFrame.layout(BoxConstraints.tight(38, 6));
vpFrame.paint(screen, 41, 16);

// Simulate viewport content (scrolled by 2)
const scrollOffset = 2;
const contentLines = [
  "Line 1: Welcome to viewport",
  "Line 2: This line is hidden",
  "Line 3: First visible line  ←",
  "Line 4: Content row 4",
  "Line 5: Content row 5",
  "Line 6: Content row 6",
  "Line 7: Content row 7       ←",
  "Line 8: Last visible line",
  "Line 9: Hidden below",
];

for (let i = 0; i < 4 && scrollOffset + i < contentLines.length; i++) {
  const line = contentLines[scrollOffset + i];
  writeText(screen, 43, 17 + i, line!.slice(0, 35), new TextStyle({ foreground: Color.white() }));
}

// Scroll indicator
writeText(screen, 78, 17, "░", dimStyle);
writeText(screen, 78, 18, "█", new TextStyle({ foreground: Color.cyan() }));
writeText(screen, 78, 19, "█", new TextStyle({ foreground: Color.cyan() }));
writeText(screen, 78, 20, "░", dimStyle);

// --- Footer ---
writeText(screen, 41, 22, "ScrollController, ClipScreen, HitTest", dimStyle);

// ════════════════════════════════════════════════════
//  Render
// ════════════════════════════════════════════════════

const renderer = new AnsiRenderer();
process.stdout.write(renderer.renderFull(screen));
console.log("\n");
