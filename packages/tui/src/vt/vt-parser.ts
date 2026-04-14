/**
 * VT/ANSI 终端解析器状态机。
 *
 * 将原始字节流解析为结构化的 {@link VtEvent} 事件对象。
 * 支持完整的 VT 状态机，包括 CSI、OSC、DCS、APC、SOS、PM 序列，
 * 以及 UTF-8 多字节和 Unicode 字形簇（grapheme cluster）处理。
 *
 * @example
 * ```ts
 * import { VtParser } from "./vt-parser.js";
 *
 * const parser = new VtParser();
 * parser.onEvent((evt) => {
 *   if (evt.type === "print") console.log(evt.grapheme);
 *   if (evt.type === "csi")   console.log(evt.final, evt.params);
 * });
 *
 * parser.parse(Buffer.from("\x1b[31mHello\x1b[0m"));
 * ```
 *
 * @module
 */

import type {
  CsiParam,
  VtApcEvent,
  VtCsiEvent,
  VtDcsEvent,
  VtEscapeEvent,
  VtEvent,
  VtOscEvent,
  VtPrintEvent,
} from "./types.js";

// ════════════════════════════════════════════════════
//  状态枚举
// ════════════════════════════════════════════════════

/**
 * 解析器内部状态。
 *
 * 对应 VT500 系列终端状态机的标准状态集。
 */
export type VtParserState =
  | "ground"
  | "escape"
  | "escape_intermediate"
  | "csi_entry"
  | "csi_param"
  | "csi_intermediate"
  | "csi_ignore"
  | "osc_string"
  | "dcs_entry"
  | "dcs_param"
  | "dcs_intermediate"
  | "dcs_passthrough"
  | "dcs_ignore"
  | "apc_string"
  | "sos_string"
  | "pm_string";

/** CSI 参数数量上限 */
const MAX_CSI_PARAMS = 16;

/** UTF-8 文本解码器（非严格模式，无效字节替换为 U+FFFD） */
const textDecoder = new TextDecoder("utf-8", { fatal: false });

/** 字形簇分割器 */
const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });

// ════════════════════════════════════════════════════
//  VtParser 类
// ════════════════════════════════════════════════════

/**
 * VT/ANSI 终端解析器。
 *
 * 基于 VT500 状态机，接收原始字节并输出结构化事件。
 * 支持跨 `parse()` 调用的状态持久化，可处理任意位置的
 * 字节流分割。
 *
 * @example
 * ```ts
 * const parser = new VtParser();
 * const events: VtEvent[] = [];
 * parser.onEvent((e) => events.push(e));
 *
 * // 跨调用分割的 CSI 序列
 * parser.parse(Buffer.from("\x1b["));
 * parser.parse(Buffer.from("31m"));
 * // events 包含一个 VtCsiEvent
 * ```
 */
export class VtParser {
  /** 当前状态 */
  private state: VtParserState = "ground";

  /** 事件回调列表 */
  private handlers: Array<(event: VtEvent) => void> = [];

  // ── 打印缓冲区 ────────────────────────────────────

  /** 待解码的 UTF-8 字节缓冲区 */
  private printBuf: number[] = [];

  /** 当前 UTF-8 多字节序列中仍需要的后续字节数 */
  private utf8Remaining: number = 0;

  // ── CSI / DCS 参数收集 ─────────────────────────────

  /** CSI/DCS 参数列表 */
  private params: CsiParam[] = [];

  /** 当前参数正在累积的数值（-1 表示尚未收到数字） */
  private currentParamValue: number = -1;

  /** 当前参数的子参数列表 */
  private currentSubparams: number[] = [];

  /** 是否正在累积子参数 */
  private inSubparam: boolean = false;

  /** 私有标记字符（?、<、=、>） */
  private privateMarker: string = "";

  /** 中间字节收集 */
  private intermediates: string = "";

  // ── OSC / DCS / APC / SOS / PM 数据 ───────────────

  /** 字符串数据缓冲区 */
  private stringData: string = "";

  /** DCS 终止字节 */
  private dcsFinal: string = "";

  // ── ESC 后检查 ST（ESC \）────────────────────────

