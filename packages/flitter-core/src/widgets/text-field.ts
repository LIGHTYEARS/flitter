// TextField with TextEditingController — full-featured text input widget
// Amp ref: widgets-catalog.md — StatefulWidget with controller pattern
// TextEditingController manages text state; TextField manages focus + key events
// Phase 20: Complete rewrite with multi-line, word ops, mouse, selection, RenderText

import { Widget, StatefulWidget, StatelessWidget, State, type BuildContext } from '../framework/widget';
import { Key } from '../core/key';
import { TextSpan } from '../core/text-span';
import { TextStyle } from '../core/text-style';
import { Color } from '../core/color';
import { ChangeNotifier } from '../framework/listenable';
import type { KeyEvent, KeyEventResult, MouseEvent as TuiMouseEvent } from '../input/events';
import { FocusNode } from '../input/focus';
import { Text } from './text';
import { FocusScope } from './focus-scope';

// ---------------------------------------------------------------------------
// Word boundary helpers
// ---------------------------------------------------------------------------

/** Find the start of the previous word from position `pos` in `text`. */
function wordBoundaryLeft(text: string, pos: number): number {
  if (pos <= 0) return 0;
  let i = pos - 1;
  // Skip whitespace/punctuation
  while (i > 0 && !isWordChar(text[i]!)) i--;
  // Skip word characters
  while (i > 0 && isWordChar(text[i - 1]!)) i--;
  return i;
}

/** Find the end of the next word from position `pos` in `text`. */
function wordBoundaryRight(text: string, pos: number): number {
  const len = text.length;
  if (pos >= len) return len;
  let i = pos;
  // Skip whitespace/punctuation
  while (i < len && !isWordChar(text[i]!)) i++;
  // Skip word characters
  while (i < len && isWordChar(text[i]!)) i++;
  return i;
}

/** Find word boundaries around position for double-click selection. */
function wordBoundsAt(text: string, pos: number): { start: number; end: number } {
  if (text.length === 0) return { start: 0, end: 0 };
  const clampedPos = Math.min(pos, text.length - 1);
  const adjustedPos = Math.max(0, clampedPos);

  let start = adjustedPos;
  let end = adjustedPos;

  if (isWordChar(text[adjustedPos]!)) {
    // Expand left
    while (start > 0 && isWordChar(text[start - 1]!)) start--;
    // Expand right
    while (end < text.length && isWordChar(text[end]!)) end++;
  } else {
    // Non-word character: select just that one character
    end = adjustedPos + 1;
  }

  return { start, end };
}

function isWordChar(ch: string): boolean {
  // Letters, digits, underscore
  return /\w/.test(ch);
}

// ---------------------------------------------------------------------------
// TextEditingController
// ---------------------------------------------------------------------------

/**
 * Controller for text input. Manages the text content, cursor position,
 * and selection state. Notifies listeners on any change.
 *
 * Pattern: ChangeNotifier (same as Flutter's TextEditingController)
 */
export class TextEditingController extends ChangeNotifier {
  private _text: string = '';
  private _cursorPosition: number = 0;
  private _selectionStart: number = -1;
  private _selectionEnd: number = -1;

  constructor(opts?: { text?: string }) {
    super();
    if (opts?.text) {
      this._text = opts.text;
      this._cursorPosition = opts.text.length;
    }
  }

  // --- Text ---

  get text(): string {
    return this._text;
  }

  set text(value: string) {
    if (this._text === value) return;
    this._text = value;
    // Clamp cursor to valid range
    this._cursorPosition = Math.min(this._cursorPosition, value.length);
    this._cursorPosition = Math.max(0, this._cursorPosition);
    this.notifyListeners();
  }

  // --- Cursor ---

  get cursorPosition(): number {
    return this._cursorPosition;
  }

  set cursorPosition(pos: number) {
    const clamped = Math.max(0, Math.min(pos, this._text.length));
    if (this._cursorPosition === clamped) return;
    this._cursorPosition = clamped;
    this.notifyListeners();
  }

  // --- Selection ---

  get selectionStart(): number {
    return this._selectionStart;
  }

  get selectionEnd(): number {
    return this._selectionEnd;
  }

  get hasSelection(): boolean {
    return this._selectionStart >= 0 && this._selectionEnd >= 0 && this._selectionStart !== this._selectionEnd;
  }

