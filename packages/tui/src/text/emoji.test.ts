import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { isEmoji, isEmojiPresentation } from "./emoji.js";
import { charWidth, textWidth } from "./char-width.js";

describe("isEmoji", () => {
  it("😀 (U+1F600) 属于 Emoji 表情符号范围", () => {
    assert.equal(isEmoji(0x1f600), true);
  });

  it("☀ (U+2600) 属于杂项符号 Emoji 范围", () => {
    assert.equal(isEmoji(0x2600), true);
  });

  it("✂ (U+2702) 属于丁巴特 Emoji 范围", () => {
    assert.equal(isEmoji(0x2702), true);
  });

  it("🚀 (U+1F680) 属于交通与地图符号 Emoji 范围", () => {
    assert.equal(isEmoji(0x1f680), true);
  });

  it("ASCII 字母 'A' (U+0041) 不是 Emoji", () => {
    assert.equal(isEmoji(0x41), false);
  });

  it("CJK 汉字 '中' (U+4E2D) 不是 Emoji", () => {
    assert.equal(isEmoji(0x4e2d), false);
  });

  it("🤖 (U+1F916) 属于补充符号与象形 Emoji 范围", () => {
    assert.equal(isEmoji(0x1f916), true);
  });

  it("⌚ (U+231A) 属于杂项技术符号 Emoji 范围", () => {
    assert.equal(isEmoji(0x231a), true);
  });
});

describe("isEmojiPresentation", () => {
  it("😀 (U+1F600) 默认以 Emoji 呈现", () => {
    assert.equal(isEmojiPresentation(0x1f600), true);
  });

  it("🇦 (U+1F1E6) 区域指示符默认以 Emoji 呈现", () => {
    assert.equal(isEmojiPresentation(0x1f1e6), true);
  });

  it("☀ (U+2600) 默认以文本呈现，不是 Emoji 呈现", () => {
    assert.equal(isEmojiPresentation(0x2600), false);
  });

  it("✂ (U+2702) 默认以文本呈现，不是 Emoji 呈现", () => {
    assert.equal(isEmojiPresentation(0x2702), false);
  });

  it("🚀 (U+1F680) 默认以 Emoji 呈现", () => {
    assert.equal(isEmojiPresentation(0x1f680), true);
  });

  it("🥇 (U+1F947) 补充符号默认以 Emoji 呈现", () => {
    assert.equal(isEmojiPresentation(0x1f947), true);
  });
});

describe("charWidth — Emoji 字素簇", () => {
  it("简单 Emoji '😀' 宽度为 2", () => {
    assert.equal(charWidth("\u{1F600}"), 2);
  });

  it("旗帜序列 '🇯🇵' 宽度为 2", () => {
    assert.equal(charWidth("\u{1F1EF}\u{1F1F5}"), 2);
  });

  it("肤色变体 '👍🏻' 宽度为 2", () => {
    assert.equal(charWidth("\u{1F44D}\u{1F3FB}"), 2);
  });

  it("ZWJ 家庭序列 '👨\u200D👩\u200D👧' 宽度为 2", () => {
    assert.equal(charWidth("\u{1F468}\u200D\u{1F469}\u200D\u{1F467}"), 2);
  });

  it("VS15 文本呈现 '☀' + VS15 宽度为 1", () => {
    assert.equal(charWidth("\u2600\uFE0E"), 1);
  });

  it("VS16 Emoji 呈现 '☀' + VS16 宽度为 2", () => {
    assert.equal(charWidth("\u2600\uFE0F"), 2);
  });

  it("挥手 + 肤色 '👋🏽' 宽度为 2", () => {
    assert.equal(charWidth("\u{1F44B}\u{1F3FD}"), 2);
  });

  it("简单火箭 '🚀' 宽度为 2", () => {
    assert.equal(charWidth("\u{1F680}"), 2);
  });
});

describe("textWidth — Emoji 混合文本", () => {
  it("纯 Emoji '😀🚀' 宽度为 4", () => {
    assert.equal(textWidth("\u{1F600}\u{1F680}"), 4);
  });

  it("Emoji + ASCII 'hi😀' 宽度为 4", () => {
    assert.equal(textWidth("hi\u{1F600}"), 4);
  });

  it("Emoji + CJK '你😀好' 宽度为 6", () => {
    assert.equal(textWidth("\u4F60\u{1F600}\u597D"), 6);
  });

  it("含 ZWJ 序列的文本宽度正确", () => {
    // "A" (1) + ZWJ family (2) + "B" (1) = 4
    const text = "A\u{1F468}\u200D\u{1F469}\u200D\u{1F467}B";
    assert.equal(textWidth(text), 4);
  });

  it("空字符串宽度为 0", () => {
    assert.equal(textWidth(""), 0);
  });
});

describe("回归测试 — 既有行为保持不变", () => {
  it("CJK 汉字 '中' 宽度仍为 2", () => {
    assert.equal(charWidth("\u4E2D"), 2);
  });

  it("ASCII 字母 'A' 宽度仍为 1", () => {
    assert.equal(charWidth("A"), 1);
  });

  it("ZWJ (U+200D) 单独出现宽度仍为 0", () => {
    assert.equal(charWidth("\u200D"), 0);
  });
});
