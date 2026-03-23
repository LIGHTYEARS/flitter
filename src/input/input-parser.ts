// Core escape sequence parser — state machine for terminal input
// Amp ref: input-system.md Section 1 (emitKeys generator), Section 3.1 (wiring)
//
// This is a push-based parser that accepts raw characters via feed() and
// emits InputEvent objects via a callback. It faithfully reproduces the
// Bun/Node readline emitKeys() state machine found at amp-strings.txt:241761.

import type { InputEvent, KeyEvent, MouseEvent, PasteEvent, FocusEvent } from './events';
import { createKeyEvent, createPasteEvent, createFocusEvent } from './events';
import { LogicalKey, LOW_LEVEL_TO_TUI_KEY } from './keyboard';
import {
  extractMouseModifiers,
  extractBaseButton,
  determineMouseAction,
} from './mouse';

// -- Parser states --

const enum ParserState {
  /** Waiting for next character */
  Idle,
  /** Received ESC, waiting for next character */
  Escape,
  /** Inside a CSI sequence (ESC [) */
  CSI,
  /** Inside SS3 sequence (ESC O) */
  SS3,
  /** Inside bracketed paste (collecting text) */
  Paste,
}

// -- Regex patterns for CSI parameter parsing --
// Amp ref: input-system.md Section 1.4 (lines 241795, 241800)

/** Numeric codes with ~, ^, or $ terminators: e.g. "11~", "2;5~", "200~" */
const CSI_NUMERIC_RE = /^(?:(\d\d?)(?:;(\d+))?([~^$])|(\d{3}~))$/;

/** Letter-terminated codes: e.g. "A", "1;5A", "5A" */
const CSI_LETTER_RE = /^((\d+;)?(\d+))?([A-Za-z])$/;

/** SGR mouse format: e.g. "<0;10;5" with trailing M or m */
const SGR_MOUSE_RE = /^<(\d+);(\d+);(\d+)$/;

/**
 * Escape code timeout in milliseconds.
 * Amp ref: input-system.md Section 3.1 (line 242115, ESCAPE_CODE_TIMEOUT)
 */
const ESCAPE_TIMEOUT_MS = 500;

/**
 * InputParser: converts raw terminal input into structured InputEvent objects.
 *
 * Usage:
 *   const parser = new InputParser((event) => { handle(event); });
 *   process.stdin.on('data', (data) => parser.feed(data));
 *   // cleanup:
 *   parser.dispose();
 */
export class InputParser {
  private _callback: (event: InputEvent) => void;
  private _state: ParserState = ParserState.Idle;
  private _buffer: string = '';
  private _escapeTimer: ReturnType<typeof setTimeout> | null = null;
  private _pasteBuffer: string | null = null;
  private _escaped: boolean = false; // Whether we entered via bare ESC (meta=true)
  private _disposed: boolean = false;

  constructor(callback: (event: InputEvent) => void) {
    this._callback = callback;
  }

  /**
   * Feed raw input data from stdin.
   * Can accept strings or Buffers. Characters are processed one at a time
   * to handle partial/interleaved input correctly.
   */
  feed(data: string | Buffer): void {
    if (this._disposed) return;

    const str = typeof data === 'string' ? data : data.toString('utf8');
    for (const char of str) {
      this._processChar(char);
    }
  }

  /**
   * Main state machine dispatcher.
   */
  private _processChar(char: string): void {
    switch (this._state) {
      case ParserState.Idle:
        this._processIdle(char);
        break;
      case ParserState.Escape:
        this._processEscape(char);
        break;
      case ParserState.CSI:
        this._processCSI(char);
        break;
      case ParserState.SS3:
        this._processSS3(char);
        break;
      case ParserState.Paste:
        this._processPaste(char);
        break;
    }
  }

  /**
   * IDLE state: waiting for a new character.
   */
  private _processIdle(char: string): void {
    const code = char.charCodeAt(0);

    // ESC starts an escape sequence
    if (char === '\x1b') {
      this._clearEscapeTimeout();
      this._state = ParserState.Escape;
      this._buffer = '';
      this._escaped = false;
      this._startEscapeTimeout();
      return;
    }

    // Single character processing (non-escape)
    this._emitSingleChar(char, code, false);
  }

