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

  /**
   * 生成受 color depth 限制的 SGR 参数字符串。
   *
   * 逆向: amp's color downgrade occurs at the rendering layer, converting
   * RGB colors to 256-index or 16-color depending on terminal capability.
   * See modules/0080_unknown_QXR.js for detection, rendering adapts output.
   *
   * @param isForeground - true for fg, false for bg
   * @param colorDepth - target color depth: "truecolor", "256", or "16"
   * @returns SGR parameter string, downgraded if necessary
   */
  toAnsiAt(isForeground: boolean, colorDepth: "16" | "256" | "truecolor"): string {
    switch (this.kind) {
      case "default":
        return isForeground ? "39" : "49";

      case "named":
        // Named 16-colors always work at any depth
        if (this.index < 8) {
          return String(isForeground ? 30 + this.index : 40 + this.index);
        }
        return String(isForeground ? 90 + (this.index - 8) : 100 + (this.index - 8));

      case "index":
        if (colorDepth === "16") {
          // Downgrade 256-index to nearest 16-color
          const ansi16 = xterm256ToAnsi16(this.index);
          if (ansi16 < 8) {
            return String(isForeground ? 30 + ansi16 : 40 + ansi16);
          }
          return String(isForeground ? 90 + (ansi16 - 8) : 100 + (ansi16 - 8));
        }
        // 256 and truecolor both support 256-index natively
        return isForeground ? `38;5;${this.index}` : `48;5;${this.index}`;

      case "rgb":
        if (colorDepth === "truecolor") {
          return isForeground
            ? `38;2;${this.r};${this.g};${this.b}`
            : `48;2;${this.r};${this.g};${this.b}`;
        }
        if (colorDepth === "256") {
          const idx = rgbToXterm256(this.r, this.g, this.b);
          return isForeground ? `38;5;${idx}` : `48;5;${idx}`;
        }
        // 16-color: convert RGB → 256 → 16
        {
          const idx = rgbToXterm256(this.r, this.g, this.b);
          const ansi16 = xterm256ToAnsi16(idx);
          if (ansi16 < 8) {
            return String(isForeground ? 30 + ansi16 : 40 + ansi16);
          }
          return String(isForeground ? 90 + (ansi16 - 8) : 100 + (ansi16 - 8));
        }
    }
  }
}

// ── Color Conversion Helpers ───────────────────────────

/**
 * The 6x6x6 color cube values used in xterm-256 (indices 16-231).
 * Each axis step: 0, 95, 135, 175, 215, 255.
 */
const CUBE_STEPS = [0, 0x5f, 0x87, 0xaf, 0xd7, 0xff] as const;

/**
 * The 24 grayscale ramp values (indices 232-255).
 * 8, 18, 28, ..., 238.
 */
const GRAY_RAMP = Array.from({ length: 24 }, (_, i) => 8 + 10 * i);

/**
 * Convert an RGB color to the nearest xterm-256 palette index.
 *
 * Algorithm:
 * 1. Find nearest in the 6x6x6 color cube (indices 16-231)
 * 2. Find nearest in the grayscale ramp (indices 232-255)
 * 3. Return whichever has lower Euclidean distance
 *
 * @param r - Red (0-255)
 * @param g - Green (0-255)
 * @param b - Blue (0-255)
 * @returns xterm-256 palette index (0-255)
 */
export function rgbToXterm256(r: number, g: number, b: number): number {
  // Find nearest cube index per channel
  const cr = nearestCubeIndex(r);
  const cg = nearestCubeIndex(g);
  const cb = nearestCubeIndex(b);
  const cubeIdx = 16 + 36 * cr + 6 * cg + cb;
  const cubeR = CUBE_STEPS[cr];
  const cubeG = CUBE_STEPS[cg];
  const cubeB = CUBE_STEPS[cb];
  const cubeDist = colorDistSq(r, g, b, cubeR, cubeG, cubeB);

  // Find nearest grayscale
  const avg = Math.round((r + g + b) / 3);
  let grayIdx = 0;
  let grayDist = Infinity;
  for (let i = 0; i < 24; i++) {
    const gv = GRAY_RAMP[i];
    const d = colorDistSq(r, g, b, gv, gv, gv);
    if (d < grayDist) {
      grayDist = d;
      grayIdx = 232 + i;
    }
  }

  return cubeDist <= grayDist ? cubeIdx : grayIdx;
}

function nearestCubeIndex(value: number): number {
  let best = 0;
  let bestDist = Math.abs(value - CUBE_STEPS[0]);
  for (let i = 1; i < 6; i++) {
    const d = Math.abs(value - CUBE_STEPS[i]);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

function colorDistSq(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  return (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2;
}

/**
 * Standard 16-color ANSI palette RGB values.
 * Index 0-7: normal colors, 8-15: bright colors.
 */
const ANSI_16_PALETTE: readonly [number, number, number][] = [
  [0, 0, 0],       // 0: black
  [170, 0, 0],     // 1: red
  [0, 170, 0],     // 2: green
  [170, 85, 0],    // 3: yellow/brown
  [0, 0, 170],     // 4: blue
  [170, 0, 170],   // 5: magenta
  [0, 170, 170],   // 6: cyan
  [170, 170, 170], // 7: white
  [85, 85, 85],    // 8: bright black (gray)
  [255, 85, 85],   // 9: bright red
  [85, 255, 85],   // 10: bright green
  [255, 255, 85],  // 11: bright yellow
  [85, 85, 255],   // 12: bright blue
  [255, 85, 255],  // 13: bright magenta
  [85, 255, 255],  // 14: bright cyan
  [255, 255, 255], // 15: bright white
];

/**
 * Convert a xterm-256 palette index to the nearest ANSI 16-color index.
 *
 * For indices 0-15, returns the index directly.
 * For indices 16-255, finds the nearest ANSI 16-color by Euclidean distance.
 *
 * @param idx - xterm-256 palette index (0-255)
 * @returns ANSI 16-color index (0-15)
 */
export function xterm256ToAnsi16(idx: number): number {
  if (idx < 16) return idx;

  // Resolve index to RGB
  let r: number, g: number, b: number;
  if (idx < 232) {
    // Color cube
    const ci = idx - 16;
    r = CUBE_STEPS[Math.floor(ci / 36)];
    g = CUBE_STEPS[Math.floor((ci % 36) / 6)];
    b = CUBE_STEPS[ci % 6];
  } else {
    // Grayscale ramp
    const gv = 8 + 10 * (idx - 232);
    r = gv;
    g = gv;
    b = gv;
  }

  // Find nearest ANSI 16-color
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < 16; i++) {
    const [pr, pg, pb] = ANSI_16_PALETTE[i];
    const d = colorDistSq(r, g, b, pr, pg, pb);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}
