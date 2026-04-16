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
  InputEvent,
  KeyEvent,
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

  constructor() {
    this.vtParser = new VtParser();
    this.vtParser.onEvent((evt) => this.handleVtEvent(evt));
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
   * @param data - 原始字节数据
   */
  feed(data: Buffer | Uint8Array): void {
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
   */
  reset(): void {
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

    const decoded = decodeSgrMouse(buttonByte, x1, y1, finalChar);
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