  /** Get selected text, or empty string if no selection. */
  get selectedText(): string {
    if (!this.hasSelection) return '';
    const start = Math.min(this._selectionStart, this._selectionEnd);
    const end = Math.max(this._selectionStart, this._selectionEnd);
    return this._text.slice(start, end);
  }

  /**
   * Set selection range directly.
   * Clamps values to valid range. Pass (-1, -1) to clear selection.
   */
  setSelection(start: number, end: number): void {
    if (start < 0 || end < 0) {
      this._selectionStart = -1;
      this._selectionEnd = -1;
    } else {
      this._selectionStart = Math.max(0, Math.min(start, this._text.length));
      this._selectionEnd = Math.max(0, Math.min(end, this._text.length));
    }
    this.notifyListeners();
  }

  /** Clear selection without moving cursor. */
  clearSelection(): void {
    if (this._selectionStart === -1 && this._selectionEnd === -1) return;
    this._selectionStart = -1;
    this._selectionEnd = -1;
    this.notifyListeners();
  }

  // --- Text editing operations ---

  /**
   * Insert text at the current cursor position.
   * If there is a selection, replace the selected text.
   */
  insertText(text: string): void {
    if (this.hasSelection) {
      // Replace selection
      const start = Math.min(this._selectionStart, this._selectionEnd);
      const end = Math.max(this._selectionStart, this._selectionEnd);
      this._text = this._text.slice(0, start) + text + this._text.slice(end);
      this._cursorPosition = start + text.length;
      this._selectionStart = -1;
      this._selectionEnd = -1;
    } else {
      // Insert at cursor
      this._text =
        this._text.slice(0, this._cursorPosition) +
        text +
        this._text.slice(this._cursorPosition);
      this._cursorPosition += text.length;
    }
    this.notifyListeners();
  }

  /**
   * Delete the character before the cursor (Backspace).
   * If there is a selection, delete the selected text.
   */
  deleteBackward(): void {
    if (this.hasSelection) {
      this._deleteSelection();
      return;
    }
    if (this._cursorPosition <= 0) return;
    this._text =
      this._text.slice(0, this._cursorPosition - 1) +
      this._text.slice(this._cursorPosition);
    this._cursorPosition--;
    this.notifyListeners();
  }

  /**
   * Delete the character at the cursor (Delete key).
   * If there is a selection, delete the selected text.
   */
  deleteForward(): void {
    if (this.hasSelection) {
      this._deleteSelection();
      return;
    }
    if (this._cursorPosition >= this._text.length) return;
    this._text =
      this._text.slice(0, this._cursorPosition) +
      this._text.slice(this._cursorPosition + 1);
    this.notifyListeners();
  }

  /**
   * Delete the word before the cursor (Ctrl+Backspace).
   */
  deleteWordBackward(): void {
    if (this.hasSelection) {
      this._deleteSelection();
      return;
    }
    if (this._cursorPosition <= 0) return;
    const newPos = wordBoundaryLeft(this._text, this._cursorPosition);
    this._text = this._text.slice(0, newPos) + this._text.slice(this._cursorPosition);
    this._cursorPosition = newPos;
    this.notifyListeners();
  }

  /**
   * Delete the word after the cursor (Ctrl+Delete).
   */
  deleteWordForward(): void {
    if (this.hasSelection) {
      this._deleteSelection();
      return;
    }
    if (this._cursorPosition >= this._text.length) return;
    const newEnd = wordBoundaryRight(this._text, this._cursorPosition);
    this._text = this._text.slice(0, this._cursorPosition) + this._text.slice(newEnd);
    this.notifyListeners();
  }

  // --- Cursor movement ---

  moveCursorLeft(): void {
    if (this._cursorPosition > 0) {
      this._cursorPosition--;
      this._selectionStart = -1;
      this._selectionEnd = -1;
      this.notifyListeners();
    }
  }

  moveCursorRight(): void {
    if (this._cursorPosition < this._text.length) {
      this._cursorPosition++;
      this._selectionStart = -1;
      this._selectionEnd = -1;
      this.notifyListeners();
    }
  }

  moveCursorHome(): void {
    if (this._cursorPosition !== 0) {
      this._cursorPosition = 0;
      this._selectionStart = -1;
      this._selectionEnd = -1;
      this.notifyListeners();
    }
  }

  moveCursorEnd(): void {
    if (this._cursorPosition !== this._text.length) {
      this._cursorPosition = this._text.length;
      this._selectionStart = -1;
      this._selectionEnd = -1;
      this.notifyListeners();
    }
  }