  /** OSC/DCS/APC/SOS/PM 中收到 ESC，等待判断是否为 ST */
  private escInString: boolean = false;

  // ════════════════════════════════════════════════════
  //  公开 API
  // ════════════════════════════════════════════════════

  /**
   * 注册事件回调。
   *
   * @param handler - 事件处理函数，每产生一个 VtEvent 即调用一次
   */
  onEvent(handler: (event: VtEvent) => void): void {
    this.handlers.push(handler);
  }

  /**
   * 解析一段原始字节数据。
   *
   * 可多次调用，状态在调用之间保持。
   *
   * @param data - 原始字节数据
   */
  parse(data: Buffer | Uint8Array): void {
    for (let i = 0; i < data.length; i++) {
      this.processByte(data[i]);
    }
  }

  /**
   * 重置解析器到初始状态。
   *
   * 清空所有内部缓冲区，刷新待输出的打印事件。
   */
  reset(): void {
    this.flushPrint();
    this.state = "ground";
    this.params = [];
    this.currentParamValue = -1;
    this.currentSubparams = [];
    this.inSubparam = false;
    this.privateMarker = "";
    this.intermediates = "";
    this.stringData = "";
    this.dcsFinal = "";
    this.escInString = false;
    this.utf8Remaining = 0;
  }

  /**
   * 获取当前解析器状态（用于测试）。
   *
   * @returns 当前状态名称
   */
  getState(): VtParserState {
    return this.state;
  }

  // ════════════════════════════════════════════════════
  //  事件发射
  // ════════════════════════════════════════════════════

  /** 触发事件回调 */
  private emit(event: VtEvent): void {
    for (const h of this.handlers) {
      h(event);
    }
  }

  // ════════════════════════════════════════════════════
  //  打印缓冲区管理
  // ════════════════════════════════════════════════════

  /**
   * 将字节加入打印缓冲区。
   *
   * @param byte - 要缓冲的字节值
   */
  private pushPrintByte(byte: number): void {
    this.printBuf.push(byte);
  }

  /**
   * 刷新打印缓冲区，解码 UTF-8 并按字形簇发射 VtPrintEvent。
   */
  private flushPrint(): void {
    if (this.printBuf.length === 0) return;

    const bytes = new Uint8Array(this.printBuf);
    this.printBuf = [];

    const text = textDecoder.decode(bytes);
    if (text.length === 0) return;

    for (const seg of segmenter.segment(text)) {
      const evt: VtPrintEvent = { type: "print", grapheme: seg.segment };
      this.emit(evt);
    }
  }

  // ════════════════════════════════════════════════════
  //  CSI / DCS 参数管理
  // ════════════════════════════════════════════════════

  /** 重置 CSI/DCS 参数收集状态 */
  private resetParams(): void {
    this.params = [];
    this.currentParamValue = -1;
    this.currentSubparams = [];
    this.inSubparam = false;
    this.privateMarker = "";
    this.intermediates = "";
  }

  /** 完成当前参数并推入参数列表 */
  private finishParam(): void {
    if (this.params.length >= MAX_CSI_PARAMS) return;

    const param: CsiParam = { value: this.currentParamValue };
    if (this.currentSubparams.length > 0) {
      param.subparams = [...this.currentSubparams];
    }
    this.params.push(param);
    this.currentParamValue = -1;
    this.currentSubparams = [];
    this.inSubparam = false;
  }

  /** 处理参数分隔符（分号） */
  private paramSeparator(): void {
    this.finishParam();
  }

  /** 处理子参数分隔符（冒号） */
  private subparamSeparator(): void {
    // 将当前值推入子参数列表
    this.currentSubparams.push(this.currentParamValue === -1 ? -1 : this.currentParamValue);
    this.currentParamValue = -1;
    this.inSubparam = true;
  }

  /** 累积参数数字 */
  private paramDigit(digit: number): void {
    if (this.currentParamValue === -1) {
      this.currentParamValue = digit;
    } else {
      this.currentParamValue = this.currentParamValue * 10 + digit;
    }
  }

