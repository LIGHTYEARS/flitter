---
plan: 05-02
status: complete
tests_added: 32
tests_total: 32
---

## Summary

实现 Row/Column/Flexible/Expanded Widget 和 MultiChildRenderObjectElement。

### Files Created
- `packages/tui/src/widgets/multi-child-render-object-element.ts` — 多子节点元素管理
- `packages/tui/src/widgets/row.ts` — Row Widget (horizontal RenderFlex)
- `packages/tui/src/widgets/column.ts` — Column Widget (vertical RenderFlex)
- `packages/tui/src/widgets/flexible.ts` — Flexible/Expanded ParentDataWidget
- `packages/tui/src/widgets/row-column.test.ts` — 32 个测试

### Key Decisions
- MultiChildRenderObjectElement 使用简化全量替换协调策略
- ParentDataWidgetLike 接口模式实现 Flexible/Expanded 与 FlexParentData 通信
- Expanded 固定 fit="tight"，继承 Flexible