  // --- Word-level cursor movement ---

  /** Move cursor to the start of the previous word (Ctrl+Left). */
  moveCursorWordLeft(): void {
    const newPos = wordBoundaryLeft(this._text, this._cursorPosition);
    if (newPos !== this._cursorPosition) {
      this._cursorPosition = newPos;
      this._selectionStart = -1;
      this._selectionEnd = -1;
      this.notifyListeners();
    }
  }

  /** Move cursor to the end of the next word (Ctrl+Right). */
  moveCursorWordRight(): void {
    const newPos = wordBoundaryRight(this._text, this._cursorPosition);
    if (newPos !== this._cursorPosition) {
      this._cursorPosition = newPos;
      this._selectionStart = -1;
      this._selectionEnd = -1;
      this.notifyListeners();
    }
  }

  // --- Multi-line cursor movement ---

  /** Move cursor up one line. Returns true if moved. */
  moveCursorUp(): boolean {
    const lines = this._text.split('\n');
    if (lines.length <= 1) return false;

    const { lineIndex, colInLine } = this._getCursorLineCol(lines);
    if (lineIndex <= 0) return false;

    const prevLine = lines[lineIndex - 1]!;
    const newCol = Math.min(colInLine, prevLine.length);
    // Calculate absolute position
    let absPos = 0;
    for (let i = 0; i < lineIndex - 1; i++) {
      absPos += lines[i]!.length + 1; // +1 for \n
    }
    absPos += newCol;

    this._cursorPosition = absPos;
    this._selectionStart = -1;
    this._selectionEnd = -1;
    this.notifyListeners();
    return true;
  }

  /** Move cursor down one line. Returns true if moved. */
  moveCursorDown(): boolean {
    const lines = this._text.split('\n');
    if (lines.length <= 1) return false;

    const { lineIndex, colInLine } = this._getCursorLineCol(lines);
    if (lineIndex >= lines.length - 1) return false;

    const nextLine = lines[lineIndex + 1]!;
    const newCol = Math.min(colInLine, nextLine.length);
    // Calculate absolute position
    let absPos = 0;
    for (let i = 0; i <= lineIndex; i++) {
      absPos += lines[i]!.length + 1; // +1 for \n
    }
    absPos += newCol;

    this._cursorPosition = absPos;
    this._selectionStart = -1;
    this._selectionEnd = -1;
    this.notifyListeners();
    return true;
  }

  /** Move cursor to the start of the current line. */
  moveCursorLineHome(): void {
    const lines = this._text.split('\n');
    const { lineIndex } = this._getCursorLineCol(lines);
    let absPos = 0;
    for (let i = 0; i < lineIndex; i++) {
      absPos += lines[i]!.length + 1;
    }
    if (this._cursorPosition !== absPos) {
      this._cursorPosition = absPos;
      this._selectionStart = -1;
      this._selectionEnd = -1;
      this.notifyListeners();
    }
  }

  /** Move cursor to the end of the current line. */
  moveCursorLineEnd(): void {
    const lines = this._text.split('\n');
    const { lineIndex } = this._getCursorLineCol(lines);
    let absPos = 0;
    for (let i = 0; i < lineIndex; i++) {
      absPos += lines[i]!.length + 1;
    }
    absPos += lines[lineIndex]!.length;
    if (this._cursorPosition !== absPos) {
      this._cursorPosition = absPos;
      this._selectionStart = -1;
      this._selectionEnd = -1;
      this.notifyListeners();
    }
  }

  // --- Selection with movement ---

  /** Extend selection to the left by one character (Shift+Left). */
  selectLeft(): void {
    if (this._cursorPosition <= 0) return;
    if (this._selectionStart < 0) {
      this._selectionStart = this._cursorPosition;
    }
    this._cursorPosition--;
    this._selectionEnd = this._cursorPosition;
    this.notifyListeners();
  }

  /** Extend selection to the right by one character (Shift+Right). */
  selectRight(): void {
    if (this._cursorPosition >= this._text.length) return;
    if (this._selectionStart < 0) {
      this._selectionStart = this._cursorPosition;
    }
    this._cursorPosition++;
    this._selectionEnd = this._cursorPosition;
    this.notifyListeners();
  }

