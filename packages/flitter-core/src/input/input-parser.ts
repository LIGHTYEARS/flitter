// Core escape sequence parser — state machine for terminal input
// Amp ref: input-system.md Section 1 (emitKeys generator), Section 3.1 (wiring)
//
// This is a push-based parser that accepts raw characters via feed() and
// emits InputEvent objects via a callback. It faithfully reproduces the
// Bun/Node readline emitKeys() state machine found at amp-strings.txt:241761.

import type { InputEvent, KeyEvent, MouseEvent, PasteEvent, FocusEvent, TerminalResponseEvent } from './events';
import { createKeyEvent, createPasteEvent, createImagePasteEvent, createFocusEvent, createTerminalResponseEvent } from './events';
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
  /** Inside an OSC sequence (ESC ]) — GAP-SUM-055 */
  OSC,
  /** Inside a DCS sequence (ESC P) — GAP-SUM-055 */
  DCS,
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

const BASE64_IMAGE_RE = /^data:(image\/[a-zA-Z+.-]+);base64,([A-Za-z0-9+/=\s]+)$/;

// -- Regex patterns for terminal response detection (GAP-SUM-055) --

/** DA1 response: ESC [ ? Ps ; ... c */
const DA1_RESPONSE_RE = /^\?[\d;]+$/;

/** DA2 response: ESC [ > Ps ; Ps ; Ps c */
const DA2_RESPONSE_RE = /^>[\d;]+$/;

/** DA3 response: ESC [ = ... c */
const DA3_RESPONSE_RE = /^=.*$/;

/** DSR response: ESC [ Ps n (typically ESC [ 0 n) */
const DSR_RESPONSE_RE = /^\d+$/;

/** DECRPM (mode report): ESC [ ? Ps ; Ps $ y */
const DECRPM_RESPONSE_RE = /^\?\d+;\d+\$$/;

/** Kitty keyboard query response: ESC [ ? flags u */
const KITTY_KB_RESPONSE_RE = /^\?\d+$/;