  // ════════════════════════════════════════════════════
  //  CSI 派发
  // ════════════════════════════════════════════════════

  /** 派发 CSI 事件 */
  private csiDispatch(finalByte: number): void {
    // 完成最后一个参数
    if (
      this.currentParamValue !== -1 ||
      this.currentSubparams.length > 0 ||
      this.params.length > 0
    ) {
      this.finishParam();
    }

    const evt: VtCsiEvent = {
      type: "csi",
      params: this.params,
      intermediates: this.intermediates,
      private_marker: this.privateMarker,
      final: String.fromCharCode(finalByte),
    };
    this.emit(evt);
    this.toGround();
  }

  // ════════════════════════════════════════════════════
  //  ESC 派发
  // ════════════════════════════════════════════════════

  /** 派发 ESC 事件 */
  private escDispatch(finalByte: number): void {
    const evt: VtEscapeEvent = {
      type: "escape",
      intermediates: this.intermediates,
      final: String.fromCharCode(finalByte),
    };
    this.emit(evt);
    this.toGround();
  }

  // ════════════════════════════════════════════════════
  //  OSC 派发
  // ════════════════════════════════════════════════════

  /** 派发 OSC 事件 */
  private oscDispatch(): void {
    const evt: VtOscEvent = {
      type: "osc",
      data: this.stringData,
    };
    this.emit(evt);
    this.stringData = "";
    this.toGround();
  }

  // ════════════════════════════════════════════════════
  //  DCS 派发
  // ════════════════════════════════════════════════════

  /** 派发 DCS 事件 */
  private dcsDispatch(): void {
    const evt: VtDcsEvent = {
      type: "dcs",
      params: this.params,
      intermediates: this.intermediates,
      private_marker: this.privateMarker,
      final: this.dcsFinal,
      data: this.stringData,
    };
    this.emit(evt);
    this.stringData = "";
    this.dcsFinal = "";
    this.toGround();
  }

  // ════════════════════════════════════════════════════
  //  APC 派发
  // ════════════════════════════════════════════════════

  /** 派发 APC 事件 */
  private apcDispatch(): void {
    const evt: VtApcEvent = {
      type: "apc",
      data: this.stringData,
    };
    this.emit(evt);
    this.stringData = "";
    this.toGround();
  }

  // ════════════════════════════════════════════════════
  //  状态转换
  // ════════════════════════════════════════════════════

  /** 回到 ground 状态 */
  private toGround(): void {
    this.state = "ground";
    this.resetParams();
    this.escInString = false;
  }

  /** 进入 escape 状态 */
  private enterEscape(): void {
    this.utf8Remaining = 0;
    this.flushPrint();
    this.state = "escape";
    this.resetParams();
  }

  /** 进入 CSI entry 状态 */
  private enterCsiEntry(): void {
    this.utf8Remaining = 0;
    this.flushPrint();
    this.state = "csi_entry";
    this.resetParams();
  }

  /** 进入 OSC string 状态 */
  private enterOscString(): void {
    this.utf8Remaining = 0;
    this.flushPrint();
    this.state = "osc_string";
    this.stringData = "";
    this.escInString = false;
  }

  /** 进入 DCS entry 状态 */
  private enterDcsEntry(): void {
    this.utf8Remaining = 0;
    this.flushPrint();
    this.state = "dcs_entry";
    this.resetParams();
    this.stringData = "";
    this.dcsFinal = "";
    this.escInString = false;
  }

  /** 进入 APC string 状态 */
  private enterApcString(): void {
    this.utf8Remaining = 0;
    this.flushPrint();
    this.state = "apc_string";
    this.stringData = "";
    this.escInString = false;
  }

  /** 进入 SOS string 状态 */
  private enterSosString(): void {
    this.utf8Remaining = 0;
    this.flushPrint();
    this.state = "sos_string";
    this.stringData = "";
    this.escInString = false;
  }

  /** 进入 PM string 状态 */
  private enterPmString(): void {
    this.utf8Remaining = 0;
    this.flushPrint();
    this.state = "pm_string";
    this.stringData = "";
    this.escInString = false;
  }