  /** Extend selection to the previous word boundary (Ctrl+Shift+Left). */
  selectWordLeft(): void {
    const newPos = wordBoundaryLeft(this._text, this._cursorPosition);
    if (newPos === this._cursorPosition) return;
    if (this._selectionStart < 0) {
      this._selectionStart = this._cursorPosition;
    }
    this._cursorPosition = newPos;
    this._selectionEnd = this._cursorPosition;
    this.notifyListeners();
  }

  /** Extend selection to the next word boundary (Ctrl+Shift+Right). */
  selectWordRight(): void {
    const newPos = wordBoundaryRight(this._text, this._cursorPosition);
    if (newPos === this._cursorPosition) return;
    if (this._selectionStart < 0) {
      this._selectionStart = this._cursorPosition;
    }
    this._cursorPosition = newPos;
    this._selectionEnd = this._cursorPosition;
    this.notifyListeners();
  }

  /** Extend selection upward by one line (Shift+Up). */
  selectUp(): void {
    const lines = this._text.split('\n');
    if (lines.length <= 1) return;
    const { lineIndex, colInLine } = this._getCursorLineCol(lines);
    if (lineIndex <= 0) return;
    if (this._selectionStart < 0) {
      this._selectionStart = this._cursorPosition;
    }
    const prevLine = lines[lineIndex - 1]!;
    const newCol = Math.min(colInLine, prevLine.length);
    let absPos = 0;
    for (let i = 0; i < lineIndex - 1; i++) {
      absPos += lines[i]!.length + 1;
    }
    absPos += newCol;
    this._cursorPosition = absPos;
    this._selectionEnd = this._cursorPosition;
    this.notifyListeners();
  }

  /** Extend selection downward by one line (Shift+Down). */
  selectDown(): void {
    const lines = this._text.split('\n');
    if (lines.length <= 1) return;
    const { lineIndex, colInLine } = this._getCursorLineCol(lines);
    if (lineIndex >= lines.length - 1) return;
    if (this._selectionStart < 0) {
      this._selectionStart = this._cursorPosition;
    }
    const nextLine = lines[lineIndex + 1]!;
    const newCol = Math.min(colInLine, nextLine.length);
    let absPos = 0;
    for (let i = 0; i <= lineIndex; i++) {
      absPos += lines[i]!.length + 1;
    }
    absPos += newCol;
    this._cursorPosition = absPos;
    this._selectionEnd = this._cursorPosition;
    this.notifyListeners();
  }

  /** Extend selection to Home (Shift+Home). */
  selectHome(): void {
    if (this._cursorPosition <= 0) return;
    if (this._selectionStart < 0) {
      this._selectionStart = this._cursorPosition;
    }
    this._cursorPosition = 0;
    this._selectionEnd = this._cursorPosition;
    this.notifyListeners();
  }

  /** Extend selection to End (Shift+End). */
  selectEnd(): void {
    if (this._cursorPosition >= this._text.length) return;
    if (this._selectionStart < 0) {
      this._selectionStart = this._cursorPosition;
    }
    this._cursorPosition = this._text.length;
    this._selectionEnd = this._cursorPosition;
    this.notifyListeners();
  }

  // --- Selection ---

  selectAll(): void {
    this._selectionStart = 0;
    this._selectionEnd = this._text.length;
    this._cursorPosition = this._text.length;
    this.notifyListeners();
  }

  /** Select the word at the given character position (for double-click). */
  selectWordAt(pos: number): void {
    const bounds = wordBoundsAt(this._text, pos);
    this._selectionStart = bounds.start;
    this._selectionEnd = bounds.end;
    this._cursorPosition = bounds.end;
    this.notifyListeners();
  }

  // --- Clear ---

  clear(): void {
    this._text = '';
    this._cursorPosition = 0;
    this._selectionStart = -1;
    this._selectionEnd = -1;
    this.notifyListeners();
  }

  // --- Internal helpers ---

  /** Delete the current selection and place cursor at selection start. */
  private _deleteSelection(): void {
    if (!this.hasSelection) return;
    const start = Math.min(this._selectionStart, this._selectionEnd);
    const end = Math.max(this._selectionStart, this._selectionEnd);
    this._text = this._text.slice(0, start) + this._text.slice(end);
    this._cursorPosition = start;
    this._selectionStart = -1;
    this._selectionEnd = -1;
    this.notifyListeners();
  }

