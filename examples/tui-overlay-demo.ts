/**
 * TUI Overlay Demo — Overlay & CommandPalette showcase.
 *
 * Demonstrates the overlay system: OverlayState, OverlayEntry, and
 * CommandPalette widget API.
 *
 * Run: bun run examples/tui-overlay-demo.ts
 *
 * @module
 */

import { Screen } from "../packages/tui/src/screen/screen.js";
import { AnsiRenderer } from "../packages/tui/src/screen/ansi-renderer.js";
import { Color } from "../packages/tui/src/screen/color.js";
import { TextStyle } from "../packages/tui/src/screen/text-style.js";
import { ContainerRenderObject } from "../packages/tui/src/widgets/container.js";
import { BoxConstraints } from "../packages/tui/src/tree/constraints.js";
import { EdgeInsets } from "../packages/tui/src/widgets/edge-insets.js";
import { BorderSide } from "../packages/tui/src/widgets/border-side.js";
import { Border } from "../packages/tui/src/widgets/border.js";
import { BoxDecoration } from "../packages/tui/src/widgets/box-decoration.js";
import { OverlayEntry } from "../packages/tui/src/overlay/overlay-entry.js";
import { OverlayState } from "../packages/tui/src/overlay/overlay.js";
import { SizedBox } from "../packages/tui/src/widgets/sized-box.js";

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
  for (let i = 0; i < text.length && x + i < screen.width; i++) {
    screen.writeChar(x + i, y, text[i], style);
  }
}

// ════════════════════════════════════════════════════
//  Setup
// ════════════════════════════════════════════════════

const W = 80;
const H = 24;
const screen = new Screen(W, H);

const titleStyle = new TextStyle({ foreground: Color.cyan(), bold: true });
const bold = new TextStyle({ bold: true });
const labelStyle = new TextStyle({ foreground: Color.yellow() });
const valueStyle = new TextStyle({ foreground: Color.green() });
const dimStyle = new TextStyle({ dim: true });
const codeStyle = new TextStyle({ foreground: Color.magenta() });

// ════════════════════════════════════════════════════
//  Title
// ════════════════════════════════════════════════════

writeText(screen, 2, 0, "Flitter TUI Overlay Demo — Overlay & CommandPalette", titleStyle);
writeText(screen, 2, 1, "━".repeat(52), dimStyle);

// ════════════════════════════════════════════════════
//  Background — simulated app content
// ════════════════════════════════════════════════════

const bgBorder = Border.all(new BorderSide(Color.brightBlack(), 1, "solid"));
const bgDeco = new BoxDecoration({ color: Color.rgb(30, 30, 40), border: bgBorder });
const bgRO = new ContainerRenderObject(76, 14, undefined, undefined, bgDeco);
bgRO.layout(BoxConstraints.tight(76, 14));
bgRO.paint(screen, 2, 3);

// Simulated app content behind overlay
writeText(screen, 4, 4, "┌─── Application Content ───────────────────┐", dimStyle);
writeText(screen, 4, 5, "│  This is the main application area.       │", dimStyle);
writeText(screen, 4, 6, "│  An overlay will appear on top of this.   │", dimStyle);
writeText(screen, 4, 7, "│                                           │", dimStyle);
for (let i = 8; i <= 14; i++) {
  writeText(screen, 4, i, "│" + " ".repeat(43) + "│", dimStyle);
}
writeText(screen, 4, 15, "└───────────────────────────────────────────┘", dimStyle);

// ════════════════════════════════════════════════════
//  Overlay — simulated command palette
// ════════════════════════════════════════════════════

// Draw a command palette overlay on top of the background
const paletteBorder = Border.all(new BorderSide(Color.cyan(), 1, "rounded"));
const paletteDeco = new BoxDecoration({ color: Color.rgb(20, 20, 35), border: paletteBorder });
const paletteRO = new ContainerRenderObject(50, 10, EdgeInsets.all(1), undefined, paletteDeco);
paletteRO.layout(BoxConstraints.tight(50, 10));
paletteRO.paint(screen, 15, 5);

// Search bar inside palette
const searchBorder = Border.all(new BorderSide(Color.white(), 1, "rounded"));
const searchDeco = new BoxDecoration({ color: Color.rgb(40, 40, 55), border: searchBorder });
const searchRO = new ContainerRenderObject(46, 3, undefined, undefined, searchDeco);
searchRO.layout(BoxConstraints.tight(46, 3));
searchRO.paint(screen, 17, 6);
writeText(screen, 19, 7, "> Search commands...", new TextStyle({ foreground: Color.brightBlack() }));

// Command list items
const commands = [
  { label: "Open File", shortcut: "Ctrl+O", color: Color.white() },
  { label: "Save File", shortcut: "Ctrl+S", color: Color.white() },
  { label: "Find & Replace", shortcut: "Ctrl+H", color: Color.yellow() },
  { label: "Toggle Terminal", shortcut: "Ctrl+`", color: Color.white() },
];

for (let i = 0; i < commands.length; i++) {
  const cmd = commands[i];
  const y = 10 + i;
  const highlight = i === 2; // "Find & Replace" is selected
  if (highlight) {
    // Selected item background
    for (let x = 17; x < 63; x++) {
      screen.writeChar(x, y, " ", new TextStyle({ background: Color.rgb(60, 60, 90) }));
    }
  }
  writeText(screen, 18, y, cmd.label, new TextStyle({
    foreground: highlight ? Color.yellow() : cmd.color,
    bold: highlight,
  }));
  writeText(screen, 52, y, cmd.shortcut, new TextStyle({
    foreground: Color.brightBlack(),
  }));
}

// ════════════════════════════════════════════════════
//  Section 2: OverlayState API
// ════════════════════════════════════════════════════

writeText(screen, 2, 18, "OverlayState API:", bold);

const mockSetState = () => {};
const overlayState = new OverlayState(mockSetState);

const entry1 = new OverlayEntry({
  builder: () => new SizedBox({ width: 10, height: 5 }),
});
const entry2 = new OverlayEntry({
  builder: () => new SizedBox({ width: 20, height: 10 }),
  maintainState: true,
});

overlayState.insert(entry1);
overlayState.insert(entry2);

writeText(screen, 4, 19, `entryCount: ${overlayState.entryCount}`, valueStyle);
writeText(screen, 25, 19, `entries[0].mounted: ${entry1.mounted}`, labelStyle);
writeText(screen, 55, 19, `maintainState: ${entry2.maintainState}`, labelStyle);

// ════════════════════════════════════════════════════
//  Section 3: CommandPalette API
// ════════════════════════════════════════════════════

writeText(screen, 2, 21, "CommandPalette(StatefulWidget):", bold);
writeText(screen, 4, 22, "{ commands: [{id, label, description, shortcut, action}], onDismiss }", codeStyle);
writeText(screen, 4, 23, "Rendered above: simulated command palette overlay with search + items", dimStyle);

// ════════════════════════════════════════════════════
//  Render
// ════════════════════════════════════════════════════

const renderer = new AnsiRenderer();
process.stdout.write(renderer.renderFull(screen));
console.log("\n");
