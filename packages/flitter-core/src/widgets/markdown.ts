// Markdown widget — StatelessWidget that parses markdown and renders as styled Text
// Amp ref: _g class — simple markdown renderer
// Source: .reference/widgets-catalog.md

import { Key } from '../core/key';
import { Color } from '../core/color';
import { TextStyle } from '../core/text-style';
import { TextSpan } from '../core/text-span';
import {
  Widget,
  StatelessWidget,
  type BuildContext,
} from '../framework/widget';
import { Column, Row } from './flex';
import { Text } from './text';
import { Theme, type ThemeData } from './theme';
import { Divider } from './divider';
import { AppTheme, type SyntaxHighlightConfig } from './app-theme';
import { syntaxHighlight, detectLanguage } from './syntax-highlight';
import { Padding } from './padding';
import { EdgeInsets } from '../layout/edge-insets';
import { SizedBox } from './sized-box';
import { Container } from './container';
import { BoxDecoration } from '../layout/render-decorated';
import { stringWidth } from '../core/wcwidth';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Pad a string with trailing spaces until its terminal display width
 * reaches the target column count. Unlike String.padEnd(), this correctly
 * handles CJK / fullwidth / emoji characters that occupy 2 columns.
 */
function padEndDisplayWidth(str: string, targetWidth: number): string {
  const currentWidth = stringWidth(str);
  if (currentWidth >= targetWidth) return str;
  return str + ' '.repeat(targetWidth - currentWidth);
}

/**
 * Pad a string with leading spaces until its terminal display width
 * reaches the target column count. Display-width-aware version of padStart().
 */
function padStartDisplayWidth(str: string, targetWidth: number): string {
  const currentWidth = stringWidth(str);
  if (currentWidth >= targetWidth) return str;
  return ' '.repeat(targetWidth - currentWidth) + str;
}

/**
 * Center a string within the target display width by distributing
 * spaces on both sides. Extra space (when odd) goes to the right.
 */
function centerPadDisplayWidth(str: string, targetWidth: number): string {
  const currentWidth = stringWidth(str);
  if (currentWidth >= targetWidth) return str;
  const total = targetWidth - currentWidth;
  const left = Math.floor(total / 2);
  const right = total - left;
  return ' '.repeat(left) + str + ' '.repeat(right);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** GFM table column alignment derived from the separator row. */
export type TableColumnAlignment = 'left' | 'center' | 'right';

/** Classification of a markdown block for rendering. */
export type MarkdownBlockType =
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'heading4'
  | 'bullet'
  | 'numbered-list'
  | 'blockquote'
  | 'horizontal-rule'
  | 'table'
  | 'code-block'
  | 'paragraph';

/**
 * Style properties that can override the default styling for a markdown block type.
 * `fontStyle` maps to TextStyle boolean flags (e.g., 'italic' → italic: true).
 * Other fields (dim, bold, underline, etc.) map directly to TextStyle properties.
 */
export interface MarkdownBlockStyleOverride {
  readonly fontStyle?: 'italic' | 'normal';
  readonly dim?: boolean;
  readonly bold?: boolean;
  readonly underline?: boolean;
  readonly strikethrough?: boolean;
  readonly foreground?: Color;
  readonly background?: Color;
}

/**
 * A mapping from MarkdownBlockType to style overrides.
 * When provided to Markdown, each block type's default style is merged
 * with the corresponding override entry (if present).
 */
export type MarkdownStyleScheme = {
  [K in MarkdownBlockType]?: MarkdownBlockStyleOverride;
};

/** A parsed markdown block. */
export interface MarkdownBlock {
  readonly type: MarkdownBlockType;
  readonly content: string;
  /** For code blocks, the language hint if provided. */
  readonly language?: string;
  /** For numbered lists, the list item number. */
  readonly listNumber?: number;
  /** For GFM tables, the header column names. */
  readonly tableHeaders?: string[];
  /** For GFM tables, the data rows (array of arrays). */
  readonly tableRows?: string[][];
  /** For GFM tables, per-column alignment parsed from the separator row. */
  readonly tableAlignments?: TableColumnAlignment[];
}

// ---------------------------------------------------------------------------
// Inline segment types
// ---------------------------------------------------------------------------

export interface InlineSegment {
  readonly text: string;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly code?: boolean;
  readonly linkText?: string;
  readonly linkUrl?: string;
  readonly strikethrough?: boolean;
  readonly boldItalic?: boolean;
}

// ---------------------------------------------------------------------------
// Internal: recursive inline parser context
// ---------------------------------------------------------------------------

/** Accumulated formatting state from enclosing scopes. */
interface InlineStyleContext {
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  linkUrl?: string;
  linkText?: string;
}

type DelimiterKind = '***' | '**' | '*' | '~~' | '`';

// ---------------------------------------------------------------------------
// LRU AST Cache (Amp caches 100 entries)
// ---------------------------------------------------------------------------

class MarkdownCache {
  private _cache: Map<string, MarkdownBlock[]> = new Map();
  private _order: string[] = [];
  private _maxSize: number;

  constructor(maxSize: number = 100) {
    this._maxSize = maxSize;
  }

  get(key: string): MarkdownBlock[] | undefined {
    const value = this._cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      const idx = this._order.indexOf(key);
      if (idx !== -1) {
        this._order.splice(idx, 1);
        this._order.push(key);
      }
    }
    return value;
  }

  set(key: string, value: MarkdownBlock[]): void {
    if (this._cache.has(key)) {
      // Update existing entry, move to end
      this._cache.set(key, value);
      const idx = this._order.indexOf(key);
      if (idx !== -1) {
        this._order.splice(idx, 1);
      }
      this._order.push(key);
    } else {
      // Evict LRU if at capacity
      if (this._order.length >= this._maxSize) {
        const evictKey = this._order.shift()!;
        this._cache.delete(evictKey);
      }
      this._cache.set(key, value);
      this._order.push(key);
    }
  }

  invalidate(key: string): void {
    if (this._cache.has(key)) {
      this._cache.delete(key);
      const idx = this._order.indexOf(key);
      if (idx !== -1) {
        this._order.splice(idx, 1);
      }
    }
  }

  clear(): void {
    this._cache.clear();
    this._order = [];
  }
}

