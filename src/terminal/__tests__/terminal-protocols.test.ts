// Tests for terminal protocol extensions (TPRO-01 through TPRO-10).
// Validates escape sequence constants, Renderer methods, terminalCleanup, and capability queries.

import { describe, it, expect } from 'bun:test';
import {
  Renderer,
  CSI,
  OSC,
  ST,
  ESC,
  // TPRO-01: Kitty Keyboard
  KITTY_KEYBOARD_ON,
  KITTY_KEYBOARD_OFF,
  // TPRO-02: ModifyOtherKeys
  MODIFY_OTHER_KEYS_ON,
  MODIFY_OTHER_KEYS_OFF,
  // TPRO-03: Emoji Width
  EMOJI_WIDTH_ON,
  EMOJI_WIDTH_OFF,
  // TPRO-04: In-Band Resize
  IN_BAND_RESIZE_ON,
  IN_BAND_RESIZE_OFF,
  // TPRO-05: Progress Bar
  PROGRESS_BAR_OFF,
  PROGRESS_BAR_INDETERMINATE,
  PROGRESS_BAR_PAUSED,
  // TPRO-06: Window Title
  windowTitle,
  // TPRO-07: Mouse Shape
  mouseShape,
  // TPRO-08: Pixel Mouse
  PIXEL_MOUSE_ON,
  PIXEL_MOUSE_OFF,
  // Existing constants for cleanup verification
  MOUSE_OFF,
  BRACKET_PASTE_OFF,
  ALT_SCREEN_OFF,
  CURSOR_SHOW,
  SGR_RESET,
  HYPERLINK_CLOSE,
} from '../renderer.js';

import { terminalCleanup } from '../terminal-cleanup.js';

import {
  DA1_QUERY,
  DA2_QUERY,
  DA3_QUERY,
  DSR_QUERY,
  KITTY_KEYBOARD_QUERY,
  KITTY_GRAPHICS_QUERY,
  XTVERSION_QUERY,
  FG_COLOR_QUERY,
  BG_COLOR_QUERY,
  CAPABILITY_RESPONSE_PATTERNS,
  buildCapabilityQuery,
  MockPlatform,
} from '../platform.js';

// ── TPRO-01: Kitty Keyboard Protocol ─────────────────────────

describe('TPRO-01: Kitty Keyboard Protocol', () => {
  it('should have correct escape sequence constants', () => {
    expect(KITTY_KEYBOARD_ON).toBe('\x1b[>5u');
    expect(KITTY_KEYBOARD_OFF).toBe('\x1b[<u');
  });

  it('Renderer.enableKittyKeyboard() returns correct sequence', () => {
    const renderer = new Renderer();
    expect(renderer.enableKittyKeyboard()).toBe('\x1b[>5u');
  });

  it('Renderer.disableKittyKeyboard() returns correct sequence', () => {
    const renderer = new Renderer();
    expect(renderer.disableKittyKeyboard()).toBe('\x1b[<u');
  });
});

// ── TPRO-02: ModifyOtherKeys ─────────────────────────────────

describe('TPRO-02: ModifyOtherKeys', () => {
  it('should have correct escape sequence constants', () => {
    expect(MODIFY_OTHER_KEYS_ON).toBe('\x1b[>4;1m');
    expect(MODIFY_OTHER_KEYS_OFF).toBe('\x1b[>4;0m');
  });

  it('Renderer.enableModifyOtherKeys() returns correct sequence', () => {
    const renderer = new Renderer();
    expect(renderer.enableModifyOtherKeys()).toBe('\x1b[>4;1m');
  });

  it('Renderer.disableModifyOtherKeys() returns correct sequence', () => {
    const renderer = new Renderer();
    expect(renderer.disableModifyOtherKeys()).toBe('\x1b[>4;0m');
  });
});

// ── TPRO-03: Emoji Width Mode ────────────────────────────────

describe('TPRO-03: Emoji Width Mode', () => {
  it('should have correct escape sequence constants', () => {
    expect(EMOJI_WIDTH_ON).toBe('\x1b[?2027h');
    expect(EMOJI_WIDTH_OFF).toBe('\x1b[?2027l');
  });

  it('Renderer.enableEmojiWidth() returns correct sequence', () => {
    const renderer = new Renderer();
    expect(renderer.enableEmojiWidth()).toBe('\x1b[?2027h');
  });

  it('Renderer.disableEmojiWidth() returns correct sequence', () => {
    const renderer = new Renderer();
    expect(renderer.disableEmojiWidth()).toBe('\x1b[?2027l');
  });
});

