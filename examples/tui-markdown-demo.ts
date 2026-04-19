/**
 * TUI Markdown Demo — MarkdownParser & MarkdownRenderer showcase.
 *
 * Demonstrates Markdown → AST → TextSpan rendering pipeline.
 *
 * Run: bun run examples/tui-markdown-demo.ts
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
import { MarkdownParser } from "../packages/tui/src/markdown/markdown-parser.js";
import { MarkdownRenderer } from "../packages/tui/src/markdown/markdown-renderer.js";
import { RenderParagraph } from "../packages/tui/src/widgets/rich-text.js";
import { TextSpan } from "../packages/tui/src/widgets/text-span.js";

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
const bold = new TextStyle({ bold: true });
const dimStyle = new TextStyle({ dim: true });
const labelStyle = new TextStyle({ foreground: Color.yellow() });

// ════════════════════════════════════════════════════
//  Title
// ════════════════════════════════════════════════════

writeText(screen, 2, 0, "Flitter TUI Markdown Demo — Parser & Renderer", titleStyle);
writeText(screen, 2, 1, "━".repeat(47), dimStyle);

// ════════════════════════════════════════════════════
//  Section 1: Parse markdown and show AST
// ════════════════════════════════════════════════════

writeText(screen, 2, 3, "1. Markdown Source:", bold);

const markdownSource = `# Hello Flitter
This is **bold** and *italic* text.

- Item one
- Item two
- Item three

\`inline code\` and a [link](https://example.com)`;

// Show source in a bordered container
const srcBorder = Border.all(new BorderSide(Color.brightBlack(), 1, "rounded"));
const srcDeco = new BoxDecoration({ color: Color.rgb(25, 25, 35), border: srcBorder });
const srcRO = new ContainerRenderObject(36, 10, undefined, undefined, srcDeco);
srcRO.layout(BoxConstraints.tight(36, 10));
srcRO.paint(screen, 2, 4);

const srcLines = markdownSource.split("\n");
for (let i = 0; i < srcLines.length && i < 8; i++) {
  writeText(screen, 4, 5 + i, srcLines[i].slice(0, 33), new TextStyle({ foreground: Color.green() }));
}

// ════════════════════════════════════════════════════
//  Section 2: Parsed AST
// ════════════════════════════════════════════════════

writeText(screen, 40, 3, "2. Parsed AST (nodes):", bold);

const parser = new MarkdownParser();
const nodes = parser.parse(markdownSource);

// Show node types
let astY = 4;
for (let i = 0; i < nodes.length && astY < 14; i++) {
  const node = nodes[i];
  const typeStr = `[${node.type}]`;
  const valueStr = node.value
    ? ` "${node.value.slice(0, 25)}${node.value.length > 25 ? "..." : ""}"`
    : node.children
      ? ` (${node.children.length} children)`
      : "";
  writeText(screen, 42, astY, typeStr, new TextStyle({ foreground: Color.magenta() }));
  writeText(screen, 42 + typeStr.length, astY, valueStr.slice(0, 35 - typeStr.length), labelStyle);
  astY++;
}

// ════════════════════════════════════════════════════
//  Section 3: Rendered TextSpans
// ════════════════════════════════════════════════════

writeText(screen, 2, 15, "3. Rendered output (MarkdownRenderer → TextSpan → RenderParagraph):", bold);

const mdRenderer = new MarkdownRenderer();
const spans = mdRenderer.render(nodes);

// Create a bordered area for rendered output
const outBorder = Border.all(new BorderSide(Color.cyan(), 1, "rounded"));
const outDeco = new BoxDecoration({ border: outBorder });
const outRO = new ContainerRenderObject(76, 7, undefined, undefined, outDeco);
outRO.layout(BoxConstraints.tight(76, 7));
outRO.paint(screen, 2, 16);

// Render each span via RenderParagraph
let renderY = 17;
for (const span of spans) {
  if (renderY >= 22) break;
  const rp = new RenderParagraph(span);
  rp.layout(BoxConstraints.loose(72, 1));
  rp.paint(screen, 4, renderY);
  renderY++;
}

// ════════════════════════════════════════════════════
//  Footer
// ════════════════════════════════════════════════════

writeText(
  screen,
  2,
  23,
  "Pipeline: Markdown → parse() → MarkdownNode[] → render() → TextSpan[] → RenderParagraph",
  dimStyle,
);

// ════════════════════════════════════════════════════
//  Render
// ════════════════════════════════════════════════════

const renderer = new AnsiRenderer();
process.stdout.write(renderer.renderFull(screen));
console.log("\n");
