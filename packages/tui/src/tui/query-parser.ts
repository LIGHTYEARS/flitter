/**
 * QueryParser — Terminal capability query sequence builder and response router.
 *
 * 逆向: dY in amp-cli-reversed/modules/2109_unknown_dY.js
 *      Sk0 query array in amp-cli-reversed/modules/1472_tui_components/data_structures.js
 *      FP() tmux passthrough wrapper in amp-cli-reversed/modules/0512_unknown_Ku0.js
 *      startCapabilityDetection in amp-cli-reversed/modules/2112_unknown_XXT.js:384-410
 *
 * Builds the concatenated VT query string sent to the terminal on startup,
 * and routes terminal responses to the appropriate capability fields.
 *
 * The DA1 sentinel (`\x1b[c`) is always sent last; its response signals that
 * all earlier responses have been received (terminals process queries in order).
 *
 * @module
 */

import type { RgbColor } from "../screen/screen.js";
import { wrapForTmux } from "../widgets/render-image.js";
import type { TerminalCapabilities } from "./tui-controller.js";

// ════════════════════════════════════════════════════
//  Types
// ════════════════════════════════════════════════════

export type { RgbColor } from "../screen/screen.js";

/** All collected RGB colors, or null if any are missing. */
export interface RgbColors {
  fg: RgbColor;
  bg: RgbColor;
  cursor: RgbColor;
  indices: Array<RgbColor | null>;
}

/** Options controlling which queries to build. */
export interface BuildQueryOpts {
  isJetBrains: boolean;
  isAppleTerminal: boolean;
  isTmux: boolean;
}

// ════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════

/**
 * Convert a hex color component string (of any hex length) to a 0-255 byte.
 *
 * 逆向: dY.js processOsc11 inner lambda:
 *   `l / (2 ** o - 1) * 255`  where o = hexStr.length * 4
 */
function hexChannelToByte(hexStr: string): number {
  const value = Number.parseInt(hexStr, 16);
  const bits = hexStr.length * 4;
  return Math.round((value / (2 ** bits - 1)) * 255);
}

// ════════════════════════════════════════════════════
//  QueryParser
// ════════════════════════════════════════════════════

/**
 * Builds terminal capability queries and routes response tokens back to
 * a `TerminalCapabilities` partial.
 *
 * 逆向: dY class in amp-cli-reversed/modules/2109_unknown_dY.js
 */
export class QueryParser {
  // ── State ────────────────────────────────────────

  /** True once processDeviceAttributes() has been called (DA1 sentinel received). */
  private _complete = false;

  /** True while waiting for CPR response from kitty width probe. */
  private _kittyWidthQuerySent = false;

  /** Resolvers waiting for completion. */
  private _completionResolvers: Array<() => void> = [];

  /** Partial capabilities accumulated from response tokens. */
  private _capabilities: Partial<TerminalCapabilities> = {
    syncOutput: false,
    emojiWidth: false,
    pixelMouse: false,
    kittyKeyboard: false,
    osc52: false,
    kittyGraphics: false,
    background: "dark",
    colorPaletteNotifications: false,
    kittyExplicitWidth: false,
    xtversion: null,
  };

  /** Raw RGB color data collected from OSC 10/11/12/4 responses. */
  private _rgbColors: {
    foreground: RgbColor | null;
    background: RgbColor | null;
    cursor: RgbColor | null;
    indices: Array<RgbColor | null>;
  } = {
    foreground: null,
    background: null,
    cursor: null,
    indices: [null, null, null, null, null, null, null, null],
  };

  // ── Query building ───────────────────────────────