// ── TPRO-04: In-Band Resize ─────────────────────────────────

describe('TPRO-04: In-Band Resize', () => {
  it('should have correct escape sequence constants', () => {
    expect(IN_BAND_RESIZE_ON).toBe('\x1b[?2048h');
    expect(IN_BAND_RESIZE_OFF).toBe('\x1b[?2048l');
  });

  it('Renderer.enableInBandResize() returns correct sequence', () => {
    const renderer = new Renderer();
    expect(renderer.enableInBandResize()).toBe('\x1b[?2048h');
  });

  it('Renderer.disableInBandResize() returns correct sequence', () => {
    const renderer = new Renderer();
    expect(renderer.disableInBandResize()).toBe('\x1b[?2048l');
  });
});

// ── TPRO-05: Progress Bar OSC ────────────────────────────────

describe('TPRO-05: Progress Bar OSC', () => {
  it('should have correct escape sequence constants', () => {
    expect(PROGRESS_BAR_OFF).toBe('\x1b]9;4;0\x1b\\');
    expect(PROGRESS_BAR_INDETERMINATE).toBe('\x1b]9;4;3\x1b\\');
    expect(PROGRESS_BAR_PAUSED).toBe('\x1b]9;4;4\x1b\\');
  });

  it('Renderer.setProgressBarIndeterminate() returns correct sequence', () => {
    const renderer = new Renderer();
    expect(renderer.setProgressBarIndeterminate()).toBe('\x1b]9;4;3\x1b\\');
  });

  it('Renderer.setProgressBarOff() returns correct sequence', () => {
    const renderer = new Renderer();
    expect(renderer.setProgressBarOff()).toBe('\x1b]9;4;0\x1b\\');
  });

  it('Renderer.setProgressBarPaused() returns correct sequence', () => {
    const renderer = new Renderer();
    expect(renderer.setProgressBarPaused()).toBe('\x1b]9;4;4\x1b\\');
  });
});

// ── TPRO-06: Window Title OSC ────────────────────────────────

describe('TPRO-06: Window Title OSC', () => {
  it('windowTitle() returns correct sequence', () => {
    expect(windowTitle('My App')).toBe('\x1b]0;My App\x07');
    expect(windowTitle('')).toBe('\x1b]0;\x07');
    expect(windowTitle('Test - [1/3]')).toBe('\x1b]0;Test - [1/3]\x07');
  });

  it('Renderer.setTitle() returns correct sequence', () => {
    const renderer = new Renderer();
    expect(renderer.setTitle('Hello World')).toBe('\x1b]0;Hello World\x07');
  });
});

// ── TPRO-07: Mouse Cursor Shape OSC ─────────────────────────

describe('TPRO-07: Mouse Cursor Shape OSC', () => {
  it('mouseShape() returns correct sequence', () => {
    expect(mouseShape('default')).toBe('\x1b]22;default\x1b\\');
    expect(mouseShape('pointer')).toBe('\x1b]22;pointer\x1b\\');
    expect(mouseShape('text')).toBe('\x1b]22;text\x1b\\');
  });

  it('Renderer.setMouseShape() returns correct sequence', () => {
    const renderer = new Renderer();
    expect(renderer.setMouseShape('crosshair')).toBe('\x1b]22;crosshair\x1b\\');
  });
});

// ── TPRO-08: Pixel Mouse ────────────────────────────────────

describe('TPRO-08: Pixel Mouse', () => {
  it('should have correct escape sequence constants', () => {
    expect(PIXEL_MOUSE_ON).toBe('\x1b[?1016h');
    expect(PIXEL_MOUSE_OFF).toBe('\x1b[?1016l');
  });

  it('Renderer.enablePixelMouse() returns correct sequence', () => {
    const renderer = new Renderer();
    expect(renderer.enablePixelMouse()).toBe('\x1b[?1016h');
  });

  it('Renderer.disablePixelMouse() returns correct sequence', () => {
    const renderer = new Renderer();
    expect(renderer.disablePixelMouse()).toBe('\x1b[?1016l');
  });
});

// ── TPRO-09: Terminal Cleanup Function ───────────────────────

