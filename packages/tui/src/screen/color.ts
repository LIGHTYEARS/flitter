/**
 * 终端颜色表示。
 *
 * 支持四种颜色模式：
 * - `"default"` — 终端默认颜色
 * - `"named"` — 标准 16 色（0-7 普通色 + 8-15 亮色）
 * - `"index"` — 256 色索引（0-255）
 * - `"rgb"` — 24 位真彩色（r, g, b 各 0-255）
 *
 * 所有实例通过静态工厂方法创建，不可直接 new。
 *
 * @example
 * ```ts
 * const fg = Color.red();
 * const bg = Color.rgb(30, 30, 30);
 * console.log(`\x1b[${fg.toAnsi(true)};${bg.toAnsi(false)}m颜色文本\x1b[0m`);
 * ```
 *
 * @module
 */

/** 颜色模式类型 */
export type ColorKind = "default" | "named" | "index" | "rgb";

/**
 * 终端颜色值对象。
 *
 * 采用不可变设计，所有属性均为只读。
 * 通过静态工厂方法创建不同模式的颜色实例。
 */
export class Color {
  /** 颜色模式 */
  readonly kind: ColorKind;
  /** 命名色/索引色的索引值（0-255），rgb 模式下为 -1 */
  readonly index: number;
  /** 红色分量（0-255），仅 rgb 模式有效 */
  readonly r: number;
  /** 绿色分量（0-255），仅 rgb 模式有效 */
  readonly g: number;
  /** 蓝色分量（0-255），仅 rgb 模式有效 */
  readonly b: number;

  private constructor(kind: ColorKind, index: number, r: number, g: number, b: number) {
    this.kind = kind;
    this.index = index;
    this.r = r;
    this.g = g;
    this.b = b;
  }

  // ── 默认色 ────────────────────────────────────────

  /**
   * 创建终端默认颜色。
   *
   * @example
   * ```ts
   * const c = Color.default();
   * c.toAnsi(true);  // "39"
   * c.toAnsi(false); // "49"
   * ```
   */
  static default(): Color {
    return new Color("default", -1, 0, 0, 0);
  }

  // ── 标准 8 色（索引 0-7）──────────────────────────

  /** 黑色（索引 0） */
  static black(): Color {
    return new Color("named", 0, 0, 0, 0);
  }

  /** 红色（索引 1） */
  static red(): Color {
    return new Color("named", 1, 0, 0, 0);
  }

  /** 绿色（索引 2） */
  static green(): Color {
    return new Color("named", 2, 0, 0, 0);
  }

  /** 黄色（索引 3） */
  static yellow(): Color {
    return new Color("named", 3, 0, 0, 0);
  }

  /** 蓝色（索引 4） */
  static blue(): Color {
    return new Color("named", 4, 0, 0, 0);
  }

  /** 品红色（索引 5） */
  static magenta(): Color {
    return new Color("named", 5, 0, 0, 0);
  }

  /** 青色（索引 6） */
  static cyan(): Color {
    return new Color("named", 6, 0, 0, 0);
  }

  /** 白色（索引 7） */
  static white(): Color {
    return new Color("named", 7, 0, 0, 0);
  }

  // ── 亮色 8 色（索引 8-15）─────────────────────────

  /** 亮黑色（索引 8） */
  static brightBlack(): Color {
    return new Color("named", 8, 0, 0, 0);
  }

  /** 亮红色（索引 9） */
  static brightRed(): Color {
    return new Color("named", 9, 0, 0, 0);
  }

  /** 亮绿色（索引 10） */
  static brightGreen(): Color {
    return new Color("named", 10, 0, 0, 0);
  }

  /** 亮黄色（索引 11） */
  static brightYellow(): Color {
    return new Color("named", 11, 0, 0, 0);
  }

  /** 亮蓝色（索引 12） */
  static brightBlue(): Color {
    return new Color("named", 12, 0, 0, 0);
  }

  /** 亮品红色（索引 13） */
  static brightMagenta(): Color {
    return new Color("named", 13, 0, 0, 0);
  }