const _astCache = new MarkdownCache(100);

// ---------------------------------------------------------------------------
// Markdown (Amp: _g)
// ---------------------------------------------------------------------------

/**
 * A StatelessWidget that parses markdown text and renders it as styled Text.
 *
 * Supports simple line-by-line markdown:
 * - `# Heading` -> bold text
 * - `## Heading` -> bold text
 * - `### Heading` -> bold text (dimmer)
 * - `` `code` `` -> styled with background
 * - `**bold**` -> bold style
 * - `*italic*` -> italic style
 * - `[text](url)` -> text with hyperlink TextSpan (OSC 8)
 * - `- item` -> bullet point list
 * - ``` code block ``` -> code block with background
 * - Regular text -> plain Text widget
 *
 * Usage:
 *   new Markdown({
 *     markdown: '# Hello\n\nSome **bold** and *italic* text.',
 *   })
 *
 * Amp ref: _g class
 */
export class Markdown extends StatelessWidget {
  readonly markdown: string;
  readonly textAlign: 'left' | 'center' | 'right';
  readonly maxLines?: number;
  readonly overflow: 'clip' | 'ellipsis';
  readonly enableCache: boolean;
  readonly styleOverrides?: Partial<MarkdownStyleScheme>;

  constructor(opts: {
    key?: Key;
    markdown: string;
    textAlign?: 'left' | 'center' | 'right';
    maxLines?: number;
    overflow?: 'clip' | 'ellipsis';
    enableCache?: boolean;
    styleOverrides?: Partial<MarkdownStyleScheme>;
  }) {
    super(opts.key !== undefined ? { key: opts.key } : undefined);
    this.markdown = opts.markdown;
    this.textAlign = opts.textAlign ?? 'left';
    this.maxLines = opts.maxLines;
    this.overflow = opts.overflow ?? 'clip';
    this.enableCache = opts.enableCache ?? true;
    this.styleOverrides = opts.styleOverrides;
  }

  static invalidateCache(markdown: string): void {
    _astCache.invalidate(markdown);
  }

  static clearCache(): void {
    _astCache.clear();
  }

