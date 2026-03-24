// text-editor.ts — Multi-line text editor with line numbers, cursor, and syntax highlighting.
//
// Run with: bun run examples/text-editor.ts
//
// Controls:
// - Arrow keys: Move cursor (up/down/left/right)
// - Home / End: Move to start / end of line
// - Page Up / Page Down: Move cursor up/down by 10 lines
// - Type characters: Insert at cursor position
// - Backspace: Delete character before cursor
// - Delete: Delete character at cursor position
// - Enter: Insert new line at cursor
// - Ctrl+S: Show "Saved!" indicator
// - Ctrl+Q: Quit
//
// This example demonstrates:
// - StatefulWidget with complex multi-line editing state
// - FocusNode for keyboard input handling
// - TextSpan children for syntax highlighting (comments, strings)
// - Row + Expanded layout for line number gutter
// - Dynamic status bar with cursor position

import {
  StatefulWidget,
  State,
  Widget,
  type BuildContext,
} from '../src/framework/widget';
import { runApp } from '../src/framework/binding';
import { Text } from '../src/widgets/text';
import { Column, Row } from '../src/widgets/flex';
import { SizedBox } from '../src/widgets/sized-box';
import { Container } from '../src/widgets/container';
import { Expanded } from '../src/widgets/flexible';
import { Divider } from '../src/widgets/divider';
import { Padding } from '../src/widgets/padding';
import { TextSpan } from '../src/core/text-span';
import { TextStyle } from '../src/core/text-style';
import { Color } from '../src/core/color';
import { EdgeInsets } from '../src/layout/edge-insets';
import { BoxDecoration, Border, BorderSide } from '../src/layout/render-decorated';
import { FocusNode, FocusManager } from '../src/input/focus';
import type { KeyEvent, KeyEventResult } from '../src/input/events';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const normalStyle = new TextStyle({ foreground: Color.defaultColor });
const dimStyle = new TextStyle({ dim: true });
const gutterStyle = new TextStyle({ foreground: Color.brightBlack, dim: true });
const cursorLineGutterStyle = new TextStyle({ foreground: Color.yellow, bold: true });
const statusStyle = new TextStyle({ foreground: Color.defaultColor, bold: true });
const statusDimStyle = new TextStyle({ foreground: Color.brightBlack });
const commentStyle = new TextStyle({ foreground: Color.green, dim: true });
const stringStyle = new TextStyle({ foreground: Color.yellow });
const savedStyle = new TextStyle({ foreground: Color.green, bold: true });

// ---------------------------------------------------------------------------
// Helper: create a Text widget from a string
// ---------------------------------------------------------------------------

function txt(content: string, style?: TextStyle): Text {
  return new Text({
    text: new TextSpan({ text: content, style: style ?? normalStyle }),
  });
}

function richText(spans: TextSpan[]): Text {
  return new Text({
    text: new TextSpan({ children: spans }),
  });
}

// ---------------------------------------------------------------------------
// Syntax highlighting: tokenize a single line into TextSpan segments
// ---------------------------------------------------------------------------

