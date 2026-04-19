/**
 * TUI Text Rendering Demo -- Text, RichText, and TextSpan showcase.
 *
 * Demonstrates the Flitter TUI text rendering pipeline:
 *   TextSpan -> RenderParagraph -> layout -> paint(Screen) -> AnsiRenderer -> stdout
 *
 * Run: bun run examples/tui-text-demo.ts
 *
 * @module
 */

import { Screen } from "../packages/tui/src/screen/screen.js";
import { AnsiRenderer } from "../packages/tui/src/screen/ansi-renderer.js";
import { BoxConstraints } from "../packages/tui/src/tree/constraints.js";
import { Color } from "../packages/tui/src/screen/color.js";
import { TextStyle } from "../packages/tui/src/screen/text-style.js";
import { TextSpan } from "../packages/tui/src/widgets/text-span.js";
import { RenderParagraph } from "../packages/tui/src/widgets/rich-text.js";
import { ContainerRenderObject } from "../packages/tui/src/widgets/container.js";
import { EdgeInsets } from "../packages/tui/src/widgets/edge-insets.js";
import { BorderSide } from "../packages/tui/src/widgets/border-side.js";
import { Border } from "../packages/tui/src/widgets/border.js";
import { BoxDecoration } from "../packages/tui/src/widgets/box-decoration.js";

// ════════════════════════════════════════════════════
//  Helper: write a string directly to screen cells
// ════════════════════════════════════════════════════

function writeText(
  screen: Screen,
  x: number,
  y: number,
  text: string,
  style: TextStyle = TextStyle.NORMAL,
): void {
  for (let i = 0; i < text.length; i++) {
    screen.writeChar(x + i, y, text[i], style);
  }
}

// ════════════════════════════════════════════════════
//  Helper: draw a bordered section
// ════════════════════════════════════════════════════

function drawSection(
  screen: Screen,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  borderColor: Color = Color.brightBlack(),
): void {
  const border = Border.all(new BorderSide(borderColor, 1, "rounded"));
  const decoration = new BoxDecoration({ border });
  const container = new ContainerRenderObject(w, h, undefined, undefined, decoration);
  container.layout(BoxConstraints.tight(w, h));
  container.paint(screen, x, y);

  // Write title label inside the top border
  const titleStyle = new TextStyle({ foreground: borderColor, bold: true });
  writeText(screen, x + 2, y, ` ${title} `, titleStyle);
}

// ════════════════════════════════════════════════════
//  Helper: create RenderParagraph, layout, and paint
// ════════════════════════════════════════════════════

function renderSpan(
  screen: Screen,
  span: TextSpan,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number = 1,
): void {
  const rp = new RenderParagraph(span);
  rp.layout(BoxConstraints.loose(maxWidth, maxHeight));
  rp.paint(screen, x, y);
}

// ════════════════════════════════════════════════════
//  Setup
// ════════════════════════════════════════════════════

const W = 240;
const H = 60;
const screen = new Screen(W, H);

// ════════════════════════════════════════════════════
//  Title bar
// ════════════════════════════════════════════════════

const titleBg = Color.rgb(30, 60, 120);
screen.fill(0, 0, W, 1, " ", { bg: titleBg });
writeText(
  screen,
  2,
  0,
  "Flitter TUI Text Rendering Demo",
  new TextStyle({ foreground: Color.white(), background: titleBg, bold: true }),
);

// ════════════════════════════════════════════════════
//  Section 1: Plain Text & Text Decorations (left)
// ════════════════════════════════════════════════════

drawSection(screen, 0, 2, 39, 10, "Text Decorations", Color.cyan());

const labelStyle = new TextStyle({ foreground: Color.brightBlack() });

// 1. Plain text
writeText(screen, 2, 3, "Plain:", labelStyle);
renderSpan(screen, new TextSpan({ text: "Hello, Flitter!" }), 11, 3, 26);

// 2. Bold
writeText(screen, 2, 4, "Bold:", labelStyle);
renderSpan(
  screen,
  new TextSpan({ text: "Bold text here", style: new TextStyle({ bold: true }) }),
  11,
  4,
  26,
);

// 3. Italic
writeText(screen, 2, 5, "Italic:", labelStyle);
renderSpan(
  screen,
  new TextSpan({ text: "Italic text", style: new TextStyle({ italic: true }) }),
  11,
  5,
  26,
);

// 4. Underline
writeText(screen, 2, 6, "Underln:", labelStyle);
renderSpan(
  screen,
  new TextSpan({ text: "Underlined", style: new TextStyle({ underline: true }) }),
  11,
  6,
  26,
);

// 5. Strikethrough
writeText(screen, 2, 7, "Strike:", labelStyle);
renderSpan(
  screen,
  new TextSpan({ text: "Strikethrough", style: new TextStyle({ strikethrough: true }) }),
  11,
  7,
  26,
);

// 6. Dim
writeText(screen, 2, 8, "Dim:", labelStyle);
renderSpan(
  screen,
  new TextSpan({ text: "Dim / faded text", style: new TextStyle({ dim: true }) }),
  11,
  8,
  26,
);

