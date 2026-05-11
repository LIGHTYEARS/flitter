/**
 * 终端输入事件解析器。
 *
 * 将 VT 低层事件（{@link VtEvent}）转换为面向 Widget 层的
 * 语义化输入事件（{@link InputEvent}）。支持键盘、鼠标、粘贴
 * 和焦点事件的解析。
 *
 * 由于 {@link VtParser} 不会为 C0 控制字符（0x00-0x1F）生成事件，
 * 本类额外提供 {@link feed} 方法，在将原始字节交给 VtParser 之前
 * 先拦截 C0 控制字符并转换为对应的 {@link KeyEvent}。
 *
 * @example
 * ```ts
 * import { InputParser } from "./input-parser.js";
 *
 * const parser = new InputParser();
 * parser.onInput((evt) => {
 *   if (evt.type === "key") console.log(evt.key, evt.modifiers);
 *   if (evt.type === "mouse") console.log(evt.x, evt.y, evt.button);
 * });
 *
 * // 直接喂入原始字节（推荐，自动处理 C0 控制字符）
 * parser.feed(Buffer.from("\x1b[A"));
 *
 * // 或者手动传入 VtEvent
 * parser.handleVtEvent({ type: "csi", params: [], intermediates: "", private_marker: "", final: "A" });
 * ```
 *
 * @module
 */

import { logger } from "../debug/logger.js";
import type {
  CursorPositionEvent,
  InbandResizeEvent,
  InputEvent,
  KeyEvent,
  KittyKeyboardResponseEvent,
  Modifiers,
  MouseAction,
  MouseButton,
  PasteEvent,
  FocusEvent as TermFocusEvent,
  MouseEvent as TermMouseEvent,
  VtCsiEvent,
  VtEscapeEvent,
  VtEvent,
  VtPrintEvent,
} from "./types.js";
import { MODIFIERS_NONE, modifierFromCsiParam } from "./types.js";
import { VtParser } from "./vt-parser.js";

const log = logger.scoped("input");

// ════════════════════════════════════════════════════
//  内部辅助
// ════════════════════════════════════════════════════

/** 创建仅 Ctrl 修饰键的 Modifiers 对象 */
function ctrlMod(): Modifiers {
  return { shift: false, alt: false, ctrl: true, meta: false };
}

/** 创建仅 Shift 修饰键的 Modifiers 对象 */
function shiftMod(): Modifiers {
  return { shift: true, alt: false, ctrl: false, meta: false };
}

/**
 * 构造 KeyEvent 辅助函数。
 *
 * @param key - 逻辑键名
 * @param modifiers - 修饰键状态，默认无修饰键
 */
function keyEvent(key: string, modifiers: Modifiers = { ...MODIFIERS_NONE }): KeyEvent {
  return { type: "key", key, modifiers };
}

/**
 * CSI "~" 终止符的参数到键名映射。
 *
 * 参见 xterm 文档中各功能键对应的 CSI 编码。
 */
const TILDE_KEY_MAP: Record<number, string> = {
  1: "Home",
  2: "Insert",
  3: "Delete",
  4: "End",
  5: "PageUp",
  6: "PageDown",
  7: "Home",
  8: "End",
  11: "F1",
  12: "F2",
  13: "F3",
  14: "F4",
  15: "F5",
  17: "F6",
  18: "F7",
  19: "F8",
  20: "F9",
  21: "F10",
  23: "F11",
  24: "F12",
};

/**
 * SS3（ESC O）序列的终止字节到键名映射。
 */
const SS3_KEY_MAP: Record<string, string> = {
  P: "F1",
  Q: "F2",
  R: "F3",
  S: "F4",
  A: "ArrowUp",
  B: "ArrowDown",
  C: "ArrowRight",
  D: "ArrowLeft",
};

/**
 * CSI 终止字节到方向/导航键名映射。
 */
const CSI_FINAL_KEY_MAP: Record<string, string> = {
  A: "ArrowUp",
  B: "ArrowDown",
  C: "ArrowRight",
  D: "ArrowLeft",
  H: "Home",
  F: "End",
};

// ════════════════════════════════════════════════════
//  Kitty 键盘协议辅助
// ════════════════════════════════════════════════════

