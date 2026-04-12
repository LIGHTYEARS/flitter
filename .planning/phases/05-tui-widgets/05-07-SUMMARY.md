---
plan: 05-07
status: complete
tests_added: 30
tests_total: 30
---

## Summary

实现 Emoji 检测和宽度处理，扩展 char-width 模块。

### Files Created
- `packages/tui/src/text/emoji.ts` — isEmoji, isEmojiPresentation
- `packages/tui/src/text/emoji.test.ts` — 30 个测试

### Files Modified
- `packages/tui/src/text/char-width.ts` — 集成 Emoji 宽度到 codePointWidth 和 charWidth

### Key Decisions
- isEmojiPresentation 区分默认 Emoji 呈现和默认文本呈现的码点
- charWidth 多码点处理: VS15→1, VS16+emojiBase→2, ZWJ 序列→2, 肤色修饰→2
- hasEmojiBase 保护避免非 Emoji 字素簇被错误加宽
- 33 个 char-width 回归测试全部通过