  // ════════════════════════════════════════════════════
  //  主字节处理
  // ════════════════════════════════════════════════════

  /**
   * 处理单个字节。
   *
   * @param byte - 输入字节（0x00–0xFF）
   */
  private processByte(byte: number): void {
    // 在字符串状态中，先处理 ESC 前缀（可能是 ST = ESC \）
    if (this.escInString) {
      this.escInString = false;
      if (byte === 0x5c) {
        // ESC \ = ST（String Terminator），派发当前字符串序列
        switch (this.state) {
          case "osc_string":
            this.oscDispatch();
            return;
          case "dcs_passthrough":
            this.dcsDispatch();
            return;
          case "apc_string":
            this.apcDispatch();
            return;
          case "sos_string":
          case "pm_string":
            // SOS/PM 序列不产生事件，直接回到 ground
            this.stringData = "";
            this.toGround();
            return;
          default:
            break;
        }
      }
      // ESC 后不是 \，说明 ESC 开启了一个新的转义序列
      // 切到 escape 状态重新处理当前字节
      this.stringData = "";
      this.enterEscape();
      this.processByte(byte);
      return;
    }

    switch (this.state) {
      case "ground":
        this.processGround(byte);
        break;
      case "escape":
        this.processEscape(byte);
        break;
      case "escape_intermediate":
        this.processEscapeIntermediate(byte);
        break;
      case "csi_entry":
        this.processCsiEntry(byte);
        break;
      case "csi_param":
        this.processCsiParam(byte);
        break;
      case "csi_intermediate":
        this.processCsiIntermediate(byte);
        break;
      case "csi_ignore":
        this.processCsiIgnore(byte);
        break;
      case "osc_string":
        this.processOscString(byte);
        break;
      case "dcs_entry":
        this.processDcsEntry(byte);
        break;
      case "dcs_param":
        this.processDcsParam(byte);
        break;
      case "dcs_intermediate":
        this.processDcsIntermediate(byte);
        break;
      case "dcs_passthrough":
        this.processDcsPassthrough(byte);
        break;
      case "dcs_ignore":
        this.processDcsIgnore(byte);
        break;
      case "apc_string":
        this.processStringAccumulator(byte);
        break;
      case "sos_string":
        this.processStringAccumulator(byte);
        break;
      case "pm_string":
        this.processStringAccumulator(byte);
        break;
    }
  }

  // ════════════════════════════════════════════════════
  //  各状态处理逻辑
  // ════════════════════════════════════════════════════

  /** Ground 状态处理 */
  private processGround(byte: number): void {
    // UTF-8 多字节序列中，后续字节优先作为 continuation 处理
    if (this.utf8Remaining > 0) {
      if (byte >= 0x80 && byte <= 0xbf) {
        // 有效 UTF-8 continuation byte
        this.pushPrintByte(byte);
        this.utf8Remaining--;
        return;
      }
      // 非 continuation byte → UTF-8 序列中断，让 TextDecoder 处理（产生 U+FFFD）
      this.utf8Remaining = 0;
      // 继续处理当前字节（fall through 到下面的逻辑）
    }

    if (byte === 0x1b) {
      // ESC → 进入 escape 状态
      this.enterEscape();
    } else if (byte >= 0x20 && byte <= 0x7e) {
      // 可打印 ASCII
      this.pushPrintByte(byte);
    } else if (byte >= 0xc0 && byte <= 0xdf) {
      // UTF-8 两字节序列前导
      this.pushPrintByte(byte);
      this.utf8Remaining = 1;
    } else if (byte >= 0xe0 && byte <= 0xef) {
      // UTF-8 三字节序列前导
      this.pushPrintByte(byte);
      this.utf8Remaining = 2;
    } else if (byte >= 0xf0 && byte <= 0xf7) {
      // UTF-8 四字节序列前导
      this.pushPrintByte(byte);
      this.utf8Remaining = 3;
    } else if (byte === 0x9b) {
      // 8 位 CSI（C1）—— 仅在非 UTF-8 序列中到达此处
      this.flushPrint();
      this.enterCsiEntry();
    } else if (byte === 0x9d) {
      // 8 位 OSC（C1）
      this.flushPrint();
      this.enterOscString();
    } else if (byte === 0x90) {
      // 8 位 DCS（C1）
      this.flushPrint();
      this.enterDcsEntry();
    } else if (byte === 0x9f) {
      // 8 位 APC（C1）
      this.flushPrint();
      this.enterApcString();
    } else if (byte === 0x9c) {
      // 8 位 ST — 在 ground 状态无意义，忽略
    } else if (byte >= 0x80) {
      // 其他高字节（孤立 continuation 0x80-0xBF，或非法 0xF8-0xFF）→ 缓冲给 TextDecoder 处理
      this.pushPrintByte(byte);
    } else {
      // C0 控制字符 (0x00-0x1F 除 ESC)
      // 先刷新打印缓冲区
      this.flushPrint();
      // C0 控制字符不产生事件（跳过）
    }
  }

