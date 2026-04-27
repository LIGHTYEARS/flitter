/**
 * keyboard-tester — terminal keyboard input diagnostics tool (hidden command)
 *
 * Enables raw mode + terminal input protocols (Kitty keyboard, bracketed paste,
 * focus events, in-band resize), reads stdin, parses via flitter's InputParser,
 * and outputs each parsed event as JSONL to stdout.
 *
 * With `--raw`, also logs raw hex bytes before parsing.
 * Ctrl+C exits cleanly with terminal state restored.
 *
 * 逆向参考:
 *   - 0525_unknown_sy0.js  — sy0() keyboard-tester main loop
 *   - 0520_unknown_L3.js   — L3() JSONL output helper
 *   - 0524_unknown_Rh.js   — Rh() write-with-raw-logging helper
 *   - 0521_unknown_bY.js   — bY() bytes-to-escaped-string
 *   - 0522_unknown_MxT.js  — iy0() Ctrl+C detection
 *   - chunk-005.js:26444-26451 — escape sequence constants
 *
 * @example
 * ```bash
 * flitter keyboard-tester         # stream parsed events as JSONL
 * flitter keyboard-tester --raw   # also log raw hex bytes
 * ```
 */

import type { InputEvent } from "@flitter/tui";
import { InputParser } from "@flitter/tui";

// ════════════════════════════════════════════════════
//  Terminal protocol escape sequences
// ════════════════════════════════════════════════════
//
// 逆向: chunk-005.js:26444-26451
//   Ty0 = "\x1B[c"         — device attributes query
//   Ry0 = "\x1B[?1004h"    — focus reporting enable
//   ay0 = "\x1B[?1004l"    — focus reporting disable
//   ey0 = "\x1B[?u"        — kitty keyboard protocol query
//   ty0 = "\x1B[>4;2m"     — modifyOtherKeys mode 2 (tmux)
//   ry0 = "\x1B[?9001l"    — win32 input mode disable
//
// Also from ansi-renderer.ts:
//   KITTY_KEYBOARD_ON  = CSI >7 u    — push kitty keyboard mode (flags=7)
//   KITTY_KEYBOARD_OFF = CSI < u     — pop kitty keyboard mode
//   PASTE_ON  = CSI ?2004 h          — enable bracketed paste
//   PASTE_OFF = CSI ?2004 l          — disable bracketed paste
//   FOCUS_ON  = CSI ?1004 h          — enable focus reporting
//   FOCUS_OFF = CSI ?1004 l          — disable focus reporting
//   IN_BAND_RESIZE_ON  = CSI ?2048 h — enable in-band resize
//   IN_BAND_RESIZE_OFF = CSI ?2048 l — disable in-band resize

const CSI = "\x1b[";

const KITTY_KEYBOARD_ON = `${CSI}>7u`;
const KITTY_KEYBOARD_OFF = `${CSI}<u`;
const PASTE_ON = `${CSI}?2004h`;
const PASTE_OFF = `${CSI}?2004l`;
const FOCUS_ON = `${CSI}?1004h`;
const FOCUS_OFF = `${CSI}?1004l`;
const IN_BAND_RESIZE_ON = `${CSI}?2048h`;
const IN_BAND_RESIZE_OFF = `${CSI}?2048l`;

// ════════════════════════════════════════════════════
//  Helpers (matching amp's L3, bY, iy0, Rh)
// ════════════════════════════════════════════════════

/**
 * Write a JSON line to stdout.
 *
 * 逆向: L3(T, R) in 0520_unknown_L3.js
 * Writes JSON.stringify(obj) + newline. If callback provided and stdout
 * returns false (backpressure), waits for drain before calling callback.
 */
function writeJsonLine(obj: Record<string, unknown>, callback?: () => void): void {
  if (!process.stdout.writable || process.stdout.destroyed) {
    callback?.();
    return;
  }
  const line = `${JSON.stringify(obj)}\n`;
  try {
    if (callback) {
      if (!process.stdout.write(line)) {
        process.stdout.once("drain", callback);
        return;
      }
      callback();
      return;
    }
    process.stdout.write(line);
  } catch {
    callback?.();
  }
}

/**
 * Convert raw bytes to an escaped string for human-readable display.
 *
 * 逆向: bY(T) in 0521_unknown_bY.js
 * Printable ASCII (32-126, except backslash) → literal char
 * Backslash → "\\\\"
 * Everything else → "\\xHH"
 */
function escapeBytes(data: Buffer | Uint8Array): string {
  return Array.from(data, (byte) => {
    if (byte >= 32 && byte <= 126 && byte !== 92) return String.fromCharCode(byte);
    if (byte === 92) return "\\\\";
    return `\\x${byte.toString(16).padStart(2, "0")}`;
  }).join("");
}

/**
 * Check if a parsed key event is Ctrl+C (exit signal).
 *
 * 逆向: iy0(T) in 0522_unknown_MxT.js
 * Returns true for Ctrl+C press events (not repeat/release).
 */