  /**
   * Emit a single non-escape character as a KeyEvent.
   * Amp ref: input-system.md Section 2.7
   */
  private _emitSingleChar(char: string, code: number, meta: boolean): void {
    let key: string;
    let ctrl = false;
    let shift = false;

    if (char === '\r' || char === '\n') {
      // Both \r (carriage return) and \n (line feed) map to 'Enter'.
      // Real terminals send \r when the Enter key is pressed.
      key = 'Enter';
    } else if (char === '\t') {
      key = 'Tab';
    } else if (char === '\b' || code === 0x7F) {
      key = 'Backspace';
    } else if (char === ' ') {
      key = 'Space';
    } else if (code >= 0x01 && code <= 0x1A) {
      // Control characters: 0x01 = ctrl+a, etc.
      // Amp ref: input-system.md line 242044
      ctrl = true;
      key = String.fromCharCode(code + 0x60); // 0x01 -> 'a'
    } else if (code >= 0x20 && code <= 0x7E) {
      // Printable ASCII
      key = char;
      // Uppercase letters have shift set
      // Amp ref: input-system.md line 242046
      if (code >= 0x41 && code <= 0x5A) {
        shift = true;
        key = char.toLowerCase();
      }
    } else {
      // Any other character (unicode, etc.)
      key = char;
    }

    // Map to TUI-level key name
    const tuiKey = LOW_LEVEL_TO_TUI_KEY[key] ?? key;

    this._emit(createKeyEvent(tuiKey, {
      ctrlKey: ctrl,
      altKey: meta,
      shiftKey: shift,
      metaKey: false,
      sequence: char,
    }));
  }

  /**
   * ESCAPE state: received ESC, waiting for next character.
   * Amp ref: input-system.md Section 1.2 (state machine)
   */
  private _processEscape(char: string): void {
    this._clearEscapeTimeout();

    if (char === '[') {
      // CSI mode: ESC [
      this._state = ParserState.CSI;
      this._buffer = '';
      return;
    }

    if (char === 'O') {
      // SS3 mode: ESC O
      this._state = ParserState.SS3;
      this._buffer = '';
      return;
    }

    if (char === '\x1b') {
      // Double ESC: emit first as Escape, start new escape sequence
      this._emit(createKeyEvent('Escape', { sequence: '\x1b' }));
      this._state = ParserState.Escape;
      this._buffer = '';
      this._startEscapeTimeout();
      return;
    }

    if (char === '') {
      // Empty string from timeout trigger — emit bare ESC
      this._emitBareEscape();
      return;
    }

    // Bare escape + char = meta modifier on the character
    // Amp ref: input-system.md Section 1.2 (bare escape path)
    this._state = ParserState.Idle;
    const code = char.charCodeAt(0);
    this._emitSingleChar(char, code, true);
  }

  /**
   * CSI state: inside ESC [ ... sequence, collecting parameters.
   * Format: ESC [ [params] [intermediate] final
   * Amp ref: input-system.md Section 1.4
   */
  private _processCSI(char: string): void {
    const code = char.charCodeAt(0);

    // Collect digits, semicolons, '<', and intermediate bytes
    if (
      (code >= 0x30 && code <= 0x3F) || // 0-9, :, ;, <, =, >, ?
      char === '[' // double-bracket prefix like [[A for f1
    ) {
      this._buffer += char;
      return;
    }

    // Final byte: 0x40-0x7E (letters, ~, ^) plus $ (0x24)
    // Standard CSI final bytes are 0x40-0x7E, but rxvt uses $ as terminator
    if ((code >= 0x40 && code <= 0x7E) || char === '$') {
      const params = this._buffer;
      const final = char;
      this._state = ParserState.Idle;
      this._resolveCSI(params, final);
      return;
    }

    // Unexpected character — reset to idle
    this._state = ParserState.Idle;
  }

