# Fix: ParentDataElement.update() — renderObject 替换断链

## Summary

发送消息后 TUI 无响应（欢迎页不消失、消息不显示、渲染冻结），根因是 `ParentDataElement.update()` 替换 child 时调用了一个**未实现的方法** `_replaceRenderObjectInAncestor()`，导致 TypeError 被 `buildScope()` 静默吞掉，渲染树断链。

## Current State Analysis

### Bug 触发路径

```
用户发送 "hello"
→ appState.startProcessing() → items 从 [] 变成 [UserMessage]
→ notifyListeners() → setState() → markNeedsRebuild()
→ buildScope() → StatefulElement.performRebuild()
→ AppStateWidget.build() 返回新 widget tree（items.length > 0）
→ diff: Column.updateChildren() Phase 1
  → Expanded.canUpdate(Expanded) = true → Expanded.update(newExpanded)
  → ParentDataElement.update()
    → canUpdate(Center, Row) = false → else 分支
    → 旧 Center unmount ✓
    → 新 Row createElement + mount ✓
    → 调用 this._replaceRenderObjectInAncestor() ← 💥 undefined！
→ TypeError 被 buildScope() 的 catch 静默吞掉
→ dirty=false，不再重试
→ 渲染树断链：Column 的 RenderFlex 仍引用已 unmount 的旧 RenderCenter
```

### 根因

`parent-data-widget.ts` 第 115 行调用了 `this._replaceRenderObjectInAncestor(oldRenderObject, newRenderObject)`，但**该方法从未实现**。这看起来是之前的 milestone 执行尝试修复但只写了调用没有写实现。

### 受影响的文件

1. **`packages/flitter-core/src/widgets/parent-data-widget.ts`** — 缺少 `_replaceRenderObjectInAncestor` 方法
2. **`packages/flitter-core/src/framework/element.ts`** — `MultiChildRenderObjectElement.updateChildren()` Phase 1/2 中 `update()` 后没有检查 renderObject 变化

## Proposed Changes

### Change 1: 实现 `_replaceRenderObjectInAncestor` (parent-data-widget.ts)

**文件**: `packages/flitter-core/src/widgets/parent-data-widget.ts`

**What**: 在 `ParentDataElement` 中添加 `_replaceRenderObjectInAncestor()` 私有方法。

**Why**: 当 `ParentDataElement.update()` 替换 child 导致底层 renderObject 变化时，需要在祖先 RenderObjectElement 的 renderObject 上执行替换，否则渲染树断链。

**How**:
```typescript
private _replaceRenderObjectInAncestor(
  oldRenderObject: RenderObject | undefined,
  newRenderObject: RenderObject | undefined,
): void {
  // 向上遍历找到最近的 RenderObjectElement 祖先
  let ancestor = this.parent;
  while (ancestor) {
    if (ancestor instanceof RenderObjectElement && ancestor.renderObject) {
      const parentRO = ancestor.renderObject;
      // ContainerRenderBox (Column/Row 的 RenderFlex) — 用 remove + insert 保持位置
      if (oldRenderObject && typeof (parentRO as any).remove === 'function') {
        // 找到旧 renderObject 在 children 中的位置
        const children = (parentRO as any).children as ReadonlyArray<any> | undefined;
        let after: any = undefined;
        if (children) {
          const idx = children.indexOf(oldRenderObject);
          if (idx > 0) after = children[idx - 1];
        }
        (parentRO as any).remove(oldRenderObject);
        if (newRenderObject && typeof (parentRO as any).insert === 'function') {
          (parentRO as any).insert(newRenderObject, after);
        }
      }
      // SingleChild render objects — 用 child setter 替换
      else if ('child' in parentRO) {
        if (oldRenderObject) {
          (parentRO as any).child = null;
        }
        if (newRenderObject) {
          (parentRO as any).child = newRenderObject;
        }
      }
      break;
    }
    ancestor = ancestor.parent;
  }
}
```

**设计说明**:
- 向上遍历 parent chain 找到第一个 `RenderObjectElement` — 这就是"拥有" renderObject 的祖先
- 对 `ContainerRenderBox`（有 `remove`/`insert` 方法）：找到旧 child 的前一个兄弟作为 `after` 参考，`remove(old)` + `insert(new, after)` 保持位置
- 对 single-child render objects（有 `child` setter）：直接替换 child
- 替换后由已有的 `_applyParentData()` 调用来重新设置 parent data（flex/fit 等）

### Change 2: 在替换后重新应用 parent data (parent-data-widget.ts)

**文件**: `packages/flitter-core/src/widgets/parent-data-widget.ts`

**What**: 确认 `_applyParentData()` 在 `_replaceRenderObjectInAncestor()` 之后被调用。

**Why**: `insert()` 调用 `setupParentData()` 会创建新的 ParentData，需要重新设置 flex/fit 值。

**How**: 当前代码中 `_applyParentData()` 已经在 update() 的最后一行被调用，无需额外修改。

### Change 3: 添加回归测试

**文件**: `packages/flitter-core/src/framework/__tests__/element.test.ts`（或新建专门的测试文件）

**What**: 添加一个测试验证当 `Expanded` 的 child 类型变化时（如 `Center` → `Row`），渲染树正确更新。

**How**: 
- 创建一个 `StatefulWidget`，其 build 根据 state 返回 `Expanded(child: Center(...))` 或 `Expanded(child: Row(...))`
- 调用 `setState` 切换状态
- 触发 frame 处理
- 验证 Column 的 `RenderFlex.children` 中的 child 是新的 `RenderFlex`（来自 Row）而不是旧的 `RenderCenter`

## Assumptions & Decisions

1. **只修复 ParentDataElement** — `StatelessElement.rebuild()` 和 `StatefulElement.rebuild()` 的 child 替换理论上也有同样问题，但实践中 ComponentElement 的 child 变化不改变透传的 renderObject（因为 ComponentElement 不拥有 renderObject，其 `renderObject` getter 在 Element 基类返回 undefined）。只有 `ParentDataElement` 的 `renderObject` getter 会透传 child 的 renderObject 给祖先使用，所以只需修复 ParentDataElement。

2. **不修改 MultiChildRenderObjectElement.updateChildren()** — 让替换逻辑自包含在 ParentDataElement 中，避免影响 updateChildren 的通用性。

3. **位置保留** — 使用 `after` 参数确保新 renderObject 插入到旧 renderObject 所在的位置，而不是 append 到末尾。

## Verification

1. **单元测试**: `bun test packages/flitter-core/src` — 确保不破坏现有测试
2. **flitter-amp 测试**: `bun test packages/flitter-amp/src/__tests__/` — 所有 105 个测试通过
3. **实际 TUI 验证**: 通过 tmux 启动 `flitter-amp`，发送 "hello"，确认：
   - 用户消息显示在聊天区域
   - 助手响应流式显示
   - 欢迎页消失，切换到 ScrollView 布局
   - "Streaming..." 在处理时显示，完成后消失
