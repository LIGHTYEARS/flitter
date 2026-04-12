import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  isCjk,
  isZeroWidth,
  codePointWidth,
  graphemeSegments,
  charWidth,
  textWidth,
} from "./char-width.js";

describe("isCjk", () => {
  it("ASCII 字母不是 CJK 字符", () => {
    assert.equal(isCjk(0x41), false); // 'A'
  });

  it("CJK 统一汉字 U+4E00 '一' 是 CJK 字符", () => {
    assert.equal(isCjk(0x4e00), true);
  });

  it("CJK 统一汉字 U+9FFF 是 CJK 字符", () => {
    assert.equal(isCjk(0x9fff), true);
  });

  it("韩文音节 U+AC00 '가' 是 CJK 字符", () => {
    assert.equal(isCjk(0xac00), true);
  });

  it("平假名 U+3042 'あ' 是 CJK 字符", () => {
    assert.equal(isCjk(0x3042), true);
  });

  it("片假名 U+30A2 'ア' 是 CJK 字符", () => {
    assert.equal(isCjk(0x30a2), true);
  });

  it("全角 ASCII U+FF01 '！' 是 CJK 字符", () => {
    assert.equal(isCjk(0xff01), true);
  });

  it("CJK 标点符号 U+3001 '、' 是 CJK 字符", () => {
    assert.equal(isCjk(0x3001), true);
  });

  it("CJK 扩展 B U+20000 是 CJK 字符", () => {
    assert.equal(isCjk(0x20000), true);
  });

  it("区域指示符 U+1F1E6 是 CJK 字符", () => {
    assert.equal(isCjk(0x1f1e6), true);
  });
});

describe("isZeroWidth", () => {
  it("零宽连接符 ZWJ U+200D 是零宽字符", () => {
    assert.equal(isZeroWidth(0x200d), true);
  });

  it("零宽非连接符 ZWNJ U+200C 是零宽字符", () => {
    assert.equal(isZeroWidth(0x200c), true);
  });

  it("字节序标记 BOM U+FEFF 是零宽字符", () => {
    assert.equal(isZeroWidth(0xfeff), true);
  });

  it("零宽空格 ZWSP U+200B 是零宽字符", () => {
    assert.equal(isZeroWidth(0x200b), true);
  });

  it("变体选择符 U+FE0F 是零宽字符", () => {
    assert.equal(isZeroWidth(0xfe0f), true);
  });

  it("组合变音符号 U+0300 是零宽字符", () => {
    assert.equal(isZeroWidth(0x0300), true);
  });

  it("普通 ASCII 字符不是零宽字符", () => {
    assert.equal(isZeroWidth(0x41), false); // 'A'
  });

  it("制表符 Tab U+0009 不是零宽字符", () => {
    assert.equal(isZeroWidth(0x0009), false);
  });
});

describe("codePointWidth", () => {
  it("ASCII 字符 'A' 宽度为 1", () => {
    assert.equal(codePointWidth(0x41), 1);
  });

  it("CJK 汉字 '中' (U+4E2D) 宽度为 2", () => {
    assert.equal(codePointWidth(0x4e2d), 2);
  });

  it("零宽连接符 ZWJ 宽度为 0", () => {
    assert.equal(codePointWidth(0x200d), 0);
  });

  it("全角字符 'Ａ' (U+FF21) 宽度为 2", () => {
    assert.equal(codePointWidth(0xff21), 2);
  });
});

describe("graphemeSegments", () => {
  it("ASCII 文本正确分割为字素簇", () => {
    assert.deepEqual(graphemeSegments("abc"), ["a", "b", "c"]);
  });

  it("CJK 文本每个字符是一个字素簇", () => {
    assert.deepEqual(graphemeSegments("你好"), ["你", "好"]);
  });

  it("空字符串返回空数组", () => {
    assert.deepEqual(graphemeSegments(""), []);
  });
});

describe("charWidth", () => {
  it("ASCII 字符宽度为 1", () => {
    assert.equal(charWidth("A"), 1);
  });

  it("CJK 字符宽度为 2", () => {
    assert.equal(charWidth("中"), 2);
  });

  it("缓存：多次调用返回相同结果", () => {
    const first = charWidth("测");
    const second = charWidth("测");
    assert.equal(first, second);
    assert.equal(first, 2);
  });
});

describe("textWidth", () => {
  it("纯 ASCII 文本 'hello' 宽度为 5", () => {
    assert.equal(textWidth("hello"), 5);
  });

  it("纯 CJK 文本 '你好' 宽度为 4", () => {
    assert.equal(textWidth("你好"), 4);
  });

  it("混合文本 'hello你好' 宽度为 9", () => {
    assert.equal(textWidth("hello你好"), 9);
  });

  it("空字符串宽度为 0", () => {
    assert.equal(textWidth(""), 0);
  });

  it("包含零宽字符的字符串中零宽字符不计入宽度", () => {
    // "a" + ZWJ (U+200D) + "b" — ZWJ doesn't add width
    const str = "a\u200Db";
    assert.equal(textWidth(str), 2);
  });
});