  /** 亮青色（索引 14） */
  static brightCyan(): Color {
    return new Color("named", 14, 0, 0, 0);
  }

  /** 亮白色（索引 15） */
  static brightWhite(): Color {
    return new Color("named", 15, 0, 0, 0);
  }

  // ── 256 色索引 ────────────────────────────────────

  /**
   * 创建 256 色索引颜色。
   *
   * @param n - 颜色索引（0-255）
   * @throws RangeError 当 n 不在 0-255 范围内时
   *
   * @example
   * ```ts
   * const c = Color.indexed(128);
   * c.toAnsi(true);  // "38;5;128"
   * c.toAnsi(false); // "48;5;128"
   * ```
   */
  static indexed(n: number): Color {
    if (n < 0 || n > 255 || !Number.isInteger(n)) {
      throw new RangeError(`颜色索引必须为 0-255 的整数，收到: ${n}`);
    }
    return new Color("index", n, 0, 0, 0);
  }

  // ── 24 位真彩色 ───────────────────────────────────

  /**
   * 创建 24 位 RGB 真彩色。
   *
   * @param r - 红色分量（0-255）
   * @param g - 绿色分量（0-255）
   * @param b - 蓝色分量（0-255）
   * @throws RangeError 当任意分量不在 0-255 范围内时
   *
   * @example
   * ```ts
   * const c = Color.rgb(255, 128, 0);
   * c.toAnsi(true);  // "38;2;255;128;0"
   * c.toAnsi(false); // "48;2;255;128;0"
   * ```
   */
  static rgb(r: number, g: number, b: number): Color {
    for (const [name, val] of [
      ["r", r],
      ["g", g],
      ["b", b],
    ] as const) {
      if (val < 0 || val > 255 || !Number.isInteger(val)) {
        throw new RangeError(`RGB 分量 ${name} 必须为 0-255 的整数，收到: ${val}`);
      }
    }
    return new Color("rgb", -1, r, g, b);
  }

  // ── 实例方法 ──────────────────────────────────────

  /**
   * 值相等比较。
   *
   * 两个 Color 相等当且仅当它们的模式和所有分量都相同。
   *
   * @example
   * ```ts
   * Color.red().equals(Color.red());           // true
   * Color.red().equals(Color.rgb(255, 0, 0));  // false（不同模式）
   * ```
   */
  equals(other: Color): boolean {
    if (this.kind !== other.kind) return false;
    switch (this.kind) {
      case "default":
        return true;
      case "named":
      case "index":
        return this.index === other.index;
      case "rgb":
        return this.r === other.r && this.g === other.g && this.b === other.b;
    }
  }

  /**
   * 生成 SGR 参数字符串。
   *
   * 根据颜色模式生成对应的 ANSI SGR 参数：
   * - default: 前景 "39" / 背景 "49"
   * - named 0-7: 前景 "30"-"37" / 背景 "40"-"47"
   * - named 8-15: 前景 "90"-"97" / 背景 "100"-"107"
   * - index: 前景 "38;5;n" / 背景 "48;5;n"
   * - rgb: 前景 "38;2;r;g;b" / 背景 "48;2;r;g;b"
   *
   * @param isForeground - true 生成前景色参数，false 生成背景色参数
   *
   * @example
   * ```ts
   * Color.red().toAnsi(true);       // "31"
   * Color.red().toAnsi(false);      // "41"
   * Color.brightRed().toAnsi(true); // "91"
   * ```
   */
  toAnsi(isForeground: boolean): string {
    switch (this.kind) {
      case "default":
        return isForeground ? "39" : "49";
      case "named":
        if (this.index < 8) {
          return String(isForeground ? 30 + this.index : 40 + this.index);
        }
        // 亮色 8-15
        return String(isForeground ? 90 + (this.index - 8) : 100 + (this.index - 8));
      case "index":
        return isForeground ? `38;5;${this.index}` : `48;5;${this.index}`;
      case "rgb":
        return isForeground
          ? `38;2;${this.r};${this.g};${this.b}`
          : `48;2;${this.r};${this.g};${this.b}`;
    }
  }
}