  build(context: BuildContext): Widget {
    const themeData = context != null ? Theme.maybeOf(context) : undefined;
    const blocks = this.enableCache
      ? Markdown.parseMarkdown(this.markdown)
      : Markdown._parseMarkdownNoCache(this.markdown);
    const children: Widget[] = [];

    for (const block of blocks) {
      const widget = this._renderBlock(block, themeData, context);
      children.push(widget);
    }

    // If no blocks parsed, render empty
    if (children.length === 0) {
      children.push(
        new Text({
          text: new TextSpan({ text: '' }),
          textAlign: this.textAlign,
        }),
      );
    }

    return new Column({
      crossAxisAlignment: 'stretch',
      mainAxisSize: 'min',
      children,
    });
  }

  // ---------------------------------------------------------------------------
  // Markdown Parsing
  // ---------------------------------------------------------------------------

  /**
   * Parse markdown text into blocks.
   * Exported as static for testability.
   */
  static parseMarkdown(markdown: string): MarkdownBlock[] {
    // Check cache first
    const cached = _astCache.get(markdown);
    if (cached !== undefined) {
      return cached;
    }

    const blocks = Markdown._parseMarkdownNoCache(markdown);

    // Store result in cache
    _astCache.set(markdown, blocks);

    return blocks;
  }