  /**
   * Build the concatenated VT query string to send to the terminal.
   *
   * 逆向: Sk0 array in data_structures.js + startCapabilityDetection in XXT.js:384-410
   *
   * - Apple Terminal: return "" (skip all queries — amp skips at caller level)
   * - tmux: each sequence is wrapped with DCS passthrough via FP()
   * - JetBrains: skip kitty graphics query (shouldSend: !ji())
   * - DA1 (`\x1b[c`) is always last (isFinal: true in Sk0)
   */
  buildQuerySequence(opts: BuildQueryOpts): string {
    // 逆向: XXT.js:389 — Apple_Terminal returns early with canRgb:false defaults
    if (opts.isAppleTerminal) {
      return "";
    }

    const wrap = (seq: string): string => (opts.isTmux ? wrapForTmux(seq, true) : seq);

    // 逆向: Sk0 array order from data_structures.js
    // Note: we omit the "Query Kitty explicit width support" entry (index 0)
    // because that is handled separately by markKittyWidthQuerySent() in XXT.js
    // and requires entering/exiting alt screen — not part of the passive query burst.
    const sequences: string[] = [
      // OSC 10 — terminal foreground color
      wrap("\x1b]10;?\x07"),
      // OSC 11 — terminal background color
      wrap("\x1b]11;?\x07"),
      // OSC 12 — terminal cursor color
      wrap("\x1b]12;?\x07"),
      // OSC 4;0–7 — palette colors 0-7
      wrap("\x1b]4;0;?\x07"),
      wrap("\x1b]4;1;?\x07"),
      wrap("\x1b]4;2;?\x07"),
      wrap("\x1b]4;3;?\x07"),
      wrap("\x1b]4;4;?\x07"),
      wrap("\x1b]4;5;?\x07"),
      wrap("\x1b]4;6;?\x07"),
      wrap("\x1b]4;7;?\x07"),
      // DECRQSS ?2026 — synchronized output
      wrap("\x1b[?2026$p"),
      // DECRQSS ?2027 — emoji width
      wrap("\x1b[?2027$p"),
      // DECRQSS ?1016 — pixel mouse
      wrap("\x1b[?1016$p"),
      // DECRQSS ?2031 — color palette notifications
      wrap("\x1b[?2031$p"),
      // Kitty keyboard protocol query
      wrap("\x1b[?u"),
      // XTVERSION
      wrap("\x1b[>0q"),
      // XTGETTCAP for "Ms" (OSC 52 clipboard capability)
      wrap("\x1bP+q4d73\x1b\\"),
    ];

    // 逆向: Sk0 entry shouldSend: () => !ji() && process.env.TERM_PROGRAM !== "Apple_Terminal"
    // JetBrains skips kitty graphics; Apple Terminal already returned "" above.
    if (!opts.isJetBrains) {
      sequences.push(wrap("\x1b_Gi=1,a=q\x1b\\"));
    }

    // DA1 sentinel — MUST be last (isFinal: true in Sk0)
    sequences.push(wrap("\x1b[c"));

    return sequences.join("");
  }

  // ── Response handlers ────────────────────────────

  /**
   * Handle DA1 (Primary Device Attributes) response — this is the sentinel.
   *
   * 逆向: dY.js processDeviceAttributes:43-45
   *   if (this.checkPixelDimensions(), this.detectJetBrains() || this.detectTmux())
   *     this.capabilities.emojiWidth = true
   *   complete = true; return true (triggers finishInitialization in XXT)
   *
   * JetBrains and tmux both propagate emoji width from the outer terminal,
   * so we force emojiWidth=true when detected regardless of DECRQSS response.
   */
  processDeviceAttributes(): boolean {
    // 逆向: dY.js:44 — detectJetBrains() || detectTmux() → emojiWidth = true
    if (this._isJetBrains() || this._isTmux()) {
      this._capabilities.emojiWidth = true;
    }
    this._complete = true;
    this._finish();
    return true;
  }

  /**
   * Handle DECRQSS response.
   *
   * 逆向: dY.js processDecrqss:35-42
   *   ?2026 → syncOutput, ?2027 → emojiWidth, ?1016 → pixelMouse,
   *   ?2031 → colorPaletteNotifications, u → kittyKeyboard
   */
  processDecrqss(request: string, value: string): boolean {
    if (request === "?2026") {
      this._capabilities.syncOutput = value === "1" || value === "2";
    }
    if (request === "?2027") {
      this._capabilities.emojiWidth = value === "1" || value === "2";
    }
    if (request === "?1016") {
      this._capabilities.pixelMouse = value === "1" || value === "2";
    }
    if (request === "?2031") {
      this._capabilities.colorPaletteNotifications = value === "1" || value === "2";
    }
    if (request === "u") {
      this._capabilities.kittyKeyboard = true;
    }
    return false;
  }

