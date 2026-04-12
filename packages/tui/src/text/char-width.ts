/**
 * CJK 双宽字符处理模块
 *
 * 提供 Unicode 字符宽度计算功能，支持 CJK 统一汉字、韩文音节、
 * 日文假名、全角字符等双宽字符的正确宽度判定，以及零宽字符的识别。
 *
 * @module char-width
 */

/**
 * 判断给定码点是否为 CJK 双宽字符
 *
 * 覆盖以下 Unicode 范围：
 * - U+4E00-9FFF — CJK 统一汉字
 * - U+3400-4DBF — CJK 扩展 A
 * - U+20000-2A6DF — CJK 扩展 B
 * - U+2A700-2B73F — CJK 扩展 C
 * - U+2B740-2B81F — CJK 扩展 D
 * - U+2B820-2CEAF — CJK 扩展 E
 * - U+2CEB0-2EBEF — CJK 扩展 F
 * - U+30000-3134F — CJK 扩展 G
 * - U+AC00-D7AF — 韩文音节
 * - U+3040-309F — 平假名
 * - U+30A0-30FF — 片假名
 * - U+31F0-31FF — 片假名音标扩展
 * - U+FF01-FF60 — 全角 ASCII 变体
 * - U+FFE0-FFE6 — 全角货币符号
 * - U+3000-303F — CJK 符号和标点
 * - U+FE30-FE4F — CJK 兼容形式
 * - U+FE50-FE6F — 小写变体
 * - U+1F1E6-1F1FF — 区域指示符
 * - U+2329-232A — 尖括号
 *
 * @param codePoint - Unicode 码点
 * @returns 如果是 CJK 双宽字符返回 true
 *
 * @example
 * ```ts
 * isCjk(0x4E00); // true — '一'
 * isCjk(0x41);   // false — 'A'
 * isCjk(0xAC00); // true — '가'
 * ```
 */
export function isCjk(codePoint: number): boolean {
  return (
    // CJK 统一汉字
    (codePoint >= 0x4e00 && codePoint <= 0x9fff) ||
    // CJK 扩展 A
    (codePoint >= 0x3400 && codePoint <= 0x4dbf) ||
    // CJK 扩展 B
    (codePoint >= 0x20000 && codePoint <= 0x2a6df) ||
    // CJK 扩展 C
    (codePoint >= 0x2a700 && codePoint <= 0x2b73f) ||
    // CJK 扩展 D
    (codePoint >= 0x2b740 && codePoint <= 0x2b81f) ||
    // CJK 扩展 E
    (codePoint >= 0x2b820 && codePoint <= 0x2ceaf) ||
    // CJK 扩展 F
    (codePoint >= 0x2ceb0 && codePoint <= 0x2ebef) ||
    // CJK 扩展 G
    (codePoint >= 0x30000 && codePoint <= 0x3134f) ||
    // 韩文音节
    (codePoint >= 0xac00 && codePoint <= 0xd7af) ||
    // 平假名
    (codePoint >= 0x3040 && codePoint <= 0x309f) ||
    // 片假名
    (codePoint >= 0x30a0 && codePoint <= 0x30ff) ||
    // 片假名音标扩展
    (codePoint >= 0x31f0 && codePoint <= 0x31ff) ||
    // 全角 ASCII 变体
    (codePoint >= 0xff01 && codePoint <= 0xff60) ||
    // 全角货币符号
    (codePoint >= 0xffe0 && codePoint <= 0xffe6) ||
    // CJK 符号和标点
    (codePoint >= 0x3000 && codePoint <= 0x303f) ||
    // CJK 兼容形式
    (codePoint >= 0xfe30 && codePoint <= 0xfe4f) ||
    // 小写变体
    (codePoint >= 0xfe50 && codePoint <= 0xfe6f) ||
    // 区域指示符
    (codePoint >= 0x1f1e6 && codePoint <= 0x1f1ff) ||
    // 尖括号
    (codePoint >= 0x2329 && codePoint <= 0x232a)
  );
}

/**
 * 判断给定码点是否为零宽字符
 *
 * 覆盖以下 Unicode 范围：
 * - U+200B — 零宽空格 (ZWSP)
 * - U+200C — 零宽非连接符 (ZWNJ)
 * - U+200D — 零宽连接符 (ZWJ)
 * - U+200E-200F — 方向标记
 * - U+FEFF — 字节序标记 (BOM)
 * - U+00AD — 软连字符
 * - U+2060-2069 — 格式控制字符
 * - U+FE00-FE0F — 变体选择符
 * - U+0300-036F — 组合变音符号
 * - U+0000-001F — 控制字符（U+0009 制表符除外）
 *
 * @param codePoint - Unicode 码点
 * @returns 如果是零宽字符返回 true
 *
 * @example
 * ```ts
 * isZeroWidth(0x200D); // true — ZWJ
 * isZeroWidth(0x0041); // false — 'A'
 * isZeroWidth(0x0009); // false — Tab 不是零宽字符
 * ```
 */