function highlightLine(line: string, isCursorLine: boolean, cursorCol: number): Text {
  const spans: TextSpan[] = [];
  let i = 0;

  while (i < line.length) {
    // Check for line comment
    if (line[i] === '/' && i + 1 < line.length && line[i + 1] === '/') {
      const commentText = line.substring(i);
      if (isCursorLine && cursorCol >= i && cursorCol <= line.length) {
        const beforeCursor = commentText.substring(0, cursorCol - i);
        const cursorChar = cursorCol - i < commentText.length ? commentText[cursorCol - i] : ' ';
        const afterCursor = cursorCol - i + 1 < commentText.length ? commentText.substring(cursorCol - i + 1) : '';
        if (beforeCursor.length > 0) {
          spans.push(new TextSpan({ text: beforeCursor, style: commentStyle }));
        }
        spans.push(new TextSpan({ text: cursorChar, style: new TextStyle({ foreground: Color.green, inverse: true }) }));
        if (afterCursor.length > 0) {
          spans.push(new TextSpan({ text: afterCursor, style: commentStyle }));
        }
      } else {
        spans.push(new TextSpan({ text: commentText, style: commentStyle }));
      }
      i = line.length;
      continue;
    }

    // Check for single-quoted string
    if (line[i] === "'" || line[i] === '"' || line[i] === '`') {
      const quote = line[i]!;
      let j = i + 1;
      while (j < line.length && line[j] !== quote) {
        if (line[j] === '\\') j++;
        j++;
      }
      if (j < line.length) j++; // include closing quote
      const strText = line.substring(i, j);
      if (isCursorLine && cursorCol >= i && cursorCol < j) {
        const beforeCursor = strText.substring(0, cursorCol - i);
        const cursorChar = strText[cursorCol - i] ?? ' ';
        const afterCursor = cursorCol - i + 1 < strText.length ? strText.substring(cursorCol - i + 1) : '';
        if (beforeCursor.length > 0) {
          spans.push(new TextSpan({ text: beforeCursor, style: stringStyle }));
        }
        spans.push(new TextSpan({ text: cursorChar, style: new TextStyle({ foreground: Color.yellow, inverse: true }) }));
        if (afterCursor.length > 0) {
          spans.push(new TextSpan({ text: afterCursor, style: stringStyle }));
        }
      } else {
        spans.push(new TextSpan({ text: strText, style: stringStyle }));
      }
      i = j;
      continue;
    }

    // Find next special token
    let nextSpecial = line.length;
    for (let k = i; k < line.length; k++) {
      if ((line[k] === '/' && k + 1 < line.length && line[k + 1] === '/') ||
          line[k] === "'" || line[k] === '"' || line[k] === '`') {
        nextSpecial = k;
        break;
      }
    }

    const plainText = line.substring(i, nextSpecial);
    if (plainText.length > 0) {
      if (isCursorLine && cursorCol >= i && cursorCol < nextSpecial) {
        const beforeCursor = plainText.substring(0, cursorCol - i);
        const cursorChar = plainText[cursorCol - i] ?? ' ';
        const afterCursor = cursorCol - i + 1 < plainText.length ? plainText.substring(cursorCol - i + 1) : '';
        if (beforeCursor.length > 0) {
          spans.push(new TextSpan({ text: beforeCursor, style: normalStyle }));
        }
        spans.push(new TextSpan({ text: cursorChar, style: new TextStyle({ foreground: Color.defaultColor, inverse: true }) }));
        if (afterCursor.length > 0) {
          spans.push(new TextSpan({ text: afterCursor, style: normalStyle }));
        }
      } else {
        spans.push(new TextSpan({ text: plainText, style: normalStyle }));
      }
    }
    i = nextSpecial;
  }

  // If cursor is at end of line on the cursor line
  if (isCursorLine && cursorCol >= line.length) {
    spans.push(new TextSpan({ text: ' ', style: new TextStyle({ inverse: true }) }));
  }

  // Empty line with cursor
  if (line.length === 0 && isCursorLine) {
    return txt(' ', new TextStyle({ inverse: true }));
  }

  if (spans.length === 0) {
    return txt(' ');
  }

  return richText(spans);
}

// ---------------------------------------------------------------------------
// Sample buffer content
// ---------------------------------------------------------------------------

const INITIAL_BUFFER: string[] = [
  '// text-editor.ts',
  '// A simple TUI text editor example',
  '',
  'interface Config {',
  '  theme: "dark" | "light";',
  '  tabSize: number;',
  '  wordWrap: boolean;',
  '}',
  '',
  'function createEditor(config: Config) {',
  '  const buffer: string[] = [];',
  '  let cursorRow = 0;',
  '  let cursorCol = 0;',
  '',
  '  // Initialize the editor buffer',
  '  return {',
  '    insert(text: string) {',
  '      buffer.splice(cursorRow, 0, text);',
  '      cursorRow++;',
  '    },',
  '    getLine(row: number): string {',
  '      return buffer[row] ?? "";',
  '    },',
  '  };',
  '}',
  '',
  'const editor = createEditor({',
  '  theme: "dark",',
  '  tabSize: 2,',
  '  wordWrap: true,',
  '});',
];

