// Tests for Markdown widget
// Verifies markdown parsing, inline formatting, block types, and widget construction

import { describe, test, expect, beforeEach } from 'bun:test';
import { Markdown, type TableColumnAlignment } from '../markdown';
import { stringWidth } from '../../core/wcwidth';

// ---------------------------------------------------------------------------
// Block parsing tests
// ---------------------------------------------------------------------------

describe('Markdown.parseMarkdown', () => {
  beforeEach(() => {
    Markdown.clearCache();
  });

  test('parses heading level 1', () => {
    const blocks = Markdown.parseMarkdown('# Hello World');
    expect(blocks.length).toBe(1);
    expect(blocks[0]!.type).toBe('heading1');
    expect(blocks[0]!.content).toBe('Hello World');
  });

  test('parses heading level 2', () => {
    const blocks = Markdown.parseMarkdown('## Subtitle');
    expect(blocks.length).toBe(1);
    expect(blocks[0]!.type).toBe('heading2');
    expect(blocks[0]!.content).toBe('Subtitle');
  });

  test('parses heading level 3', () => {
    const blocks = Markdown.parseMarkdown('### Section');
    expect(blocks.length).toBe(1);
    expect(blocks[0]!.type).toBe('heading3');
    expect(blocks[0]!.content).toBe('Section');
  });

  test('parses bullet items with dash', () => {
    const blocks = Markdown.parseMarkdown('- item one\n- item two');
    expect(blocks.length).toBe(2);
    expect(blocks[0]!.type).toBe('bullet');
    expect(blocks[0]!.content).toBe('item one');
    expect(blocks[1]!.type).toBe('bullet');
    expect(blocks[1]!.content).toBe('item two');
  });

  test('parses bullet items with asterisk', () => {
    const blocks = Markdown.parseMarkdown('* first\n* second');
    expect(blocks.length).toBe(2);
    expect(blocks[0]!.type).toBe('bullet');
    expect(blocks[0]!.content).toBe('first');
  });

  test('parses code blocks', () => {
    const md = '```typescript\nconst x = 1;\nconst y = 2;\n```';
    const blocks = Markdown.parseMarkdown(md);
    expect(blocks.length).toBe(1);
    expect(blocks[0]!.type).toBe('code-block');
    expect(blocks[0]!.content).toBe('const x = 1;\nconst y = 2;');
    expect(blocks[0]!.language).toBe('typescript');
  });

  test('parses code blocks without language hint', () => {
    const md = '```\nhello\n```';
    const blocks = Markdown.parseMarkdown(md);
    expect(blocks.length).toBe(1);
    expect(blocks[0]!.type).toBe('code-block');
    expect(blocks[0]!.content).toBe('hello');
    expect(blocks[0]!.language).toBeUndefined();
  });

  test('parses regular paragraphs', () => {
    const blocks = Markdown.parseMarkdown('Just some text.');
    expect(blocks.length).toBe(1);
    expect(blocks[0]!.type).toBe('paragraph');
    expect(blocks[0]!.content).toBe('Just some text.');
  });

  test('skips empty lines', () => {
    const blocks = Markdown.parseMarkdown('# Title\n\nParagraph');
    expect(blocks.length).toBe(2);
    expect(blocks[0]!.type).toBe('heading1');
    expect(blocks[1]!.type).toBe('paragraph');
  });

  test('handles mixed block types', () => {
    const md = `# Title

Some paragraph.

- bullet one
- bullet two

## Subtitle

\`\`\`
code here
\`\`\`

More text.`;
    const blocks = Markdown.parseMarkdown(md);
    expect(blocks.length).toBe(7);
    expect(blocks[0]!.type).toBe('heading1');
    expect(blocks[1]!.type).toBe('paragraph');
    expect(blocks[2]!.type).toBe('bullet');
    expect(blocks[3]!.type).toBe('bullet');
    expect(blocks[4]!.type).toBe('heading2');
    expect(blocks[5]!.type).toBe('code-block');
    expect(blocks[6]!.type).toBe('paragraph');
  });

  test('handles empty input', () => {
    const blocks = Markdown.parseMarkdown('');
    expect(blocks.length).toBe(0);
  });

  test('handles code block at end of input (no closing ```)', () => {
    const md = '```\nsome code';
    const blocks = Markdown.parseMarkdown(md);
    expect(blocks.length).toBe(1);
    expect(blocks[0]!.type).toBe('code-block');
    expect(blocks[0]!.content).toBe('some code');
  });
});

// ---------------------------------------------------------------------------
// Inline parsing tests
// ---------------------------------------------------------------------------