  /**
   * Resolve a complete CSI sequence.
   */
  private _resolveCSI(params: string, final: string): void {
    const fullCode = '[' + params + final;
    const sequence = '\x1b' + fullCode;

    // Check for SGR mouse: ESC [ < button ; col ; row M|m
    if (params.startsWith('<') && (final === 'M' || final === 'm')) {
      const mouseParams = params.slice(1); // strip leading '<'
      this._parseSGRMouse(mouseParams, final, sequence);
      return;
    }

    // Check for focus events: ESC [ I (focus in) or ESC [ O (focus out)
    if (params === '' && final === 'I') {
      this._emit(createFocusEvent(true));
      return;
    }
    if (params === '' && final === 'O') {
      this._emit(createFocusEvent(false));
      return;
    }

    // Check for bracketed paste: [200~ and [201~
    if (params + final === '200~') {
      this._state = ParserState.Paste;
      this._pasteBuffer = '';
      return;
    }
    if (params + final === '201~') {
      // paste-end without paste-start (shouldn't normally happen)
      this._state = ParserState.Idle;
      return;
    }

    // Try to match the code against the key mapping table
    const csiCode = params + final;

    // Check for Linux console double-bracket function keys: [[A through [[E
    // Amp ref: input-system.md Section 2.1
    if (params.startsWith('[') && final.length === 1) {
      const linuxCode = '[[' + final;
      const linuxName = CSI_LETTER_MAP[linuxCode];
      if (linuxName) {
        const tuiKey = LOW_LEVEL_TO_TUI_KEY[linuxName] ?? linuxName;
        this._emit(createKeyEvent(tuiKey, { sequence }));
        return;
      }
    }

    // Try numeric code regex: "11~", "2;5~", "200~", etc.
    const numericMatch = CSI_NUMERIC_RE.exec(csiCode);
    if (numericMatch) {
      this._resolveNumericCSI(numericMatch, fullCode, sequence);
      return;
    }

    // Try letter code regex: "A", "1;5A", etc.
    const letterMatch = CSI_LETTER_RE.exec(csiCode);
    if (letterMatch) {
      this._resolveLetterCSI(letterMatch, fullCode, sequence);
      return;
    }

    // Unknown CSI sequence — emit as undefined key with the raw sequence
    this._emit(createKeyEvent('Undefined', { sequence }));
  }

  /**
   * Resolve CSI sequences with numeric codes and ~ ^ $ terminators.
   * Amp ref: input-system.md Section 1.4 (regex pattern at line 241795)
   */
  private _resolveNumericCSI(
    match: RegExpExecArray,
    fullCode: string,
    sequence: string,
  ): void {
    let keyName: string | undefined;
    let modifier = 0;
    let shift = false;
    let ctrl = false;

    if (match[4]) {
      // 3-digit numeric code: e.g. "200~" (handled above for paste),
      // but could be other 3-digit codes
      keyName = this._lookupNumericCode(match[4].slice(0, -1), '~');
    } else {
      const code = match[1]!;
      const modStr = match[2];
      const terminator = match[3]!;

      if (modStr) {
        modifier = (parseInt(modStr, 10) || 1) - 1;
      }

      // Shift variants (rxvt-style $)
      // Amp ref: input-system.md Section 2.4
      if (terminator === '$') {
        shift = true;
      }
      // Ctrl variants (rxvt-style ^)
      // Amp ref: input-system.md Section 2.5
      if (terminator === '^') {
        ctrl = true;
      }

      keyName = this._lookupNumericCode(code, terminator);
    }

    if (!keyName) {
      this._emit(createKeyEvent('Undefined', { sequence }));
      return;
    }

    // Decode modifier bits from CSI parameter
    // Amp ref: input-system.md Section 1.3
    const modifiers = this._decodeModifier(modifier);

    // Map to TUI key name
    const tuiKey = LOW_LEVEL_TO_TUI_KEY[keyName] ?? keyName;

    this._emit(createKeyEvent(tuiKey, {
      ctrlKey: ctrl || modifiers.ctrl,
      altKey: modifiers.alt,
      shiftKey: shift || modifiers.shift,
      metaKey: modifiers.meta,
      sequence,
    }));
  }