  /**
   * Parse markdown without cache interaction.
   * Used internally when enableCache is false.
   */
  private static _parseMarkdownNoCache(markdown: string): MarkdownBlock[] {
    const lines = markdown.split('\n');
    const blocks: MarkdownBlock[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i]!;

      // Code block: ``` ... ```
      if (line.trimStart().startsWith('```')) {
        const indent = line.indexOf('```');
        const langHint = line.slice(indent + 3).trim();
        const codeLines: string[] = [];
        i++;

        while (i < lines.length) {
          const codeLine = lines[i]!;
          if (codeLine.trimStart().startsWith('```')) {
            i++;
            break;
          }
          codeLines.push(codeLine);
          i++;
        }

        blocks.push({
          type: 'code-block',
          content: codeLines.join('\n'),
          language: langHint || undefined,
        });
        continue;
      }

      // Heading: # ## ### ####
      if (line.startsWith('#### ')) {
        blocks.push({ type: 'heading4', content: line.slice(5) });
        i++;
        continue;
      }
      if (line.startsWith('### ')) {
        blocks.push({ type: 'heading3', content: line.slice(4) });
        i++;
        continue;
      }
      if (line.startsWith('## ')) {
        blocks.push({ type: 'heading2', content: line.slice(3) });
        i++;
        continue;
      }
      if (line.startsWith('# ')) {
        blocks.push({ type: 'heading1', content: line.slice(2) });
        i++;
        continue;
      }

      // Horizontal rule: ---, ***, ___ (3+ of same char, standalone line)
      if (/^[-*_]{3,}\s*$/.test(line) && /^([-]{3,}|[*]{3,}|[_]{3,})\s*$/.test(line)) {
        blocks.push({ type: 'horizontal-rule', content: '' });
        i++;
        continue;
      }

      // GFM Table: detect separator row | --- | --- |
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1]!;
        if (/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(nextLine) && line.includes('|')) {
          // Parse table header from current line
          const headers = Markdown._parseTableRow(line);
          if (headers.length > 0) {
            // Parse column alignments from the separator row
            const alignments = Markdown._parseTableAlignments(nextLine);
            // Skip header and separator
            i += 2;
            // Collect data rows
            const dataRows: string[][] = [];
            while (i < lines.length) {
              const dataLine = lines[i]!;
              if (!dataLine.includes('|') || dataLine.trim() === '') {
                break;
              }
              dataRows.push(Markdown._parseTableRow(dataLine));
              i++;
            }
            blocks.push({
              type: 'table',
              content: '',
              tableHeaders: headers,
              tableRows: dataRows,
              tableAlignments: alignments,
            });
            continue;
          }
        }
      }

      // Blockquote: > text (collect contiguous > lines)
      if (/^>\s?/.test(line)) {
        const quoteLines: string[] = [];
        while (i < lines.length && /^>\s?/.test(lines[i]!)) {
          quoteLines.push(lines[i]!.replace(/^>\s?/, ''));
          i++;
        }
        blocks.push({ type: 'blockquote', content: quoteLines.join('\n') });
        continue;
      }

      // Numbered list: 1. item, 2. item, etc.
      const numberedMatch = line.match(/^(\d+)\.\s+(.*)/);
      if (numberedMatch) {
        const num = parseInt(numberedMatch[1]!, 10);
        const content = numberedMatch[2]!;
        blocks.push({ type: 'numbered-list', content, listNumber: num });
        i++;
        continue;
      }

      // Bullet: - item or * item
      if (/^[\-\*]\s+/.test(line)) {
        const content = line.replace(/^[\-\*]\s+/, '');
        blocks.push({ type: 'bullet', content });
        i++;
        continue;
      }

      // Empty line: skip
      if (line.trim() === '') {
        i++;
        continue;
      }

      // Regular paragraph — merge consecutive non-empty, non-special lines
      {
        const paragraphLines: string[] = [line];
        i++;
        while (i < lines.length) {
          const nextLine = lines[i]!;
          // Stop merging at empty lines or special block starts
          if (
            nextLine.trim() === '' ||
            nextLine.startsWith('#') ||
            nextLine.startsWith('```') ||
            nextLine.startsWith('>') ||
            /^[\-\*]\s+/.test(nextLine) ||
            /^\d+\.\s+/.test(nextLine) ||
            /^[-*_]{3,}\s*$/.test(nextLine) ||
            (i + 1 < lines.length && /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(lines[i + 1]!) && nextLine.includes('|'))
          ) {
            break;
          }
          paragraphLines.push(nextLine);
          i++;
        }
        blocks.push({ type: 'paragraph', content: paragraphLines.join(' ') });
      }
    }

    return blocks;
  }

  /**
   * Parse a GFM table row into cell strings.
   */
  private static _parseTableRow(line: string): string[] {
    let trimmed = line.trim();
    // Strip leading and trailing pipes
    if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
    if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
    return trimmed.split('|').map((cell) => cell.trim());
  }

  /**
   * Parse GFM alignment markers from a separator row.
   * `:---` -> left, `:---:` -> center, `---:` -> right, `---` -> left (default).
   */
  static _parseTableAlignments(separatorLine: string): TableColumnAlignment[] {
    let trimmed = separatorLine.trim();
    if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
    if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
    return trimmed.split('|').map((cell) => {
      const c = cell.trim();
      const startsColon = c.startsWith(':');
      const endsColon = c.endsWith(':');
      if (startsColon && endsColon) return 'center';
      if (endsColon) return 'right';
      return 'left';
    });
  }

  /**
   * Align a cell string to the target display width using the given alignment.
   */
  private static _alignCell(text: string, targetWidth: number, alignment: TableColumnAlignment): string {
    switch (alignment) {
      case 'right':
        return padStartDisplayWidth(text, targetWidth);
      case 'center':
        return centerPadDisplayWidth(text, targetWidth);
      case 'left':
      default:
        return padEndDisplayWidth(text, targetWidth);
    }
  }

  /**
   * Parse inline markdown formatting within a text string.
   * Handles nested formatting: **bold *italic* bold** produces
   * three segments with correct style inheritance.
   * Exported as static for testability.
   */
  static parseInline(text: string): InlineSegment[] {
    if (text.length === 0) return [];
    const result = Markdown._parseInlineRecursive(text, {});
    return result.segments;
  }

  /**
   * Recursively parse inline markdown with style context inheritance.
   * Each formatting delimiter opens a scope; within that scope, the parser
   * recursively parses inner content, producing child segments that inherit
   * the outer scope's formatting flags.
   *
   * Returns { segments, consumed, closed }.
   * - closed=true means the stopDelim was found and consumed.
   * - closed=false means end-of-text was reached without finding stopDelim.
   */
  private static _parseInlineRecursive(
    text: string,
    ctx: InlineStyleContext,
    stopDelim?: DelimiterKind,
  ): { segments: InlineSegment[]; consumed: number; closed: boolean } {
    const segments: InlineSegment[] = [];
    let pos = 0;
    let plainStart = 0;

    const flushPlain = () => {
      if (pos > plainStart) {
        segments.push(Markdown._makeSegment(text.slice(plainStart, pos), ctx));
      }
    };

    while (pos < text.length) {
      // Check if we've hit the stop delimiter for the current scope.
      // For single-char delimiters (* or ~), ensure we don't match the
      // start of a multi-char delimiter (** or ~~).
      if (stopDelim && text.startsWith(stopDelim, pos)) {
        const afterDelim = pos + stopDelim.length;
        let isRealStop = true;

        if (stopDelim === '*') {
          // Don't match * if the next char is also * (would be ** or ***)
          if (afterDelim < text.length && text[afterDelim] === '*') {
            isRealStop = false;
          }
        }

        if (isRealStop) {
          flushPlain();
          return { segments, consumed: pos + stopDelim.length, closed: true };
        }
      }

      // --- Inline code: `code` (no recursion inside code spans) ---
      if (text[pos] === '`') {
        const closeIdx = text.indexOf('`', pos + 1);
        if (closeIdx !== -1) {
          flushPlain();
          const codeText = text.slice(pos + 1, closeIdx);
          segments.push(Markdown._makeSegment(codeText, { ...ctx, code: true }));
          pos = closeIdx + 1;
          plainStart = pos;
          continue;
        }
      }

      // --- Link: [text](url) ---
      if (text[pos] === '[') {
        const closeBracket = Markdown._findMatchingBracket(text, pos);
        if (closeBracket !== -1 && closeBracket + 1 < text.length && text[closeBracket + 1] === '(') {
          const closeParen = text.indexOf(')', closeBracket + 2);
          if (closeParen !== -1) {
            flushPlain();
            const linkTextStr = text.slice(pos + 1, closeBracket);
            const linkUrlStr = text.slice(closeBracket + 2, closeParen);
            // Recursively parse the link text for nested formatting
            const linkCtx: InlineStyleContext = {
              ...ctx,
              linkUrl: linkUrlStr,
              linkText: linkTextStr,
            };
            const inner = Markdown._parseInlineRecursive(linkTextStr, linkCtx);
            segments.push(...inner.segments);
            pos = closeParen + 1;
            plainStart = pos;
            continue;
          }
        }
      }

      // --- Bold-italic: ***text*** ---
      if (text.startsWith('***', pos)) {
        const innerStart = pos + 3;
        const result = Markdown._parseInlineRecursive(
          text.slice(innerStart),
          { ...ctx, bold: true, italic: true },
          '***',
        );
        if (result.closed) {
          flushPlain();
          segments.push(...result.segments);
          pos = innerStart + result.consumed;
          plainStart = pos;
          continue;
        }
      }

      // --- Bold: **text** ---
      if (text.startsWith('**', pos) && !text.startsWith('***', pos)) {
        const innerStart = pos + 2;
        const result = Markdown._parseInlineRecursive(
          text.slice(innerStart),
          { ...ctx, bold: true },
          '**',
        );
        if (result.closed) {
          flushPlain();
          segments.push(...result.segments);
          pos = innerStart + result.consumed;
          plainStart = pos;
          continue;
        }
      }

      // --- Italic: *text* ---
      if (text[pos] === '*' && !text.startsWith('**', pos)) {
        const innerStart = pos + 1;
        const result = Markdown._parseInlineRecursive(
          text.slice(innerStart),
          { ...ctx, italic: true },
          '*',
        );
        if (result.closed) {
          flushPlain();
          segments.push(...result.segments);
          pos = innerStart + result.consumed;
          plainStart = pos;
          continue;
        }
      }

      // --- Strikethrough: ~~text~~ ---
      if (text.startsWith('~~', pos)) {
        const innerStart = pos + 2;
        const result = Markdown._parseInlineRecursive(
          text.slice(innerStart),
          { ...ctx, strikethrough: true },
          '~~',
        );
        if (result.closed) {
          flushPlain();
          segments.push(...result.segments);
          pos = innerStart + result.consumed;
          plainStart = pos;
          continue;
        }
      }

      // No pattern matched at this position; advance one character
      pos++;
    }

    // Flush any remaining plain text
    flushPlain();
    return { segments, consumed: pos, closed: false };
  }

  /**
   * Create an InlineSegment with the given text and style context.
   * Merges boolean flags so the segment carries the union of all
   * enclosing scopes' formatting.
   */
  private static _makeSegment(text: string, ctx: InlineStyleContext): InlineSegment {
    const seg: Record<string, unknown> = { text };

    const isBold = !!ctx.bold;
    const isItalic = !!ctx.italic;

    if (isBold && isItalic) {
      seg.boldItalic = true;
    } else if (isBold) {
      seg.bold = true;
    } else if (isItalic) {
      seg.italic = true;
    }

    if (ctx.strikethrough) seg.strikethrough = true;
    if (ctx.code) seg.code = true;
    if (ctx.linkUrl) {
      seg.linkUrl = ctx.linkUrl;
      seg.linkText = ctx.linkText;
    }

    return seg as unknown as InlineSegment;
  }

  /**
   * Find the index of the closing ']' that matches the opening '[' at
   * position `start`. Returns -1 if not found. Handles nested brackets.
   */
  private static _findMatchingBracket(text: string, start: number): number {
    let depth = 0;
    for (let i = start; i < text.length; i++) {
      if (text[i] === '[') depth++;
      else if (text[i] === ']') {
        depth--;
        if (depth === 0) return i;
      }
    }
    return -1;
  }

  // ---------------------------------------------------------------------------
  // Private rendering
  // ---------------------------------------------------------------------------

  /**
   * Render a markdown block into a Text widget.
   */
  private _renderBlock(block: MarkdownBlock, themeData?: ThemeData, context?: BuildContext): Widget {
    switch (block.type) {
      case 'heading1':
        return this._renderHeading(block.content, 1, themeData);
      case 'heading2':
        return this._renderHeading(block.content, 2, themeData);
      case 'heading3':
        return this._renderHeading(block.content, 3, themeData);
      case 'heading4':
        return this._renderHeading(block.content, 4, themeData);
      case 'bullet':
        return this._renderBullet(block.content, themeData);
      case 'numbered-list':
        return this._renderNumberedList(block.content, block.listNumber ?? 1, themeData);
      case 'blockquote':
        return this._renderBlockquote(block.content, themeData);
      case 'horizontal-rule':
        return this._renderHorizontalRule(themeData);
      case 'table':
        return this._renderTable(block, themeData);
      case 'code-block':
        return this._renderCodeBlock(block.content, themeData, block.language, context);
      case 'paragraph':
      default:
        return this._renderParagraph(block.content, themeData);
    }
  }

  /**
   * Render a heading with bold styling.
   * H1, H3: use primary color. H2, H4: use textSecondary color.
   */
  private _renderHeading(
    content: string,
    level: number,
    themeData?: ThemeData,
  ): Widget {
    const primaryColor = themeData?.primary ?? Color.rgb(97, 175, 239);
    const secondaryColor = themeData?.textSecondary ?? Color.brightBlack;
    const textColor = (level === 1 || level === 3) ? primaryColor : secondaryColor;
    const style = new TextStyle({
      foreground: textColor,
      bold: true,
    });

    const prefix = level === 1 ? '━ ' : level === 2 ? '─ ' : level === 3 ? '· ' : '';
    const text = prefix + content;

    // Parse inline formatting within the heading
    const segments = Markdown.parseInline(text);
    const children = segments.map((seg) => this._segmentToSpan(seg, style, themeData));

    return new Text({
      text: children.length === 1
        ? children[0]!
        : new TextSpan({ children }),
      textAlign: this.textAlign,
      maxLines: this.maxLines,
      overflow: this.overflow,
    });
  }

  /**
   * Render a bullet point item.
   */
  private _renderBullet(content: string, themeData?: ThemeData): Widget {
    const bulletColor = themeData?.textSecondary ?? Color.rgb(150, 150, 150);
    const bulletSpan = new TextSpan({
      text: '  \u2022 ',
      style: new TextStyle({ foreground: bulletColor }),
    });

    const baseStyle = new TextStyle({
      foreground: themeData?.text ?? Color.rgb(220, 220, 220),
    });

    const segments = Markdown.parseInline(content);
    const contentSpans = segments.map((seg) => this._segmentToSpan(seg, baseStyle, themeData));

    return new Text({
      text: new TextSpan({
        children: [bulletSpan, ...contentSpans],
      }),
      textAlign: this.textAlign,
      maxLines: this.maxLines,
      overflow: this.overflow,
    });
  }

  /**
   * Render a code block with optional syntax highlighting.
   * Does NOT apply a fallback background color — only foreground is styled in the fallback path.
   */
  private _renderCodeBlock(content: string, themeData?: ThemeData, language?: string, context?: BuildContext): Widget {
    const fgColor = themeData?.text ?? Color.rgb(220, 220, 220);

    // Try syntax highlighting if we have a context and AppTheme
    if (context && language) {
      const appThemeData = AppTheme.maybeOf(context);
      if (appThemeData) {
        const syntheticPath = `file.${language}`;
        const detectedLang = detectLanguage(syntheticPath);
        if (detectedLang) {
          const highlightedLines = syntaxHighlight(content, appThemeData.syntaxHighlight, syntheticPath);
          const lineWidgets: Widget[] = highlightedLines.map((lineSpan) =>
            new Text({
              text: lineSpan,
              textAlign: this.textAlign,
            }),
          );
          return new Column({ children: lineWidgets });
        }
      }
    }

    // Fallback: simple styled text
    const style = new TextStyle({
      foreground: fgColor,
    });

    return new Text({
      text: new TextSpan({ text: content, style }),
      textAlign: this.textAlign,
      maxLines: this.maxLines,
      overflow: this.overflow,
    });
  }

  /**
   * Render a paragraph with inline formatting.
   * Applies styleOverrides for the 'paragraph' block type if provided.
   */
  private _renderParagraph(content: string, themeData?: ThemeData): Widget {
    let baseStyle = new TextStyle({
      foreground: themeData?.text ?? Color.rgb(220, 220, 220),
    });

    const override = this.styleOverrides?.paragraph;
    if (override) {
      baseStyle = this._applyStyleOverride(baseStyle, override);
    }

    const segments = Markdown.parseInline(content);
    const children = segments.map((seg) => this._segmentToSpan(seg, baseStyle, themeData));

    return new Text({
      text: children.length === 1
        ? children[0]!
        : new TextSpan({ children }),
      textAlign: this.textAlign,
      maxLines: this.maxLines,
      overflow: this.overflow,
    });
  }

  /**
   * Render a numbered list item with `  N. ` prefix.
   */
  private _renderNumberedList(content: string, listNumber: number, themeData?: ThemeData): Widget {
    const numColor = Color.brightBlack;
    const numSpan = new TextSpan({
      text: `  ${listNumber}. `,
      style: new TextStyle({ foreground: numColor, dim: true }),
    });

    const baseStyle = new TextStyle({
      foreground: themeData?.text ?? Color.rgb(220, 220, 220),
    });

    const segments = Markdown.parseInline(content);
    const contentSpans = segments.map((seg) => this._segmentToSpan(seg, baseStyle, themeData));

    return new Text({
      text: new TextSpan({
        children: [numSpan, ...contentSpans],
      }),
      textAlign: this.textAlign,
      maxLines: this.maxLines,
      overflow: this.overflow,
    });
  }

  /**
   * Render a blockquote with `  \u2502 ` left-border prefix in info color, content in dim.
   * Multi-line blockquotes produce one row per line, each with its own border prefix.
   */
  private _renderBlockquote(content: string, themeData?: ThemeData): Widget {
    const borderColor = themeData?.info ?? Color.brightBlue;
    const contentStyle = new TextStyle({
      foreground: Color.brightBlack,
    });

    const quoteLines = content.split('\n');

    // Single-line blockquote: render as a single Text
    if (quoteLines.length === 1) {
      const borderSpan = new TextSpan({
        text: '  \u2502 ',
        style: new TextStyle({ foreground: borderColor }),
      });
      const segments = Markdown.parseInline(content);
      const contentSpans = segments.map((seg) => this._segmentToSpan(seg, contentStyle, themeData));

      return new Text({
        text: new TextSpan({
          children: [borderSpan, ...contentSpans],
        }),
        textAlign: this.textAlign,
        maxLines: this.maxLines,
        overflow: this.overflow,
      });
    }

    // Multi-line blockquote: one Text widget per line, wrapped in Column
    const lineWidgets: Widget[] = quoteLines.map((quoteLine) => {
      const borderSpan = new TextSpan({
        text: '  \u2502 ',
        style: new TextStyle({ foreground: borderColor }),
      });
      const segments = Markdown.parseInline(quoteLine);
      const contentSpans = segments.map((seg) => this._segmentToSpan(seg, contentStyle, themeData));

      return new Text({
        text: new TextSpan({
          children: [borderSpan, ...contentSpans],
        }),
        textAlign: this.textAlign,
      });
    });

    return new Column({ children: lineWidgets });
  }

  /**
   * Render a horizontal rule as a Divider widget.
   */
  private _renderHorizontalRule(themeData?: ThemeData): Widget {
    return new Divider({ color: themeData?.border ?? Color.brightBlack });
  }

  /**
   * Render a GFM table with header row and data rows.
   */
  private _renderTable(block: MarkdownBlock, themeData?: ThemeData): Widget {
    const headers = block.tableHeaders ?? [];
    const rows = block.tableRows ?? [];
    const baseTextColor = themeData?.text ?? Color.rgb(220, 220, 220);
    const headerColor = themeData?.primary ?? Color.rgb(97, 175, 239);
    const borderColor = themeData?.border ?? Color.brightBlack;

    // Compute column widths (max of header and each row)
    const colCount = headers.length;
    const colWidths: number[] = headers.map((h) => stringWidth(h));
    for (const row of rows) {
      for (let c = 0; c < colCount; c++) {
        const cellLen = stringWidth(row[c] ?? '');
        if (cellLen > colWidths[c]!) colWidths[c] = cellLen;
      }
    }

    // Per-column alignment (defaults to left if not specified)
    const alignments = block.tableAlignments ?? [];

    const tableLines: Widget[] = [];

    // Header row
    const headerCells = headers.map((h, c) => Markdown._alignCell(h, colWidths[c]!, alignments[c] ?? 'left'));
    const headerText = '  ' + headerCells.join(' \u2502 ');
    tableLines.push(
      new Text({
        text: new TextSpan({
          text: headerText,
          style: new TextStyle({ foreground: headerColor, bold: true }),
        }),
        textAlign: this.textAlign,
      }),
    );

    // Separator row
    const sepCells = colWidths.map((w) => '\u2500'.repeat(w));
    const sepText = '  ' + sepCells.join('\u2500\u253c\u2500');
    tableLines.push(
      new Text({
        text: new TextSpan({
          text: sepText,
          style: new TextStyle({ foreground: borderColor }),
        }),
        textAlign: this.textAlign,
      }),
    );

    // Data rows
    for (const row of rows) {
      const cells = headers.map((_, c) => Markdown._alignCell(row[c] ?? '', colWidths[c]!, alignments[c] ?? 'left'));
      const rowText = '  ' + cells.join(' \u2502 ');
      tableLines.push(
        new Text({
          text: new TextSpan({
            text: rowText,
            style: new TextStyle({ foreground: baseTextColor }),
          }),
          textAlign: this.textAlign,
        }),
      );
    }

    return new Column({ children: tableLines });
  }

  /**
   * Convert an InlineSegment to a TextSpan with appropriate styling.
   */
  private _segmentToSpan(
    segment: InlineSegment,
    baseStyle: TextStyle,
    themeData?: ThemeData,
  ): TextSpan {
    let style = baseStyle;

    if (segment.boldItalic) {
      style = style.copyWith({ bold: true, italic: true });
    }
    if (segment.bold) {
      style = style.copyWith({ bold: true });
    }
    if (segment.italic) {
      style = style.copyWith({ italic: true });
    }
    if (segment.strikethrough) {
      style = style.copyWith({ strikethrough: true });
    }
    if (segment.code) {
      // Amp style: bold + yellow foreground for inline code
      style = style.copyWith({ bold: true, foreground: Color.yellow });
    }
    if (segment.linkUrl) {
      const linkColor = themeData?.primary ?? Color.rgb(97, 175, 239);
      style = style.copyWith({ foreground: linkColor, underline: true });
      return new TextSpan({
        text: segment.text,
        style,
        hyperlink: { uri: segment.linkUrl },
      });
    }

    return new TextSpan({ text: segment.text, style });
  }

  /**
   * Apply a MarkdownBlockStyleOverride to a TextStyle, returning a new TextStyle
   * with the override fields merged in. `fontStyle: 'italic'` maps to `italic: true`.
   */
  private _applyStyleOverride(base: TextStyle, override: MarkdownBlockStyleOverride): TextStyle {
    const overrides: Parameters<TextStyle['copyWith']>[0] = {};
    if (override.fontStyle === 'italic') overrides.italic = true;
    if (override.dim !== undefined) overrides.dim = override.dim;
    if (override.bold !== undefined) overrides.bold = override.bold;
    if (override.underline !== undefined) overrides.underline = override.underline;
    if (override.strikethrough !== undefined) overrides.strikethrough = override.strikethrough;
    if (override.foreground !== undefined) overrides.foreground = override.foreground;
    if (override.background !== undefined) overrides.background = override.background;
    return base.copyWith(overrides);
  }
}
