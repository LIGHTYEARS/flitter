/**
 * CJK 双宽字符及 Emoji 处理模块
 *
 * 提供 Unicode 字符宽度计算功能，支持 CJK 统一汉字、韩文音节、
 * 日文假名、全角字符等双宽字符的正确宽度判定，Emoji 字符（含 ZWJ
 * 序列、肤色修饰、旗帜序列、变体选择符）的宽度计算，以及零宽字符的识别。
 *
 * @module char-width
 */

import { isEmoji, isEmojiPresentation } from "./emoji.js";

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

// 逆向: chunk-003.js:22520 — Bm0(T) { return /\p{M}/u.test(T); }
const COMBINING_MARK_RE = /\p{M}/u;

/**
 * 判断给定码点是否为零宽字符
 *
 * 逆向: chunk-003.js:22558 — xxT 的零宽判定分支
 * 匹配 amp 的完整零宽检测：
 * - 组合标记 \p{M}
 * - U+200B-200D — ZWJ/ZWNJ/ZWSP
 * - U+200E-200F — 方向标记
 * - U+2060 — Word Joiner
 * - U+FEFF — BOM
 * - U+FE00-FE0F — 变体选择符
 * - U+E0100-E01EF — 补充变体选择符
 * - U+1F3FB-1F3FF — 肤色修饰符
 *
 * @param codePoint - Unicode 码点
 * @returns 如果是零宽字符返回 true
 */
export function isZeroWidth(codePoint: number): boolean {
  if (codePoint === 0x0009) return false;

  // 逆向: xxT 零宽判定 (line 22558):
  //   Bm0(String.fromCodePoint(T)) ||
  //   T >= 8203 && T <= 8205 ||   (0x200B-0x200D)
  //   T === 8206 || T === 8207 ||  (0x200E-0x200F)
  //   T === 8288 ||               (0x2060)
  //   T === 65279 ||              (0xFEFF)
  //   T >= 65024 && T <= 65039 || (0xFE00-0xFE0F)
  //   T >= 917760 && T <= 917999 ||(0xE0100-0xE01EF)
  //   T >= 127995 && T <= 127999  (0x1F3FB-0x1F3FF)
  if (COMBINING_MARK_RE.test(String.fromCodePoint(codePoint))) return true;

  return (
    (codePoint >= 0x200b && codePoint <= 0x200d) ||
    codePoint === 0x200e ||
    codePoint === 0x200f ||
    codePoint === 0x2060 ||
    codePoint === 0xfeff ||
    (codePoint >= 0xfe00 && codePoint <= 0xfe0f) ||
    (codePoint >= 0xe0100 && codePoint <= 0xe01ef) ||
    (codePoint >= 0x1f3fb && codePoint <= 0x1f3ff)
  );
}

/**
 * 计算单个 Unicode 码点的显示宽度
 *
 * 逆向: chunk-003.js:22556 — xxT(T)
 *   if (T === 9) return tabWidth;
 *   if (zeroWidth checks) return 0;
 *   if (Um0(T)) {           // Extended_Pictographic
 *     if (wm0(T)) return 1; // !Emoji_Presentation → text-default
 *     return 2;             // Emoji_Presentation → wide
 *   }
 *   if (Hm0(T)) return 2;  // CJK
 *   return 1;
 *
 * @param codePoint - Unicode 码点
 * @returns 显示宽度（0、1 或 2）
 */
export function codePointWidth(codePoint: number): number {
  if (isZeroWidth(codePoint)) return 0;
  if (isEmoji(codePoint)) {
    if (!isEmojiPresentation(codePoint)) return 1;
    return 2;
  }
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
 * 逆向: chunk-003.js:22522-22554 — Nm0(T, R=true) grapheme width mode
 * 遍历字素簇的码点，找到第一个非零宽码点，获取其 codePointWidth，
 * 然后检查下一个码点是否为 VS-15 (→1) 或 VS-16 (→2) 覆盖。
 *
 * @param grapheme - 单个字素簇字符串
 * @returns 显示宽度
 */
export function charWidth(grapheme: string): number {
  const cached = widthCache.get(grapheme);
  if (cached !== undefined) return cached;

  const chars = Array.from(grapheme);
  let width = 0;

  for (let t = 0; t < chars.length; t++) {
    const cp = chars[t].codePointAt(0);
    if (cp === undefined) continue;
    const w = codePointWidth(cp);
    if (w !== 0) {
      let finalW = w;
      if (t + 1 < chars.length) {
        const next = chars[t + 1]?.codePointAt(0);
        if (next === 0xfe0e) finalW = 1;
        else if (next === 0xfe0f) finalW = 2;
      }
      width = finalW;
      break;
    }
  }

  widthCache.set(grapheme, width);
  return width;
}

/**
 * 计算文本的总显示宽度
 *
 * 将文本按字素簇分割后，累加每个字素簇的显示宽度。
 * CJK 字符占 2 列，Emoji 字符占 2 列，ASCII 字符占 1 列，零宽字符占 0 列。
 *
 * @param text - 待计算的文本
 * @returns 总显示宽度（列数）
 *
 * @example
 * ```ts
 * textWidth("hello");     // 5
 * textWidth("你好");       // 4
 * textWidth("hello你好");  // 9
 * textWidth("😀🚀");      // 4
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