  /** Escape 状态处理 */
  private processEscape(byte: number): void {
    if (byte === 0x5b) {
      // '[' → CSI entry
      this.state = "csi_entry";
      this.resetParams();
    } else if (byte === 0x5d) {
      // ']' → OSC string
      this.state = "osc_string";
      this.stringData = "";
      this.escInString = false;
    } else if (byte === 0x50) {
      // 'P' → DCS entry
      this.state = "dcs_entry";
      this.resetParams();
      this.stringData = "";
      this.dcsFinal = "";
      this.escInString = false;
    } else if (byte === 0x5f) {
      // '_' → APC string
      this.state = "apc_string";
      this.stringData = "";
      this.escInString = false;
    } else if (byte === 0x58) {
      // 'X' → SOS string
      this.state = "sos_string";
      this.stringData = "";
      this.escInString = false;
    } else if (byte === 0x5e) {
      // '^' → PM string
      this.state = "pm_string";
      this.stringData = "";
      this.escInString = false;
    } else if (byte >= 0x20 && byte <= 0x2f) {
      // 中间字节 → escape_intermediate
      this.intermediates += String.fromCharCode(byte);
      this.state = "escape_intermediate";
    } else if (byte >= 0x30 && byte <= 0x7e) {
      // 终止字节 → 派发 ESC 事件
      this.escDispatch(byte);
    } else if (byte === 0x1b) {
      // ESC ESC → 忽略第一个，重新开始
      this.enterEscape();
    } else {
      // 其他字节（C0 控制等）→ 忽略，回到 ground
      this.toGround();
    }
  }

  /** Escape intermediate 状态处理 */
  private processEscapeIntermediate(byte: number): void {
    if (byte >= 0x20 && byte <= 0x2f) {
      // 更多中间字节
      this.intermediates += String.fromCharCode(byte);
    } else if (byte >= 0x30 && byte <= 0x7e) {
      // 终止字节 → 派发 ESC 事件
      this.escDispatch(byte);
    } else if (byte === 0x1b) {
      // ESC 中断
      this.enterEscape();
    } else {
      // 无效字节 → 回到 ground
      this.toGround();
    }
  }

  /** CSI entry 状态处理 */
  private processCsiEntry(byte: number): void {
    if (byte >= 0x30 && byte <= 0x39) {
      // 数字 → csi_param
      this.paramDigit(byte - 0x30);
      this.state = "csi_param";
    } else if (byte === 0x3b) {
      // ';' → csi_param（空参数）
      this.paramSeparator();
      this.state = "csi_param";
    } else if (byte >= 0x3c && byte <= 0x3f) {
      // '<', '=', '>', '?' → 私有标记
      this.privateMarker = String.fromCharCode(byte);
      this.state = "csi_param";
    } else if (byte >= 0x20 && byte <= 0x2f) {
      // 中间字节
      this.intermediates += String.fromCharCode(byte);
      this.state = "csi_intermediate";
    } else if (byte >= 0x40 && byte <= 0x7e) {
      // 终止字节 → 派发
      this.csiDispatch(byte);
    } else if (byte === 0x3a) {
      // ':' in entry → csi_ignore (colon not valid at start in some interpretations)
      // 但在实践中允许进入 param 收集子参数
      this.subparamSeparator();
      this.state = "csi_param";
    } else if (byte === 0x1b) {
      // ESC 中断当前 CSI
      this.enterEscape();
    } else {
      // C0 控制字符等 → 忽略（留在当前状态）
    }
  }