// ---------------------------------------------------------------------------
// TextEditor Widget
// ---------------------------------------------------------------------------

export class TextEditor extends StatefulWidget {
  createState(): TextEditorState {
    return new TextEditorState();
  }
}

export class TextEditorState extends State<TextEditor> {
  private _lines: string[] = [];
  private _cursorRow = 0;
  private _cursorCol = 0;
  private _scrollOffset = 0;
  private _filename = 'untitled.ts';
  private _savedMessage = '';
  private _savedTimeout: ReturnType<typeof setTimeout> | null = null;
  private _focusNode: FocusNode | null = null;

  initState(): void {
    this._lines = [...INITIAL_BUFFER];
    this._focusNode = new FocusNode({
      debugLabel: 'TextEditorFocus',
      onKey: (event: KeyEvent): KeyEventResult => {
        return this._handleKey(event);
      },
    });
    FocusManager.instance.registerNode(this._focusNode, null);
    this._focusNode.requestFocus();
  }

  dispose(): void {
    if (this._savedTimeout !== null) {
      clearTimeout(this._savedTimeout);
    }
    if (this._focusNode) {
      this._focusNode.dispose();
      this._focusNode = null;
    }
    super.dispose();
  }

  private _clampCursor(): void {
    if (this._cursorRow < 0) this._cursorRow = 0;
    if (this._cursorRow >= this._lines.length) this._cursorRow = this._lines.length - 1;
    if (this._lines.length === 0) {
      this._cursorRow = 0;
      this._cursorCol = 0;
      return;
    }
    const lineLen = this._lines[this._cursorRow]!.length;
    if (this._cursorCol < 0) this._cursorCol = 0;
    if (this._cursorCol > lineLen) this._cursorCol = lineLen;
  }

  private _ensureCursorVisible(viewportHeight: number): void {
    if (this._cursorRow < this._scrollOffset) {
      this._scrollOffset = this._cursorRow;
    }
    if (this._cursorRow >= this._scrollOffset + viewportHeight) {
      this._scrollOffset = this._cursorRow - viewportHeight + 1;
    }
    if (this._scrollOffset < 0) this._scrollOffset = 0;
  }

