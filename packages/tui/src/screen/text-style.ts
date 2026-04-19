/**
 * 终端文本样式。
 *
 * 封装前景色、背景色和文本修饰属性（粗体、斜体、下划线、删除线、暗淡），
 * 能够生成完整的 SGR 参数序列，以及与前一状态之间的最小差异序列。
 *
 * @example
 * ```ts
 * const style = new TextStyle({ bold: true, foreground: Color.red() });
 * console.log(`\x1b[${style.toSgr()}m粗体红字\x1b[0m`);
 *
 * const next = style.copyWith({ italic: true });
 * const diff = next.diffSgr(style);
 * console.log(`\x1b[${diff}m追加斜体\x1b[0m`);
 * ```
 *
 * @module
 */

import { Color } from "./color.js";

/**
 * TextStyle 构造选项接口。
 *
 * 所有字段均为可选，未指定的字段使用默认值：
 * - 颜色默认为 `Color.default()`
 * - 布尔属性默认为 `false`
 */
export interface TextStyleOptions {
  /** 前景色 */
  foreground: Color;
  /** 背景色 */
  background: Color;
  /** 粗体 */
  bold: boolean;
  /** 斜体 */
  italic: boolean;
  /** 下划线 */
  underline: boolean;
  /** 删除线 */
  strikethrough: boolean;
  /** 暗淡 */
  dim: boolean;
}

/**
 * 终端文本样式值对象。
 *
 * 不可变设计——所有属性均为只读，修改通过 `copyWith` 或 `merge` 创建新实例。
 */
export class TextStyle {
  /** 前景色 */
  readonly foreground: Color;
  /** 背景色 */
  readonly background: Color;
  /** 粗体 */
  readonly bold: boolean;
  /** 斜体 */
  readonly italic: boolean;
  /** 下划线 */
  readonly underline: boolean;
  /** 删除线 */
  readonly strikethrough: boolean;
  /** 暗淡 */
  readonly dim: boolean;

  /**
   * 共享的默认样式实例。
   *
   * 所有颜色为终端默认，所有修饰属性为 false。
   *
   * @example
   * ```ts
   * const normal = TextStyle.NORMAL;
   * normal.toSgr(); // ""
   * ```
   */
  static readonly NORMAL: TextStyle = new TextStyle();

  /**
   * 创建文本样式实例。
   *
   * @param options - 样式选项，未指定的字段使用默认值
   *
   * @example
   * ```ts
   * // 全部默认
   * const s1 = new TextStyle();
   *
   * // 部分指定
   * const s2 = new TextStyle({ bold: true, foreground: Color.green() });
   * ```
   */
  constructor(options?: Partial<TextStyleOptions>) {
    this.foreground = options?.foreground ?? Color.default();
    this.background = options?.background ?? Color.default();
    this.bold = options?.bold ?? false;
    this.italic = options?.italic ?? false;
    this.underline = options?.underline ?? false;
    this.strikethrough = options?.strikethrough ?? false;
    this.dim = options?.dim ?? false;
  }

  /**
   * 创建部分修改的新样式实例。
   *
   * 原实例不受影响。
   *
   * @param options - 需要覆盖的字段
   * @returns 新 TextStyle 实例
   *
   * @example
   * ```ts
   * const base = new TextStyle({ bold: true });
   * const derived = base.copyWith({ italic: true });
   * // base.italic === false, derived.italic === true, derived.bold === true
   * ```
   */
  copyWith(options: Partial<TextStyleOptions>): TextStyle {
    return new TextStyle({
      foreground: options.foreground ?? this.foreground,
      background: options.background ?? this.background,
      bold: options.bold ?? this.bold,
      italic: options.italic ?? this.italic,
      underline: options.underline ?? this.underline,
      strikethrough: options.strikethrough ?? this.strikethrough,
      dim: options.dim ?? this.dim,
    });
  }