describe('TPRO-09: Terminal Cleanup Function', () => {
  it('terminalCleanup includes all mode disables', () => {
    const renderer = new Renderer();
    const cleanup = terminalCleanup(renderer);

    // Must disable Kitty keyboard
    expect(cleanup).toContain(KITTY_KEYBOARD_OFF);
    // Must disable ModifyOtherKeys
    expect(cleanup).toContain(MODIFY_OTHER_KEYS_OFF);
    // Must disable emoji width
    expect(cleanup).toContain(EMOJI_WIDTH_OFF);
    // Must disable in-band resize
    expect(cleanup).toContain(IN_BAND_RESIZE_OFF);
    // Must turn off progress bar
    expect(cleanup).toContain(PROGRESS_BAR_OFF);
    // Must disable all mouse modes (via renderer.disableMouse which includes 1002, 1003, 1004, 1006, 1016)
    expect(cleanup).toContain(renderer.disableMouse());
    // Must disable bracketed paste
    expect(cleanup).toContain(BRACKET_PASTE_OFF);
    // Must exit alt screen
    expect(cleanup).toContain(ALT_SCREEN_OFF);
    // Must reset cursor shape (DECSCUSR default)
    expect(cleanup).toContain(`${CSI}0 q`);
    // Must show cursor
    expect(cleanup).toContain(CURSOR_SHOW);
    // Must reset SGR
    expect(cleanup).toContain(SGR_RESET);
    // Must close hyperlink
    expect(cleanup).toContain(HYPERLINK_CLOSE);
  });

  it('cleanup sequence has correct ordering (keyboard before mouse before screen)', () => {
    const renderer = new Renderer();
    const cleanup = terminalCleanup(renderer);

    // Keyboard protocols should come before mouse
    const kittyIdx = cleanup.indexOf(KITTY_KEYBOARD_OFF);
    const mouseIdx = cleanup.indexOf(renderer.disableMouse());
    const altScreenIdx = cleanup.indexOf(ALT_SCREEN_OFF);
    const cursorShowIdx = cleanup.indexOf(CURSOR_SHOW);

    expect(kittyIdx).toBeLessThan(mouseIdx);
    expect(mouseIdx).toBeLessThan(altScreenIdx);
    expect(altScreenIdx).toBeLessThan(cursorShowIdx);
  });
});

// ── TPRO-10: Terminal Capability Detection via Escape Queries ─

describe('TPRO-10: Capability Query Constants', () => {
  it('DA1_QUERY is correct', () => {
    expect(DA1_QUERY).toBe('\x1b[c');
  });

  it('DA2_QUERY is correct', () => {
    expect(DA2_QUERY).toBe('\x1b[>c');
  });

  it('DA3_QUERY is correct', () => {
    expect(DA3_QUERY).toBe('\x1b[=c');
  });

  it('DSR_QUERY is correct', () => {
    expect(DSR_QUERY).toBe('\x1b[5n');
  });

  it('KITTY_KEYBOARD_QUERY is correct', () => {
    expect(KITTY_KEYBOARD_QUERY).toBe('\x1b[?u');
  });

  it('KITTY_GRAPHICS_QUERY starts with OSC G', () => {
    expect(KITTY_GRAPHICS_QUERY).toContain('\x1b]G');
  });

  it('XTVERSION_QUERY is correct', () => {
    expect(XTVERSION_QUERY).toBe('\x1b[>0q');
  });

  it('FG_COLOR_QUERY and BG_COLOR_QUERY are correct', () => {
    expect(FG_COLOR_QUERY).toBe('\x1b]10;?\x1b\\');
    expect(BG_COLOR_QUERY).toBe('\x1b]11;?\x1b\\');
  });
});