  /**
   * Handle XTVERSION (DCS >|...) response.
   *
   * 逆向: dY.js processXtversion:47-52
   *   Stores version string; sets osc52=true for known terminals:
   *   ghostty, kitty, wezterm, foot, alacritty, iterm2, tmux
   */
  processXtversion(version: string): boolean {
    this._capabilities.xtversion = version;
    const known = ["ghostty", "kitty", "wezterm", "foot", "alacritty", "iterm2", "tmux"];
    const lower = version.toLowerCase();
    if (known.some((name) => lower.includes(name))) {
      this._capabilities.osc52 = true;
    }
    return false;
  }

  /**
   * Handle XTGETTCAP response.
   *
   * 逆向: dY.js processXtgettcap:54-57
   *   key "4d73" = hex encoding of "Ms" — OSC 52 clipboard support
   *   osc52 = R.length > 0 (non-empty value means supported)
   */
  processXtgettcap(key: string, value: string): boolean {
    if (key.toLowerCase() === "4d73") {
      this._capabilities.osc52 = value.length > 0;
    }
    return false;
  }

  /**
   * Handle APC response starting with "G" — kitty graphics protocol.
   *
   * 逆向: dY.js processKittyGraphics:58-61
   *   If iterm2 → kittyGraphics=false; else → kittyGraphics=true
   */
  processKittyGraphics(): boolean {
    if (this._isITerm2()) {
      this._capabilities.kittyGraphics = false;
      return false;
    }
    this._capabilities.kittyGraphics = true;
    return false;
  }

  /**
   * Handle Kitty keyboard protocol support.
   *
   * 逆向: dY.js processDecrqss: T === "u" → kittyKeyboard = true
   * This method is provided as a convenience alias for callers that detect
   * kitty keyboard via a dedicated path.
   */
  processKittyKeyboard(): boolean {
    this._capabilities.kittyKeyboard = true;
    return false;
  }

  /**
   * Mark that the kitty explicit width probe has been sent.
   *
   * Called immediately after writing the probe sequence
   * `\x1b[?1049h\x1b[H\x1b]66;w=1; \x1b\\\x1b[6n\x1b[?1049l`
   *
   * 逆向: dY.js:69-71
   *   markKittyWidthQuerySent() { this.kittyWidthQuerySent = true }
   */
  markKittyWidthQuerySent(): void {
    this._kittyWidthQuerySent = true;
  }

  /**
   * Handle Cursor Position Report (CPR) response.
   *
   * When the kitty width probe was sent, a CPR response with row=1, col=2
   * means the terminal honored the OSC 66 explicit width (the space char
   * advanced one column). Any other col means OSC 66 was ignored.
   *
   * 逆向: dY.js:62-67
   *   processCursorPositionReport(T, R) {
   *     if (this.kittyWidthQuerySent) {
   *       if (T === 1 && R === 2) this.capabilities.kittyExplicitWidth = true;
   *       this.kittyWidthQuerySent = false;
   *     }
   *   }
   */
  processCursorPositionReport(row: number, col: number): boolean {
    if (this._kittyWidthQuerySent) {
      if (row === 1 && col === 2) {
        this._capabilities.kittyExplicitWidth = true;
      }
      this._kittyWidthQuerySent = false;
    }
    return false;
  }