function isCtrlC(event: InputEvent): boolean {
  return event.type === "key" && event.modifiers.ctrl && event.key.toLowerCase() === "c";
}

/**
 * Write an escape sequence to the tty output stream, optionally logging
 * raw bytes when --raw mode is enabled.
 *
 * 逆向: Rh(T, R, a, e, t) in 0524_unknown_Rh.js
 * T = control target (stream), R = escape sequence string,
 * a = label name, e = options (e.raw), t = stage
 */
function writeControlSequence(
  stream: NodeJS.WritableStream,
  seq: string,
  name: string,
  raw: boolean,
  stage?: string,
): void {
  if (raw) {
    const buf = Buffer.from(seq);
    writeJsonLine({
      type: "control",
      name,
      stage: stage ?? null,
      bytes: buf.toString("hex"),
      escaped: escapeBytes(buf),
    });
  }
  stream.write(seq);
}

// ════════════════════════════════════════════════════
//  Main handler
// ════════════════════════════════════════════════════

/**
 * Handle the `flitter keyboard-tester` command.
 *
 * 逆向: sy0(T) in 0525_unknown_sy0.js
 *
 * 1. Check stdin.isTTY
 * 2. Enable raw mode
 * 3. Write protocol enable sequences (focus, bracketed paste, kitty keyboard)
 * 4. Create InputParser instance
 * 5. Read stdin data events, parse, write JSONL
 * 6. On Ctrl+C: cleanup (disable protocols, restore terminal) and exit
 */
export async function handleKeyboardTester(opts: { raw?: boolean }): Promise<void> {
  const raw = opts.raw === true;

  // Check that stdin is a TTY
  if (!process.stdin.isTTY) {
    process.stderr.write(
      "Error: keyboard-tester requires an interactive TTY (stdin is not a TTY)\n",
    );
    process.exitCode = 1;
    return;
  }

  // 逆向: sy0 logs debug info when --raw
  if (raw) {
    writeJsonLine({
      type: "debug",
      platform: process.platform,
      stdoutIsTTY: process.stdout.isTTY ?? false,
      stderrIsTTY: process.stderr.isTTY ?? false,
      term: process.env.TERM ?? null,
      termProgram: process.env.TERM_PROGRAM ?? null,
      termProgramVersion: process.env.TERM_PROGRAM_VERSION ?? null,
    });
  }

  // Use stdin as both input source and output target for control sequences
  // 逆向: sy0 uses hy0() → control target, eXT() → raw mode input
  const inputStream = process.stdin;
  const outputStream = process.stderr.isTTY ? process.stderr : process.stdout;

  // Enable raw mode on stdin
  // 逆向: eXT() in amp sets up raw mode via stdin
  inputStream.setRawMode(true);
  inputStream.resume();

  // Create parser
  const parser = new InputParser();

  let cleaned = false;
  let resolvePromise: (() => void) | null = null;

  // Promise that resolves when Ctrl+C exits
  const exitPromise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });

  /**
   * Cleanup: disable protocols, restore terminal, exit.
   *
   * 逆向: sy0 P() cleanup function
   * Disables focus reporting, in-band resize, bracketed paste, kitty keyboard.
   */
  const cleanup = (): void => {
    if (cleaned) return;
    cleaned = true;

    // Remove signal handlers
    process.off("SIGINT", handleSigInt);
    process.off("SIGTERM", handleSigTerm);
    process.off("exit", cleanup);
    if (sigwinchRegistered) {
      process.off("SIGWINCH", handleSigwinch);
    }
    if (process.stdout.isTTY) {
      process.stdout.off("resize", handleStdoutResize);
    }

    // Disable terminal protocols
    // 逆向: sy0 P() cleanup — disable in reverse order
    try {
      writeControlSequence(outputStream, FOCUS_OFF, "focus-disable", raw);
      writeControlSequence(outputStream, IN_BAND_RESIZE_OFF, "inband-resize-disable", raw);
      writeControlSequence(outputStream, PASTE_OFF, "bracketed-paste-disable", raw);
      writeControlSequence(outputStream, KITTY_KEYBOARD_OFF, "kitty-keyboard-disable", raw);
    } catch {
      // Terminal may already be gone
    }

    // Restore terminal mode
    try {
      inputStream.setRawMode(false);
      inputStream.pause();
    } catch {
      // stdin may already be closed
    }
  };

  /**
   * Exit with a specific code.
   *
   * 逆向: sy0 k(I) — sets exitCode, calls cleanup, resolves promise
   */
  const exit = (code: number): void => {
    if (cleaned) return;
    process.exitCode = code;
    cleanup();
    resolvePromise?.();
  };

  // 逆向: sy0 x() — SIGINT → exit(130)
  const handleSigInt = (): void => {
    exit(130);
  };
  // 逆向: sy0 f() — SIGTERM → exit(143)
  const handleSigTerm = (): void => {
    exit(143);
  };

  // 逆向: sy0 n() — SIGWINCH handler
  const handleSigwinch = (): void => {
    writeJsonLine({
      type: "signal",
      signal: "SIGWINCH",
      stdout: getStdoutSize(),
    });
  };

  // 逆向: sy0 p() — stdout resize handler
  const handleStdoutResize = (): void => {
    writeJsonLine({
      type: "stdout_resize",
      stdout: getStdoutSize(),
    });
  };

  // Register signal handlers
  // 逆向: sy0 registers once for SIGINT/SIGTERM/exit, on for SIGWINCH
  process.once("SIGINT", handleSigInt);
  process.once("SIGTERM", handleSigTerm);
  process.once("exit", cleanup);

  let sigwinchRegistered = false;
  try {
    process.on("SIGWINCH", handleSigwinch);
    sigwinchRegistered = true;
  } catch (err) {
    writeJsonLine({
      type: "signal_subscription_error",
      signal: "SIGWINCH",
      error: err instanceof Error ? err.message : String(err),
    });
  }

  if (process.stdout.isTTY) {
    process.stdout.on("resize", handleStdoutResize);
  }

  // Set up event routing from parser → JSONL output
  // 逆向: sy0 registers handlers on the parser ($H instance) for each event type
  // Flitter's InputParser emits a unified InputEvent, so we handle all types in one callback
  parser.onInput((event: InputEvent) => {
    // Check for Ctrl+C → exit cleanly
    // 逆向: sy0 iy0(I) check → k(0)
    if (isCtrlC(event)) {
      writeJsonLine(inputEventToJson(event), () => exit(0));
      return;
    }

    writeJsonLine(inputEventToJson(event));
  });

  // Wire stdin data → parser
  // 逆向: sy0 R.on("data", I => { if (T.raw) L3({...raw...}); a.parse(I); })
  inputStream.on("data", (data: Buffer) => {
    if (raw) {
      writeJsonLine({
        type: "raw",
        bytes: Buffer.from(data).toString("hex"),
        escaped: escapeBytes(data),
      });
    }
    parser.feed(data);
  });

  // Enable terminal protocols
  // 逆向: sy0 line 191-193 — enable focus, inband resize, bracketed paste, kitty keyboard
  writeControlSequence(outputStream, FOCUS_ON, "focus-enable", raw);
  writeControlSequence(outputStream, IN_BAND_RESIZE_ON, "inband-resize-enable", raw);
  writeControlSequence(outputStream, PASTE_ON, "bracketed-paste-enable", raw);
  writeControlSequence(outputStream, KITTY_KEYBOARD_ON, "kitty-keyboard-enable", raw);

  // Wait for exit
  await exitPromise;
}