/**
 * Kitty 扩展键码（Unicode 私有区）到键名映射。
 *
 * 逆向: amp-cli-reversed/modules/2026_tail_anonymous.js:156722-156829 (IxT)
 * Kitty protocol assigns keycodes >= 57344 for special keys.
 * These are used in CSI keycode ; modifiers u sequences.
 */
const KITTY_SPECIAL_KEY_MAP: Record<number, string> = {
  57348: "Insert",
  57349: "Delete",
  57350: "ArrowLeft",
  57351: "ArrowRight",
  57352: "ArrowUp",
  57353: "ArrowDown",
  57354: "PageUp",
  57355: "PageDown",
  57356: "Home",
  57357: "End",
  57358: "CapsLock",
  57359: "ScrollLock",
  57360: "NumLock",
  57361: "PrintScreen",
  57362: "Pause",
  57363: "ContextMenu",
  57364: "F1",
  57365: "F2",
  57366: "F3",
  57367: "F4",
  57368: "F5",
  57369: "F6",
  57370: "F7",
  57371: "F8",
  57372: "F9",
  57373: "F10",
  57374: "F11",
  57375: "F12",
  57376: "F13",
  57377: "F14",
  57378: "F15",
  57379: "F16",
  57380: "F17",
  57381: "F18",
  57382: "F19",
  57383: "F20",
  57384: "F21",
  57385: "F22",
  57386: "F23",
  57387: "F24",
  57414: "Enter",
  57441: "ShiftLeft",
  57442: "ControlLeft",
  57443: "AltLeft",
  57444: "MetaLeft",
};

/**
 * キー コードを論理キー名に変換する (kitty unicodeToKey 相当).
 *
 * 逆向: amp-cli-reversed/modules/2026_tail_anonymous.js:157406-157421 (unicodeToKey)
 */
function kittyUnicodeToKey(code: number): string | null {
  if (code === 13) return "Enter";
  if (code === 9) return "Tab";
  if (code === 27) return "Escape";
  if (code === 127) return "Backspace";
  if (code === 32) return " ";
  if (code >= 1 && code <= 26) return String.fromCharCode(0x60 + code);
  const special = KITTY_SPECIAL_KEY_MAP[code];
  if (special !== undefined) return special;
  if (code >= 32 && code <= 126) return String.fromCharCode(code);
  if (code > 126) {
    try {
      return String.fromCodePoint(code);
    } catch {
      return null;
    }
  }
  return null;
}

// ════════════════════════════════════════════════════
//  SGR 鼠标事件解码
// ════════════════════════════════════════════════════

/**
 * 从 SGR 鼠标按钮字节中提取修饰键。
 *
 * 按钮字节的高位编码修饰键：
 * - bit 2 (0x04) = Shift
 * - bit 3 (0x08) = Alt/Meta
 * - bit 4 (0x10) = Ctrl
 *
 * @param buttonByte - SGR 鼠标编码的按钮字节
 */
function mouseModifiers(buttonByte: number): Modifiers {
  return {
    shift: (buttonByte & 0x04) !== 0,
    alt: (buttonByte & 0x08) !== 0,
    ctrl: (buttonByte & 0x10) !== 0,
    meta: false,
  };
}

/**
 * 解码 SGR 鼠标事件。
 *
 * @param buttonByte - params[0] 按钮编码字节
 * @param x1 - params[1] 列坐标（1 起始）
 * @param y1 - params[2] 行坐标（1 起始）
 * @param finalChar - 终止字符 "M"（按下）或 "m"（释放）
 */
function decodeSgrMouse(
  buttonByte: number,
  x1: number,
  y1: number,
  finalChar: string,
): TermMouseEvent {
  const modifiers = mouseModifiers(buttonByte);
  const x = x1 - 1;
  const y = y1 - 1;

  // 滚轮事件
  if (buttonByte >= 64 && buttonByte < 128) {
    const wheelBase = buttonByte & ~0x1c; // 去掉修饰键位
    const action: MouseAction = wheelBase === 64 ? "wheel_up" : "wheel_down";
    return { type: "mouse", x, y, button: "none", action, modifiers };
  }

  // 移动事件（bit 5 = 32）
  if (buttonByte >= 32 && buttonByte < 64) {
    const base = (buttonByte - 32) & 0x03;
    const button: MouseButton =
      base === 0 ? "left" : base === 1 ? "middle" : base === 2 ? "right" : "none";
    return { type: "mouse", x, y, button, action: "move", modifiers };
  }

  // 普通按键事件
  const base = buttonByte & 0x03;
  const button: MouseButton =
    base === 0 ? "left" : base === 1 ? "middle" : base === 2 ? "right" : "none";
  const action: MouseAction = finalChar === "M" ? "press" : "release";

  return { type: "mouse", x, y, button, action, modifiers };
}

