/**
 * TUI Markdown Demo — MarkdownParser & MarkdownRenderer showcase.
 *
 * Demonstrates all 10 markdown rendering features:
 * 1. Heading color grading (h1=blue bold, h2=cyan bold, h3=blue, h4=cyan)
 * 2. Prism.js syntax highlighting (language-aware)
 * 3. Table column width + alignment + Unicode box-drawing
 * 4. Blockquote colored left border
 * 5. Nested list indentation + bullet + checkmark
 * 6. OSC 8 clickable links
 * 7. Image node rendering
 * 8. Smart paragraph spacing
 * 9. Inline code bold
 * 10. MarkdownTheme integration
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
import { MarkdownParser } from "../packages/tui/src/markdown/markdown-parser.js";
import { MarkdownRenderer } from "../packages/tui/src/markdown/markdown-renderer.js";
import { RenderParagraph } from "../packages/tui/src/widgets/rich-text.js";
import { TextSpan } from "../packages/tui/src/widgets/text-span.js";

// ════════════════════════════════════════════════════
//  Markdown Source — exercises all 10 features
// ════════════════════════════════════════════════════

const markdownSource = `# Heading 1 (Blue + Bold)

## Heading 2 (Cyan + Bold)

### Heading 3 (Blue, no bold)

#### Heading 4 (Cyan, no bold)

This paragraph has \`inline code\` which is **yellow + bold** with a dark background.

Here is a [clickable link](https://example.com) rendered as OSC 8 hyperlink.

![screenshot](https://example.com/image.png)

> Blockquote with colored left border.
> Content is NOT dim — only the │ border has color.

- Top-level bullet
  - Nested bullet (indented)
    - Deep nested
- [✓] Checked task
- [ ] Unchecked task

1. Ordered item one
2. Ordered item two

| Name  | Language   | Stars |
|:------|:----------:|------:|
| React | JavaScript | 220k  |
| Vue   | TypeScript | 46k   |
| Svelte| JavaScript | 78k   |

\`\`\`typescript
interface User {
  name: string;
  age: number;
}

function greet(user: User): string {
  // Return greeting
  return \`Hello, \${user.name}!\`;
}
\`\`\`

\`\`\`python
def fibonacci(n: int) -> int:
    """Calculate nth Fibonacci number."""
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
\`\`\`

---

Thematic break above. Smart spacing: no double-newline inside blockquotes.
`;

// ════════════════════════════════════════════════════
//  Parse & Render
// ════════════════════════════════════════════════════

const parser = new MarkdownParser();
const renderer = new MarkdownRenderer();

const ast = parser.parse(markdownSource);
const spans = renderer.render(ast);

// ════════════════════════════════════════════════════
//  Output via RenderParagraph
// ════════════════════════════════════════════════════

const W = 100;
const H = 80;
const screen = new Screen(W, H);

const titleStyle = new TextStyle({ foreground: Color.cyan(), bold: true });
const dimStyle = new TextStyle({ dim: true });

// Title
const title = "Flitter Markdown Rendering — All 10 Gaps Closed";
for (let i = 0; i < title.length && i < W; i++) {
  screen.writeChar(i + 2, 0, title[i], titleStyle);
}
const sep = "━".repeat(title.length);
for (let i = 0; i < sep.length && i < W; i++) {
  screen.writeChar(i + 2, 1, sep[i], dimStyle);
}

// Render markdown spans into the screen via RenderParagraph
const rootSpan = new TextSpan({ children: spans });
const rp = new RenderParagraph(rootSpan);
rp.layout(BoxConstraints.loose(W - 4, H - 4));
rp.paint(screen, 2, 3);

// ════════════════════════════════════════════════════
//  Output
// ════════════════════════════════════════════════════

const ansi = new AnsiRenderer();
process.stdout.write(ansi.renderFull(screen));
console.log("\n");
