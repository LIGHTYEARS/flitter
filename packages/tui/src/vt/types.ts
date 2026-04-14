/**
 * VT/ANSI 事件类型定义与输入事件类型。
 *
 * 本模块包含两组类型：
 * 1. **VT 低层事件**（`VtEvent`）—— 解析器直接输出的终端转义序列事件
 * 2. **输入高层事件**（`InputEvent`）—— 面向 Widget 层的语义化输入事件
 *
 * 同时提供修饰键相关的辅助工具函数和常量。
 *
 * @example
 * ```ts
 * import type { VtEvent, InputEvent } from "./types.js";
 * import { MODIFIERS_NONE, hasModifier, modifierFromCsiParam } from "./types.js";
 *
 * // VT 事件类型判别
 * function handleVt(evt: VtEvent) {
 *   if (evt.type === "csi") {
 *     console.log(evt.final, evt.params);
 *   }
 * }
 *
 * // CSI 修饰键参数解码
 * const mods = modifierFromCsiParam(6); // Ctrl+Shift
 * hasModifier(mods); // true
 * ```
 *
 * @module
 */

// ════════════════════════════════════════════════════
//  VT 低层事件（解析器输出）
// ════════════════════════════════════════════════════

/**
 * CSI 序列参数。
 *
 * 每个参数可包含可选的子参数（冒号分隔），例如 `4:3` 表示
 * 卷曲下划线样式。
 *
 * @example
 * ```ts
 * // 普通参数：CSI 38;2;255;0;0 m 中的 "38"
 * const p: CsiParam = { value: 38 };
 *
 * // 带子参数：CSI 4:3 m 中的 "4:3"
 * const p2: CsiParam = { value: 4, subparams: [3] };
 *
 * // 省略参数（默认值）
 * const p3: CsiParam = { value: -1 };
 * ```
 */
export interface CsiParam {
  /** 参数值，-1 表示省略/使用默认值 */
  value: number;
  /** 子参数列表（冒号分隔），无子参数时为 undefined */
  subparams?: number[];
}

/**
 * 打印事件 —— 输出可显示的 Unicode 字形簇。
 *
 * @example
 * ```ts
 * const evt: VtPrintEvent = { type: "print", grapheme: "A" };
 * const emoji: VtPrintEvent = { type: "print", grapheme: "👨‍👩‍👧" };
 * ```
 */
export interface VtPrintEvent {
  type: "print";
  /** Unicode 字形簇（grapheme cluster） */
  grapheme: string;
}

/**
 * CSI（Control Sequence Introducer）事件。
 *
 * 表示 `ESC [ ... final` 形式的控制序列。
 *
 * @example
 * ```ts
 * // CSI 1;2 A  —— Shift+光标上移
 * const evt: VtCsiEvent = {
 *   type: "csi",
 *   params: [{ value: 1 }, { value: 2 }],
 *   intermediates: "",
 *   private_marker: "",
 *   final: "A",
 * };
 *
 * // CSI ? 1049 h  —— 启用备用屏幕缓冲区
 * const decset: VtCsiEvent = {
 *   type: "csi",
 *   params: [{ value: 1049 }],
 *   intermediates: "",
 *   private_marker: "?",
 *   final: "h",
 * };
 * ```
 */
export interface VtCsiEvent {
  type: "csi";
  /** 参数列表（含可选子参数） */
  params: CsiParam[];
  /** 中间字节，例如 `" "` */
  intermediates: string;
  /** 私有标记，例如 `"?"` `"<"` */
  private_marker: string;
  /** 终止字节，例如 `"A"` `"m"` `"h"` */
  final: string;
}

/**
 * ESC（Escape）事件。
 *
 * 表示 `ESC intermediate... final` 形式的转义序列。
 *
 * @example
 * ```ts
 * // ESC M  —— 反向换行（Reverse Index）
 * const ri: VtEscapeEvent = {
 *   type: "escape",
 *   intermediates: "",
 *   final: "M",
 * };
 * ```
 */
export interface VtEscapeEvent {
  type: "escape";
  /** 中间字节 */
  intermediates: string;
  /** 终止字节 */
  final: string;
}