/**
 * SGR 鼠标转换函数。
 *
 * 允许调用方在启用 ?1016 后，把像素坐标转换回字符坐标。
 */
type SgrMouseConverter = (
  buttonByte: number,
  x1: number,
  y1: number,
  finalChar: string,
) => TermMouseEvent;

// ════════════════════════════════════════════════════
//  InputParser 类
// ════════════════════════════════════════════════════

/**
 * 终端输入事件解析器。
 *
 * 接收 VT 低层事件并转换为语义化的输入事件。提供两种使用方式：
 *
 * 1. **推荐**：使用 {@link feed} 方法直接喂入原始字节，内部自动
 *    使用 VtParser 并拦截 C0 控制字符。
 * 2. 使用 {@link handleVtEvent} 手动传入 VtEvent（需自行处理
 *    C0 控制字符）。
 */
export class InputParser {
  /** 输入事件回调列表 */
  private handlers: Array<(event: InputEvent) => void> = [];

  /** 是否处于粘贴模式（bracketed paste） */
  private pasteMode = false;

  /** 粘贴文本缓冲区 */
  private pasteBuffer = "";

  /** 内部 VtParser 实例（用于 feed 方法） */
  private vtParser: VtParser;

  /** 当前 SGR 鼠标转换器，默认使用字符坐标解码。 */
  private sgrMouseConverter: SgrMouseConverter = decodeSgrMouse;

  // ── Escape timeout mechanism ──────────────────────
  //
  // 逆向: amp InputParser in chunk-005.js:163013-163099
  //
  // When a standalone ESC byte arrives (data.length === 1 && data[0] === 0x1b),
  // we schedule a 25ms timeout. If no more bytes arrive within that window,
  // we emit a standalone "Escape" key event. If more bytes arrive (the ESC was
  // the start of an escape sequence like CSI, SS3, etc.), the timeout is
  // cleared and the full sequence is parsed normally by the VtParser.

  /**
   * Timeout handle for pending standalone ESC detection.
   *
   * 逆向: amp escapeTimeout = null (chunk-005.js:163013)
   */
  private escapeTimeout: ReturnType<typeof setTimeout> | null = null;

  /** pendingEscape — whether a standalone ESC timeout is active.
   * 逆向: amp pendingEscape = !1 (chunk-005.js:163015)
   * Read in handlePrint for Alt+key detection (not yet implemented in flitter). */
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: maintained for amp-compat; consumed by Alt+key path (pending impl)
  private pendingEscape = false;

  /**
   * Timeout in ms to wait before treating ESC as standalone.
   *
   * 逆向: amp ESCAPE_TIMEOUT_MS = 25 (chunk-005.js:163014)
   */
  private readonly ESCAPE_TIMEOUT_MS = 25;

  constructor() {
    this.vtParser = new VtParser();
    this.vtParser.onEvent((evt) => this.handleVtEvent(evt));
  }

  /**
   * Check if data is a standalone ESC byte (single 0x1b).
   *
   * 逆向: amp isStandaloneEscape (chunk-005.js:163084-163086)
   */
  private isStandaloneEscape(data: Buffer | Uint8Array): boolean {
    return data.length === 1 && data[0] === 0x1b;
  }

  /**
   * Schedule a timeout to emit standalone Escape if no follow-up bytes arrive.
   *
   * 逆向: amp scheduleEscapeTimeout (chunk-005.js:163087-163099)
   */
  private scheduleEscapeTimeout(): void {
    this.pendingEscape = true;
    this.escapeTimeout = setTimeout(() => {
      this.pendingEscape = false;
      // Reset the VtParser which is sitting in "escape" state waiting for more bytes
      this.vtParser.reset();
      // Emit standalone Escape key event
      this.emit(keyEvent("Escape"));
      this.escapeTimeout = null;
    }, this.ESCAPE_TIMEOUT_MS);
  }