  /** Get the line index and column of the cursor within multi-line text. */
  private _getCursorLineCol(lines: string[]): { lineIndex: number; colInLine: number } {
    let remaining = this._cursorPosition;
    for (let i = 0; i < lines.length; i++) {
      const lineLen = lines[i]!.length;
      if (remaining <= lineLen) {
        return { lineIndex: i, colInLine: remaining };
      }
      remaining -= lineLen + 1; // +1 for the \n
    }
    // Fallback: cursor at end of last line
    return { lineIndex: lines.length - 1, colInLine: lines[lines.length - 1]!.length };
  }
}

// ---------------------------------------------------------------------------
// TextField Widget — StatefulWidget
// ---------------------------------------------------------------------------

/**
 * A text input widget that manages a TextEditingController and focus.
 *
 * Usage:
 *   new TextField({ placeholder: 'Type here...', onSubmitted: (text) => ... })
 *
 * The TextField creates a default controller if none is provided.
 * It handles key events for text editing and dispatches onChanged/onSubmitted.
 *
 * Features:
 * - Single-line (maxLines=1): Enter submits
 * - Multi-line (maxLines>1 or undefined): Enter inserts newline, Ctrl+Enter submits
 * - Shift+Enter / Alt+Enter always inserts newline
 * - Word-level operations (Ctrl+Backspace, Ctrl+Delete, Ctrl+Left/Right)
 * - Selection (Shift+arrows, Ctrl+A, Ctrl+Shift+Left/Right)
 * - Mouse: click to place cursor, double-click to select word, drag to select
 * - Renders via Text widget with TextSpan for consistent rendering
 */
export class TextField extends StatefulWidget {
  readonly controller?: TextEditingController;
  readonly placeholder?: string;
  readonly style?: TextStyle;
  readonly selectionColor?: Color;
  readonly cursorChar?: string;
  readonly maxLines?: number;
  readonly submitOnEnter?: boolean;
  readonly onSubmit?: (text: string) => void;
  readonly onSubmitted?: (text: string) => void;
  readonly onChanged?: (text: string) => void;
  readonly autofocus?: boolean;
  readonly focusNode?: FocusNode;

  constructor(opts?: {
    key?: Key;
    controller?: TextEditingController;
    placeholder?: string;
    style?: TextStyle;
    selectionColor?: Color;
    cursorChar?: string;
    maxLines?: number;
    submitOnEnter?: boolean;
    onSubmit?: (text: string) => void;
    onSubmitted?: (text: string) => void;
    onChanged?: (text: string) => void;
    autofocus?: boolean;
    focusNode?: FocusNode;
  }) {
    super(opts?.key !== undefined ? { key: opts.key } : undefined);
    this.controller = opts?.controller;
    this.placeholder = opts?.placeholder;
    this.style = opts?.style;
    this.selectionColor = opts?.selectionColor;
    this.cursorChar = opts?.cursorChar;
    this.maxLines = opts?.maxLines;
    this.submitOnEnter = opts?.submitOnEnter;
    this.onSubmit = opts?.onSubmit;
    this.onSubmitted = opts?.onSubmitted;
    this.onChanged = opts?.onChanged;
    this.autofocus = opts?.autofocus;
    this.focusNode = opts?.focusNode;
  }

  /** Whether this is a single-line text field. */
  get isSingleLine(): boolean {
    return this.maxLines === 1;
  }

  createState(): State<TextField> {
    return new TextFieldState();
  }
}

/**
 * State for TextField. Manages the controller lifecycle and builds
 * a Text widget representation of the input content.
 */
class TextFieldState extends State<TextField> {
  private _controller!: TextEditingController;
  private _ownsController: boolean = false;
  private _focusNode!: FocusNode;
  private _ownsFocusNode: boolean = false;

  // Mouse interaction state
  private _lastClickTime: number = 0;
  private _lastClickPos: number = -1;
  private _isDragging: boolean = false;
  private _dragAnchor: number = -1;

  initState(): void {
    super.initState();

    // Controller setup
    if (this.widget.controller) {
      this._controller = this.widget.controller;
      this._ownsController = false;
    } else {
      this._controller = new TextEditingController();
      this._ownsController = true;
    }
    this._controller.addListener(this._onControllerChanged);

    // FocusNode setup
    if (this.widget.focusNode) {
      this._focusNode = this.widget.focusNode;
      this._ownsFocusNode = false;
    } else {
      this._focusNode = new FocusNode({ debugLabel: 'TextField' });
      this._ownsFocusNode = true;
    }
    this._focusNode.onKey = this._handleKeyEvent;
    this._focusNode.onPaste = this._handlePaste;
  }

