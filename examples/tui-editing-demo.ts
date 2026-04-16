/**
 * TUI Editing Demo — TextField & TextEditingController showcase.
 *
 * Demonstrates text editing capabilities by showing TextEditingController
 * state manipulation and the TextField widget API.
 *
 * Run: bun run examples/tui-editing-demo.ts
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
import { TextEditingController } from "../packages/tui/src/editing/text-editing-controller.js";

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

writeText(screen, 2, 0, "Flitter TUI Editing Demo — TextField & TextEditingController", titleStyle);
writeText(screen, 2, 1, "━".repeat(60), dimStyle);

// ════════════════════════════════════════════════════
//  Section 1: TextEditingController state
// ════════════════════════════════════════════════════

writeText(screen, 2, 3, "1. TextEditingController — state tracking:", bold);

const ctrl = new TextEditingController({ text: "Hello, Flitter TUI!", width: 40 });

writeText(screen, 4, 4, `text: "${ctrl.text}"`, valueStyle);
writeText(screen, 4, 5, `cursorPosition: ${ctrl.cursorPosition}`, labelStyle);
writeText(screen, 30, 5, `lineCount: ${ctrl.lineCount}`, labelStyle);
writeText(screen, 50, 5, `graphemes: ${ctrl.graphemes.length}`, labelStyle);

// Show cursor line/column
writeText(screen, 4, 6, `cursorLine: ${ctrl.cursorLine}`, labelStyle);
writeText(screen, 25, 6, `cursorColumn: ${ctrl.cursorColumn}`, labelStyle);

// Visual text field representation
const fieldBorder = Border.all(new BorderSide(Color.white(), 1, "rounded"));
const fieldDeco = new BoxDecoration({ color: Color.brightBlack(), border: fieldBorder });
const fieldRO = new ContainerRenderObject(50, 3, EdgeInsets.symmetric({ horizontal: 1 }), undefined, fieldDeco);
fieldRO.layout(BoxConstraints.tight(50, 3));
fieldRO.paint(screen, 4, 7);
writeText(screen, 6, 8, ctrl.text, new TextStyle({ foreground: Color.white() }));
// cursor indicator
writeText(screen, 6 + ctrl.cursorPosition, 8, "▏", new TextStyle({ foreground: Color.cyan() }));

// ════════════════════════════════════════════════════
//  Section 2: Text manipulation
// ════════════════════════════════════════════════════

writeText(screen, 2, 11, "2. Text manipulation operations:", bold);

// Clone state by creating new controller
const ctrl2 = new TextEditingController({ text: "Hello, World!", width: 40 });
writeText(screen, 4, 12, `Before: "${ctrl2.text}"  cursor: ${ctrl2.cursorPosition}`, dimStyle);

// Move cursor and insert
ctrl2.moveCursorToEnd();
ctrl2.insertText(" 🎉");
writeText(screen, 4, 13, `After insertText(" 🎉"): "${ctrl2.text}"`, valueStyle);

// Delete backward
ctrl2.deleteText(1);
writeText(screen, 4, 14, `After deleteText(1):    "${ctrl2.text}"`, valueStyle);

// Word boundary movement
const ctrl3 = new TextEditingController({ text: "one two three four", width: 40 });
ctrl3.moveCursorToStart();
ctrl3.moveCursorWordBoundary("right");
writeText(screen, 4, 15, `moveCursorWordBoundary("right"): cursor at ${ctrl3.cursorPosition}`, labelStyle);

// ════════════════════════════════════════════════════
//  Section 3: TextField Widget API
// ════════════════════════════════════════════════════

writeText(screen, 2, 17, "3. TextField Widget (StatefulWidget):", bold);

writeText(screen, 4, 18, "new TextField({", codeStyle);
writeText(screen, 4, 19, '  controller: new TextEditingController(),', codeStyle);
writeText(screen, 4, 20, '  placeholder: "Type here...",', codeStyle);
writeText(screen, 4, 21, "  readOnly: false,", codeStyle);
writeText(screen, 4, 22, "})", codeStyle);

// ════════════════════════════════════════════════════
//  Footer
// ════════════════════════════════════════════════════

writeText(screen, 2, 23, "Emacs bindings: Ctrl+K (kill to EOL), Ctrl+Y (yank), Ctrl+A/E (home/end)", dimStyle);

// Cleanup
ctrl.dispose();
ctrl2.dispose();
ctrl3.dispose();

// ════════════════════════════════════════════════════
//  Render
// ════════════════════════════════════════════════════

const renderer = new AnsiRenderer();
process.stdout.write(renderer.renderFull(screen));
console.log("\n");