  /**
   * Handle OSC 10/11/12 color response as a unified method.
   *
   * 逆向: dY.js processOsc10/11/12 — each parses "rgba:HH/GG/BB" format
   *
   * index 10 = foreground, 11 = background, 12 = cursor
   * For index 11 (background), also computes BT.601 luma to set background luminance.
   *
   * @param index - OSC index (10=fg, 11=bg, 12=cursor)
   * @param r - Red 0-255
   * @param g - Green 0-255
   * @param b - Blue 0-255
   */
  processOscColor(index: number, r: number, g: number, b: number): void {
    const color: RgbColor = { r, g, b };
    if (index === 10) {
      this._rgbColors.foreground = color;
    } else if (index === 11) {
      this._rgbColors.background = color;
      // 逆向: dY.js processOsc11:111-112
      //   luma = 0.299*r + 0.587*g + 0.114*b  (BT.601)
      //   background = luma < 128 ? "dark" : "light"
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      this._capabilities.background = luma < 128 ? "dark" : "light";
    } else if (index === 12) {
      this._rgbColors.cursor = color;
    }
  }

  /**
   * Handle OSC 10/11/12 responses from raw terminal data strings.
   *
   * 逆向: dY.js processOsc10:73-91 — parses "10;rgba:HH/GG/BB" format
   *
   * Delegates to processOscColor after extracting r/g/b.
   */
  processOsc10(data: string): boolean {
    const rgb = this._parseOscRgb(data, 10);
    if (rgb) {
      this.processOscColor(10, rgb.r, rgb.g, rgb.b);
    }
    return false;
  }

  /** 逆向: dY.js processOsc11:92-113 */
  processOsc11(data: string): boolean {
    const rgb = this._parseOscRgb(data, 11);
    if (rgb) {
      this.processOscColor(11, rgb.r, rgb.g, rgb.b);
    }
    return false;
  }

  /** 逆向: dY.js processOsc12:114-133 */
  processOsc12(data: string): boolean {
    const rgb = this._parseOscRgb(data, 12);
    if (rgb) {
      this.processOscColor(12, rgb.r, rgb.g, rgb.b);
    }
    return false;
  }

  /**
   * Handle OSC 4 palette color response.
   *
   * 逆向: dY.js processOsc4:134-155
   *   Parses "4;N;rgba:HH/GG/BB" format, stores indices[N] for N in 0-7
   *
   * @param paletteIndex - Color index (0-7 stored)
   * @param r - Red 0-255
   * @param g - Green 0-255
   * @param b - Blue 0-255
   */
  processOscPaletteColor(paletteIndex: number, r: number, g: number, b: number): void {
    if (paletteIndex >= 0 && paletteIndex <= 7) {
      this._rgbColors.indices[paletteIndex] = { r, g, b };
    }
  }

  /**
   * Handle OSC 4 response from raw terminal data string.
   *
   * 逆向: dY.js processOsc4:134-155
   */
  processOsc4(data: string): boolean {
    const match = data.match(/^4;(\d+);rgba?:([0-9a-f]+)\/([0-9a-f]+)\/([0-9a-f]+)/i);
    if (!match?.[1] || !match[2] || !match[3] || !match[4]) {
      return false;
    }
    const idx = Number.parseInt(match[1], 10);
    const r = hexChannelToByte(match[2]);
    const g = hexChannelToByte(match[3]);
    const b = hexChannelToByte(match[4]);
    this.processOscPaletteColor(idx, r, g, b);
    return false;
  }

  // ── Completion / results ─────────────────────────