  private _onControllerChanged = (): void => {
    if (this.mounted) {
      this.setState();
      this.widget.onChanged?.(this._controller.text);
    }
  };

  didUpdateWidget(oldWidget: TextField): void {
    // Controller change
    if (oldWidget.controller !== this.widget.controller) {
      this._controller.removeListener(this._onControllerChanged);
      if (this._ownsController) {
        this._controller.dispose();
      }
      if (this.widget.controller) {
        this._controller = this.widget.controller;
        this._ownsController = false;
      } else {
        this._controller = new TextEditingController();
        this._ownsController = true;
      }
      this._controller.addListener(this._onControllerChanged);
    }

    // FocusNode change
    if (oldWidget.focusNode !== this.widget.focusNode) {
      if (this._ownsFocusNode) {
        this._focusNode.dispose();
      }
      if (this.widget.focusNode) {
        this._focusNode = this.widget.focusNode;
        this._ownsFocusNode = false;
      } else {
        this._focusNode = new FocusNode({ debugLabel: 'TextField' });
        this._ownsFocusNode = true;
      }
      this._focusNode.onKey = this._handleKeyEvent;
    this._focusNode.onPaste = this._handlePaste;
    }
  }

  dispose(): void {
    this._controller.removeListener(this._onControllerChanged);
    if (this._ownsController) {
      this._controller.dispose();
    }
    if (this._ownsFocusNode) {
      this._focusNode.dispose();
    }
    super.dispose();
  }

  // --- Key event handling ---

  private _handleKeyEvent = (event: KeyEvent): KeyEventResult => {
    return this.handleKeyEvent(event);
  };

  /**
   * Handle a key event for this text field.
   * Supports both the old string-based API and the new KeyEvent API.
   */
  handleKeyEvent(eventOrKey: KeyEvent | string): KeyEventResult | 'handled' | 'ignored' {
    // Support old string-based API for backward compatibility
    if (typeof eventOrKey === 'string') {
      return this._handleStringKey(eventOrKey);
    }

    const event = eventOrKey;
    const { key, ctrlKey, shiftKey, altKey } = event;
    const isMultiLine = !this.widget.isSingleLine;

    // --- Ctrl combinations ---
    if (ctrlKey && !shiftKey && !altKey) {
      switch (key) {
        case 'a':
          this._controller.selectAll();
          return 'handled';
        case 'Backspace':
          this._controller.deleteWordBackward();
          return 'handled';
        case 'Delete':
          this._controller.deleteWordForward();
          return 'handled';
        case 'ArrowLeft':
          this._controller.moveCursorWordLeft();
          return 'handled';
        case 'ArrowRight':
          this._controller.moveCursorWordRight();
          return 'handled';
        case 'Enter':
        case 'Return':
          // Ctrl+Enter always submits
          this._submit();
          return 'handled';
      }
    }

    // --- Ctrl+Shift combinations ---
    if (ctrlKey && shiftKey && !altKey) {
      switch (key) {
        case 'ArrowLeft':
          this._controller.selectWordLeft();
          return 'handled';
        case 'ArrowRight':
          this._controller.selectWordRight();
          return 'handled';
      }
    }

    // --- Shift combinations (selection) ---
    if (shiftKey && !ctrlKey && !altKey) {
      switch (key) {
        case 'ArrowLeft':
          this._controller.selectLeft();
          return 'handled';
        case 'ArrowRight':
          this._controller.selectRight();
          return 'handled';
        case 'ArrowUp':
          this._controller.selectUp();
          return 'handled';
        case 'ArrowDown':
          this._controller.selectDown();
          return 'handled';
        case 'Home':
          this._controller.selectHome();
          return 'handled';
        case 'End':
          this._controller.selectEnd();
          return 'handled';
        case 'Enter':
        case 'Return':
          // Shift+Enter: insert newline (even in single-line mode)
          this._controller.insertText('\n');
          return 'handled';
      }
    }

    // --- Alt+Enter: insert newline ---
    if (altKey && !ctrlKey && !shiftKey && (key === 'Enter' || key === 'Return')) {
      this._controller.insertText('\n');
      return 'handled';
    }

    // --- Plain keys (no ctrl/alt/meta) ---
    if (!ctrlKey && !altKey) {
      switch (key) {
        case 'Backspace':
          this._controller.deleteBackward();
          return 'handled';
        case 'Delete':
          this._controller.deleteForward();
          return 'handled';
        case 'ArrowLeft':
          if (this._controller.hasSelection) {
            // Move to start of selection
            const pos = Math.min(this._controller.selectionStart, this._controller.selectionEnd);
            this._controller.clearSelection();
            this._controller.cursorPosition = pos;
          } else {
            this._controller.moveCursorLeft();
          }
          return 'handled';
        case 'ArrowRight':
          if (this._controller.hasSelection) {
            // Move to end of selection
            const pos = Math.max(this._controller.selectionStart, this._controller.selectionEnd);
            this._controller.clearSelection();
            this._controller.cursorPosition = pos;
          } else {
            this._controller.moveCursorRight();
          }
          return 'handled';
        case 'ArrowUp':
          if (isMultiLine) {
            const movedUp = this._controller.moveCursorUp();
            return movedUp ? 'handled' : 'ignored';
          }
          return 'ignored';
        case 'ArrowDown':
          if (isMultiLine) {
            const movedDown = this._controller.moveCursorDown();
            return movedDown ? 'handled' : 'ignored';
          }
          return 'ignored';
        case 'Home':
          if (isMultiLine) {
            this._controller.moveCursorLineHome();
          } else {
            this._controller.moveCursorHome();
          }
          return 'handled';
        case 'End':
          if (isMultiLine) {
            this._controller.moveCursorLineEnd();
          } else {
            this._controller.moveCursorEnd();
          }
          return 'handled';
        case 'Enter':
        case 'Return':
          if (isMultiLine && !this.widget.submitOnEnter) {
            this._controller.insertText('\n');
          } else {
            this._submit();
          }
          return 'handled';
        case 'Tab':
          return 'ignored'; // Let focus system handle Tab
      }

      // Printable characters (single char, not shift-only modified)
      if (key.length === 1 && !event.metaKey) {
        const code = key.charCodeAt(0);
        if (code >= 0x20 && code <= 0x7E) {
          this._controller.insertText(key);
          return 'handled';
        }
      }

      // Space key
      if (key === 'Space') {
        this._controller.insertText(' ');
        return 'handled';
      }
    }

    return 'ignored';
  }