  /** CSI param 状态处理 */
  private processCsiParam(byte: number): void {
    if (byte >= 0x30 && byte <= 0x39) {
      // 数字
      this.paramDigit(byte - 0x30);
    } else if (byte === 0x3b) {
      // ';' → 参数分隔
      this.paramSeparator();
    } else if (byte === 0x3a) {
      // ':' → 子参数分隔
      this.subparamSeparator();
    } else if (byte >= 0x20 && byte <= 0x2f) {
      // 中间字节 → csi_intermediate
      this.intermediates += String.fromCharCode(byte);
      this.state = "csi_intermediate";
    } else if (byte >= 0x40 && byte <= 0x7e) {
      // 终止字节 → 派发
      this.csiDispatch(byte);
    } else if (byte >= 0x3c && byte <= 0x3f) {
      // 私有标记在 param 位置 → csi_ignore
      this.state = "csi_ignore";
    } else if (byte === 0x1b) {
      // ESC 中断
      this.enterEscape();
    } else {
      // C0 控制字符 → 忽略
    }
  }

  /** CSI intermediate 状态处理 */
  private processCsiIntermediate(byte: number): void {
    if (byte >= 0x20 && byte <= 0x2f) {
      // 更多中间字节
      this.intermediates += String.fromCharCode(byte);
    } else if (byte >= 0x40 && byte <= 0x7e) {
      // 终止字节 → 派发
      this.csiDispatch(byte);
    } else if (byte === 0x1b) {
      // ESC 中断
      this.enterEscape();
    } else if (byte >= 0x30 && byte <= 0x3f) {
      // 参数字节在 intermediate 之后 → csi_ignore
      this.state = "csi_ignore";
    } else {
      // 其他 → csi_ignore
      this.state = "csi_ignore";
    }
  }

  /** CSI ignore 状态处理 */
  private processCsiIgnore(byte: number): void {
    if (byte >= 0x40 && byte <= 0x7e) {
      // 终止字节 → 丢弃序列，回到 ground
      this.toGround();
    } else if (byte === 0x1b) {
      // ESC 中断
      this.enterEscape();
    }
    // 其他字节 → 留在 csi_ignore
  }

  /** OSC string 状态处理 */
  private processOscString(byte: number): void {
    if (byte === 0x07) {
      // BEL → OSC 终止
      this.oscDispatch();
    } else if (byte === 0x9c) {
      // 8 位 ST
      this.oscDispatch();
    } else if (byte === 0x1b) {
      // ESC → 可能是 ST（ESC \）
      this.escInString = true;
    } else if ((byte >= 0x20 && byte <= 0x7e) || byte >= 0x80) {
      // 可打印 ASCII 或高字节 → 累积
      this.stringData += String.fromCharCode(byte);
    } else if (byte >= 0x08 && byte <= 0x0d) {
      // 某些 C0 控制字符在 OSC 中也可以累积（兼容性）
      this.stringData += String.fromCharCode(byte);
    }
    // 其他 C0 控制字符 → 忽略
  }

  /** DCS entry 状态处理 */
  private processDcsEntry(byte: number): void {
    if (byte >= 0x30 && byte <= 0x39) {
      // 数字 → dcs_param
      this.paramDigit(byte - 0x30);
      this.state = "dcs_param";
    } else if (byte === 0x3b) {
      // ';' → dcs_param
      this.paramSeparator();
      this.state = "dcs_param";
    } else if (byte >= 0x3c && byte <= 0x3f) {
      // 私有标记
      this.privateMarker = String.fromCharCode(byte);
      this.state = "dcs_param";
    } else if (byte >= 0x20 && byte <= 0x2f) {
      // 中间字节
      this.intermediates += String.fromCharCode(byte);
      this.state = "dcs_intermediate";
    } else if (byte >= 0x40 && byte <= 0x7e) {
      // 终止字节 → dcs_passthrough
      this.dcsFinal = String.fromCharCode(byte);
      // 完成参数收集
      if (
        this.currentParamValue !== -1 ||
        this.currentSubparams.length > 0 ||
        this.params.length > 0
      ) {
        this.finishParam();
      }
      this.state = "dcs_passthrough";
    } else if (byte === 0x3a) {
      // ':' → 子参数
      this.subparamSeparator();
      this.state = "dcs_param";
    } else if (byte === 0x1b) {
      this.enterEscape();
    } else {
      // C0 → 忽略
    }
  }