  /**
   * Resolve CSI sequences with letter terminators.
   * Amp ref: input-system.md Section 1.4 (regex at line 241800)
   */
  private _resolveLetterCSI(
    match: RegExpExecArray,
    fullCode: string,
    sequence: string,
  ): void {
    const modStr = match[3];
    const letter = match[4]!;

    let modifier = 0;
    if (modStr) {
      modifier = (parseInt(modStr, 10) || 1) - 1;
    }

    // For Linux console double-bracket codes, the buffer contains "[" prefix
    // e.g., buffer="[" final="A" → code="[[A"
    // These are now handled above in _resolveCSI before reaching regex matching.
    const code = '[' + letter;
    let keyName = this._lookupLetterCode(code);
    let extraShift = false;

    // Shift+Tab special case: [Z maps to tab with shift=true
    // Amp ref: input-system.md Section 2.6
    if (code === '[Z' && keyName === 'tab') {
      extraShift = true;
    }

    // Check for rxvt-style shift variants (lowercase letters)
    // Amp ref: input-system.md Section 2.4
    if (!keyName) {
      const shiftName = RXVT_SHIFT_MAP['[' + letter];
      if (shiftName) {
        keyName = shiftName;
        extraShift = true;
      }
    }

    if (!keyName) {
      this._emit(createKeyEvent('Undefined', { sequence }));
      return;
    }

    const modifiers = this._decodeModifier(modifier);
    const tuiKey = LOW_LEVEL_TO_TUI_KEY[keyName] ?? keyName;

    this._emit(createKeyEvent(tuiKey, {
      ctrlKey: modifiers.ctrl,
      altKey: modifiers.alt,
      shiftKey: extraShift || modifiers.shift,
      metaKey: modifiers.meta,
      sequence,
    }));
  }

  /**
   * SS3 state: inside ESC O ... sequence.
   * SS3 sequences are typically a single letter, optionally preceded by a modifier digit.
   * Amp ref: input-system.md Section 1.2 (SS3 mode)
   */
  private _processSS3(char: string): void {
    const code = char.charCodeAt(0);

    // Collect digits (modifier)
    if (code >= 0x30 && code <= 0x39) {
      this._buffer += char;
      return;
    }

    // Final letter
    if (code >= 0x40 && code <= 0x7E) {
      const modStr = this._buffer;
      this._state = ParserState.Idle;

      const ss3Code = 'O' + char;
      let keyName = this._lookupSS3Code(ss3Code);
      let ctrl = false;

      // Check for rxvt-style ctrl variants: Oa, Ob, Oc, Od, Oe
      // Amp ref: input-system.md Section 2.5
      if (!keyName) {
        const rxvtName = RXVT_CTRL_SS3_MAP[ss3Code];
        if (rxvtName) {
          keyName = rxvtName;
          ctrl = true;
        }
      }

      if (!keyName) {
        this._emit(createKeyEvent('Undefined', { sequence: '\x1bO' + modStr + char }));
        return;
      }

      let modifier = 0;
      if (modStr) {
        modifier = (parseInt(modStr, 10) || 1) - 1;
      }

      const modifiers = this._decodeModifier(modifier);
      const tuiKey = LOW_LEVEL_TO_TUI_KEY[keyName] ?? keyName;

      this._emit(createKeyEvent(tuiKey, {
        ctrlKey: ctrl || modifiers.ctrl,
        altKey: modifiers.alt,
        shiftKey: modifiers.shift,
        metaKey: modifiers.meta,
        sequence: '\x1bO' + modStr + char,
      }));
      return;
    }

    // Unexpected — reset to idle
    this._state = ParserState.Idle;
  }

  /**
   * PASTE state: collecting text between [200~ and [201~.
   * Amp ref: input-system.md Section 11
   */
  private _processPaste(char: string): void {
    // We need to detect ESC [ 201 ~ to end paste mode.
    // Buffer potential escape sequence endings.
    if (this._pasteBuffer === null) {
      this._pasteBuffer = '';
    }

    this._pasteBuffer += char;

    // Check if the paste buffer ends with the paste-end sequence
    const PASTE_END = '\x1b[201~';
    if (this._pasteBuffer.endsWith(PASTE_END)) {
      const text = this._pasteBuffer.slice(0, -PASTE_END.length);
      this._pasteBuffer = null;
      this._state = ParserState.Idle;
      this._emit(createPasteEvent(text));
    }
  }