  /**
   * Clear any pending escape timeout.
   *
   * 逆向: amp clearEscapeTimeout (chunk-005.js:163101-163103)
   */
  private clearEscapeTimeout(): void {
    if (this.escapeTimeout) {
      clearTimeout(this.escapeTimeout);
      this.escapeTimeout = null;
    }
    this.pendingEscape = false;
  }

  // ════════════════════════════════════════════════════
  //  公开 API
  // ════════════════════════════════════════════════════

  /**
   * 注册输入事件回调。
   *
   * @param handler - 事件处理函数，每产生一个 InputEvent 即调用一次
   */
  onInput(handler: (event: InputEvent) => void): void {
    this.handlers.push(handler);
  }

  /**
   * 设置 SGR 鼠标转换器。
   *
   * @param converter - 新的坐标转换函数
   */
  setSgrMouseConverter(converter: SgrMouseConverter): void {
    this.sgrMouseConverter = converter;
  }

  /**
   * 处理单个 VT 低层事件并转换为输入事件。
   *
   * @param event - VT 解析器输出的低层事件
   */
  handleVtEvent(event: VtEvent): void {
    switch (event.type) {
      case "print":
        this.handlePrint(event);
        break;
      case "csi":
        this.handleCsi(event);
        break;
      case "escape":
        this.handleEscape(event);
        break;
      default:
        // osc, dcs, apc — 当前不产生输入事件
        break;
    }
  }

  /**
   * 喂入原始字节流。
   *
   * 在将字节交给内部 VtParser 之前，先拦截 C0 控制字符
   * （0x00-0x1F 除 ESC）和 DEL（0x7F）并转换为对应的 KeyEvent。
   * 调用结束后自动刷新 VtParser 的打印缓冲区，确保所有
   * 可打印字符都产生事件。
   *
   * 逆向: amp parse (chunk-005.js:163075-163082) — standalone ESC detection
   * When a single ESC byte arrives, schedules a 25ms timeout. If no follow-up
   * bytes arrive (confirming it's not the start of CSI/SS3/etc.), emits a
   * standalone "Escape" key event. If more bytes come, the timeout is cleared
   * and normal sequence parsing proceeds.
   *
   * @param data - 原始字节数据
   */
  feed(data: Buffer | Uint8Array): void {
    // ── Standalone ESC detection (amp pattern) ──
    // 逆向: amp parse (chunk-005.js:163076-163081)
    if (this.isStandaloneEscape(data)) {
      // Clear any previous escape timeout and schedule a new one
      this.clearEscapeTimeout();
      this.scheduleEscapeTimeout();
      // Still pass to VtParser so it enters escape state (waiting for follow-up)
      this.vtParser.parse(data);
      return;
    }

    // If we had a pending escape and more data arrived, clear the timeout —
    // the ESC was the start of a multi-byte sequence, not standalone.
    // 逆向: amp parse (chunk-005.js:163081)
    if (this.escapeTimeout) {
      this.clearEscapeTimeout();
    }

    // 将数据按段切分：C0 控制字符和 DEL 单独处理，其余交给 VtParser
    let start = 0;

    for (let i = 0; i < data.length; i++) {
      const byte = data[i];

      // C0 控制字符（0x00-0x1F 除 ESC）和 DEL (0x7F) 需要拦截
      if ((byte < 0x20 && byte !== 0x1b) || byte === 0x7f) {
        // 先将之前累积的非控制字节段交给 VtParser
        if (i > start) {
          this.vtParser.parse(data.subarray(start, i));
        }
        // 刷新 VtParser 的打印缓冲区，确保之前的可打印字符先产生事件
        this.vtParser.reset();
        this.handleC0(byte);
        start = i + 1;
      }
    }

    // 处理剩余字节
    if (start < data.length) {
      this.vtParser.parse(data.subarray(start, data.length));
    }

    // 刷新 VtParser 打印缓冲区，确保尾部可打印字符产生事件
    this.vtParser.reset();
  }

