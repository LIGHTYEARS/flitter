---
plan: 05-04
status: complete
tests_added: 28
tests_total: 28
---

## Summary

实现 EdgeInsets/Padding/SizedBox/Container 基础容器 Widget。

### Files Created
- `packages/tui/src/widgets/edge-insets.ts` — EdgeInsets 不可变值对象
- `packages/tui/src/widgets/padding.ts` — SingleChildRenderObjectElement, RenderPadding, Padding
- `packages/tui/src/widgets/sized-box.ts` — RenderSizedBox, SizedBox
- `packages/tui/src/widgets/container.ts` — Container StatelessWidget
- `packages/tui/src/widgets/container.test.ts` — 28 个测试

### Key Decisions
- EdgeInsets 使用 Object.freeze 保证不可变，5 种工厂方法
- SingleChildRenderObjectElement 独立实现，供 Padding/SizedBox 复用
- Container.build() 按 SizedBox → Padding 顺序包装子 Widget
