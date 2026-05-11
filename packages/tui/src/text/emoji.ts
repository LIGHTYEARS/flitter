/**
 * Emoji 检测模块
 *
 * 使用 Unicode 属性转义 (property escapes) 检测 Emoji 码点，
 * 区分 Extended_Pictographic 和 Emoji_Presentation。
 *
 * 逆向: chunk-003.js:22512-22570
 *   Dm0(T) — \p{Extended_Pictographic} 检测
 *   wm0(T) — !\p{Emoji_Presentation} (返回 true 表示文本呈现)
 *   Um0(T) — 将码点转为字符串后调用 Dm0
 *
 * @module emoji
 */

// 逆向: Dm0(T) { return /\p{Extended_Pictographic}/u.test(T); }
const EXTENDED_PICTOGRAPHIC_RE = /\p{Extended_Pictographic}/u;

// 逆向: wm0(T) { let R = String.fromCodePoint(T); return !/\p{Emoji_Presentation}/u.test(R); }
const EMOJI_PRESENTATION_RE = /\p{Emoji_Presentation}/u;

/**
 * 判断给定码点是否属于 Extended_Pictographic
 *
 * 逆向: Um0(T) { let R = String.fromCodePoint(T); return Dm0(R); }
 *
 * @param codePoint - Unicode 码点
 * @returns 如果是 Extended_Pictographic 返回 true
 */
export function isEmoji(codePoint: number): boolean {
  return EXTENDED_PICTOGRAPHIC_RE.test(String.fromCodePoint(codePoint));
}

/**
 * 判断给定码点是否默认以 Emoji 呈现方式显示
 *
 * 逆向: wm0(T) 返回 !\p{Emoji_Presentation}，即 true = 文本呈现
 * 此函数取反：true = Emoji 呈现
 *
 * @param codePoint - Unicode 码点
 * @returns 如果码点默认以 Emoji 呈现返回 true
 */
export function isEmojiPresentation(codePoint: number): boolean {
  return EMOJI_PRESENTATION_RE.test(String.fromCodePoint(codePoint));
}