  /**
   * 重置解析器状态。
   *
   * 刷新 VtParser 的打印缓冲区并重置粘贴模式。
   * 用于终端恢复后清除可能的部分解析状态。
   *
   * 逆向: amp reset (chunk-005.js:163108-163109)
   * Also clears any pending escape timeout.
   */
  reset(): void {
    this.clearEscapeTimeout();
    this.vtParser.reset();
    this.pasteMode = false;
    this.pasteBuffer = "";
  }

  // ════════════════════════════════════════════════════
  //  事件发射
  // ════════════════════════════════════════════════════

  /** 触发输入事件回调 */
  private emit(event: InputEvent): void {
    for (const h of this.handlers) {
      h(event);
    }
  }

  // ════════════════════════════════════════════════════
  //  C0 控制字符处理
  // ════════════════════════════════════════════════════

  /**
   * 处理 C0 控制字符（0x00-0x1F 除 ESC）。
   *
   * 这些字符不会由 VtParser 产生事件，需要在 feed() 中拦截。
   *
   * @param byte - C0 控制字符字节值
   */
  private handleC0(byte: number): void {
    if (this.pasteMode) {
      // 粘贴模式中，C0 控制字符追加到粘贴缓冲区
      if (byte === 0x0a || byte === 0x0d) {
        this.pasteBuffer += String.fromCharCode(byte);
      } else if (byte === 0x09) {
        this.pasteBuffer += "\t";
      }
      return;
    }

    switch (byte) {
      case 0x00:
        // Ctrl+@ / Ctrl+Space
        this.emit(keyEvent("Space", ctrlMod()));
        break;
      case 0x08:
        // BS → Backspace
        this.emit(keyEvent("Backspace"));
        break;
      case 0x09:
        // HT → Tab
        this.emit(keyEvent("Tab"));
        break;
      case 0x0a:
        // LF → Enter
        this.emit(keyEvent("Enter"));
        break;
      case 0x0d:
        // CR → Enter
        this.emit(keyEvent("Enter"));
        break;
      case 0x1b:
        // ESC — 不应到达此处（在 feed 中已排除）
        this.emit(keyEvent("Escape"));
        break;
      case 0x7f:
        // DEL — 不是 C0 但也需处理（实际上 0x7F 不在 < 0x20 范围内）
        this.emit(keyEvent("Backspace"));
        break;
      default:
        if (byte >= 0x01 && byte <= 0x1a) {
          // Ctrl+a 到 Ctrl+z
          const letter = String.fromCharCode(0x60 + byte);
          this.emit(keyEvent(letter, ctrlMod()));
        }
        // 其他 C0 控制字符忽略
        break;
    }
  }

  // ════════════════════════════════════════════════════
  //  VtPrintEvent 处理
  // ════════════════════════════════════════════════════

  /**
   * 处理打印事件。
   *
   * VtParser 产生的打印事件仅包含可显示字符（>= 0x20）。
   * 在粘贴模式中将文本追加到缓冲区，否则转为 KeyEvent。
   *
   * @param event - VT 打印事件
   */
  private handlePrint(event: VtPrintEvent): void {
    const { grapheme } = event;

    if (this.pasteMode) {
      this.pasteBuffer += grapheme;
      return;
    }

    // 检查是否为 C0 控制字符（理论上 VtParser 不会产生，但防御性处理）
    if (grapheme.length === 1) {
      const code = grapheme.charCodeAt(0);
      if (code < 0x20) {
        this.handleC0(code);
        return;
      }
      if (code === 0x7f) {
        this.emit(keyEvent("Backspace"));
        return;
      }
    }

    this.emit(keyEvent(grapheme));
  }

  // ════════════════════════════════════════════════════
  //  VtCsiEvent 处理
  // ════════════════════════════════════════════════════