/**
 * OSC（Operating System Command）事件。
 *
 * 表示 `ESC ] data ST` 形式的操作系统命令序列。
 *
 * @example
 * ```ts
 * // OSC 52;c;base64data ST  —— 剪贴板操作
 * const osc: VtOscEvent = {
 *   type: "osc",
 *   data: "52;c;SGVsbG8=",
 * };
 * ```
 */
export interface VtOscEvent {
  type: "osc";
  /** OSC 数据负载，例如 `"52;c;base64data"` */
  data: string;
}

/**
 * DCS（Device Control String）事件。
 *
 * 表示 `ESC P params intermediates final data ST` 形式的设备控制序列。
 *
 * @example
 * ```ts
 * // DCS + q 7465 ST  —— 请求 terminfo 能力
 * const dcs: VtDcsEvent = {
 *   type: "dcs",
 *   params: [],
 *   intermediates: "+",
 *   private_marker: "",
 *   final: "q",
 *   data: "7465",
 * };
 * ```
 */
export interface VtDcsEvent {
  type: "dcs";
  /** 参数列表（含可选子参数） */
  params: CsiParam[];
  /** 中间字节 */
  intermediates: string;
  /** 私有标记 */
  private_marker: string;
  /** 终止字节 */
  final: string;
  /** DCS 数据负载 */
  data: string;
}

/**
 * APC（Application Program Command）事件。
 *
 * 表示 `ESC _ data ST` 形式的应用程序命令序列。
 *
 * @example
 * ```ts
 * const apc: VtApcEvent = { type: "apc", data: "some-payload" };
 * ```
 */
export interface VtApcEvent {
  type: "apc";
  /** APC 数据负载 */
  data: string;
}

/**
 * VT 解析器输出的低层事件联合类型。
 *
 * 可通过 `type` 字段进行判别（discriminated union）。
 *
 * @example
 * ```ts
 * function dispatch(evt: VtEvent) {
 *   switch (evt.type) {
 *     case "print": console.log(evt.grapheme); break;
 *     case "csi":   console.log(evt.final);    break;
 *     case "escape": break;
 *     case "osc":   console.log(evt.data);     break;
 *     case "dcs":   console.log(evt.data);     break;
 *     case "apc":   console.log(evt.data);     break;
 *   }
 * }
 * ```
 */
export type VtEvent =
  | VtPrintEvent
  | VtCsiEvent
  | VtEscapeEvent
  | VtOscEvent
  | VtDcsEvent
  | VtApcEvent;

// ════════════════════════════════════════════════════
//  输入高层事件（面向 Widget）
// ════════════════════════════════════════════════════

/**
 * 修饰键状态。
 *
 * 表示 Shift、Alt、Ctrl、Meta 四个修饰键的按下状态。
 *
 * @example
 * ```ts
 * const mods: Modifiers = { shift: false, alt: true, ctrl: false, meta: false };
 * ```
 */
export interface Modifiers {
  /** Shift 键是否按下 */
  shift: boolean;
  /** Alt 键是否按下 */
  alt: boolean;
  /** Ctrl 键是否按下 */
  ctrl: boolean;
  /** Meta 键是否按下 */
  meta: boolean;
}

/** 鼠标按键类型 */
export type MouseButton = "left" | "middle" | "right" | "none";

/** 鼠标操作类型 */
export type MouseAction = "press" | "release" | "move" | "wheel_up" | "wheel_down";

/**
 * 键盘事件。
 *
 * @example
 * ```ts
 * const enter: KeyEvent = {
 *   type: "key",
 *   key: "Enter",
 *   modifiers: MODIFIERS_NONE,
 * };
 *
 * const ctrlC: KeyEvent = {
 *   type: "key",
 *   key: "c",
 *   modifiers: { shift: false, alt: false, ctrl: true, meta: false },
 * };
 * ```
 */
export interface KeyEvent {
  type: "key";
  /** 逻辑键名，例如 `"Enter"` `"ArrowUp"` `"a"` `"A"` `"F1"` */
  key: string;
  /** 修饰键状态 */
  modifiers: Modifiers;
}

/**
 * 鼠标事件。
 *
 * @example
 * ```ts
 * const click: MouseEvent = {
 *   type: "mouse",
 *   x: 10,
 *   y: 5,
 *   button: "left",
 *   action: "press",
 *   modifiers: MODIFIERS_NONE,
 * };
 * ```
 */