  /**
   * Legacy string-based key handler for backward compatibility.
   */
  private _handleStringKey(key: string): 'handled' | 'ignored' {
    if (key === 'Backspace') {
      this._controller.deleteBackward();
      return 'handled';
    }
    if (key === 'Delete') {
      this._controller.deleteForward();
      return 'handled';
    }
    if (key === 'ArrowLeft') {
      this._controller.moveCursorLeft();
      return 'handled';
    }
    if (key === 'ArrowRight') {
      this._controller.moveCursorRight();
      return 'handled';
    }
    if (key === 'Home') {
      this._controller.moveCursorHome();
      return 'handled';
    }
    if (key === 'End') {
      this._controller.moveCursorEnd();
      return 'handled';
    }
    if (key === 'Enter') {
      this._submit();
      return 'handled';
    }
    // Printable characters (single char)
    if (key.length === 1) {
      this._controller.insertText(key);
      return 'handled';
    }
    return 'ignored';
  }

  /** Fire submit callbacks. */
  private _submit(): void {
    const text = this._controller.text;
    this.widget.onSubmit?.(text);
    this.widget.onSubmitted?.(text);
  }

  /**
   * Copy current selection to system clipboard via OSC 52.
   * Amp ref: wB0 clipboard — selection auto-copies to clipboard
   */
  private _copySelectionToClipboard(): void {
    const selectedText = this._controller.selectedText;
    if (!selectedText) return;
    try {
      const { WidgetsBinding } = require('../framework/binding');
      const binding = WidgetsBinding.instance;
      if (binding?.tui) {
        binding.tui.copyToClipboard(selectedText);
      }
    } catch {
      // WidgetsBinding not available (e.g., in tests)
    }
  }

  /**
   * Handle paste event: insert pasted text at cursor / replace selection.
   * Wired to FocusNode.onPaste via the focus system.
   */
  private _handlePaste = (text: string): void => {
    this._controller.insertText(text);
  };

  // --- Mouse handling ---

