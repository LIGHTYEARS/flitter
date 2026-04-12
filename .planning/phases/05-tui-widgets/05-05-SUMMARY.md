---
plan: 05-05
status: complete
tests_added: 23
tests_total: 23
---

## Summary

实现 TextSpan/RenderParagraph/RichText/Text 文本渲染 Widget。

### Files Created
- `packages/tui/src/widgets/text-span.ts` — TextSpan 样式化文本树
- `packages/tui/src/widgets/rich-text.ts` — RenderParagraph + RichText Widget
- `packages/tui/src/widgets/text.ts` — Text 便捷 Widget
- `packages/tui/src/widgets/text.test.ts` — 23 个测试

### Key Decisions
- TextSpan 支持嵌套子节点和样式继承 (merge)
- RenderParagraph 使用 graphemeSegments + charWidth 处理 CJK/Emoji 宽度
- performPaint 使用 Screen.writeChar 支持双宽字符
- Text.build() 返回 RichText({ text: TextSpan({ text, style }) })