export interface MouseEvent {
  type: "mouse";
  /** 列位置（0 起始） */
  x: number;
  /** 行位置（0 起始） */
  y: number;
  /** 鼠标按键 */
  button: MouseButton;
  /** 操作类型 */
  action: MouseAction;
  /** 修饰键状态 */
  modifiers: Modifiers;
}

/**
 * 粘贴事件（bracketed paste）。
 *
 * @example
 * ```ts
 * const paste: PasteEvent = { type: "paste", text: "Hello, World!" };
 * ```
 */
export interface PasteEvent {
  type: "paste";
  /** 粘贴的文本内容 */
  text: string;
}

/**
 * 焦点事件。
 *
 * @example
 * ```ts
 * const focusIn: FocusEvent = { type: "focus", focused: true };
 * const focusOut: FocusEvent = { type: "focus", focused: false };
 * ```
 */
export interface FocusEvent {
  type: "focus";
  /** 终端窗口是否获得焦点 */
  focused: boolean;
}

/**
 * 终端窗口大小变化事件。
 *
 * @example
 * ```ts
 * const resize: ResizeEvent = { type: "resize", cols: 120, rows: 40 };
 * ```
 */
export interface ResizeEvent {
  type: "resize";
  /** 列数 */
  cols: number;
  /** 行数 */
  rows: number;
}

/**
 * 面向 Widget 层的语义化输入事件联合类型。
 *
 * 可通过 `type` 字段进行判别（discriminated union）。
 *
 * @example
 * ```ts
 * function onInput(evt: InputEvent) {
 *   switch (evt.type) {
 *     case "key":    console.log(evt.key);     break;
 *     case "mouse":  console.log(evt.x, evt.y); break;
 *     case "paste":  console.log(evt.text);    break;
 *     case "focus":  console.log(evt.focused); break;
 *     case "resize": console.log(evt.cols);    break;
 *   }
 * }
 * ```
 */
export type InputEvent = KeyEvent | MouseEvent | PasteEvent | FocusEvent | ResizeEvent;

// ════════════════════════════════════════════════════
//  辅助工具
// ════════════════════════════════════════════════════

/**
 * 所有修饰键均未按下的共享常量。
 *
 * @example
 * ```ts
 * const evt: KeyEvent = { type: "key", key: "a", modifiers: MODIFIERS_NONE };
 * hasModifier(MODIFIERS_NONE); // false
 * ```
 */
export const MODIFIERS_NONE: Readonly<Modifiers> = Object.freeze({
  shift: false,
  alt: false,
  ctrl: false,
  meta: false,
});

/**
 * 判断是否有任意修饰键被按下。
 *
 * @param m - 修饰键状态
 * @returns 如果任一修饰键为 true 则返回 true
 *
 * @example
 * ```ts
 * hasModifier(MODIFIERS_NONE);                                        // false
 * hasModifier({ shift: true, alt: false, ctrl: false, meta: false }); // true
 * hasModifier({ shift: false, alt: false, ctrl: true, meta: false }); // true
 * ```
 */
export function hasModifier(m: Modifiers): boolean {
  return m.shift || m.alt || m.ctrl || m.meta;
}

/**
 * 将 CSI 修饰键参数转换为 Modifiers 对象。
 *
 * CSI 修饰键编码规则：`param = 1 + bitmask`，其中：
 * - Shift = 1
 * - Alt   = 2
 * - Ctrl  = 4
 * - Meta  = 8
 *
 * 例如 param=6 → bitmask=5 → Ctrl(4)+Shift(1)。
 *
 * @param param - CSI 修饰键参数值
 * @returns 解码后的修饰键状态
 *
 * @example
 * ```ts
 * modifierFromCsiParam(1);  // 无修饰键（MODIFIERS_NONE）
 * modifierFromCsiParam(2);  // Shift
 * modifierFromCsiParam(3);  // Alt
 * modifierFromCsiParam(5);  // Ctrl
 * modifierFromCsiParam(6);  // Ctrl+Shift
 * modifierFromCsiParam(9);  // Meta
 * ```
 */
export function modifierFromCsiParam(param: number): Modifiers {
  const bits = param - 1;
  return {
    shift: (bits & 1) !== 0,
    alt: (bits & 2) !== 0,
    ctrl: (bits & 4) !== 0,
    meta: (bits & 8) !== 0,
  };
}