  /**
   * 处理 CSI 序列事件。
   *
   * 根据私有标记和终止字节分发到不同的处理逻辑。
   *
   * @param event - VT CSI 事件
   */
  private handleCsi(event: VtCsiEvent): void {
    const { params, private_marker, final: finalChar } = event;

    // SGR 鼠标事件
    if (private_marker === "<") {
      this.handleSgrMouse(params, finalChar);
      return;
    }

    // Kitty keyboard protocol response: CSI ? <flags> u
    //
    // 逆向: amp-cli-reversed/modules/2026_tail_anonymous.js:157504-157512
    //   csiToKittyKeyboardResponse(T) {
    //     if (T.final === "u" && T.private === "?") {
    //       return { type: "decrqss_response", request: "u", ... };
    //     }
    //   }
    //
    // Terminal sends this in response to a CSI ? u probe sequence,
    // indicating it supports the kitty keyboard protocol.
    if (private_marker === "?" && finalChar === "u") {
      const flags = params.length >= 1 ? params[0].value : 0;
      log.debug("kitty keyboard response", { flags });
      this.emit({
        type: "kitty_keyboard_response",
        flags,
      } as KittyKeyboardResponseEvent);
      return;
    }

    // 非标准私有标记 → 忽略
    if (private_marker !== "") {
      return;
    }

    switch (finalChar) {
      case "~":
        this.handleTildeKey(params);
        break;

      case "A":
      case "B":
      case "C":
      case "D":
      case "H":
      case "F": {
        const key = CSI_FINAL_KEY_MAP[finalChar]!;
        const modifiers =
          params.length >= 2 && params[1].value > 0
            ? modifierFromCsiParam(params[1].value)
            : { ...MODIFIERS_NONE };
        this.emit(keyEvent(key, modifiers));
        break;
      }

      case "Z":
        // Shift+Tab
        this.emit(keyEvent("Tab", shiftMod()));
        break;

      case "I":
        // 焦点获得
        this.emit({ type: "focus", focused: true } as TermFocusEvent);
        break;

      case "O":
        // 焦点失去
        this.emit({ type: "focus", focused: false } as TermFocusEvent);
        break;

      case "u":
        // Kitty Keyboard Protocol (KKP) key event: CSI keycode ; modifiers u
        //
        // 逆向: amp-cli-reversed/modules/2026_tail_anonymous.js:157230-157268 (csiToKey)
        //   params[0].value = unicode codepoint or special key code
        //   params[1].value = modifier bits + 1 (standard CSI modifier encoding)
        //   params[1].subparams?.[0] = event type (1=press, 2=repeat, 3=release)
        //   params[2] = alternate keycode (for keycodes w/ associated text or ~27 form)
        //
        // 逆向: amp unicodeToKey (157406-157421), IxT special keys (156722-156829)
        this.handleKittyKey(params);
        break;

      case "t":
        // In-band resize notification (DEC mode ?2048)
        //
        // 逆向: amp-cli-reversed/modules/2112_unknown_XXT.js:449-470
        //   handleInbandResize(T) — params[0]=48 check, T.width, T.height, T.pixelWidth, T.pixelHeight
        //
        // Response format: ESC [ 48 ; rows ; cols ; pixelH ; pixelW t
        // params[0] must be 48 (identifies this as an in-band resize, not another CSI t variant)
        // params[1] = rows, params[2] = cols, params[3] = pixelH, params[4] = pixelW
        if (params.length >= 3 && params[0].value === 48) {
          const rows = params[1].value;
          const cols = params[2].value;
          const pixelHeight = params.length >= 4 ? params[3].value : 0;
          const pixelWidth = params.length >= 5 ? params[4].value : 0;
          if (cols > 0 && rows > 0) {
            this.emit({
              type: "inband_resize",
              width: cols,
              height: rows,
              pixelWidth,
              pixelHeight,
            } as InbandResizeEvent);
          }
        }
        break;

      case "R":
        // Cursor Position Report (CPR) — response to CSI 6 n
        //
        // 逆向: amp 2112_unknown_XXT.js:66-67
        //   parser.onCursorPositionReport(T => queryParser.processCursorPositionReport(T.row, T.col))
        //
        // Response format: ESC [ row ; col R
        // Used by kitty explicit width probe: sends test char + CPR request;
        // if col===2, terminal supports OSC 66 explicit width.
        if (params.length >= 2) {
          this.emit({
            type: "cursor_position",
            row: params[0].value,
            col: params[1].value,
          } as CursorPositionEvent);
        }
        break;

      default:
        // 未识别的 CSI 序列 → 忽略
        break;
    }
  }