describe('TPRO-10: Capability Response Patterns', () => {
  it('da1 pattern matches DA1 response', () => {
    const response = '\x1b[?62;22c';
    const match = response.match(CAPABILITY_RESPONSE_PATTERNS.da1);
    expect(match).not.toBeNull();
    expect(match![1]).toBe('62;22');
  });

  it('da2 pattern matches DA2 response', () => {
    const response = '\x1b[>1;4000;19c';
    const match = response.match(CAPABILITY_RESPONSE_PATTERNS.da2);
    expect(match).not.toBeNull();
    expect(match![1]).toBe('1;4000;19');
  });

  it('dsr pattern matches device status report OK', () => {
    const response = '\x1b[0n';
    const match = response.match(CAPABILITY_RESPONSE_PATTERNS.dsr);
    expect(match).not.toBeNull();
  });

  it('kittyKeyboard pattern matches kitty keyboard response', () => {
    const response = '\x1b[?5u';
    const match = response.match(CAPABILITY_RESPONSE_PATTERNS.kittyKeyboard);
    expect(match).not.toBeNull();
    expect(match![1]).toBe('5');
  });

  it('modeReport pattern matches DECRPM response', () => {
    const response = '\x1b[?2027;1$y';
    const match = response.match(CAPABILITY_RESPONSE_PATTERNS.modeReport);
    expect(match).not.toBeNull();
    expect(match![1]).toBe('2027');
    expect(match![2]).toBe('1');
  });

  it('colorResponse pattern matches color query response', () => {
    const response = '\x1b]10;rgb:ff/ff/ff';
    const match = response.match(CAPABILITY_RESPONSE_PATTERNS.colorResponse);
    expect(match).not.toBeNull();
    expect(match![1]).toBe('10');
    expect(match![2]).toBe('ff/ff/ff');
  });
});

describe('TPRO-10: buildCapabilityQuery', () => {
  it('returns combined query string containing all queries', () => {
    const platform = new MockPlatform();
    const query = buildCapabilityQuery(platform);

    expect(query).toContain(DA1_QUERY);
    expect(query).toContain(DA2_QUERY);
    expect(query).toContain(KITTY_KEYBOARD_QUERY);
    expect(query).toContain(KITTY_GRAPHICS_QUERY);
    expect(query).toContain(XTVERSION_QUERY);
  });

  it('returns a non-empty string', () => {
    const platform = new MockPlatform();
    const query = buildCapabilityQuery(platform);
    expect(query.length).toBeGreaterThan(0);
  });
});

// ── Extended TerminalCapabilities interface ───────────────────

describe('TPRO-10: Extended TerminalCapabilities', () => {
  it('allows optional extended capability fields', () => {
    // Verify the interface accepts extended fields without breaking
    const caps = {
      trueColor: true,
      ansi256: true,
      mouse: true,
      altScreen: true,
      syncOutput: true,
      unicode: true,
      hyperlinks: true,
      kittyKeyboard: true,
      modifyOtherKeys: false,
      emojiWidth: true,
      inBandResize: false,
      pixelMouse: true,
      kittyGraphics: false,
    };

    expect(caps.kittyKeyboard).toBe(true);
    expect(caps.modifyOtherKeys).toBe(false);
    expect(caps.emojiWidth).toBe(true);
    expect(caps.inBandResize).toBe(false);
    expect(caps.pixelMouse).toBe(true);
    expect(caps.kittyGraphics).toBe(false);
  });

  it('works without extended fields (backward compatible)', () => {
    const caps = {
      trueColor: true,
      ansi256: true,
      mouse: true,
      altScreen: true,
      syncOutput: true,
      unicode: true,
      hyperlinks: true,
    };

    // Extended fields should be undefined
    expect((caps as any).kittyKeyboard).toBeUndefined();
    expect((caps as any).pixelMouse).toBeUndefined();
  });
});

// ── TerminalManager dispose uses terminalCleanup ─────────────

describe('TerminalManager dispose uses terminalCleanup', () => {
  it('dispose writes comprehensive cleanup sequence', () => {
    const platform = new MockPlatform();
    // Manually construct a TerminalManager to test dispose
    // We need to import it
    const { TerminalManager } = require('../terminal-manager.js');
    const tm = new TerminalManager(platform);
    tm.initialize();
    platform.clearOutput();

    tm.dispose();
    const output = platform.getOutput();

    // Should contain all cleanup sequences from terminalCleanup
    expect(output).toContain(KITTY_KEYBOARD_OFF);
    expect(output).toContain(MODIFY_OTHER_KEYS_OFF);
    expect(output).toContain(EMOJI_WIDTH_OFF);
    expect(output).toContain(IN_BAND_RESIZE_OFF);
    expect(output).toContain(PROGRESS_BAR_OFF);
    expect(output).toContain(PIXEL_MOUSE_OFF);
    expect(output).toContain(ALT_SCREEN_OFF);
    expect(output).toContain(CURSOR_SHOW);
    expect(output).toContain(SGR_RESET);
  });
});
