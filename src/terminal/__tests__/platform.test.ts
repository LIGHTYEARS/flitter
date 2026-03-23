// Tests for PlatformAdapter implementations (MockPlatform + detectCapabilities)
// Amp ref: wB0 TerminalManager platform interactions

import { describe, test, expect, beforeEach } from 'bun:test';
import {
  MockPlatform,
  detectCapabilities,
  type TerminalCapabilities,
} from '../platform.js';

describe('MockPlatform', () => {
  let platform: MockPlatform;

  beforeEach(() => {
    platform = new MockPlatform();
  });

  // --- Raw mode ---

  test('starts with rawMode disabled', () => {
    expect(platform.rawMode).toBe(false);
  });

  test('enableRawMode sets rawMode to true', () => {
    platform.enableRawMode();
    expect(platform.rawMode).toBe(true);
  });

  test('disableRawMode sets rawMode to false', () => {
    platform.enableRawMode();
    platform.disableRawMode();
    expect(platform.rawMode).toBe(false);
  });

  // --- Alt screen ---

  test('starts with altScreen disabled', () => {
    expect(platform.altScreen).toBe(false);
  });

  test('enableAltScreen sets altScreen to true', () => {
    platform.enableAltScreen();
    expect(platform.altScreen).toBe(true);
  });

  test('disableAltScreen sets altScreen to false', () => {
    platform.enableAltScreen();
    platform.disableAltScreen();
    expect(platform.altScreen).toBe(false);
  });

  // --- Write / Output capture ---

  test('captures all writeStdout output', () => {
    platform.writeStdout('hello');
    platform.writeStdout(' world');
    expect(platform.written).toEqual(['hello', ' world']);
  });

  test('getOutput joins all written strings', () => {
    platform.writeStdout('foo');
    platform.writeStdout('bar');
    expect(platform.getOutput()).toBe('foobar');
  });

  test('clearOutput resets captured output', () => {
    platform.writeStdout('data');
    platform.clearOutput();
    expect(platform.written).toEqual([]);
    expect(platform.getOutput()).toBe('');
  });

  // --- Terminal size ---

  test('default terminal size is 80x24', () => {
    const size = platform.getTerminalSize();
    expect(size.columns).toBe(80);
    expect(size.rows).toBe(24);
  });

  test('getTerminalSize returns a copy', () => {
    const size = platform.getTerminalSize();
    size.columns = 999;
    expect(platform.getTerminalSize().columns).toBe(80);
  });

  // --- Stdin data (simulateInput) ---

  test('simulateInput delivers string data to callbacks', () => {
    const received: Buffer[] = [];
    platform.onStdinData((data) => received.push(data));

    platform.simulateInput('hello');
    expect(received.length).toBe(1);
    expect(received[0]!.toString()).toBe('hello');
  });

  test('simulateInput delivers Buffer data to callbacks', () => {
    const received: Buffer[] = [];
    platform.onStdinData((data) => received.push(data));

    const buf = Buffer.from([0x1b, 0x5b, 0x41]); // ESC [ A
    platform.simulateInput(buf);
    expect(received.length).toBe(1);
    expect(received[0]).toEqual(buf);
  });

  test('simulateInput delivers to multiple callbacks', () => {
    let count = 0;
    platform.onStdinData(() => count++);
    platform.onStdinData(() => count++);

    platform.simulateInput('x');
    expect(count).toBe(2);
  });

  test('removeStdinData removes callback', () => {
    let count = 0;
    const cb = () => { count++; };
    platform.onStdinData(cb);
    platform.removeStdinData(cb);

    platform.simulateInput('x');
    expect(count).toBe(0);
  });

  test('getStdinCallbackCount tracks registered callbacks', () => {
    expect(platform.getStdinCallbackCount()).toBe(0);
    const cb = () => {};
    platform.onStdinData(cb);
    expect(platform.getStdinCallbackCount()).toBe(1);
    platform.removeStdinData(cb);
    expect(platform.getStdinCallbackCount()).toBe(0);
  });

  // --- Resize ---

  test('simulateResize triggers resize callbacks', () => {
    let receivedCols = 0;
    let receivedRows = 0;
    platform.onResize((cols, rows) => {
      receivedCols = cols;
      receivedRows = rows;
    });

    platform.simulateResize(120, 40);
    expect(receivedCols).toBe(120);
    expect(receivedRows).toBe(40);
  });

  test('simulateResize updates internal size', () => {
    platform.simulateResize(120, 40);
    const size = platform.getTerminalSize();
    expect(size.columns).toBe(120);
    expect(size.rows).toBe(40);
  });

  test('simulateResize triggers multiple callbacks', () => {
    let count = 0;
    platform.onResize(() => count++);
    platform.onResize(() => count++);

    platform.simulateResize(100, 50);
    expect(count).toBe(2);
  });

  test('removeResize removes callback', () => {
    let count = 0;
    const cb = () => { count++; };
    platform.onResize(cb);
    platform.removeResize(cb);

    platform.simulateResize(100, 50);
    expect(count).toBe(0);
  });

  test('getResizeCallbackCount tracks registered callbacks', () => {
    expect(platform.getResizeCallbackCount()).toBe(0);
    const cb = () => {};
    platform.onResize(cb);
    expect(platform.getResizeCallbackCount()).toBe(1);
    platform.removeResize(cb);
    expect(platform.getResizeCallbackCount()).toBe(0);
  });
});