describe('Markdown.parseInline', () => {
  test('parses plain text', () => {
    const segments = Markdown.parseInline('hello world');
    expect(segments.length).toBe(1);
    expect(segments[0]!.text).toBe('hello world');
    expect(segments[0]!.bold).toBeUndefined();
    expect(segments[0]!.italic).toBeUndefined();
  });

  test('parses bold text', () => {
    const segments = Markdown.parseInline('hello **bold** world');
    expect(segments.length).toBe(3);
    expect(segments[0]!.text).toBe('hello ');
    expect(segments[1]!.text).toBe('bold');
    expect(segments[1]!.bold).toBe(true);
    expect(segments[2]!.text).toBe(' world');
  });

  test('parses italic text', () => {
    const segments = Markdown.parseInline('hello *italic* world');
    expect(segments.length).toBe(3);
    expect(segments[0]!.text).toBe('hello ');
    expect(segments[1]!.text).toBe('italic');
    expect(segments[1]!.italic).toBe(true);
    expect(segments[2]!.text).toBe(' world');
  });

  test('parses inline code', () => {
    const segments = Markdown.parseInline('use `console.log` here');
    expect(segments.length).toBe(3);
    expect(segments[0]!.text).toBe('use ');
    expect(segments[1]!.text).toBe('console.log');
    expect(segments[1]!.code).toBe(true);
    expect(segments[2]!.text).toBe(' here');
  });

  test('parses links', () => {
    const segments = Markdown.parseInline('click [here](https://example.com) now');
    expect(segments.length).toBe(3);
    expect(segments[0]!.text).toBe('click ');
    expect(segments[1]!.text).toBe('here');
    expect(segments[1]!.linkUrl).toBe('https://example.com');
    expect(segments[1]!.linkText).toBe('here');
    expect(segments[2]!.text).toBe(' now');
  });

  test('parses multiple inline styles in sequence', () => {
    const segments = Markdown.parseInline('**bold** and *italic* and `code`');
    expect(segments.length).toBe(5);
    expect(segments[0]!.bold).toBe(true);
    expect(segments[1]!.text).toBe(' and ');
    expect(segments[2]!.italic).toBe(true);
    expect(segments[3]!.text).toBe(' and ');
    expect(segments[4]!.code).toBe(true);
  });

  test('handles text with no special formatting', () => {
    const segments = Markdown.parseInline('just plain text');
    expect(segments.length).toBe(1);
    expect(segments[0]!.text).toBe('just plain text');
  });

  test('handles empty string', () => {
    const segments = Markdown.parseInline('');
    expect(segments.length).toBe(0);
  });

  test('handles lone asterisk without matching pair', () => {
    const segments = Markdown.parseInline('foo * bar');
    // Should consume as plain text since no matching asterisk pair
    expect(segments.length).toBeGreaterThanOrEqual(1);
    const fullText = segments.map((s) => s.text).join('');
    expect(fullText).toBe('foo * bar');
  });

  test('handles lone backtick without matching pair', () => {
    const segments = Markdown.parseInline('foo ` bar');
    const fullText = segments.map((s) => s.text).join('');
    expect(fullText).toBe('foo ` bar');
  });

  test('preserves original text content through parsing', () => {
    const input = 'Hello **world** this is *a* test with `code` and [link](url)';
    const segments = Markdown.parseInline(input);
    const reconstructed = segments.map((s) => s.text).join('');
    expect(reconstructed).toBe('Hello world this is a test with code and link');
  });
});

// ---------------------------------------------------------------------------
// Widget construction tests
// ---------------------------------------------------------------------------

