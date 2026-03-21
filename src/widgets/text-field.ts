// TextField with TextEditingController — text input widget
// Amp ref: widgets-catalog.md — StatefulWidget with controller pattern
// TextEditingController manages text state; TextField manages focus + key events

import { Widget, StatefulWidget, StatelessWidget, State, type BuildContext } from '../framework/widget';
import { Key } from '../core/key';
import { TextSpan } from '../core/text-span';
import { TextStyle } from '../core/text-style';
import { ChangeNotifier } from '../framework/listenable';

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

  // --- Text editing operations ---

  /**
   * Insert text at the current cursor position.
   * If there is a selection, replace the selected text.
   */
  insertText(text: string): void {
    if (this._selectionStart >= 0 && this._selectionEnd >= 0 && this._selectionStart !== this._selectionEnd) {
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
   */
  deleteBackward(): void {
    if (this._cursorPosition <= 0) return;
    this._text =
      this._text.slice(0, this._cursorPosition - 1) +
      this._text.slice(this._cursorPosition);
    this._cursorPosition--;
    this.notifyListeners();
  }

  /**
   * Delete the character at the cursor (Delete key).
   */
  deleteForward(): void {
    if (this._cursorPosition >= this._text.length) return;
    this._text =
      this._text.slice(0, this._cursorPosition) +
      this._text.slice(this._cursorPosition + 1);
    this.notifyListeners();
  }

  // --- Cursor movement ---

  moveCursorLeft(): void {
    if (this._cursorPosition > 0) {
      this._cursorPosition--;
      this.notifyListeners();
    }
  }

  moveCursorRight(): void {
    if (this._cursorPosition < this._text.length) {
      this._cursorPosition++;
      this.notifyListeners();
    }
  }

  moveCursorHome(): void {
    if (this._cursorPosition !== 0) {
      this._cursorPosition = 0;
      this.notifyListeners();
    }
  }

  moveCursorEnd(): void {
    if (this._cursorPosition !== this._text.length) {
      this._cursorPosition = this._text.length;
      this.notifyListeners();
    }
  }

  // --- Selection ---

  selectAll(): void {
    this._selectionStart = 0;
    this._selectionEnd = this._text.length;
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
}

// ---------------------------------------------------------------------------
// TextField Widget — StatefulWidget
// ---------------------------------------------------------------------------

/**
 * A text input widget that manages a TextEditingController and focus.
 *
 * Usage:
 *   new TextField({ placeholder: 'Type here...', onSubmit: (text) => ... })
 *
 * The TextField creates a default controller if none is provided.
 * It handles key events for text editing and dispatches onChanged/onSubmit.
 */
export class TextField extends StatefulWidget {
  readonly controller?: TextEditingController;
  readonly placeholder?: string;
  readonly style?: TextStyle;
  readonly onSubmit?: (text: string) => void;
  readonly onChanged?: (text: string) => void;
  readonly autofocus?: boolean;

  constructor(opts?: {
    key?: Key;
    controller?: TextEditingController;
    placeholder?: string;
    style?: TextStyle;
    onSubmit?: (text: string) => void;
    onChanged?: (text: string) => void;
    autofocus?: boolean;
  }) {
    super(opts?.key !== undefined ? { key: opts.key } : undefined);
    this.controller = opts?.controller;
    this.placeholder = opts?.placeholder;
    this.style = opts?.style;
    this.onSubmit = opts?.onSubmit;
    this.onChanged = opts?.onChanged;
    this.autofocus = opts?.autofocus;
  }

  createState(): State<TextField> {
    return new TextFieldState();
  }
}

/**
 * State for TextField. Manages the controller lifecycle and builds
 * a Text-like representation of the input content.
 */
class TextFieldState extends State<TextField> {
  private _controller!: TextEditingController;
  private _ownsController: boolean = false;

  initState(): void {
    super.initState();
    if (this.widget.controller) {
      this._controller = this.widget.controller;
      this._ownsController = false;
    } else {
      this._controller = new TextEditingController();
      this._ownsController = true;
    }
    this._controller.addListener(this._onControllerChanged);
  }

  private _onControllerChanged = (): void => {
    if (this.mounted) {
      this.setState();
      this.widget.onChanged?.(this._controller.text);
    }
  };

  didUpdateWidget(oldWidget: TextField): void {
    if (oldWidget.controller !== this.widget.controller) {
      // Controller changed externally
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
  }

  dispose(): void {
    this._controller.removeListener(this._onControllerChanged);
    if (this._ownsController) {
      this._controller.dispose();
    }
    super.dispose();
  }

  /**
   * Handle a key event for this text field.
   * Called externally by the focus system.
   */
  handleKeyEvent(key: string): 'handled' | 'ignored' {
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
      this.widget.onSubmit?.(this._controller.text);
      return 'handled';
    }
    // Printable characters (single char)
    if (key.length === 1) {
      this._controller.insertText(key);
      return 'handled';
    }
    return 'ignored';
  }

  get controller(): TextEditingController {
    return this._controller;
  }

  build(_context: BuildContext): Widget {
    const text = this._controller.text;
    const cursorPos = this._controller.cursorPosition;

    // Build display text with cursor indicator
    let displayText: string;
    if (text.length === 0) {
      // Show placeholder or cursor
      displayText = this.widget.placeholder ?? '';
      if (displayText.length === 0) {
        displayText = '\u2502'; // cursor character
      }
    } else {
      // Insert cursor indicator at position
      const before = text.slice(0, cursorPos);
      const after = text.slice(cursorPos);
      displayText = before + '\u2502' + after;
    }

    // Return a simple TextSpan-based widget representation
    // Since we don't have a Text widget yet (from parallel plan), use a
    // placeholder StatelessWidget that carries the text data
    return new _TextFieldDisplay({
      text: displayText,
      style: this.widget.style,
    });
  }
}

/**
 * Internal widget that displays the text field content.
 * Acts as a leaf StatelessWidget carrying text + style data.
 */
class _TextFieldDisplay extends StatelessWidget {
  readonly text: string;
  readonly style?: TextStyle;

  constructor(opts: { text: string; style?: TextStyle; key?: Key }) {
    super(opts.key !== undefined ? { key: opts.key } : undefined);
    this.text = opts.text;
    this.style = opts.style;
  }

  build(_context: BuildContext): Widget {
    // Terminal leaf — returns self (actual rendering in Phase 5+)
    return this;
  }
}
