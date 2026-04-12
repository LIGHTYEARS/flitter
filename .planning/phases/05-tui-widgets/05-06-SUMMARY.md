---
plan: 05-06
status: complete
tests_added: 33
tests_total: 33
---

## Summary

实现 CJK 双宽字符和零宽字符宽度计算模块。

### Files Created
- `packages/tui/src/text/char-width.ts` — isCjk, isZeroWidth, codePointWidth, graphemeSegments, charWidth, textWidth
- `packages/tui/src/text/char-width.test.ts` — 33 个测试

### Key Decisions
- 使用 Intl.Segmenter 进行 Unicode 标准字素簇分割
- 模块级 widthCache (Map) 缓存字素宽度
- CJK 覆盖: 统一汉字 + 扩展 A-G + 韩文音节 + 假名 + 全角字符
- 零宽覆盖: ZWJ/ZWNJ/ZWSP + 方向标记 + 变体选择符 + 组合变音符号
