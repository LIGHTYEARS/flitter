/**
 * Emoji 检测模块
 *
 * 提供 Unicode Emoji 码点的识别功能，区分默认 Emoji 呈现和默认文本呈现的码点。
 * 用于配合 char-width 模块正确计算 Emoji 字符的显示宽度。
 *
 * @module emoji
 */

/**
 * 判断给定码点是否属于 Emoji 范围
 *
 * 覆盖以下 Unicode 范围：
 * - U+1F600-1F64F — 表情符号（Emoticons）
 * - U+1F300-1F5FF — 杂项符号与象形（Misc Symbols and Pictographs）
 * - U+1F680-1F6FF — 交通与地图符号（Transport and Map Symbols）
 * - U+1F900-1F9FF — 补充符号与象形（Supplemental Symbols and Pictographs）
 * - U+1FA00-1FA6F — 符号与象形扩展 A（Chess Symbols, Extended-A）
 * - U+1FA70-1FAFF — 符号与象形扩展 B（Symbols and Pictographs Extended-B）
 * - U+2702-27B0 — 丁巴特（Dingbats）
 * - U+2600-26FF — 杂项符号（Misc Symbols）
 * - U+2300-23FF — 杂项技术符号（Misc Technical，部分 Emoji）
 * - U+1F100-1F1FF — 封闭字母数字补充（Enclosed Alphanumeric Supplement）
 *
 * 注意：区域指示符 U+1F1E6-1F1FF 已在 isCjk 中处理。
 *
 * @param codePoint - Unicode 码点
 * @returns 如果是 Emoji 码点返回 true
 *
 * @example
 * ```ts
 * isEmoji(0x1F600); // true — 😀
 * isEmoji(0x2600);  // true — ☀
 * isEmoji(0x41);    // false — 'A'
 * ```
 */
export function isEmoji(codePoint: number): boolean {
  return (
    // 表情符号 U+1F600-1F64F
    (codePoint >= 0x1f600 && codePoint <= 0x1f64f) ||
    // 杂项符号与象形 U+1F300-1F5FF
    (codePoint >= 0x1f300 && codePoint <= 0x1f5ff) ||
    // 交通与地图符号 U+1F680-1F6FF
    (codePoint >= 0x1f680 && codePoint <= 0x1f6ff) ||
    // 补充符号与象形 U+1F900-1F9FF
    (codePoint >= 0x1f900 && codePoint <= 0x1f9ff) ||
    // 符号与象形扩展 A U+1FA00-1FA6F
    (codePoint >= 0x1fa00 && codePoint <= 0x1fa6f) ||
    // 符号与象形扩展 B U+1FA70-1FAFF
    (codePoint >= 0x1fa70 && codePoint <= 0x1faff) ||
    // 丁巴特 U+2702-27B0
    (codePoint >= 0x2702 && codePoint <= 0x27b0) ||
    // 杂项符号 U+2600-26FF
    (codePoint >= 0x2600 && codePoint <= 0x26ff) ||
    // 杂项技术符号 U+2300-23FF（部分 Emoji）
    (codePoint >= 0x2300 && codePoint <= 0x23ff) ||
    // 封闭字母数字补充 U+1F100-1F1FF
    (codePoint >= 0x1f100 && codePoint <= 0x1f1ff)
  );
}

/**
 * 判断给定码点是否默认以 Emoji 呈现方式显示
 *
 * 这些码点无需变体选择符 VS16 (U+FE0F) 即默认显示为 Emoji 图形样式。
 *
 * 默认 Emoji 呈现范围：
 * - U+1F600-1F64F — 表情符号
 * - U+1F300-1F5FF — 杂项符号与象形
 * - U+1F680-1F6FF — 交通与地图符号
 * - U+1F900-1F9FF — 补充符号与象形
 * - U+1FA00-1FA6F — 符号与象形扩展 A
 * - U+1FA70-1FAFF — 符号与象形扩展 B
 * - U+1F1E6-1F1FF — 区域指示符
 *
 * 以下范围虽属于 Emoji 但默认以文本呈现（需 VS16 才显示为 Emoji）：
 * - U+2600-26FF 大部分（如 ☀、☁）
 * - U+2702-27B0 大部分（如 ✂、✈）
 * - U+2300-23FF 范围
 *
 * @param codePoint - Unicode 码点
 * @returns 如果码点默认以 Emoji 呈现返回 true
 *
 * @example
 * ```ts
 * isEmojiPresentation(0x1F600); // true — 😀 默认 Emoji 呈现
 * isEmojiPresentation(0x1F1E6); // true — 🇦 区域指示符
 * isEmojiPresentation(0x2600);  // false — ☀ 默认文本呈现
 * ```
 */
export function isEmojiPresentation(codePoint: number): boolean {
  return (
    // 表情符号 U+1F600-1F64F
    (codePoint >= 0x1f600 && codePoint <= 0x1f64f) ||
    // 杂项符号与象形 U+1F300-1F5FF
    (codePoint >= 0x1f300 && codePoint <= 0x1f5ff) ||
    // 交通与地图符号 U+1F680-1F6FF
    (codePoint >= 0x1f680 && codePoint <= 0x1f6ff) ||
    // 补充符号与象形 U+1F900-1F9FF
    (codePoint >= 0x1f900 && codePoint <= 0x1f9ff) ||
    // 符号与象形扩展 A U+1FA00-1FA6F
    (codePoint >= 0x1fa00 && codePoint <= 0x1fa6f) ||
    // 符号与象形扩展 B U+1FA70-1FAFF
    (codePoint >= 0x1fa70 && codePoint <= 0x1faff) ||
    // 区域指示符 U+1F1E6-1F1FF
    (codePoint >= 0x1f1e6 && codePoint <= 0x1f1ff)
  );
}
