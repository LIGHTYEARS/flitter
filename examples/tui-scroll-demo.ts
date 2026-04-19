/**
 * TUI Scroll Demo — Viewport & ScrollController showcase.
 *
 * Demonstrates the viewport clipping and scroll offset system by rendering
 * a tall content area inside a viewport with a visible scroll indicator.
 *
 * Run: bun run examples/tui-scroll-demo.ts
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
import { RenderViewport } from "../packages/tui/src/widgets/viewport.js";
import { ScrollController } from "../packages/tui/src/scroll/scroll-controller.js";

// ════════════════════════════════════════════════════
//  Helper: write text to screen
// ════════════════════════════════════════════════════

function writeText(
  screen: Screen,
  x: number,
  y: number,
  text: string,
  style: TextStyle = TextStyle.NORMAL,
): void {
  for (let i = 0; i < text.length; i++) {
    if (x + i < screen.width) {
      screen.writeChar(x + i, y, text[i], style);
    }
  }
}

// ════════════════════════════════════════════════════
//  Setup
// ════════════════════════════════════════════════════

const W = 240;
const H = 60;
const screen = new Screen(W, H);

const titleStyle = new TextStyle({ foreground: Color.cyan(), bold: true });
const bold = new TextStyle({ bold: true });
const labelStyle = new TextStyle({ foreground: Color.yellow() });
const dimStyle = new TextStyle({ dim: true });
const codeStyle = new TextStyle({ foreground: Color.green() });

// ════════════════════════════════════════════════════
//  Title
// ════════════════════════════════════════════════════

writeText(screen, 2, 0, "Flitter TUI Scroll Demo — Viewport & ScrollController", titleStyle);
writeText(screen, 2, 1, "━".repeat(56), dimStyle);

// ════════════════════════════════════════════════════
//  Section 1: Viewport with clipped content
// ════════════════════════════════════════════════════

writeText(screen, 2, 3, "1. RenderViewport (scrollOffset = 0):", bold);

// Create a tall content container (simulating scrollable content)
const contentHeight = 20;
const viewportHeight = 8;
const contentBorder = Border.all(new BorderSide(Color.brightBlack(), 1, "solid"));
const contentDeco = new BoxDecoration({ border: contentBorder });
const contentRO = new ContainerRenderObject(36, contentHeight, undefined, undefined, contentDeco);
contentRO.layout(BoxConstraints.tight(36, contentHeight));

// Create viewport with scroll offset 0
const viewport1 = new RenderViewport("vertical", 0);
viewport1.adoptChild(contentRO);
viewport1.layout(BoxConstraints.tight(36, viewportHeight));

// Paint viewport — it clips child to its own bounds
viewport1.paint(screen, 4, 5);

// Write content lines inside the viewport area (manually, since Container doesn't have text children)
for (let i = 0; i < viewportHeight; i++) {
  const lineText = `  Line ${i + 1}: ${i === 0 ? "First visible line" : `Content row ${i + 1}`}`;
  writeText(screen, 5, 5 + i, lineText.padEnd(34).slice(0, 34), labelStyle);
}

// Draw viewport border overlay
const vpBorder = Border.all(new BorderSide(Color.cyan(), 1, "rounded"));
const vpDeco = new BoxDecoration({ border: vpBorder });
const vpOverlay = new ContainerRenderObject(38, viewportHeight + 2, undefined, undefined, vpDeco);
vpOverlay.layout(BoxConstraints.tight(38, viewportHeight + 2));
vpOverlay.paint(screen, 3, 4);

// Scroll indicator on the right
for (let i = 0; i < viewportHeight; i++) {
  const thumbPos = 0; // scroll at top
  const char = i <= 2 ? "█" : "░";
  writeText(screen, 42, 5 + i, char, new TextStyle({ foreground: Color.cyan() }));
}

// ════════════════════════════════════════════════════
//  Section 2: Viewport with scroll offset
// ════════════════════════════════════════════════════

writeText(screen, 46, 3, "2. scrollOffset = 5:", bold);

// Create another viewport with offset
const contentRO2 = new ContainerRenderObject(30, contentHeight, undefined, undefined, contentDeco);
contentRO2.layout(BoxConstraints.tight(30, contentHeight));

const viewport2 = new RenderViewport("vertical", 5);
viewport2.adoptChild(contentRO2);
viewport2.layout(BoxConstraints.tight(30, viewportHeight));
viewport2.paint(screen, 48, 5);

// Write offset content lines
for (let i = 0; i < viewportHeight; i++) {
  const lineNum = i + 6; // offset by 5
  const lineText = `  Line ${lineNum}: Row ${lineNum}`;
  writeText(screen, 49, 5 + i, lineText.padEnd(28).slice(0, 28), labelStyle);
}

// Scroll indicator
for (let i = 0; i < viewportHeight; i++) {
  const char = i >= 2 && i <= 4 ? "█" : "░";
  writeText(screen, 78, 5 + i, char, new TextStyle({ foreground: Color.cyan() }));
}

// ════════════════════════════════════════════════════
//  Section 3: ScrollController API
// ════════════════════════════════════════════════════

writeText(screen, 2, 14, "3. ScrollController API:", bold);

const sc = new ScrollController();
sc.updateMaxScrollExtent(100);
sc.jumpTo(25);

writeText(screen, 4, 15, `offset: ${sc.offset}`, labelStyle);
writeText(screen, 20, 15, `maxScrollExtent: ${sc.maxScrollExtent}`, labelStyle);
writeText(screen, 50, 15, `atTop: ${sc.atTop}`, labelStyle);
writeText(screen, 65, 15, `atBottom: ${sc.atBottom}`, labelStyle);

writeText(screen, 4, 17, "Methods: scrollUp(), scrollDown(), scrollToTop(),", codeStyle);
writeText(screen, 4, 18, "  scrollToBottom(), jumpTo(offset), animateTo(target),", codeStyle);
writeText(screen, 4, 19, "  scrollPageUp(vpSize), scrollPageDown(vpSize),", codeStyle);
writeText(screen, 4, 20, "  enableFollowMode(), toggleFollowMode()", codeStyle);

// ════════════════════════════════════════════════════
//  Section 4: ClipScreen info
// ════════════════════════════════════════════════════

writeText(screen, 2, 22, "ClipScreen wraps Screen, clips all draw ops to viewport rect.", dimStyle);
writeText(screen, 2, 23, "Viewport uses ClipScreen internally — child renders are clipped.", dimStyle);

sc.dispose();

// ════════════════════════════════════════════════════
//  Render
// ════════════════════════════════════════════════════

const renderer = new AnsiRenderer();
process.stdout.write(renderer.renderFull(screen));
console.log("\n");