  private _handleKey(event: KeyEvent): KeyEventResult {
    // Quit
    if (event.key === 'q' && event.ctrlKey) {
      process.exit(0);
    }

    // Save
    if (event.key === 's' && event.ctrlKey) {
      this.setState(() => {
        this._savedMessage = 'Saved!';
      });
      if (this._savedTimeout !== null) {
        clearTimeout(this._savedTimeout);
      }
      this._savedTimeout = setTimeout(() => {
        this.setState(() => {
          this._savedMessage = '';
        });
      }, 2000);
      return 'handled';
    }

    // Arrow keys
    if (event.key === 'ArrowUp') {
      this.setState(() => {
        this._cursorRow--;
        this._clampCursor();
      });
      return 'handled';
    }

    if (event.key === 'ArrowDown') {
      this.setState(() => {
        this._cursorRow++;
        this._clampCursor();
      });
      return 'handled';
    }

    if (event.key === 'ArrowLeft') {
      this.setState(() => {
        if (this._cursorCol > 0) {
          this._cursorCol--;
        } else if (this._cursorRow > 0) {
          this._cursorRow--;
          this._cursorCol = this._lines[this._cursorRow]!.length;
        }
      });
      return 'handled';
    }

    if (event.key === 'ArrowRight') {
      this.setState(() => {
        const lineLen = this._lines[this._cursorRow]?.length ?? 0;
        if (this._cursorCol < lineLen) {
          this._cursorCol++;
        } else if (this._cursorRow < this._lines.length - 1) {
          this._cursorRow++;
          this._cursorCol = 0;
        }
      });
      return 'handled';
    }

    // Home / End
    if (event.key === 'Home') {
      this.setState(() => {
        this._cursorCol = 0;
      });
      return 'handled';
    }

    if (event.key === 'End') {
      this.setState(() => {
        this._cursorCol = this._lines[this._cursorRow]?.length ?? 0;
      });
      return 'handled';
    }

    // Page Up / Page Down
    if (event.key === 'PageUp') {
      this.setState(() => {
        this._cursorRow -= 10;
        this._clampCursor();
      });
      return 'handled';
    }

    if (event.key === 'PageDown') {
      this.setState(() => {
        this._cursorRow += 10;
        this._clampCursor();
      });
      return 'handled';
    }

    // Enter — insert new line
    if (event.key === 'Enter') {
      this.setState(() => {
        const currentLine = this._lines[this._cursorRow] ?? '';
        const before = currentLine.substring(0, this._cursorCol);
        const after = currentLine.substring(this._cursorCol);
        this._lines[this._cursorRow] = before;
        this._lines.splice(this._cursorRow + 1, 0, after);
        this._cursorRow++;
        this._cursorCol = 0;
      });
      return 'handled';
    }

    // Backspace
    if (event.key === 'Backspace') {
      this.setState(() => {
        if (this._cursorCol > 0) {
          const line = this._lines[this._cursorRow] ?? '';
          this._lines[this._cursorRow] = line.substring(0, this._cursorCol - 1) + line.substring(this._cursorCol);
          this._cursorCol--;
        } else if (this._cursorRow > 0) {
          const currentLine = this._lines[this._cursorRow] ?? '';
          const prevLine = this._lines[this._cursorRow - 1] ?? '';
          this._cursorCol = prevLine.length;
          this._lines[this._cursorRow - 1] = prevLine + currentLine;
          this._lines.splice(this._cursorRow, 1);
          this._cursorRow--;
        }
      });
      return 'handled';
    }

    // Delete
    if (event.key === 'Delete') {
      this.setState(() => {
        const line = this._lines[this._cursorRow] ?? '';
        if (this._cursorCol < line.length) {
          this._lines[this._cursorRow] = line.substring(0, this._cursorCol) + line.substring(this._cursorCol + 1);
        } else if (this._cursorRow < this._lines.length - 1) {
          const nextLine = this._lines[this._cursorRow + 1] ?? '';
          this._lines[this._cursorRow] = line + nextLine;
          this._lines.splice(this._cursorRow + 1, 1);
        }
      });
      return 'handled';
    }

    // Tab — insert two spaces
    if (event.key === 'Tab') {
      this.setState(() => {
        const line = this._lines[this._cursorRow] ?? '';
        this._lines[this._cursorRow] = line.substring(0, this._cursorCol) + '  ' + line.substring(this._cursorCol);
        this._cursorCol += 2;
      });
      return 'handled';
    }

    // Printable characters
    if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
      this.setState(() => {
        const line = this._lines[this._cursorRow] ?? '';
        this._lines[this._cursorRow] = line.substring(0, this._cursorCol) + event.key + line.substring(this._cursorCol);
        this._cursorCol++;
      });
      return 'handled';
    }

    // Space
    if (event.key === 'Space') {
      this.setState(() => {
        const line = this._lines[this._cursorRow] ?? '';
        this._lines[this._cursorRow] = line.substring(0, this._cursorCol) + ' ' + line.substring(this._cursorCol);
        this._cursorCol++;
      });
      return 'handled';
    }