  /**
   * Parse SGR mouse event.
   * Format: button;col;row with M (press/motion) or m (release)
   * Amp ref: input-system.md Section 4.3
   *
   * Note: SGR coordinates are 1-based, we convert to 0-based.
   */
  private _parseSGRMouse(params: string, final: string, sequence: string): void {
    const match = SGR_MOUSE_RE.exec('<' + params);
    if (!match) return;

    const buttonCode = parseInt(match[1]!, 10);
    const col = parseInt(match[2]!, 10);
    const row = parseInt(match[3]!, 10);

    const mods = extractMouseModifiers(buttonCode);
    const baseButton = extractBaseButton(buttonCode);
    const action = determineMouseAction(buttonCode, final);

    const event: MouseEvent = {
      type: 'mouse',
      action,
      button: baseButton,
      x: col - 1,  // Convert 1-based to 0-based
      y: row - 1,  // Convert 1-based to 0-based
      ctrlKey: mods.ctrl,
      altKey: mods.alt,
      shiftKey: mods.shift,
    };

    this._callback(event);
  }

  /**
   * Start escape timeout. After ESCAPE_TIMEOUT_MS, emit bare ESC.
   * Amp ref: input-system.md Section 3.1 (line 242115)
   */
  private _startEscapeTimeout(): void {
    this._escapeTimer = setTimeout(() => {
      this._escapeTimer = null;
      if (this._state === ParserState.Escape) {
        this._emitBareEscape();
      }
    }, ESCAPE_TIMEOUT_MS);
  }

  private _clearEscapeTimeout(): void {
    if (this._escapeTimer !== null) {
      clearTimeout(this._escapeTimer);
      this._escapeTimer = null;
    }
  }

  /**
   * Emit a bare ESC as an Escape key event.
   */
  private _emitBareEscape(): void {
    this._state = ParserState.Idle;
    this._emit(createKeyEvent('Escape', { sequence: '\x1b' }));
  }

  /**
   * Force-flush the escape timeout. Used in tests.
   */
  flushEscapeTimeout(): void {
    if (this._escapeTimer !== null && this._state === ParserState.Escape) {
      this._clearEscapeTimeout();
      this._emitBareEscape();
    }
  }

  /**
   * Decode CSI modifier parameter into individual modifier flags.
   * Amp ref: input-system.md Section 1.3 (line 241805)
   *   modifier = (param || 1) - 1
   *   bit 0 = Shift, bit 1 = Alt, bit 2 = Ctrl, bit 3 = Meta
   */
  private _decodeModifier(modifier: number): {
    shift: boolean;
    alt: boolean;
    ctrl: boolean;
    meta: boolean;
  } {
    return {
      shift: !!(modifier & 1),
      alt: !!(modifier & 2),
      ctrl: !!(modifier & 4),
      meta: !!(modifier & 8),
    };
  }

  /**
   * Lookup key name for numeric CSI codes (with ~ ^ $ terminators).
   * Amp ref: input-system.md Section 2 (complete mapping table)
   */
  private _lookupNumericCode(numStr: string, _terminator: string): string | undefined {
    return NUMERIC_CODE_MAP[numStr];
  }

  /**
   * Lookup key name for letter-terminated CSI codes.
   * Amp ref: input-system.md Section 2.2
   */
  private _lookupLetterCode(code: string): string | undefined {
    return CSI_LETTER_MAP[code];
  }

  /**
   * Lookup key name for SS3 codes.
   * Amp ref: input-system.md Section 2.1-2.2
   */
  private _lookupSS3Code(code: string): string | undefined {
    return SS3_CODE_MAP[code];
  }

  private _emit(event: InputEvent): void {
    if (!this._disposed) {
      this._callback(event);
    }
  }