  /**
   * 处理 SGR 鼠标事件（CSI < ... M/m）。
   *
   * @param params - CSI 参数列表
   * @param finalChar - 终止字符
   */
  private handleSgrMouse(params: VtCsiEvent["params"], finalChar: string): void {
    if (params.length < 3) return;

    const buttonByte = params[0].value;
    const x1 = params[1].value;
    const y1 = params[2].value;

    const decoded = this.sgrMouseConverter(buttonByte, x1, y1, finalChar);
    log.debug("mouse", {
      action: decoded.action,
      button: decoded.button,
      x: decoded.x,
      y: decoded.y,
    });
    this.emit(decoded);
  }

  /**
   * 处理 CSI ... ~ 形式的功能键事件。
   *
   * @param params - CSI 参数列表
   */
  private handleTildeKey(params: VtCsiEvent["params"]): void {
    if (params.length === 0) return;

    const code = params[0].value;

    // 粘贴模式控制
    if (code === 200) {
      this.pasteMode = true;
      this.pasteBuffer = "";
      return;
    }
    if (code === 201) {
      this.pasteMode = false;
      this.emit({ type: "paste", text: this.pasteBuffer } as PasteEvent);
      this.pasteBuffer = "";
      return;
    }

    const key = TILDE_KEY_MAP[code];
    if (key === undefined) return;

    const modifiers =
      params.length >= 2 && params[1].value > 0
        ? modifierFromCsiParam(params[1].value)
        : { ...MODIFIERS_NONE };

    this.emit(keyEvent(key, modifiers));
  }

  /**
   * 处理 Kitty Keyboard Protocol (KKP) 键事件 (CSI keycode ; modifiers u)。
   *
   * 逆向: amp-cli-reversed/modules/2026_tail_anonymous.js:157230-157268 (csiToKey)
   *
   * Format: CSI keycode ; modifierParam u
   *   params[0].value = unicode codepoint or kitty extended keycode
   *   params[1].value = modifier bits + 1 (0/1 = no modifiers)
   *   params[1].subparams?.[0] = event type (1=press, 2=repeat, 3=release)
   *
   * Amp skips key release events (eventType=3) — we do the same.
   *
   * @param params - CSI 参数列表
   */
  private handleKittyKey(params: VtCsiEvent["params"]): void {
    if (params.length === 0) return;

    const keycode = params[0].value;

    // Resolve logical key name from keycode
    // 逆向: amp csiToKey line 157249-157252
    const key = kittyUnicodeToKey(keycode);
    if (key === null) return;

    // Resolve modifier state from params[1]
    // 逆向: amp parseModifiers (157391-157404): param=0/1 → no mods, else bits = param-1
    let modifiers: Modifiers = { ...MODIFIERS_NONE };
    if (params.length >= 2 && params[1] !== undefined) {
      const modParam = params[1].value;
      if (modParam > 1) {
        modifiers = modifierFromCsiParam(modParam);
      }

      // Check event type from subparam: 1=press, 2=repeat, 3=release
      // 逆向: amp kittyEventTypeToName (157285-157295)
      //   subparams?.[0] — 1=press, 2=repeat, 3=release
      const eventType = params[1].subparams?.[0];
      if (eventType === 3) {
        // Skip key release events — amp also ignores releases
        return;
      }
    }

    log.debug("kitty key", { keycode, key, modifiers });
    this.emit(keyEvent(key, modifiers));
  }

  // ════════════════════════════════════════════════════
  //  VtEscapeEvent 处理
  // ════════════════════════════════════════════════════

  /**
   * 处理 ESC 序列事件。
   *
   * 主要处理 SS3（ESC O）序列中的功能键和方向键。
   *
   * @param event - VT ESC 事件
   */
  private handleEscape(event: VtEscapeEvent): void {
    const { intermediates, final: finalChar } = event;

    // SS3 序列：ESC O <final>
    if (intermediates === "O") {
      const key = SS3_KEY_MAP[finalChar];
      if (key !== undefined) {
        this.emit(keyEvent(key));
      }
      return;
    }

    // 其他 ESC 序列暂不处理
  }
}