// 7. Combined
writeText(screen, 2, 9, "Combo:", labelStyle);
renderSpan(
  screen,
  new TextSpan({
    text: "Bold+Italic+Uline",
    style: new TextStyle({ bold: true, italic: true, underline: true }),
  }),
  11,
  9,
  26,
);

// ════════════════════════════════════════════════════
//  Section 2: Foreground Colors (right)
// ════════════════════════════════════════════════════

drawSection(screen, 41, 2, 39, 10, "Foreground Colors", Color.yellow());

const colors: Array<[string, Color]> = [
  ["Red", Color.red()],
  ["Green", Color.green()],
  ["Blue", Color.blue()],
  ["Cyan", Color.cyan()],
  ["Magenta", Color.magenta()],
  ["Yellow", Color.yellow()],
  ["BrightWhite", Color.brightWhite()],
];

for (let i = 0; i < colors.length; i++) {
  const [name, color] = colors[i];
  const row = 3 + i;
  writeText(screen, 42, row, `${name}:`.padEnd(12), labelStyle);
  renderSpan(
    screen,
    new TextSpan({
      text: `This text is ${name.toLowerCase()}`,
      style: new TextStyle({ foreground: color }),
    }),
    54,
    row,
    24,
  );
}

// ════════════════════════════════════════════════════
//  Section 3: Background Colors (left, second row)
// ════════════════════════════════════════════════════

drawSection(screen, 0, 13, 39, 5, "Background Colors", Color.green());

const bgColors: Array<[string, Color, Color]> = [
  ["Red bg", Color.red(), Color.white()],
  ["Blue bg", Color.blue(), Color.white()],
  ["Green bg", Color.green(), Color.black()],
];

for (let i = 0; i < bgColors.length; i++) {
  const [label, bg, fg] = bgColors[i];
  const col = 2 + i * 13;
  renderSpan(
    screen,
    new TextSpan({
      text: ` ${label} `,
      style: new TextStyle({ background: bg, foreground: fg, bold: true }),
    }),
    col,
    14 + Math.floor(i / 3),
    12,
  );
}

// Second row of bg colors
const bgColors2: Array<[string, Color, Color]> = [
  ["Cyan bg", Color.cyan(), Color.black()],
  ["Magenta bg", Color.magenta(), Color.white()],
  ["Yellow bg", Color.yellow(), Color.black()],
];

for (let i = 0; i < bgColors2.length; i++) {
  const [label, bg, fg] = bgColors2[i];
  const col = 2 + i * 13;
  renderSpan(
    screen,
    new TextSpan({
      text: ` ${label} `,
      style: new TextStyle({ background: bg, foreground: fg, bold: true }),
    }),
    col,
    16,
    12,
  );
}

// ════════════════════════════════════════════════════
//  Section 4: RichText with Nested Spans (right)
// ════════════════════════════════════════════════════

drawSection(screen, 41, 13, 39, 5, "RichText (Nested Spans)", Color.magenta());

// A parent span with children having different styles
const richSpan = new TextSpan({
  text: "I am ",
  style: new TextStyle({ foreground: Color.white() }),
  children: [
    new TextSpan({
      text: "bold",
      style: new TextStyle({ bold: true, foreground: Color.red() }),
    }),
    new TextSpan({ text: ", " }),
    new TextSpan({
      text: "italic",
      style: new TextStyle({ italic: true, foreground: Color.green() }),
    }),
    new TextSpan({ text: ", and " }),
    new TextSpan({
      text: "underlined",
      style: new TextStyle({ underline: true, foreground: Color.cyan() }),
    }),
    new TextSpan({ text: "!" }),
  ],
});

renderSpan(screen, richSpan, 42, 14, 36);

// Second rich text example: a "syntax highlighted" code snippet
const codeSpan = new TextSpan({
  children: [
    new TextSpan({
      text: "const ",
      style: new TextStyle({ foreground: Color.magenta() }),
    }),
    new TextSpan({
      text: "greeting",
      style: new TextStyle({ foreground: Color.cyan() }),
    }),
    new TextSpan({
      text: " = ",
      style: new TextStyle({ foreground: Color.white() }),
    }),
    new TextSpan({
      text: '"Hello"',
      style: new TextStyle({ foreground: Color.yellow() }),
    }),
    new TextSpan({
      text: ";",
      style: new TextStyle({ foreground: Color.white() }),
    }),
  ],
});

renderSpan(screen, codeSpan, 42, 16, 36);

// ════════════════════════════════════════════════════
//  Section 5: Multi-line Text Wrapping (bottom)
// ════════════════════════════════════════════════════

drawSection(screen, 0, 19, 80, 4, "Multi-line Text Wrapping", Color.brightCyan());

const longText =
  "Flitter is a Flutter-for-Terminal UI framework. It renders styled text " +
  "using TextSpan trees, lays them out via RenderParagraph with BoxConstraints, " +
  "and paints to a double-buffered Screen with ANSI diff rendering.";

renderSpan(
  screen,
  new TextSpan({
    text: longText,
    style: new TextStyle({ foreground: Color.white() }),
  }),
  2,
  20,
  75,
  3,
);

// ════════════════════════════════════════════════════
//  Render to stdout
// ════════════════════════════════════════════════════

const renderer = new AnsiRenderer();
process.stdout.write(renderer.renderFull(screen));
console.log("\n");