  /**
   * 合并另一个样式的非默认字段到当前样式。
   *
   * `other` 中非默认的字段会覆盖当前样式的对应字段：
   * - 颜色：非 `Color.default()` 的值覆盖
   * - 布尔属性：为 `true` 的值覆盖
   *
   * @param other - 要合并的样式
   * @returns 合并后的新 TextStyle
   *
   * @example
   * ```ts
   * const base = new TextStyle({ bold: true, foreground: Color.red() });
   * const overlay = new TextStyle({ italic: true, foreground: Color.blue() });
   * const merged = base.merge(overlay);
   * // merged: bold=true, italic=true, foreground=blue
   * ```
   */
  merge(other: TextStyle): TextStyle {
    return new TextStyle({
      foreground: other.foreground.kind !== "default" ? other.foreground : this.foreground,
      background: other.background.kind !== "default" ? other.background : this.background,
      bold: other.bold || this.bold,
      italic: other.italic || this.italic,
      underline: other.underline || this.underline,
      strikethrough: other.strikethrough || this.strikethrough,
      dim: other.dim || this.dim,
    });
  }

  /**
   * 值相等比较。
   *
   * @example
   * ```ts
   * const a = new TextStyle({ bold: true });
   * const b = new TextStyle({ bold: true });
   * a.equals(b); // true
   * ```
   */
  equals(other: TextStyle): boolean {
    return (
      this.foreground.equals(other.foreground) &&
      this.background.equals(other.background) &&
      this.bold === other.bold &&
      this.italic === other.italic &&
      this.underline === other.underline &&
      this.strikethrough === other.strikethrough &&
      this.dim === other.dim
    );
  }

  /**
   * 生成完整的 SGR 参数字符串。
   *
   * 按以下顺序拼接非默认属性的 SGR 代码：
   * 1. 文本修饰：bold(1), dim(2), italic(3), underline(4), strikethrough(9)
   * 2. 前景色（跳过 default）
   * 3. 背景色（跳过 default）
   *
   * @returns SGR 参数字符串，如 `"1;3;38;2;255;0;0"`。全默认时返回空字符串。
   *
   * @example
   * ```ts
   * new TextStyle({ bold: true, foreground: Color.red() }).toSgr();
   * // "1;31"
   *
   * TextStyle.NORMAL.toSgr();
   * // ""
   * ```
   */
  toSgr(): string {
    const parts: string[] = [];

    if (this.bold) parts.push("1");
    if (this.dim) parts.push("2");
    if (this.italic) parts.push("3");
    if (this.underline) parts.push("4");
    if (this.strikethrough) parts.push("9");

    if (this.foreground.kind !== "default") {
      parts.push(this.foreground.toAnsi(true));
    }
    if (this.background.kind !== "default") {
      parts.push(this.background.toAnsi(false));
    }

    return parts.join(";");
  }

  /**
   * 生成受 color depth 限制的完整 SGR 参数字符串。
   *
   * 逆向: Rendering adapts color output based on terminal color depth
   * detected via QXR (modules/0080_unknown_QXR.js).
   *
   * @param colorDepth - target color depth
   * @returns SGR parameter string with colors downgraded as needed
   */
  toSgrAt(colorDepth: "16" | "256" | "truecolor"): string {
    const parts: string[] = [];

    if (this.bold) parts.push("1");
    if (this.dim) parts.push("2");
    if (this.italic) parts.push("3");
    if (this.underline) parts.push("4");
    if (this.strikethrough) parts.push("9");

    if (this.foreground.kind !== "default") {
      parts.push(this.foreground.toAnsiAt(true, colorDepth));
    }
    if (this.background.kind !== "default") {
      parts.push(this.background.toAnsiAt(false, colorDepth));
    }

    return parts.join(";");
  }