  /**
   * Dispose the parser, clearing any pending timers.
   */
  dispose(): void {
    this._disposed = true;
    this._clearEscapeTimeout();
  }
}

// -- Key Code Mapping Tables --
// Amp ref: input-system.md Section 2

/**
 * Numeric CSI code -> key name mapping.
 * Codes from the switch statement at amp-strings.txt:241805-242030
 */
const NUMERIC_CODE_MAP: Record<string, string> = {
  // Function keys (tilde-terminated)
  '11': 'f1',     // [11~
  '12': 'f2',     // [12~
  '13': 'f3',     // [13~
  '14': 'f4',     // [14~
  '15': 'f5',     // [15~
  '17': 'f6',     // [17~
  '18': 'f7',     // [18~
  '19': 'f8',     // [19~
  '20': 'f9',     // [20~
  '21': 'f10',    // [21~
  '23': 'f11',    // [23~
  '24': 'f12',    // [24~

  // Editing keys
  '1': 'home',    // [1~
  '2': 'insert',  // [2~
  '3': 'delete',  // [3~
  '4': 'end',     // [4~
  '5': 'pageup',  // [5~
  '6': 'pagedown',// [6~
  '7': 'home',    // [7~ (rxvt)
  '8': 'end',     // [8~ (rxvt)
};

/**
 * Letter-terminated CSI code -> key name mapping.
 * Amp ref: input-system.md Section 2.2
 */
const CSI_LETTER_MAP: Record<string, string> = {
  // Arrow keys
  '[A': 'up',
  '[B': 'down',
  '[C': 'right',
  '[D': 'left',

  // Navigation
  '[E': 'clear',
  '[F': 'end',
  '[H': 'home',

  // Function keys (CSI letter form)
  '[P': 'f1',
  '[Q': 'f2',
  '[R': 'f3',
  '[S': 'f4',

  // Shift+Tab
  '[Z': 'tab',  // with shift=true (handled in resolveLetterCSI)
};

/**
 * rxvt-style shift variant codes.
 * Amp ref: input-system.md Section 2.4
 */
const RXVT_SHIFT_MAP: Record<string, string> = {
  '[a': 'up',
  '[b': 'down',
  '[c': 'right',
  '[d': 'left',
  '[e': 'clear',
};

/**
 * SS3 code -> key name mapping.
 * Amp ref: input-system.md Section 2.1-2.2
 */
const SS3_CODE_MAP: Record<string, string> = {
  // Arrow keys (SS3 form)
  'OA': 'up',
  'OB': 'down',
  'OC': 'right',
  'OD': 'left',

  // Navigation (SS3 form)
  'OE': 'clear',
  'OF': 'end',
  'OH': 'home',

  // Function keys (SS3 form)
  'OP': 'f1',
  'OQ': 'f2',
  'OR': 'f3',
  'OS': 'f4',
};

/**
 * rxvt-style ctrl variants via SS3.
 * Amp ref: input-system.md Section 2.5
 */
const RXVT_CTRL_SS3_MAP: Record<string, string> = {
  'Oa': 'up',
  'Ob': 'down',
  'Oc': 'right',
  'Od': 'left',
  'Oe': 'clear',
};

/**
 * Linux console double-bracket function key codes.
 * Amp ref: input-system.md Section 2.1
 */
// These are handled in resolveCSI via the buffer containing "["
// e.g., ESC [ [ A = f1 on Linux console
const LINUX_CONSOLE_FKEY_MAP: Record<string, string> = {
  '[[A': 'f1',
  '[[B': 'f2',
  '[[C': 'f3',
  '[[D': 'f4',
  '[[E': 'f5',
};

// Register Linux console codes into CSI_LETTER_MAP
// These come in as CSI with buffer="[" and final letter
for (const [code, name] of Object.entries(LINUX_CONSOLE_FKEY_MAP)) {
  // The code "[A" with a preceding "[" in buffer
  // In our parser, buffer will be "[" and final will be "A"
  // So fullCode = "[" + "[" + "A" => "[[A"
  CSI_LETTER_MAP[code] = name;
}