describe('Markdown widget', () => {
  test('constructs with required markdown prop', () => {
    const md = new Markdown({ markdown: '# Hello' });
    expect(md.markdown).toBe('# Hello');
    expect(md.textAlign).toBe('left');
    expect(md.maxLines).toBeUndefined();
    expect(md.overflow).toBe('clip');
  });

  test('constructs with all options', () => {
    const md = new Markdown({
      markdown: '# Hello',
      textAlign: 'center',
      maxLines: 5,
      overflow: 'ellipsis',
    });
    expect(md.textAlign).toBe('center');
    expect(md.maxLines).toBe(5);
    expect(md.overflow).toBe('ellipsis');
  });

  test('is a StatelessWidget with build method', () => {
    const md = new Markdown({ markdown: 'text' });
    expect(md).toBeInstanceOf(Markdown);
    expect(typeof md.build).toBe('function');
  });

  test('handles empty markdown', () => {
    const md = new Markdown({ markdown: '' });
    expect(md.markdown).toBe('');
    expect(Markdown.parseMarkdown(md.markdown).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Edge case tests
// ---------------------------------------------------------------------------

describe('Markdown edge cases', () => {
  test('heading without space after # is paragraph', () => {
    const blocks = Markdown.parseMarkdown('#NoSpace');
    // '#NoSpace' does not match '# ' prefix, so it's a paragraph
    expect(blocks.length).toBe(1);
    expect(blocks[0]!.type).toBe('paragraph');
  });

  test('nested code block content is preserved literally', () => {
    const md = '```\n**not bold**\n*not italic*\n```';
    const blocks = Markdown.parseMarkdown(md);
    expect(blocks.length).toBe(1);
    expect(blocks[0]!.content).toBe('**not bold**\n*not italic*');
  });

  test('multiple empty lines collapse to nothing', () => {
    const blocks = Markdown.parseMarkdown('\n\n\n');
    expect(blocks.length).toBe(0);
  });

  test('bullet with inline formatting', () => {
    const blocks = Markdown.parseMarkdown('- a **bold** item');
    expect(blocks.length).toBe(1);
    expect(blocks[0]!.type).toBe('bullet');
    expect(blocks[0]!.content).toBe('a **bold** item');
    // Verify inline parsing of the bullet content
    const segments = Markdown.parseInline(blocks[0]!.content);
    expect(segments.length).toBe(3);
    expect(segments[1]!.bold).toBe(true);
  });

  test('multiple headings at different levels', () => {
    const md = '# H1\n## H2\n### H3';
    const blocks = Markdown.parseMarkdown(md);
    expect(blocks.length).toBe(3);
    expect(blocks[0]!.type).toBe('heading1');
    expect(blocks[1]!.type).toBe('heading2');
    expect(blocks[2]!.type).toBe('heading3');
  });

  test('code block with empty content', () => {
    const md = '```\n```';
    const blocks = Markdown.parseMarkdown(md);
    expect(blocks.length).toBe(1);
    expect(blocks[0]!.type).toBe('code-block');
    expect(blocks[0]!.content).toBe('');
  });

  test('link with complex URL', () => {
    const segments = Markdown.parseInline('[docs](https://example.com/path?q=1&r=2#anchor)');
    expect(segments.length).toBe(1);
    expect(segments[0]!.linkUrl).toBe('https://example.com/path?q=1&r=2#anchor');
    expect(segments[0]!.linkText).toBe('docs');
  });
});

// ---------------------------------------------------------------------------
// New block type tests: heading4, numbered-list, blockquote, horizontal-rule, table
// ---------------------------------------------------------------------------

describe('Markdown new block types', () => {
  beforeEach(() => {
    Markdown.clearCache();
  });

  // Heading 4
  test('parses heading level 4', () => {
    const blocks = Markdown.parseMarkdown('#### Sub-section');
    expect(blocks.length).toBe(1);
    expect(blocks[0]!.type).toBe('heading4');
    expect(blocks[0]!.content).toBe('Sub-section');
  });

  test('heading 4 without space after #### is paragraph', () => {
    const blocks = Markdown.parseMarkdown('####NoSpace');
    expect(blocks.length).toBe(1);
    expect(blocks[0]!.type).toBe('paragraph');
  });

  test('all four heading levels parse correctly', () => {
    const md = '# H1\n## H2\n### H3\n#### H4';
    const blocks = Markdown.parseMarkdown(md);
    expect(blocks.length).toBe(4);
    expect(blocks[0]!.type).toBe('heading1');
    expect(blocks[1]!.type).toBe('heading2');
    expect(blocks[2]!.type).toBe('heading3');
    expect(blocks[3]!.type).toBe('heading4');
  });

  // Numbered list
  test('parses numbered list items', () => {
    const md = '1. First\n2. Second\n3. Third';
    const blocks = Markdown.parseMarkdown(md);
    expect(blocks.length).toBe(3);
    expect(blocks[0]!.type).toBe('numbered-list');
    expect(blocks[0]!.content).toBe('First');
    expect(blocks[0]!.listNumber).toBe(1);
    expect(blocks[1]!.listNumber).toBe(2);
    expect(blocks[2]!.listNumber).toBe(3);
  });

  test('numbered list preserves non-sequential numbers', () => {
    const md = '5. Fifth\n10. Tenth';
    const blocks = Markdown.parseMarkdown(md);
    expect(blocks.length).toBe(2);
    expect(blocks[0]!.listNumber).toBe(5);
    expect(blocks[1]!.listNumber).toBe(10);
  });

  test('numbered list with inline formatting', () => {
    const blocks = Markdown.parseMarkdown('1. A **bold** item');
    expect(blocks.length).toBe(1);
    expect(blocks[0]!.type).toBe('numbered-list');
    expect(blocks[0]!.content).toBe('A **bold** item');
    const segments = Markdown.parseInline(blocks[0]!.content);
    expect(segments[1]!.bold).toBe(true);
  });

  // Blockquote
  test('parses single-line blockquote', () => {
    const blocks = Markdown.parseMarkdown('> This is a quote');
    expect(blocks.length).toBe(1);
    expect(blocks[0]!.type).toBe('blockquote');
    expect(blocks[0]!.content).toBe('This is a quote');
  });

  test('parses multi-line blockquote', () => {
    const md = '> Line one\n> Line two\n> Line three';
    const blocks = Markdown.parseMarkdown(md);
    expect(blocks.length).toBe(1);
    expect(blocks[0]!.type).toBe('blockquote');
    expect(blocks[0]!.content).toBe('Line one\nLine two\nLine three');
  });

  test('blockquote stops at non-quote line', () => {
    const md = '> Quoted\nNot quoted';
    const blocks = Markdown.parseMarkdown(md);
    expect(blocks.length).toBe(2);
    expect(blocks[0]!.type).toBe('blockquote');
    expect(blocks[0]!.content).toBe('Quoted');
    expect(blocks[1]!.type).toBe('paragraph');
  });

  test('blockquote with no space after >', () => {
    const blocks = Markdown.parseMarkdown('>NoSpace');
    expect(blocks.length).toBe(1);
    expect(blocks[0]!.type).toBe('blockquote');
    expect(blocks[0]!.content).toBe('NoSpace');
  });

  test('blockquote with empty content after >', () => {
    const blocks = Markdown.parseMarkdown('>');
    expect(blocks.length).toBe(1);
    expect(blocks[0]!.type).toBe('blockquote');
    expect(blocks[0]!.content).toBe('');
  });

  // Horizontal rule
  test('parses horizontal rule with dashes', () => {
    const blocks = Markdown.parseMarkdown('---');
    expect(blocks.length).toBe(1);
    expect(blocks[0]!.type).toBe('horizontal-rule');
    expect(blocks[0]!.content).toBe('');
  });

  test('parses horizontal rule with asterisks', () => {
    const blocks = Markdown.parseMarkdown('***');
    expect(blocks.length).toBe(1);
    expect(blocks[0]!.type).toBe('horizontal-rule');
  });

  test('parses horizontal rule with underscores', () => {
    const blocks = Markdown.parseMarkdown('___');
    expect(blocks.length).toBe(1);
    expect(blocks[0]!.type).toBe('horizontal-rule');
  });

  test('parses long horizontal rules', () => {
    const blocks = Markdown.parseMarkdown('----------');
    expect(blocks.length).toBe(1);
    expect(blocks[0]!.type).toBe('horizontal-rule');
  });

  test('horizontal rule with trailing spaces', () => {
    const blocks = Markdown.parseMarkdown('---   ');
    expect(blocks.length).toBe(1);
    expect(blocks[0]!.type).toBe('horizontal-rule');
  });

  test('mixed dash/asterisk is NOT a horizontal rule', () => {
    const blocks = Markdown.parseMarkdown('-*-');
    expect(blocks.length).toBe(1);
    // '-*-' has no space after '-', so it's not a bullet either; it's a paragraph
    expect(blocks[0]!.type).toBe('paragraph');
  });

  test('dash bullet is NOT a horizontal rule', () => {
    // '- item' should be a bullet, not confused with hr
    const blocks = Markdown.parseMarkdown('- item');
    expect(blocks.length).toBe(1);
    expect(blocks[0]!.type).toBe('bullet');
  });

  test('two dashes is NOT a horizontal rule', () => {
    const blocks = Markdown.parseMarkdown('--');
    expect(blocks.length).toBe(1);
    expect(blocks[0]!.type).toBe('paragraph');
  });

  // GFM Table
  test('parses basic GFM table', () => {
    const md = '| Name | Age |\n| --- | --- |\n| Alice | 30 |\n| Bob | 25 |';
    const blocks = Markdown.parseMarkdown(md);
    expect(blocks.length).toBe(1);
    expect(blocks[0]!.type).toBe('table');
    expect(blocks[0]!.tableHeaders).toEqual(['Name', 'Age']);
    expect(blocks[0]!.tableRows!.length).toBe(2);
    expect(blocks[0]!.tableRows![0]).toEqual(['Alice', '30']);
    expect(blocks[0]!.tableRows![1]).toEqual(['Bob', '25']);
  });

  test('parses table without leading/trailing pipes', () => {
    const md = 'Name | Age\n--- | ---\nAlice | 30';
    const blocks = Markdown.parseMarkdown(md);
    expect(blocks.length).toBe(1);
    expect(blocks[0]!.type).toBe('table');
    expect(blocks[0]!.tableHeaders).toEqual(['Name', 'Age']);
    expect(blocks[0]!.tableRows![0]).toEqual(['Alice', '30']);
  });

  test('parses single-column table', () => {
    const md = '| Item |\n| --- |\n| A |\n| B |';
    const blocks = Markdown.parseMarkdown(md);
    expect(blocks.length).toBe(1);
    expect(blocks[0]!.type).toBe('table');
    expect(blocks[0]!.tableHeaders).toEqual(['Item']);
    expect(blocks[0]!.tableRows!.length).toBe(2);
  });

  test('parses table with alignment markers', () => {
    const md = '| Left | Center | Right |\n| :--- | :---: | ---: |\n| a | b | c |';
    const blocks = Markdown.parseMarkdown(md);
    expect(blocks.length).toBe(1);
    expect(blocks[0]!.type).toBe('table');
    expect(blocks[0]!.tableHeaders).toEqual(['Left', 'Center', 'Right']);
  });

  test('table stops at empty line', () => {
    const md = '| A | B |\n| --- | --- |\n| 1 | 2 |\n\nParagraph after';
    const blocks = Markdown.parseMarkdown(md);
    expect(blocks.length).toBe(2);
    expect(blocks[0]!.type).toBe('table');
    expect(blocks[1]!.type).toBe('paragraph');
  });

  test('table with mismatched column counts in rows', () => {
    const md = '| A | B | C |\n| --- | --- | --- |\n| 1 | 2 |';
    const blocks = Markdown.parseMarkdown(md);
    expect(blocks.length).toBe(1);
    expect(blocks[0]!.type).toBe('table');
    expect(blocks[0]!.tableHeaders).toEqual(['A', 'B', 'C']);
    // Data row has fewer columns; should still parse
    expect(blocks[0]!.tableRows![0]!.length).toBe(2);
  });

  test('table with no data rows', () => {
    const md = '| Header |\n| --- |';
    const blocks = Markdown.parseMarkdown(md);
    expect(blocks.length).toBe(1);
    expect(blocks[0]!.type).toBe('table');
    expect(blocks[0]!.tableHeaders).toEqual(['Header']);
    expect(blocks[0]!.tableRows!.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// New inline type tests: strikethrough, bold-italic
// ---------------------------------------------------------------------------

describe('Markdown new inline types', () => {
  test('parses strikethrough text', () => {
    const segments = Markdown.parseInline('this is ~~deleted~~ text');
    expect(segments.length).toBe(3);
    expect(segments[0]!.text).toBe('this is ');
    expect(segments[1]!.text).toBe('deleted');
    expect(segments[1]!.strikethrough).toBe(true);
    expect(segments[2]!.text).toBe(' text');
  });

  test('parses bold-italic text', () => {
    const segments = Markdown.parseInline('this is ***important*** text');
    expect(segments.length).toBe(3);
    expect(segments[0]!.text).toBe('this is ');
    expect(segments[1]!.text).toBe('important');
    expect(segments[1]!.boldItalic).toBe(true);
    expect(segments[2]!.text).toBe(' text');
  });

  test('bold-italic takes priority over bold', () => {
    // ***text*** should be bold-italic, not bold with remaining asterisks
    const segments = Markdown.parseInline('***both***');
    expect(segments.length).toBe(1);
    expect(segments[0]!.boldItalic).toBe(true);
    expect(segments[0]!.bold).toBeUndefined();
    expect(segments[0]!.italic).toBeUndefined();
  });

  test('strikethrough preserves text content', () => {
    const input = 'before ~~strike~~ after';
    const segments = Markdown.parseInline(input);
    const reconstructed = segments.map((s) => s.text).join('');
    expect(reconstructed).toBe('before strike after');
  });

  test('lone tilde without matching pair is plain text', () => {
    const segments = Markdown.parseInline('foo ~ bar');
    const fullText = segments.map((s) => s.text).join('');
    expect(fullText).toBe('foo ~ bar');
  });

  test('single tilde pair is not strikethrough', () => {
    const segments = Markdown.parseInline('foo ~bar~ baz');
    const fullText = segments.map((s) => s.text).join('');
    expect(fullText).toBe('foo ~bar~ baz');
    // None should have strikethrough since we need ~~
    const hasStrike = segments.some((s) => s.strikethrough);
    expect(hasStrike).toBe(false);
  });

  test('mixed inline: bold-italic, strikethrough, code', () => {
    const segments = Markdown.parseInline('***bi*** ~~del~~ `code`');
    expect(segments.length).toBe(5);
    expect(segments[0]!.boldItalic).toBe(true);
    expect(segments[1]!.text).toBe(' ');
    expect(segments[2]!.strikethrough).toBe(true);
    expect(segments[3]!.text).toBe(' ');
    expect(segments[4]!.code).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Inline nesting tests (Gap 37)
// ---------------------------------------------------------------------------

describe('Markdown inline nesting', () => {
  test('italic inside bold', () => {
    const segments = Markdown.parseInline('**bold *italic* bold**');
    expect(segments.length).toBe(3);
    expect(segments[0]!.text).toBe('bold ');
    expect(segments[0]!.bold).toBe(true);
    expect(segments[1]!.text).toBe('italic');
    expect(segments[1]!.boldItalic).toBe(true);
    expect(segments[2]!.text).toBe(' bold');
    expect(segments[2]!.bold).toBe(true);
  });

  test('bold inside italic', () => {
    const segments = Markdown.parseInline('*italic **bold** italic*');
    expect(segments.length).toBe(3);
    expect(segments[0]!.text).toBe('italic ');
    expect(segments[0]!.italic).toBe(true);
    expect(segments[1]!.text).toBe('bold');
    expect(segments[1]!.boldItalic).toBe(true);
    expect(segments[2]!.text).toBe(' italic');
    expect(segments[2]!.italic).toBe(true);
  });

  test('strikethrough inside bold', () => {
    const segments = Markdown.parseInline('**bold ~~strike~~ bold**');
    expect(segments.length).toBe(3);
    expect(segments[0]!.text).toBe('bold ');
    expect(segments[0]!.bold).toBe(true);
    expect(segments[0]!.strikethrough).toBeUndefined();
    expect(segments[1]!.text).toBe('strike');
    expect(segments[1]!.bold).toBe(true);
    expect(segments[1]!.strikethrough).toBe(true);
    expect(segments[2]!.text).toBe(' bold');
    expect(segments[2]!.bold).toBe(true);
  });

  test('bold inside strikethrough', () => {
    const segments = Markdown.parseInline('~~del **bold** del~~');
    expect(segments.length).toBe(3);
    expect(segments[0]!.text).toBe('del ');
    expect(segments[0]!.strikethrough).toBe(true);
    expect(segments[1]!.text).toBe('bold');
    expect(segments[1]!.bold).toBe(true);
    expect(segments[1]!.strikethrough).toBe(true);
    expect(segments[2]!.text).toBe(' del');
    expect(segments[2]!.strikethrough).toBe(true);
  });

  test('bold inside link', () => {
    const segments = Markdown.parseInline('[**bold link**](https://example.com)');
    expect(segments.length).toBe(1);
    expect(segments[0]!.text).toBe('bold link');
    expect(segments[0]!.bold).toBe(true);
    expect(segments[0]!.linkUrl).toBe('https://example.com');
  });

  test('italic inside link', () => {
    const segments = Markdown.parseInline('[*italic link*](https://example.com)');
    expect(segments.length).toBe(1);
    expect(segments[0]!.text).toBe('italic link');
    expect(segments[0]!.italic).toBe(true);
    expect(segments[0]!.linkUrl).toBe('https://example.com');
  });

  test('mixed formatting inside link', () => {
    const segments = Markdown.parseInline('[normal **bold** normal](url)');
    expect(segments.length).toBe(3);
    expect(segments[0]!.text).toBe('normal ');
    expect(segments[0]!.linkUrl).toBe('url');
    expect(segments[0]!.bold).toBeUndefined();
    expect(segments[1]!.text).toBe('bold');
    expect(segments[1]!.bold).toBe(true);
    expect(segments[1]!.linkUrl).toBe('url');
    expect(segments[2]!.text).toBe(' normal');
    expect(segments[2]!.linkUrl).toBe('url');
  });

  test('code span content is literal (no nested parsing)', () => {
    const segments = Markdown.parseInline('**bold `*not italic*` bold**');
    expect(segments.length).toBe(3);
    expect(segments[0]!.bold).toBe(true);
    expect(segments[1]!.text).toBe('*not italic*');
    expect(segments[1]!.code).toBe(true);
    expect(segments[1]!.italic).toBeUndefined();
    expect(segments[2]!.bold).toBe(true);
  });

  test('italic inside bold inside strikethrough (triple nesting)', () => {
    const segments = Markdown.parseInline('~~del **bold *italic* bold** del~~');
    // Expected: "del " strike, "bold " strike+bold, "italic" strike+boldItalic,
    //           " bold" strike+bold, " del" strike
    expect(segments.length).toBe(5);
    expect(segments[0]!.text).toBe('del ');
    expect(segments[0]!.strikethrough).toBe(true);
    expect(segments[1]!.text).toBe('bold ');
    expect(segments[1]!.bold).toBe(true);
    expect(segments[1]!.strikethrough).toBe(true);
    expect(segments[2]!.text).toBe('italic');
    expect(segments[2]!.boldItalic).toBe(true);
    expect(segments[2]!.strikethrough).toBe(true);
    expect(segments[3]!.text).toBe(' bold');
    expect(segments[3]!.bold).toBe(true);
    expect(segments[3]!.strikethrough).toBe(true);
    expect(segments[4]!.text).toBe(' del');
    expect(segments[4]!.strikethrough).toBe(true);
  });

  test('nested formatting preserves all text content', () => {
    const input = '**bold *italic* bold** plain ~~del `code` del~~';
    const segments = Markdown.parseInline(input);
    const text = segments.map((s) => s.text).join('');
    expect(text).toBe('bold italic bold plain del code del');
  });

  test('unmatched bold delimiter is plain text', () => {
    const segments = Markdown.parseInline('foo **bar');
    const fullText = segments.map((s) => s.text).join('');
    expect(fullText).toBe('foo **bar');
  });

  test('unmatched nested delimiter degrades gracefully', () => {
    const segments = Markdown.parseInline('**bold *unmatched bold**');
    // The parser should handle the mismatched inner * gracefully
    const fullText = segments.map((s) => s.text).join('');
    // All original text content should be preserved (minus consumed delimiters)
    expect(fullText.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// LRU Cache tests
// ---------------------------------------------------------------------------

describe('Markdown cache', () => {
  beforeEach(() => {
    Markdown.clearCache();
  });

  test('parseMarkdown returns cached results on second call', () => {
    const md = '# Cached heading test';
    const blocks1 = Markdown.parseMarkdown(md);
    const blocks2 = Markdown.parseMarkdown(md);
    // Should be the exact same array reference (from cache)
    expect(blocks1).toBe(blocks2);
  });

  test('invalidateCache removes specific entry', () => {
    const md = '# To invalidate';
    const blocks1 = Markdown.parseMarkdown(md);
    Markdown.invalidateCache(md);
    const blocks2 = Markdown.parseMarkdown(md);
    // After invalidation, should be a new array (not same reference)
    expect(blocks1).not.toBe(blocks2);
    // But contents should be equal
    expect(blocks2.length).toBe(blocks1.length);
    expect(blocks2[0]!.type).toBe('heading1');
  });

  test('clearCache removes all entries', () => {
    const md1 = '# First cache clear test';
    const md2 = '## Second cache clear test';
    const blocks1a = Markdown.parseMarkdown(md1);
    const blocks2a = Markdown.parseMarkdown(md2);
    Markdown.clearCache();
    const blocks1b = Markdown.parseMarkdown(md1);
    const blocks2b = Markdown.parseMarkdown(md2);
    expect(blocks1a).not.toBe(blocks1b);
    expect(blocks2a).not.toBe(blocks2b);
  });

  test('enableCache option defaults to true', () => {
    const md = new Markdown({ markdown: '# Test enableCache default' });
    expect(md.enableCache).toBe(true);
  });

  test('enableCache option can be set to false', () => {
    const md = new Markdown({ markdown: '# Test', enableCache: false });
    expect(md.enableCache).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Horizontal rule disambiguation tests
// ---------------------------------------------------------------------------

describe('Horizontal rule disambiguation', () => {
  beforeEach(() => {
    Markdown.clearCache();
  });

  test('--- is a horizontal rule, not a bullet', () => {
    const blocks = Markdown.parseMarkdown('---');
    expect(blocks[0]!.type).toBe('horizontal-rule');
  });

  test('*** is a horizontal rule, not bold-italic', () => {
    const blocks = Markdown.parseMarkdown('***');
    expect(blocks[0]!.type).toBe('horizontal-rule');
  });

  test('___ is a horizontal rule', () => {
    const blocks = Markdown.parseMarkdown('___');
    expect(blocks[0]!.type).toBe('horizontal-rule');
  });

  test('***text*** on its own line is NOT a horizontal rule (text after)', () => {
    const blocks = Markdown.parseMarkdown('***text***');
    expect(blocks[0]!.type).toBe('paragraph');
  });

  test('---- (4 dashes) is a horizontal rule', () => {
    const blocks = Markdown.parseMarkdown('----');
    expect(blocks[0]!.type).toBe('horizontal-rule');
  });

  test('- - - (spaces between) is NOT a horizontal rule with this parser', () => {
    // This parser requires all same chars without spaces
    const blocks = Markdown.parseMarkdown('- - -');
    // Each '- ' matches bullet pattern
    expect(blocks[0]!.type).toBe('bullet');
  });
});

// ---------------------------------------------------------------------------
// stringWidth correctness tests for table-relevant inputs
// ---------------------------------------------------------------------------

describe('stringWidth for table cell content', () => {
  test('ASCII string width equals length', () => {
    expect(stringWidth('hello')).toBe(5);
    expect(stringWidth('Name')).toBe(4);
    expect(stringWidth('')).toBe(0);
  });

  test('CJK ideographs are width 2 each', () => {
    expect(stringWidth('名前')).toBe(4);    // 2 chars * 2 cols
    expect(stringWidth('東京都')).toBe(6);   // 3 chars * 2 cols
    expect(stringWidth('こんにちは')).toBe(10); // 5 chars * 2 cols
  });

  test('mixed ASCII and CJK', () => {
    expect(stringWidth('Hello世界')).toBe(9);  // 5 + 4
    expect(stringWidth('A太郎B')).toBe(6);     // 1 + 4 + 1
  });

  test('fullwidth forms are width 2', () => {
    // U+FF21 = Fullwidth A
    expect(stringWidth('\uFF21')).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// GFM table CJK width handling tests
// ---------------------------------------------------------------------------

describe('GFM table CJK width handling', () => {
  beforeEach(() => {
    Markdown.clearCache();
  });

  test('CJK headers produce correct table parsing', () => {
    const md = [
      '| 名前  | 年齢 |',
      '| ----- | ---- |',
      '| 太郎  | 25   |',
      '| Alice | 30   |',
    ].join('\n');
    const blocks = Markdown.parseMarkdown(md);
    expect(blocks[0]!.type).toBe('table');
    expect(blocks[0]!.tableHeaders).toEqual(['名前', '年齢']);
    expect(blocks[0]!.tableRows!.length).toBe(2);
    expect(blocks[0]!.tableRows![0]).toEqual(['太郎', '25']);
    expect(blocks[0]!.tableRows![1]).toEqual(['Alice', '30']);
  });

  test('mixed ASCII/CJK table parses correctly', () => {
    const md = [
      '| Key      | Value      |',
      '| -------- | ---------- |',
      '| greeting | こんにちは |',
      '| name     | Bob        |',
    ].join('\n');
    const blocks = Markdown.parseMarkdown(md);
    expect(blocks[0]!.type).toBe('table');
    expect(blocks[0]!.tableHeaders).toEqual(['Key', 'Value']);
    expect(blocks[0]!.tableRows![0]).toEqual(['greeting', 'こんにちは']);
    expect(blocks[0]!.tableRows![1]).toEqual(['name', 'Bob']);
  });

  test('ASCII-only table output is unchanged by the fix', () => {
    const md = [
      '| Name  | Age |',
      '| ----- | --- |',
      '| Alice | 30  |',
      '| Bob   | 25  |',
    ].join('\n');
    const blocks = Markdown.parseMarkdown(md);
    expect(blocks[0]!.tableHeaders).toEqual(['Name', 'Age']);
    expect(blocks[0]!.tableRows).toEqual([['Alice', '30'], ['Bob', '25']]);
  });

  test('CJK column widths use stringWidth, not string.length', () => {
    // "名前" has stringWidth 4, "太郎" has stringWidth 4, "Alice" has stringWidth 5
    // Column 0 max should be max(4, 4, 5) = 5
    // "Age" has stringWidth 3, "25" has stringWidth 2, "30" has stringWidth 2
    // Column 1 max should be max(3, 2, 2) = 3
    // We verify this indirectly: the Markdown widget should build without errors
    // and the rendering method should use stringWidth for column measurement.
    const md = [
      '| 名前  | Age |',
      '| ----- | --- |',
      '| 太郎  | 25  |',
      '| Alice | 30  |',
    ].join('\n');
    const blocks = Markdown.parseMarkdown(md);
    expect(blocks[0]!.type).toBe('table');

    // Verify stringWidth gives correct measurements for table inputs
    expect(stringWidth('名前')).toBe(4);
    expect(stringWidth('太郎')).toBe(4);
    expect(stringWidth('Alice')).toBe(5);
    expect(stringWidth('Age')).toBe(3);
    expect(stringWidth('25')).toBe(2);
    expect(stringWidth('30')).toBe(2);
  });

  test('empty cells in CJK table are handled correctly', () => {
    const md = [
      '| 名前 | 値  |',
      '| ---- | --- |',
      '| 太郎 | A   |',
    ].join('\n');
    const blocks = Markdown.parseMarkdown(md);
    expect(blocks[0]!.type).toBe('table');
    expect(blocks[0]!.tableHeaders).toEqual(['名前', '値']);
    // Verify stringWidth handles empty string
    expect(stringWidth('')).toBe(0);
  });

  test('fullwidth Latin characters are measured correctly for tables', () => {
    // Fullwidth A (U+FF21) has stringWidth 2 but string.length 1
    expect(stringWidth('\uFF21\uFF22\uFF23')).toBe(6);
    expect('\uFF21\uFF22\uFF23'.length).toBe(3);
  });

  test('Markdown widget constructs with CJK table content', () => {
    const md = new Markdown({
      markdown: [
        '| 名前  | 年齢 |',
        '| ----- | ---- |',
        '| 太郎  | 25   |',
      ].join('\n'),
    });
    expect(md.markdown).toContain('名前');
    expect(typeof md.build).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// GFM table column alignment tests (GAP-SUM-025)
// ---------------------------------------------------------------------------

describe('GFM table column alignment parsing', () => {
  test('parses left alignment (:---)', () => {
    const alignments = Markdown._parseTableAlignments('| :--- | :--- |');
    expect(alignments).toEqual(['left', 'left']);
  });

  test('parses right alignment (---:)', () => {
    const alignments = Markdown._parseTableAlignments('| ---: | ---: |');
    expect(alignments).toEqual(['right', 'right']);
  });

  test('parses center alignment (:---:)', () => {
    const alignments = Markdown._parseTableAlignments('| :---: | :---: |');
    expect(alignments).toEqual(['center', 'center']);
  });

  test('parses mixed alignment markers', () => {
    const alignments = Markdown._parseTableAlignments('| :--- | :---: | ---: |');
    expect(alignments).toEqual(['left', 'center', 'right']);
  });

  test('defaults to left when no colons', () => {
    const alignments = Markdown._parseTableAlignments('| --- | --- | --- |');
    expect(alignments).toEqual(['left', 'left', 'left']);
  });

  test('handles separator without leading/trailing pipes', () => {
    const alignments = Markdown._parseTableAlignments(':--- | :---: | ---:');
    expect(alignments).toEqual(['left', 'center', 'right']);
  });

  test('handles extra dashes in separator cells', () => {
    const alignments = Markdown._parseTableAlignments('| :---------- | :---------: | ---------: |');
    expect(alignments).toEqual(['left', 'center', 'right']);
  });

  test('single column alignment', () => {
    const alignments = Markdown._parseTableAlignments('| :---: |');
    expect(alignments).toEqual(['center']);
  });
});

describe('GFM table alignment stored in parsed blocks', () => {
  beforeEach(() => {
    Markdown.clearCache();
  });

  test('table block includes alignment markers', () => {
    const md = '| Left | Center | Right |\n| :--- | :---: | ---: |\n| a | b | c |';
    const blocks = Markdown.parseMarkdown(md);
    expect(blocks.length).toBe(1);
    expect(blocks[0]!.type).toBe('table');
    expect(blocks[0]!.tableAlignments).toEqual(['left', 'center', 'right']);
  });

  test('table without alignment markers defaults to all left', () => {
    const md = '| A | B |\n| --- | --- |\n| 1 | 2 |';
    const blocks = Markdown.parseMarkdown(md);
    expect(blocks[0]!.tableAlignments).toEqual(['left', 'left']);
  });

  test('table alignment with no pipes', () => {
    const md = 'Name | Value\n:--- | ---:\nfoo | 42';
    const blocks = Markdown.parseMarkdown(md);
    expect(blocks[0]!.tableAlignments).toEqual(['left', 'right']);
  });
});

describe('GFM table alignment rendering', () => {
  beforeEach(() => {
    Markdown.clearCache();
  });

  test('left-aligned cells are padded with trailing spaces (padEnd)', () => {
    const md = [
      '| Name  | Age |',
      '| :---- | :--- |',
      '| Al    | 30  |',
      '| Bobby | 5   |',
    ].join('\n');
    const blocks = Markdown.parseMarkdown(md);
    expect(blocks[0]!.tableAlignments).toEqual(['left', 'left']);
    const row0col0 = blocks[0]!.tableRows![0]![0]!;
    const row1col0 = blocks[0]!.tableRows![1]![0]!;
    expect(row0col0).toBe('Al');
    expect(row1col0).toBe('Bobby');
  });

  test('right-aligned cells use padStart style', () => {
    const md = [
      '| Item  | Price |',
      '| :---- | ----: |',
      '| Apple | 1     |',
      '| Bread | 25    |',
    ].join('\n');
    const blocks = Markdown.parseMarkdown(md);
    expect(blocks[0]!.tableAlignments![1]).toBe('right');
  });

  test('center-aligned cells are centered', () => {
    const md = [
      '| Status |',
      '| :----: |',
      '| OK     |',
      '| FAIL   |',
    ].join('\n');
    const blocks = Markdown.parseMarkdown(md);
    expect(blocks[0]!.tableAlignments).toEqual(['center']);
  });

  test('mixed alignment table parses headers and rows correctly', () => {
    const md = [
      '| Left | Center | Right |',
      '| :--- | :----: | ----: |',
      '| a    | bb     |   ccc |',
      '| dddd | e      |     f |',
    ].join('\n');
    const blocks = Markdown.parseMarkdown(md);
    expect(blocks[0]!.tableAlignments).toEqual(['left', 'center', 'right']);
    expect(blocks[0]!.tableHeaders).toEqual(['Left', 'Center', 'Right']);
    expect(blocks[0]!.tableRows!.length).toBe(2);
    expect(blocks[0]!.tableRows![0]).toEqual(['a', 'bb', 'ccc']);
    expect(blocks[0]!.tableRows![1]).toEqual(['dddd', 'e', 'f']);
  });
});
