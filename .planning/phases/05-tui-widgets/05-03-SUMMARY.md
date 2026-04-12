---
plan: 05-03
status: complete
tests_added: 20
tests_total: 20
---

## Summary

实现 Stack/Positioned 层叠定位布局 Widget。

### Files Created
- `packages/tui/src/widgets/stack.ts` — StackParentData, RenderStack, Stack, Positioned
- `packages/tui/src/widgets/stack.test.ts` — 20 个测试

### Key Decisions
- StackParentData 继承 ParentData，存储 left/top/right/bottom + isPositioned
- 非定位子节点决定 Stack 尺寸，定位子节点可超出
- Positioned 实现 ParentDataWidgetLike 接口，复用 MultiChildRenderObjectElement
- 9 种 StackAlignment 完整支持