    return 'ignored';
  }

  build(_context: BuildContext): Widget {
    const totalLines = this._lines.length;
    const gutterWidth = Math.max(String(totalLines).length, 3);
    const viewportHeight = Math.max(process.stdout.rows - 4, 10); // reserve header + status + borders

    this._ensureCursorVisible(viewportHeight);

    const visibleStart = this._scrollOffset;
    const visibleEnd = Math.min(visibleStart + viewportHeight, totalLines);

    // Build visible lines
    const lineWidgets: Widget[] = [];
    for (let i = visibleStart; i < visibleEnd; i++) {
      const lineNum = String(i + 1).padStart(gutterWidth, ' ');
      const isCursorLine = i === this._cursorRow;
      const lineContent = this._lines[i] ?? '';

      const gutterText = txt(
        lineNum + ' ',
        isCursorLine ? cursorLineGutterStyle : gutterStyle,
      );

      const contentText = highlightLine(lineContent, isCursorLine, this._cursorCol);

      lineWidgets.push(
        new Row({
          children: [
            gutterText,
            new Expanded({ child: contentText }),
          ],
        }),
      );
    }

    // Fill remaining viewport lines with tildes
    for (let i = visibleEnd; i < visibleStart + viewportHeight; i++) {
      const padding = ' '.repeat(gutterWidth);
      lineWidgets.push(
        txt(`${padding} ~`, dimStyle),
      );
    }

    // Title bar
    const titleBar = new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'stretch',
      children: [
        new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 1 }),
          child: richText([
            new TextSpan({ text: ' Text Editor ', style: new TextStyle({ bold: true, foreground: Color.defaultColor }) }),
            new TextSpan({ text: '- ', style: new TextStyle({ foreground: Color.defaultColor }) }),
            new TextSpan({ text: this._filename, style: new TextStyle({ foreground: Color.brightYellow }) }),
            new TextSpan({
              text: this._savedMessage.length > 0 ? `  ${this._savedMessage}` : '',
              style: savedStyle,
            }),
          ]),
        }),
        new Divider({ color: Color.brightBlack }),
      ],
    });

    // Status bar
    const positionText = `Ln ${this._cursorRow + 1}, Col ${this._cursorCol + 1}`;
    const linesCountText = `${totalLines} lines`;
    const scrollPercent = totalLines > 0
      ? Math.round(((this._cursorRow + 1) / totalLines) * 100)
      : 100;

    const statusBar = new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'stretch',
      children: [
        new Divider({ color: Color.brightBlack }),
        new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 1 }),
          child: new Row({
            children: [
              richText([
                new TextSpan({ text: ' ', style: statusStyle }),
                new TextSpan({ text: this._filename, style: statusStyle }),
                new TextSpan({ text: '  ', style: statusDimStyle }),
                new TextSpan({ text: linesCountText, style: statusDimStyle }),
              ]),
              new Expanded({
                child: txt('', normalStyle),
            }),
            richText([
              new TextSpan({ text: positionText, style: statusStyle }),
              new TextSpan({ text: '  ', style: statusDimStyle }),
              new TextSpan({ text: `${scrollPercent}%`, style: statusDimStyle }),
              new TextSpan({ text: '  ', style: statusDimStyle }),
              new TextSpan({ text: 'Ctrl+S', style: new TextStyle({ foreground: Color.cyan }) }),
              new TextSpan({ text: ':Save ', style: statusDimStyle }),
              new TextSpan({ text: 'Ctrl+Q', style: new TextStyle({ foreground: Color.cyan }) }),
              new TextSpan({ text: ':Quit ', style: statusDimStyle }),
            ]),
          ],
        }),
      }),
      ],
    });

    // Main layout
    return new Column({
      children: [
        titleBar,
        new Expanded({
          child: new Column({
            mainAxisSize: 'min',
            crossAxisAlignment: 'stretch',
            children: lineWidgets,
          }),
        }),
        statusBar,
      ],
    });
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export const createTextEditor = (): TextEditor => new TextEditor();

if (import.meta.main) {
  runApp(new TextEditor(), { output: process.stdout });
}