  /**
   * Handle mouse events for the text field.
   * @param action The mouse action type
   * @param x The x coordinate relative to the text field
   * @param y The y coordinate relative to the text field (line number for multi-line)
   */
  handleMouseEvent(action: string, x: number, y: number): void {
    const charPos = this._getCharPositionFromCoords(x, y);

    switch (action) {
      case 'press':
      case 'click': {
        const now = Date.now();
        const isDoubleClick = (now - this._lastClickTime < 500) && (this._lastClickPos === charPos);
        this._lastClickTime = now;
        this._lastClickPos = charPos;

        if (isDoubleClick) {
          // Double-click: select word
          this._controller.selectWordAt(charPos);
          this._copySelectionToClipboard();
        } else {
          // Single click: place cursor
          this._controller.clearSelection();
          this._controller.cursorPosition = charPos;
          this._isDragging = true;
          this._dragAnchor = charPos;
        }
        break;
      }
      case 'move':
      case 'drag': {
        if (this._isDragging && this._dragAnchor >= 0) {
          // Click-and-drag: extend selection from anchor to current position
          this._controller.setSelection(this._dragAnchor, charPos);
          // Update cursor position to the drag end
          this._controller.cursorPosition = charPos;
        }
        break;
      }
      case 'release': {
        if (this._isDragging && this._controller.hasSelection) {
          this._copySelectionToClipboard();
        }
        this._isDragging = false;
        break;
      }
    }
  }

  /**
   * Convert (x, y) coordinates to a character position in the text.
   */
  private _getCharPositionFromCoords(x: number, y: number): number {
    const text = this._controller.text;
    const lines = text.split('\n');
    const lineIdx = Math.max(0, Math.min(y, lines.length - 1));
    const line = lines[lineIdx]!;
    const col = Math.max(0, Math.min(x, line.length));

    // Calculate absolute position
    let absPos = 0;
    for (let i = 0; i < lineIdx; i++) {
      absPos += lines[i]!.length + 1; // +1 for \n
    }
    absPos += col;

    return Math.min(absPos, text.length);
  }

  get controller(): TextEditingController {
    return this._controller;
  }

  get focusNode(): FocusNode {
    return this._focusNode;
  }

  build(_context: BuildContext): Widget {
    const text = this._controller.text;
    const cursorPos = this._controller.cursorPosition;
    const hasSelection = this._controller.hasSelection;
    const selStart = this._controller.selectionStart;
    const selEnd = this._controller.selectionEnd;
    const baseStyle = this.widget.style ?? new TextStyle();
    const selectionColor = this.widget.selectionColor ?? Color.rgb(50, 50, 180);
    const cursorChar = this.widget.cursorChar ?? '\u2502';

    // Build display text with cursor indicator
    let displayText: string;
    if (text.length === 0) {
      // Show placeholder or cursor
      displayText = this.widget.placeholder ?? '';
      if (displayText.length === 0) {
        displayText = cursorChar;
      }
    } else {
      // Insert cursor indicator at position
      const before = text.slice(0, cursorPos);
      const after = text.slice(cursorPos);
      displayText = before + cursorChar + after;
    }

    // Build TextSpan with selection highlighting
    let span: TextSpan;
    if (hasSelection && text.length > 0) {
      const minSel = Math.min(selStart, selEnd);
      const maxSel = Math.max(selStart, selEnd);

      // We build the display text with the cursor, so we need to adjust
      // selection indices for the cursor character insertion.
      // The cursor is at cursorPos in the original text.
      // In displayText: positions before cursorPos are the same,
      // the cursor char is at cursorPos, positions after shift by 1.
      const adjustSel = (pos: number) => pos <= cursorPos ? pos : pos + 1;
      const adjMin = adjustSel(minSel);
      const adjMax = adjustSel(maxSel);

      const selStyle = baseStyle.copyWith({ background: selectionColor });

      const children: TextSpan[] = [];
      if (adjMin > 0) {
        children.push(new TextSpan({ text: displayText.slice(0, adjMin), style: baseStyle }));
      }
      children.push(new TextSpan({ text: displayText.slice(adjMin, adjMax), style: selStyle }));
      if (adjMax < displayText.length) {
        children.push(new TextSpan({ text: displayText.slice(adjMax), style: baseStyle }));
      }

      span = new TextSpan({ children });
    } else {
      span = new TextSpan({ text: displayText, style: baseStyle });
    }

    // Use the FocusScope to wrap the Text widget
    const textWidget = new Text({
      text: span,
      maxLines: this.widget.maxLines,
    });

    return new FocusScope({
      focusNode: this._focusNode,
      autofocus: this.widget.autofocus ?? false,
      onKey: this._handleKeyEvent,
      child: textWidget,
    });
  }
}