  /**
   * 生成与前一样式之间的最小差异 SGR 参数字符串。
   *
   * 优化策略：
   * - 完全相同 → 空字符串
   * - 需要关闭多个属性时 → 先重置 "0" 再输出完整 SGR
   * - 其他 → 仅输出变化部分
   *
   * 关闭属性对应的 SGR 代码：
   * - bold off / dim off → "22"
   * - italic off → "23"
   * - underline off → "24"
   * - strikethrough off → "29"
   *
   * @param previous - 前一样式状态
   * @returns 差异 SGR 参数字符串
   *
   * @example
   * ```ts
   * const a = new TextStyle({ bold: true });
   * const b = new TextStyle({ bold: true, italic: true });
   * b.diffSgr(a); // "3"（仅新增斜体）
   *
   * const c = TextStyle.NORMAL;
   * c.diffSgr(b); // "0"（重置）
   * ```
   */
  diffSgr(previous: TextStyle): string {
    if (this.equals(previous)) return "";

    const parts: string[] = [];
    let resetCount = 0;

    // 统计需要关闭的属性数量
    if (previous.bold && !this.bold) resetCount++;
    if (previous.dim && !this.dim) resetCount++;
    if (previous.italic && !this.italic) resetCount++;
    if (previous.underline && !this.underline) resetCount++;
    if (previous.strikethrough && !this.strikethrough) resetCount++;

    // 如果需要关闭 3 个或更多属性，使用完整重置更经济
    if (resetCount >= 3) {
      const sgr = this.toSgr();
      return sgr ? `0;${sgr}` : "0";
    }

    // 逐属性生成差异
    // bold / dim 共享关闭码 22
    if (previous.bold && !this.bold) parts.push("22");
    if (!previous.bold && this.bold) parts.push("1");

    if (previous.dim && !this.dim) parts.push("22");
    if (!previous.dim && this.dim) parts.push("2");

    if (previous.italic && !this.italic) parts.push("23");
    if (!previous.italic && this.italic) parts.push("3");

    if (previous.underline && !this.underline) parts.push("24");
    if (!previous.underline && this.underline) parts.push("4");

    if (previous.strikethrough && !this.strikethrough) parts.push("29");
    if (!previous.strikethrough && this.strikethrough) parts.push("9");

    // 颜色差异
    if (!this.foreground.equals(previous.foreground)) {
      parts.push(this.foreground.toAnsi(true));
    }
    if (!this.background.equals(previous.background)) {
      parts.push(this.background.toAnsi(false));
    }

    return parts.join(";");
  }

  /**
   * 生成受 color depth 限制的差异 SGR 参数字符串。
   *
   * 逆向: Rendering adapts color output based on terminal color depth
   * detected via QXR (modules/0080_unknown_QXR.js).
   *
   * @param previous - previous style state
   * @param colorDepth - target color depth
   * @returns differential SGR parameter string with colors downgraded as needed
   */
  diffSgrAt(previous: TextStyle, colorDepth: "16" | "256" | "truecolor"): string {
    if (this.equals(previous)) return "";

    const parts: string[] = [];
    let resetCount = 0;

    if (previous.bold && !this.bold) resetCount++;
    if (previous.dim && !this.dim) resetCount++;
    if (previous.italic && !this.italic) resetCount++;
    if (previous.underline && !this.underline) resetCount++;
    if (previous.strikethrough && !this.strikethrough) resetCount++;

    if (resetCount >= 3) {
      const sgr = this.toSgrAt(colorDepth);
      return sgr ? `0;${sgr}` : "0";
    }

    if (previous.bold && !this.bold) parts.push("22");
    if (!previous.bold && this.bold) parts.push("1");
    if (previous.dim && !this.dim) parts.push("22");
    if (!previous.dim && this.dim) parts.push("2");
    if (previous.italic && !this.italic) parts.push("23");
    if (!previous.italic && this.italic) parts.push("3");
    if (previous.underline && !this.underline) parts.push("24");
    if (!previous.underline && this.underline) parts.push("4");
    if (previous.strikethrough && !this.strikethrough) parts.push("29");
    if (!previous.strikethrough && this.strikethrough) parts.push("9");

    if (!this.foreground.equals(previous.foreground)) {
      parts.push(this.foreground.toAnsiAt(true, colorDepth));
    }
    if (!this.background.equals(previous.background)) {
      parts.push(this.background.toAnsiAt(false, colorDepth));
    }

    return parts.join(";");
  }
}