describe('detectCapabilities', () => {
  // Note: detectCapabilities reads from process.env at call time.
  // We test it with whatever env is present; the function should always
  // return a valid TerminalCapabilities object.

  test('returns a valid TerminalCapabilities object', () => {
    const caps = detectCapabilities();
    expect(typeof caps.trueColor).toBe('boolean');
    expect(typeof caps.ansi256).toBe('boolean');
    expect(typeof caps.mouse).toBe('boolean');
    expect(typeof caps.altScreen).toBe('boolean');
    expect(typeof caps.syncOutput).toBe('boolean');
    expect(typeof caps.unicode).toBe('boolean');
    expect(typeof caps.hyperlinks).toBe('boolean');
  });

  test('unicode defaults to true', () => {
    const caps = detectCapabilities();
    expect(caps.unicode).toBe(true);
  });

  test('trueColor implies ansi256', () => {
    const caps = detectCapabilities();
    if (caps.trueColor) {
      expect(caps.ansi256).toBe(true);
    }
  });
});

// ── parseCapabilityResponse ─────────────────────────────────────────

describe('parseCapabilityResponse', () => {
  // Dynamic import to get the new functions
  const { parseCapabilityResponse, mergeCapabilities } = require('../platform');

  test('parses DA1 response', () => {
    const result = parseCapabilityResponse('\x1b[?1;2;6;22c');
    expect(result.da1Features).toEqual([1, 2, 6, 22]);
  });

  test('parses DA2 response', () => {
    const result = parseCapabilityResponse('\x1b[>1;4100;0c');
    expect(result.da2Info).toEqual({ type: 1, version: 4100, options: 0 });
  });

  test('parses DSR response', () => {
    const result = parseCapabilityResponse('\x1b[0n');
    expect(result.dsrOk).toBe(true);
  });

  test('parses Kitty keyboard response', () => {
    const result = parseCapabilityResponse('\x1b[?5u');
    expect(result.kittyKeyboardFlags).toBe(5);
  });

  test('parses Kitty graphics OK response', () => {
    const result = parseCapabilityResponse('\x1b_GOK\x1b\\');
    expect(result.kittyGraphics).toBe(true);
  });

  test('parses Kitty graphics error response', () => {
    const result = parseCapabilityResponse('\x1b_GERROR\x1b\\');
    expect(result.kittyGraphics).toBe(false);
  });

  test('parses XTVERSION response', () => {
    const result = parseCapabilityResponse('\x1bP>|xterm(390)\x1b\\');
    expect(result.xtversion).toBe('xterm(390)');
  });

  test('parses foreground color response', () => {
    const result = parseCapabilityResponse('\x1b]10;rgb:ff/aa/00');
    expect(result.fgColor).toEqual({ r: 255, g: 170, b: 0 });
  });

  test('parses background color response', () => {
    const result = parseCapabilityResponse('\x1b]11;rgb:00/00/00');
    expect(result.bgColor).toEqual({ r: 0, g: 0, b: 0 });
  });

  test('parses DECRPM mode report', () => {
    const result = parseCapabilityResponse('\x1b[?2027;1$y');
    expect(result.modeReports?.get(2027)).toBe(1);
  });

  test('parses multiple responses in one string', () => {
    const combined =
      '\x1b[?1;2c' +
      '\x1b[>0;100;0c' +
      '\x1b[0n' +
      '\x1b[?3u';
    const result = parseCapabilityResponse(combined);
    expect(result.da1Features).toEqual([1, 2]);
    expect(result.da2Info).toEqual({ type: 0, version: 100, options: 0 });
    expect(result.dsrOk).toBe(true);
    expect(result.kittyKeyboardFlags).toBe(3);
  });

  test('returns empty object for unrecognized input', () => {
    const result = parseCapabilityResponse('random text');
    expect(result.da1Features).toBeUndefined();
    expect(result.da2Info).toBeUndefined();
    expect(result.kittyKeyboardFlags).toBeUndefined();
  });

  test('mergeCapabilities updates kittyKeyboard', () => {
    const base: TerminalCapabilities = {
      trueColor: true,
      ansi256: true,
      mouse: true,
      altScreen: true,
      syncOutput: true,
      unicode: true,
      hyperlinks: true,
    };
    const parsed = { kittyKeyboardFlags: 5, kittyGraphics: true };
    const merged = mergeCapabilities(base, parsed);
    expect(merged.kittyKeyboard).toBe(true);
    expect(merged.kittyGraphics).toBe(true);
    // Base fields preserved
    expect(merged.trueColor).toBe(true);
  });
});
