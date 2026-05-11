/**
 * TUI Markdown Demo — MarkdownView Widget showcase.
 *
 * Demonstrates all 10 markdown rendering features via the new MarkdownView Widget API:
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

import { runApp } from "../packages/tui/src/binding/run-app.js";
import { WidgetsBinding } from "../packages/tui/src/binding/widgets-binding.js";
import { MarkdownView } from "../packages/tui/src/markdown/markdown-view.js";
import { Color } from "../packages/tui/src/screen/color.js";
import { TextStyle } from "../packages/tui/src/screen/text-style.js";
import type { Widget as WidgetInterface } from "../packages/tui/src/tree/element.js";
import type { Widget } from "../packages/tui/src/tree/widget.js";
import { Column } from "../packages/tui/src/widgets/column.js";
import { Text } from "../packages/tui/src/widgets/text.js";

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
//  Run the app with MarkdownView Widget
// ════════════════════════════════════════════════════

// Auto-exit after 3 seconds so the demo doesn't hang
setTimeout(() => {
  WidgetsBinding.instance.stop();
}, 3000);

await runApp(
  new Column({
    children: [
      new Text({
        data: "Flitter Markdown Rendering — MarkdownView Widget Demo",
        style: new TextStyle({ foreground: Color.cyan(), bold: true }),
      }) as unknown as Widget,
      new MarkdownView({ content: markdownSource }) as unknown as Widget,
    ],
  }) as unknown as WidgetInterface,
);