/** In-band resize (mode 2048): ESC [ 8 ; rows ; cols t — GAP-SUM-056 */
const IN_BAND_RESIZE_RE = /^8;(\d+);(\d+)$/;

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
  private _escaped: boolean = false;
  private _disposed: boolean = false;
  private _paused: boolean = false;

  constructor(callback: (event: InputEvent) => void) {
    this._callback = callback;
  }

  /**
   * Feed raw input data from stdin.
   * Can accept strings or Buffers. Characters are processed one at a time
   * to handle partial/interleaved input correctly.
   */
  feed(data: string | Buffer): void {
    if (this._disposed || this._paused) return;

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
      case ParserState.OSC:
        this._processOSC(char);
        break;
      case ParserState.DCS:
        this._processDCS(char);
        break;
    }
  }

  /**
   * IDLE state: waiting for a new character.
   */
  private _processIdle(char: string): void {
    const code = char.charCodeAt(0);

    if (char === '\x1b') {
      this._clearEscapeTimeout();
      this._state = ParserState.Escape;
      this._buffer = '';
      this._escaped = false;
      this._startEscapeTimeout();
      return;
    }

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
      key = 'Enter';
    } else if (char === '\t') {
      key = 'Tab';
    } else if (char === '\b' || code === 0x7F) {
      key = 'Backspace';
    } else if (char === ' ') {
      key = 'Space';
    } else if (code >= 0x01 && code <= 0x1A) {
      ctrl = true;
      key = String.fromCharCode(code + 0x60);
    } else if (code >= 0x20 && code <= 0x7E) {
      key = char;
      if (code >= 0x41 && code <= 0x5A) {
        shift = true;
        key = char.toLowerCase();
      }
    } else {
      key = char;
    }

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
      this._state = ParserState.CSI;
      this._buffer = '';
      return;
    }

    if (char === 'O') {
      this._state = ParserState.SS3;
      this._buffer = '';
      return;
    }

    if (char === ']') {
      this._state = ParserState.OSC;
      this._buffer = '';
      return;
    }

    if (char === 'P') {
      this._state = ParserState.DCS;
      this._buffer = '';
      return;
    }

    if (char === '\x1b') {
      this._emit(createKeyEvent('Escape', { sequence: '\x1b' }));
      this._state = ParserState.Escape;
      this._buffer = '';
      this._startEscapeTimeout();
      return;
    }

    if (char === '') {
      this._emitBareEscape();
      return;
    }

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

    if (
      (code >= 0x30 && code <= 0x3F) ||
      char === '['
    ) {
      this._buffer += char;
      return;
    }

    if ((code >= 0x40 && code <= 0x7E) || char === '$') {
      const params = this._buffer;
      const final = char;
      this._state = ParserState.Idle;
      this._resolveCSI(params, final);
      return;
    }

    this._state = ParserState.Idle;
  }

  /**
   * Resolve a complete CSI sequence.
   */
  private _resolveCSI(params: string, final: string): void {
    const fullCode = '[' + params + final;
    const sequence = '\x1b' + fullCode;

    // -- Terminal response detection (GAP-SUM-055) --

    if (final === 'c' && DA1_RESPONSE_RE.test(params)) {
      this._emit(createTerminalResponseEvent('da1', sequence, params));
      return;
    }

    if (final === 'c' && DA2_RESPONSE_RE.test(params)) {
      this._emit(createTerminalResponseEvent('da2', sequence, params));
      return;
    }

    if (final === 'c' && DA3_RESPONSE_RE.test(params)) {
      this._emit(createTerminalResponseEvent('da3', sequence, params));
      return;
    }

    if (final === 'n' && DSR_RESPONSE_RE.test(params)) {
      this._emit(createTerminalResponseEvent('dsr', sequence, params));
      return;
    }

    if (final === 'y' && DECRPM_RESPONSE_RE.test(params)) {
      this._emit(createTerminalResponseEvent('decrpm', sequence, params));
      return;
    }

    if (final === 'u' && KITTY_KB_RESPONSE_RE.test(params)) {
      this._emit(createTerminalResponseEvent('kitty_keyboard', sequence, params));
      return;
    }

    // In-band resize (mode 2048): ESC [ 8 ; rows ; cols t — GAP-SUM-056
    if (final === 't') {
      const resizeMatch = IN_BAND_RESIZE_RE.exec(params);
      if (resizeMatch) {
        const rows = parseInt(resizeMatch[1]!, 10);
        const cols = parseInt(resizeMatch[2]!, 10);
        this._emit({ type: 'resize', width: cols, height: rows });
        return;
      }
    }

    // Check for SGR mouse: ESC [ < button ; col ; row M|m
    if (params.startsWith('<') && (final === 'M' || final === 'm')) {
      const mouseParams = params.slice(1);
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
      this._state = ParserState.Idle;
      return;
    }

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

    // Kitty CSI u keyboard protocol
    if (final === 'u') {
      this._resolveKittyCSIu(params, sequence);
      return;
    }

    const numericMatch = CSI_NUMERIC_RE.exec(csiCode);
    if (numericMatch) {
      this._resolveNumericCSI(numericMatch, fullCode, sequence);
      return;
    }

    const letterMatch = CSI_LETTER_RE.exec(csiCode);
    if (letterMatch) {
      this._resolveLetterCSI(letterMatch, fullCode, sequence);
      return;
    }

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
      keyName = this._lookupNumericCode(match[4].slice(0, -1), '~');
    } else {
      const code = match[1]!;
      const modStr = match[2];
      const terminator = match[3]!;

      if (modStr) {
        modifier = (parseInt(modStr, 10) || 1) - 1;
      }

      if (terminator === '$') {
        shift = true;
      }
      if (terminator === '^') {
        ctrl = true;
      }

      keyName = this._lookupNumericCode(code, terminator);
    }

    if (!keyName) {
      this._emit(createKeyEvent('Undefined', { sequence }));
      return;
    }

    const modifiers = this._decodeModifier(modifier);
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

    const code = '[' + letter;
    let keyName = this._lookupLetterCode(code);
    let extraShift = false;

    if (code === '[Z' && keyName === 'tab') {
      extraShift = true;
    }

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
   * Resolve Kitty CSI u keyboard protocol sequence.
   * Format: ESC [ key-code[:shifted-key] [;modifiers[:event-type]] u
   */
  private _resolveKittyCSIu(params: string, sequence: string): void {
    const parts = params.split(';');
    const keyPart = parts[0] ?? '';
    const modPart = parts[1] ?? '';

    const keySegments = keyPart.split(':');
    const keyCode = parseInt(keySegments[0]!, 10);
    if (isNaN(keyCode)) {
      this._emit(createKeyEvent('Undefined', { sequence }));
      return;
    }

    const modSegments = modPart.split(':');
    const modifierRaw = modSegments[0] ? parseInt(modSegments[0], 10) : 1;
    const modifier = (modifierRaw || 1) - 1;
    const eventType = modSegments[1] ? parseInt(modSegments[1], 10) : 1;

    if (eventType === 3) {
      return;
    }

    const key = KITTY_SPECIAL_KEY_MAP[keyCode] ?? String.fromCodePoint(keyCode);
    const tuiKey = LOW_LEVEL_TO_TUI_KEY[key] ?? key;

    const modifiers = this._decodeModifier(modifier);

    this._emit(createKeyEvent(tuiKey, {
      ctrlKey: modifiers.ctrl,
      altKey: modifiers.alt,
      shiftKey: modifiers.shift,
      metaKey: modifiers.meta,
      sequence,
    }));
  }

  /**
   * SS3 state: inside ESC O ... sequence.
   * Amp ref: input-system.md Section 1.2 (SS3 mode)
   */
  private _processSS3(char: string): void {
    const code = char.charCodeAt(0);

    if (code >= 0x30 && code <= 0x39) {
      this._buffer += char;
      return;
    }

    if (code >= 0x40 && code <= 0x7E) {
      const modStr = this._buffer;
      this._state = ParserState.Idle;

      const ss3Code = 'O' + char;
      let keyName = this._lookupSS3Code(ss3Code);
      let ctrl = false;

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

    this._state = ParserState.Idle;
  }

  /**
   * PASTE state: collecting text between [200~ and [201~.
   * Amp ref: input-system.md Section 11
   */
  private _processPaste(char: string): void {
    if (this._pasteBuffer === null) {
      this._pasteBuffer = '';
    }

    this._pasteBuffer += char;

    const PASTE_END = '\x1b[201~';
    if (this._pasteBuffer.endsWith(PASTE_END)) {
      const text = this._pasteBuffer.slice(0, -PASTE_END.length);
      this._pasteBuffer = null;
      this._state = ParserState.Idle;

      const imageMatch = BASE64_IMAGE_RE.exec(text.trim());
      if (imageMatch) {
        this._emit(createImagePasteEvent(imageMatch[2]!, imageMatch[1]!));
      } else {
        this._emit(createPasteEvent(text));
      }
    }
  }

  /**
   * OSC state: inside ESC ] ... sequence (Operating System Command).
   * Collects until BEL (\x07) or ST (ESC \).
   *
   * Amp ref: GAP-SUM-055 — OSC response handling
   */
  private _processOSC(char: string): void {
    if (char === '\x07') {
      this._resolveOSC(this._buffer);
      this._state = ParserState.Idle;
      return;
    }

    if (char === '\\' && this._buffer.endsWith('\x1b')) {
      const oscData = this._buffer.slice(0, -1);
      this._resolveOSC(oscData);
      this._state = ParserState.Idle;
      return;
    }

    this._buffer += char;

    if (this._buffer.length > 4096) {
      this._state = ParserState.Idle;
    }
  }

  /**
   * Resolve a complete OSC sequence payload.
   * Classifies common terminal responses and emits TerminalResponseEvent.
   */
  private _resolveOSC(data: string): void {
    const raw = '\x1b]' + data;
    const semiIdx = data.indexOf(';');
    const oscNum = semiIdx >= 0 ? data.slice(0, semiIdx) : data;
    const oscPayload = semiIdx >= 0 ? data.slice(semiIdx + 1) : '';

    if (oscNum === '10') {
      this._emit(createTerminalResponseEvent('fg_color', raw, oscPayload));
      return;
    }

    if (oscNum === '11') {
      this._emit(createTerminalResponseEvent('bg_color', raw, oscPayload));
      return;
    }

    this._emit(createTerminalResponseEvent('osc_generic', raw, data));
  }

  /**
   * DCS state: inside ESC P ... sequence (Device Control String).
   * Collects until ST (ESC \).
   *
   * Amp ref: GAP-SUM-055 — DCS response handling
   */
  private _processDCS(char: string): void {
    if (char === '\\' && this._buffer.endsWith('\x1b')) {
      const dcsData = this._buffer.slice(0, -1);
      this._resolveDCS(dcsData);
      this._state = ParserState.Idle;
      return;
    }

    this._buffer += char;

    if (this._buffer.length > 4096) {
      this._state = ParserState.Idle;
    }
  }

  /**
   * Resolve a complete DCS sequence payload.
   * Classifies common terminal responses and emits TerminalResponseEvent.
   */
  private _resolveDCS(data: string): void {
    const raw = '\x1bP' + data;

    if (data.startsWith('>|')) {
      const version = data.slice(2);
      this._emit(createTerminalResponseEvent('xtversion', raw, version));
      return;
    }

    if (data.startsWith('G')) {
      this._emit(createTerminalResponseEvent('kitty_graphics', raw, data.slice(1)));
      return;
    }

    this._emit(createTerminalResponseEvent('dcs_generic', raw, data));
  }

  /**
   * Parse SGR mouse event.
   * Amp ref: input-system.md Section 4.3
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
      x: col - 1,
      y: row - 1,
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
   * Pause the parser. While paused, feed() silently discards data.
   * Used during TUI suspend to prevent input from being processed
   * while an external process has terminal control.
   */
  pause(): void {
    this._paused = true;
  }

  /**
   * Resume the parser after a pause. Subsequent feed() calls will
   * process input normally.
   */
  resume(): void {
    this._paused = false;
  }

  /**
   * Whether the parser is currently paused.
   */
  get isPaused(): boolean {
    return this._paused;
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
  '11': 'f1',
  '12': 'f2',
  '13': 'f3',
  '14': 'f4',
  '15': 'f5',
  '17': 'f6',
  '18': 'f7',
  '19': 'f8',
  '20': 'f9',
  '21': 'f10',
  '23': 'f11',
  '24': 'f12',
  '1': 'home',
  '2': 'insert',
  '3': 'delete',
  '4': 'end',
  '5': 'pageup',
  '6': 'pagedown',
  '7': 'home',
  '8': 'end',
};

/**
 * Letter-terminated CSI code -> key name mapping.
 * Amp ref: input-system.md Section 2.2
 */
const CSI_LETTER_MAP: Record<string, string> = {
  '[A': 'up',
  '[B': 'down',
  '[C': 'right',
  '[D': 'left',
  '[E': 'clear',
  '[F': 'end',
  '[H': 'home',
  '[P': 'f1',
  '[Q': 'f2',
  '[R': 'f3',
  '[S': 'f4',
  '[Z': 'tab',
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
  'OA': 'up',
  'OB': 'down',
  'OC': 'right',
  'OD': 'left',
  'OE': 'clear',
  'OF': 'end',
  'OH': 'home',
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
const LINUX_CONSOLE_FKEY_MAP: Record<string, string> = {
  '[[A': 'f1',
  '[[B': 'f2',
  '[[C': 'f3',
  '[[D': 'f4',
  '[[E': 'f5',
};

for (const [code, name] of Object.entries(LINUX_CONSOLE_FKEY_MAP)) {
  CSI_LETTER_MAP[code] = name;
}

/**
 * Kitty CSI u special key codepoint -> low-level key name mapping.
 */
const KITTY_SPECIAL_KEY_MAP: Record<number, string> = {
  9: 'tab',
  13: 'enter',
  27: 'escape',
  127: 'backspace',
  57358: 'insert',
  57359: 'delete',
  57360: 'pageup',
  57361: 'pagedown',
  57362: 'home',
  57363: 'end',
  57376: 'f1',
  57377: 'f2',
  57378: 'f3',
  57379: 'f4',
  57380: 'f5',
  57381: 'f6',
  57382: 'f7',
  57383: 'f8',
  57384: 'f9',
  57385: 'f10',
  57386: 'f11',
  57387: 'f12',
};