// ════════════════════════════════════════════════════
//  Serialization helpers
// ════════════════════════════════════════════════════

/**
 * Convert an InputEvent to a plain JSON-serializable object.
 *
 * 逆向: sy0 key handler formats { type, key, code, modifiers, eventType }
 * Flitter's InputEvent differs slightly from amp's (no code/eventType fields),
 * so we serialize what we have.
 */
function inputEventToJson(event: InputEvent): Record<string, unknown> {
  switch (event.type) {
    case "key":
      return {
        type: "key",
        key: event.key,
        modifiers: {
          shift: event.modifiers.shift,
          ctrl: event.modifiers.ctrl,
          alt: event.modifiers.alt,
          meta: event.modifiers.meta,
        },
      };
    case "mouse":
      return {
        type: "mouse",
        x: event.x,
        y: event.y,
        button: event.button,
        action: event.action,
        modifiers: {
          shift: event.modifiers.shift,
          ctrl: event.modifiers.ctrl,
          alt: event.modifiers.alt,
          meta: event.modifiers.meta,
        },
      };
    case "paste":
      return {
        type: "paste",
        text: event.text,
      };
    case "focus":
      return {
        type: "focus",
        focused: event.focused,
      };
    case "resize":
      return {
        type: "resize",
        cols: event.cols,
        rows: event.rows,
      };
    case "inband_resize":
      return {
        type: "inband_resize",
        width: event.width,
        height: event.height,
        pixelWidth: event.pixelWidth,
        pixelHeight: event.pixelHeight,
      };
    case "cursor_position":
      return {
        type: "cursor_position",
        row: event.row,
        col: event.col,
      };
    case "kitty_keyboard_response":
      return {
        type: "kitty_keyboard_response",
        flags: event.flags,
      };
    default:
      return { type: "unknown" };
  }
}

/**
 * Get stdout dimensions for SIGWINCH / resize logging.
 *
 * 逆向: LxT() in amp — returns { columns, rows } from stdout
 */
function getStdoutSize(): { columns: number; rows: number } {
  return {
    columns: process.stdout.columns ?? 0,
    rows: process.stdout.rows ?? 0,
  };
}
