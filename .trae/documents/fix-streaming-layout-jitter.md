# Plan: 修复 "Streaming..." 导致的界面抖动

## Summary

当前 `BottomGrid.build()` 中 `topLeft` 行（显示 "Streaming..." 或 token 用量）仅在 `isProcessing === true` 时 push 到 Column，导致 processing 开始/结束时 Column 子节点数量变化（2 ↔ 3），引起输入框位置跳动。

## Current State Analysis

### 布局结构

```
Column (min, stretch)
├── [仅 isProcessing] Padding (h:1) → topLeft ("Streaming..." / token 用量)   ← 条件性出现
├── InputArea (带边框)
└── Padding (left:1) → bottomLeft ("? for shortcuts" / "Esc to cancel" / 空占位)  ← 始终占位
```

**问题**：`topLeft` 是条件性的 (`if (w.isProcessing)`)，非 processing 时不 push 到 children 数组。但 `bottomLeft` 在上一轮修复中已经改为始终占位了（`bottomLeft ?? new SizedBox({ height: 1 })`）。两者行为不一致。

### Amp 原版的实际行为

根据 Amp 原版源码和 TUI-CHATVIEW-SPEC.md (L183-191)，SPEC 设计中 topLeft 和 bottomLeft 分别位于 InputArea 的上方和下方 Stack 中。在空闲状态，topLeft 返回 `SizedBox.shrink()`。

**但关键差异**：Amp 原版中 topLeft 是通过 `overlayTexts: [{ position: "top-left", child: g0H }]` 传入 `F0H`（PromptBar），由 `qt`（BorderTextOverlay）**叠加在输入框顶部边框线上**——它不占独立行高。flitter-amp 将其改为独立行是可以的（SPEC 也这么定义了），但需要**始终占位**以避免抖动。

## Proposed Changes

### 文件: `packages/flitter-amp/src/widgets/bottom-grid.ts`

**What**: 将 `topLeft` 行从条件性 push 改为始终占位（与 `bottomLeft` 行的处理方式一致）。

**Why**: 消除 processing 状态切换时 Column 子节点数量 2↔3 变化导致的输入框跳动。

**How**: 

```typescript
// 当前（有抖动）:
if (w.isProcessing) {
  children.push(new Padding({ ... child: topLeft }));
}
children.push(inputArea);

// 修改为（无抖动）:
children.push(
  new Padding({
    padding: EdgeInsets.symmetric({ horizontal: 1 }),
    child: w.isProcessing ? topLeft : new SizedBox({ height: 1 }),
  }),
);
children.push(inputArea);
```

非 processing 时用 `SizedBox({ height: 1 })` 占位一行，与 bottomLeft 处理方式完全对称。

### TDD 测试

在 `visual-cell-assertions.test.ts` 中新增布局稳定性测试：

```typescript
test('input box border position stays constant across processing state changes', () => {
  const h = createAppTestHarness(120, 40);
  h.appState.cwd = '/test';

  // 空闲状态
  h.drawFrame();
  const idleBorderRow = findRow(h.readGrid(), '╭');

  // 开始 processing
  h.appState.startProcessing('test');
  h.drawFrame();
  const processingBorderRow = findRow(h.readGrid(), '╭');

  expect(processingBorderRow).toBe(idleBorderRow);
  h.cleanup();
});
```

## Assumptions & Decisions

1. topLeft 行始终占位 1 行高度（与 bottomLeft 对称）。空闲时为空白行。
2. 不修改 topLeft 的 overlay 实现方式——保持当前的 Column 独立行设计，因为 SPEC 中也是这么描述的。

## Verification

1. 新增布局稳定性测试 PASS
2. 原有 34 个 visual-cell-assertions 测试 PASS
3. 全量 flitter-amp 测试无回归