  /**
   * Returns a promise that resolves when DA1 is received or timeoutMs elapses.
   *
   * 逆向: XXT.js capabilityPromise/capabilityTimeout pattern:379-409
   */
  waitForCompletion(timeoutMs: number): Promise<void> {
    if (this._complete) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        // Remove resolver from list on timeout to avoid calling it twice.
        const idx = this._completionResolvers.indexOf(wrappedResolve);
        if (idx !== -1) {
          this._completionResolvers.splice(idx, 1);
        }
        resolve();
      }, timeoutMs);

      const wrappedResolve = () => {
        clearTimeout(timer);
        resolve();
      };

      this._completionResolvers.push(wrappedResolve);
    });
  }

  /**
   * Returns a shallow copy of the accumulated capabilities partial.
   *
   * 逆向: dY.js getCapabilities:194-198  — `return { ...this.capabilities }`
   */
  getCapabilities(): Partial<TerminalCapabilities> {
    return { ...this._capabilities };
  }

  /**
   * Returns full RGB color set, or null if any required color is still missing.
   *
   * 逆向: dY.js getRgbColors:199-217
   *   Returns null unless fg, bg, cursor, and all 8 palette entries are present.
   */
  getRgbColors(): RgbColors | null {
    if (!this._rgbColors.foreground || !this._rgbColors.background || !this._rgbColors.cursor) {
      return null;
    }
    for (let i = 0; i < 8; i++) {
      if (!this._rgbColors.indices[i]) {
        return null;
      }
    }
    return {
      fg: this._rgbColors.foreground,
      bg: this._rgbColors.background,
      cursor: this._rgbColors.cursor,
      indices: [...this._rgbColors.indices],
    };
  }

  /** True once DA1 sentinel has been processed. */
  isComplete(): boolean {
    return this._complete;
  }

  // ── Private helpers ──────────────────────────────

  /** Resolve all waiters. */
  private _finish(): void {
    const resolvers = this._completionResolvers.splice(0, this._completionResolvers.length);
    for (const resolve of resolvers) {
      resolve();
    }
  }

  /**
   * Parse an OSC Nth;rgba:RR/GG/BB data string.
   *
   * 逆向: dY.js processOsc10/11/12 — all three use the same regex pattern
   */
  private _parseOscRgb(data: string, index: number): RgbColor | null {
    const re = new RegExp(`^${index};rgba?:([0-9a-f]+)\\/([0-9a-f]+)\\/([0-9a-f]+)`, "i");
    const match = data.match(re);
    if (!match?.[1] || !match[2] || !match[3]) {
      return null;
    }
    return {
      r: hexChannelToByte(match[1]),
      g: hexChannelToByte(match[2]),
      b: hexChannelToByte(match[3]),
    };
  }

  /**
   * Check whether the terminal is iTerm2 (used to suppress kitty graphics).
   *
   * 逆向: dY.js isITerm2:285-288
   *   checks xtversion.includes("iterm2") || TERM_PROGRAM === "iTerm.app"
   */
  private _isITerm2(): boolean {
    if (this._capabilities.xtversion?.toLowerCase().includes("iterm2")) {
      return true;
    }
    return process.env.TERM_PROGRAM === "iTerm.app";
  }

  /**
   * Check whether the terminal is JetBrains.
   *
   * 逆向: dY.js detectJetBrains:276-278
   *   return process.env.TERMINAL_EMULATOR?.includes("JetBrains") ?? false
   */
  private _isJetBrains(): boolean {
    return process.env.TERMINAL_EMULATOR?.includes("JetBrains") ?? false;
  }

  /**
   * Check whether running inside tmux.
   *
   * 逆向: dY.js detectTmux:282-284
   *   return !!process.env.TMUX
   */
  private _isTmux(): boolean {
    return !!process.env.TMUX;
  }
}

/**
 * Parse an OSC color response string of the form "rgba:HHHH/HHHH/HHHH" or "rgb:HH/HH/HH"
 * into a { r, g, b } object with values in the range [0, 255].
 *
 * 逆向: dY.js processOsc11 inner lambda:
 *   `l / (2 ** o - 1) * 255`  where o = hexStr.length * 4
 *
 * @param data - Raw OSC color string (without the leading index prefix)
 * @returns Parsed RGB color, or null if the format is unrecognized
 */
export function parseOscColorResponse(data: string): { r: number; g: number; b: number } | null {
  const match = data.match(/rgba?:([0-9a-f]+)\/([0-9a-f]+)\/([0-9a-f]+)/i);
  if (!match) return null;
  const parse = (hex: string) => {
    const val = parseInt(hex, 16);
    const bits = hex.length * 4;
    return Math.round((val / (2 ** bits - 1)) * 255);
  };
  return { r: parse(match[1]), g: parse(match[2]), b: parse(match[3]) };
}