export function isZeroWidth(codePoint: number): boolean {
  // 制表符 Tab 不是零宽字符
  if (codePoint === 0x0009) return false;

  return (
    // 控制字符 U+0000-001F（Tab 已排除）
    (codePoint >= 0x0000 && codePoint <= 0x001f) ||
    // 软连字符
    codePoint === 0x00ad ||
    // 零宽空格、零宽非连接符、零宽连接符、方向标记
    (codePoint >= 0x200b && codePoint <= 0x200f) ||
    // 格式控制字符
    (codePoint >= 0x2060 && codePoint <= 0x2069) ||
    // 组合变音符号
    (codePoint >= 0x0300 && codePoint <= 0x036f) ||
    // 变体选择符
    (codePoint >= 0xfe00 && codePoint <= 0xfe0f) ||
    // 字节序标记
    codePoint === 0xfeff
  );
}

/**
 * 计算单个 Unicode 码点的显示宽度
 *
 * - 零宽字符 -> 0
 * - CJK 双宽字符 -> 2
 * - 其他字符 -> 1
 *
 * @param codePoint - Unicode 码点
 * @returns 显示宽度（0、1 或 2）
 *
 * @example
 * ```ts
 * codePointWidth(0x41);   // 1 — 'A'
 * codePointWidth(0x4E2D); // 2 — '中'
 * codePointWidth(0x200D); // 0 — ZWJ
 * ```
 */
export function codePointWidth(codePoint: number): number {
  if (isZeroWidth(codePoint)) return 0;
  if (isCjk(codePoint)) return 2;
  return 1;
}

/** 字素分割器（模块级单例） */
const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });

/**
 * 将文本按字素簇（grapheme cluster）分割
 *
 * 使用 Intl.Segmenter 进行 Unicode 标准的字素簇分割，
 * 正确处理组合字符、Emoji 序列等复杂情况。
 *
 * @param text - 待分割的文本
 * @returns 字素簇数组
 *
 * @example
 * ```ts
 * graphemeSegments("abc");  // ["a", "b", "c"]
 * graphemeSegments("你好"); // ["你", "好"]
 * graphemeSegments("");     // []
 * ```
 */
export function graphemeSegments(text: string): string[] {
  return Array.from(segmenter.segment(text), (s) => s.segment);
}

/** 字素宽度缓存（模块级） */
const widthCache = new Map<string, number>();

/**
 * 计算单个字素簇的显示宽度（带缓存）
 *
 * 对于单码点字素簇直接调用 codePointWidth；
 * 对于多码点字素簇（如 Emoji ZWJ 序列），取所有非零宽码点宽度的最大值，
 * 若存在非零宽码点则最小返回 1。
 *
 * @param grapheme - 单个字素簇字符串
 * @returns 显示宽度
 *
 * @example
 * ```ts
 * charWidth("A");  // 1
 * charWidth("中"); // 2
 * charWidth("测"); // 2（会被缓存）
 * ```
 */
export function charWidth(grapheme: string): number {
  const cached = widthCache.get(grapheme);
  if (cached !== undefined) return cached;

  let width: number;

  // 单码点快捷路径
  const firstCodePoint = grapheme.codePointAt(0)!;
  // 检查是否为单码点：如果 BMP 字符则长度为 1，如果辅助平面则长度为 2（代理对）
  const firstLen = firstCodePoint > 0xffff ? 2 : 1;
  if (grapheme.length === firstLen) {
    width = codePointWidth(firstCodePoint);
  } else {
    // 多码点字素簇
    let maxWidth = 0;
    let hasNonZero = false;
    for (const char of grapheme) {
      const cp = char.codePointAt(0)!;
      const w = codePointWidth(cp);
      if (w > 0) {
        hasNonZero = true;
        if (w > maxWidth) maxWidth = w;
      }
    }
    width = hasNonZero ? Math.max(maxWidth, 1) : 0;
  }

  widthCache.set(grapheme, width);
  return width;
}

/**
 * 计算文本的总显示宽度
 *
 * 将文本按字素簇分割后，累加每个字素簇的显示宽度。
 * CJK 字符占 2 列，ASCII 字符占 1 列，零宽字符占 0 列。
 *
 * @param text - 待计算的文本
 * @returns 总显示宽度（列数）
 *
 * @example
 * ```ts
 * textWidth("hello");     // 5
 * textWidth("你好");       // 4
 * textWidth("hello你好");  // 9
 * textWidth("");           // 0
 * ```
 */
export function textWidth(text: string): number {
  if (text.length === 0) return 0;

  const segments = graphemeSegments(text);
  let total = 0;
  for (const seg of segments) {
    total += charWidth(seg);
  }
  return total;
}