  /** DCS param 状态处理 */
  private processDcsParam(byte: number): void {
    if (byte >= 0x30 && byte <= 0x39) {
      this.paramDigit(byte - 0x30);
    } else if (byte === 0x3b) {
      this.paramSeparator();
    } else if (byte === 0x3a) {
      this.subparamSeparator();
    } else if (byte >= 0x20 && byte <= 0x2f) {
      this.intermediates += String.fromCharCode(byte);
      this.state = "dcs_intermediate";
    } else if (byte >= 0x40 && byte <= 0x7e) {
      // 终止字节 → dcs_passthrough
      this.dcsFinal = String.fromCharCode(byte);
      if (
        this.currentParamValue !== -1 ||
        this.currentSubparams.length > 0 ||
        this.params.length > 0
      ) {
        this.finishParam();
      }
      this.state = "dcs_passthrough";
    } else if (byte >= 0x3c && byte <= 0x3f) {
      // 无效 → dcs_ignore
      this.state = "dcs_ignore";
    } else if (byte === 0x1b) {
      this.enterEscape();
    }
  }

  /** DCS intermediate 状态处理 */
  private processDcsIntermediate(byte: number): void {
    if (byte >= 0x20 && byte <= 0x2f) {
      this.intermediates += String.fromCharCode(byte);
    } else if (byte >= 0x40 && byte <= 0x7e) {
      this.dcsFinal = String.fromCharCode(byte);
      if (
        this.currentParamValue !== -1 ||
        this.currentSubparams.length > 0 ||
        this.params.length > 0
      ) {
        this.finishParam();
      }
      this.state = "dcs_passthrough";
    } else if (byte === 0x1b) {
      this.enterEscape();
    } else {
      this.state = "dcs_ignore";
    }
  }

  /** DCS passthrough 状态处理 */
  private processDcsPassthrough(byte: number): void {
    if (byte === 0x9c) {
      // 8 位 ST
      this.dcsDispatch();
    } else if (byte === 0x1b) {
      // ESC → 可能是 ST
      this.escInString = true;
    } else if ((byte >= 0x20 && byte <= 0x7e) || byte >= 0x80) {
      // 累积数据
      this.stringData += String.fromCharCode(byte);
    } else if (byte >= 0x08 && byte <= 0x0d) {
      // 部分 C0 也可以出现在 passthrough 中
      this.stringData += String.fromCharCode(byte);
    }
    // 其他 C0 → 忽略
  }

  /** DCS ignore 状态处理 */
  private processDcsIgnore(byte: number): void {
    if (byte === 0x9c) {
      this.toGround();
    } else if (byte === 0x1b) {
      this.escInString = true;
    }
    // 其他字节 → 留在 dcs_ignore
  }

  /** APC/SOS/PM 通用字符串累积处理 */
  private processStringAccumulator(byte: number): void {
    if (byte === 0x9c) {
      // 8 位 ST
      switch (this.state) {
        case "apc_string":
          this.apcDispatch();
          break;
        case "sos_string":
        case "pm_string":
          this.stringData = "";
          this.toGround();
          break;
      }
    } else if (byte === 0x1b) {
      // ESC → 可能是 ST
      this.escInString = true;
    } else if ((byte >= 0x20 && byte <= 0x7e) || byte >= 0x80) {
      this.stringData += String.fromCharCode(byte);
    } else if (byte >= 0x08 && byte <= 0x0d) {
      this.stringData += String.fromCharCode(byte);
    }
    // 其他 C0 → 忽略
  }
}
