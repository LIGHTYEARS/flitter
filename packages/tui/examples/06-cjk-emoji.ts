/**
 * 示例 06: CJK 与 Emoji 字符宽度
 * 展示 textWidth、charWidth、graphemeSegments 等函数的用法
 */
import {
  textWidth,
  charWidth,
  graphemeSegments,
  isCjk,
  codePointWidth,
} from "../src/text/char-width.js";
import { isEmoji, isEmojiPresentation } from "../src/text/emoji.js";

// ── CJK 宽度计算 ─────────────────────────────

console.log(textWidth("hello"));      // 5  — ASCII 每字符 1 列
console.log(textWidth("你好"));        // 4  — 每个汉字 2 列
console.log(textWidth("hello你好"));   // 9  — 混合文本
console.log(textWidth("가나다"));      // 6  — 韩文每字符 2 列
console.log(textWidth("あいう"));      // 6  — 日文平假名每字符 2 列

// ── Emoji 宽度 ────────────────────────────────

console.log(charWidth("😀"));         // 2  — 默认 Emoji 呈现
console.log(charWidth("🇯🇵"));         // 2  — 旗帜序列
console.log(charWidth("👨‍👩‍👧"));         // 2  — ZWJ 家庭序列
console.log(charWidth("👍🏽"));         // 2  — 肤色修饰
console.log(charWidth("☀"));          // 1  — 默认文本呈现（需 VS16 变宽）
console.log(charWidth("☀\uFE0F"));    // 2  — VS16 强制 Emoji 呈现

// ── 字素分割 ──────────────────────────────────

console.log(graphemeSegments("Hello"));    // ["H", "e", "l", "l", "o"]
console.log(graphemeSegments("你好世界")); // ["你", "好", "世", "界"]
console.log(graphemeSegments("👨‍👩‍👧"));      // ["👨‍👩‍👧"] — ZWJ 序列是单个字素
console.log(graphemeSegments("🇯🇵"));      // ["🇯🇵"]  — 旗帜是单个字素

// ── Unicode 检测 ──────────────────────────────

console.log(isCjk(0x4e00));              // true  — '一'
console.log(isCjk(0xac00));              // true  — '가'
console.log(isCjk(0x41));                // false — 'A'

console.log(isEmoji(0x1f600));           // true  — 😀
console.log(isEmojiPresentation(0x1f600)); // true  — 默认 Emoji 呈现
console.log(isEmojiPresentation(0x2600));  // false — ☀ 默认文本呈现
