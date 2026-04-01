# Plan: 状态行条件展示 — 对齐 Amp 原版行为 (TDD)

## Summary

当前 `BottomGrid.buildBottomLeft` 在非 `isProcessing` 状态下**始终**显示 `"? for shortcuts"`，导致界面在输入框有内容时多出一行无意义的提示文案，且在 streaming → 完成等状态切换时产生抖动。

Amp 原版通过 `suppressHint` 机制控制：**只有在用户未输入任何内容 且 无活跃状态行时**才展示 `"? for shortcuts"`。否则该行为空（不占空间）或展示对应的状态文案。

## Current State Analysis

### Amp 原版行为 (from `cli.js` 逆向)

1. **调用方**（主组件）计算 `suppressHint: D.length > 0`（`D` = 输入框值），传入 footer 组件
2. **`zMz` (Footer 包装)**：`N1 = G || KUA(T1) || x`
   - `G` = `suppressHint`（输入框有值）
   - `KUA(T1)` = 有活跃的 `statusLine`（streaming/running tools/cancelled 等）
   - `x` = `isSearching`
3. **`kZq` (底部提示行)**：`y = !H && !Z`（`H = suppressHint`, `Z = vimInsertMode`）
4. **`m0z` (提示内容)**：仅当 `y1.length === 0 && showHint` 时才 push `"? for shortcuts"`

**效果**：
- 用户未输入 + 无 streaming → 显示 `"? for shortcuts"`
- 用户输入了内容 → 不显示（空行或 SizedBox.shrink）
- 正在 streaming → 不显示 `"? for shortcuts"`，而是 `"Esc to cancel"` 或状态消息
- 取消后 → 瞬态 "Cancelled"（斜体），然后回到空

### flitter-amp 当前行为

`BottomGrid.buildBottomLeft` 逻辑（优先级从高到低）：
1. `searchState` → 搜索指示器
2. `hintText` → 自定义 hint
3. `isProcessing` → `"Esc to cancel"`
4. **兜底**（总是）→ `"? for shortcuts"` ← **问题：无论输入框是否有内容都展示**

---

## TDD Execution Plan

采用 **Red → Green → Refactor** 循环。

### Phase 0: 测试基础设施准备

**文件**: `packages/flitter-amp/src/test-utils/app-test-harness.ts`

当前 `AppTestHarness` 无法控制输入框内容。需要暴露 `inputController` 以便测试能设置输入文字。

**方案**: 给 `App` widget 增加可选的 `inputController` prop（仅测试用），让外部可以注入 controller。在 `AppTestHarness` 中创建 controller 并传入，暴露为 harness 的属性。

**修改文件**: 
- `packages/flitter-amp/src/app.ts` — `App` 增加可选 `inputController` prop，`AppStateWidget` 中优先使用外部注入的 controller
- `packages/flitter-amp/src/test-utils/app-test-harness.ts` — 创建 controller 传入 App，暴露为 `inputController` 属性

### Phase 1: RED — 先写失败测试

**文件**: `packages/flitter-amp/src/__tests__/visual-cell-assertions.test.ts`

在 `describe('Bottom Grid')` 区块中新增以下测试用例（此时全部应 FAIL）：

```typescript
test('hides "? for shortcuts" when input has text', () => {
  // 使用多帧 harness 以便设置输入文字
  const h = createAppTestHarness(120, 40);
  h.inputController.text = 'hello';
  h.drawFrame();
  const grid = h.readGrid();
  expect(findText(grid, '? for shortcuts').length).toBe(0);
  h.cleanup();
});

test('shows "? for shortcuts" when input is empty', () => {
  const h = createAppTestHarness(120, 40);
  h.inputController.text = '';
  h.drawFrame();
  const grid = h.readGrid();
  expect(findText(grid, '? for shortcuts').length).toBeGreaterThan(0);
  h.cleanup();
});

test('shows "Esc to cancel" during processing regardless of input', () => {
  const h = createAppTestHarness(120, 40);
  h.inputController.text = 'some text';
  h.appState.startProcessing('test');
  h.drawFrame();
  const grid = h.readGrid();
  expect(findText(grid, 'Esc').length).toBeGreaterThan(0);
  expect(findText(grid, 'to cancel').length).toBeGreaterThan(0);
  h.cleanup();
});

test('hides bottom-left row entirely when input has text and not processing', () => {
  const h = createAppTestHarness(120, 40);
  h.inputController.text = 'hello';
  h.drawFrame();
  const grid = h.readGrid();
  // "? for shortcuts" should be gone
  expect(findText(grid, '? for shortcuts').length).toBe(0);
  // "Esc" should also not appear
  expect(findText(grid, 'Esc').length).toBe(0);
  h.cleanup();
});
```

### Phase 2: GREEN — 最小实现让测试通过

**文件 1**: `packages/flitter-amp/src/app.ts`

- `App` props 增加可选 `inputController?: TextEditingController`
- `AppStateWidget.initState()` 中：如果 `widget.inputController` 存在则使用它，否则创建新的

**文件 2**: `packages/flitter-amp/src/test-utils/app-test-harness.ts`

- 创建 `TextEditingController` 实例
- 传入 `App` 构造函数
- 暴露为 `harness.inputController`

**文件 3**: `packages/flitter-amp/src/widgets/bottom-grid.ts`

核心改动：

1. **`BottomGridState`** 增加 `initState` / `didUpdateWidget` / `dispose` 监听 controller 文本变化：
```typescript
private _onTextChanged = (): void => {
  this.setState(() => {});
};

override initState(): void {
  super.initState();
  this.widget.controller?.addListener(this._onTextChanged);
}

override didUpdateWidget(oldWidget: BottomGrid): void {
  super.didUpdateWidget(oldWidget);
  if (oldWidget.controller !== this.widget.controller) {
    oldWidget.controller?.removeListener(this._onTextChanged);
    this.widget.controller?.addListener(this._onTextChanged);
  }
}

override dispose(): void {
  this.widget.controller?.removeListener(this._onTextChanged);
  super.dispose();
}
```

2. **`buildBottomLeft`** 签名改为返回 `Widget | null`，兜底分支增加 hasInput 检查：
```typescript
private buildBottomLeft(w: BottomGrid, mutedColor: Color, keybindColor: Color): Widget | null {
  if (w.searchState) { ... return widget; }
  if (w.hintText) { ... return widget; }
  if (w.isProcessing) { ... return widget; }
  
  // 兜底：仅当输入为空时显示
  const hasInput = (w.controller?.text.length ?? 0) > 0;
  if (hasInput) return null;
  
  return new Text({ ... "? for shortcuts" ... });
}
```

3. **`build`** 方法条件 push bottom row：
```typescript
const bottomLeft = this.buildBottomLeft(w, mutedColor, keybindColor);
if (bottomLeft !== null) {
  children.push(
    new Padding({
      padding: EdgeInsets.only({ left: 1 }),
      child: bottomLeft,
    }),
  );
}
```

### Phase 3: REFACTOR — 确认测试通过后清理

- 确认所有 7 个原有 Bottom Grid 测试 + 4 个新测试全部 PASS
- 确认其他测试无回归
- 清理临时代码（如有）

## Assumptions & Decisions

1. **不引入独立的 "Cancelled" 状态文案** — Amp 原版有 `inferenceState === "cancelled"` 对应的 "Cancelled" 斜体文案（通过 `dy()` 决策引擎），但在 flitter-amp 的 ACP 协议中没有 `inferenceState` 对等物。当前 cancel 后 `isProcessing` 直接变为 false，此时如果输入为空就显示 `"? for shortcuts"`，否则空行。
2. **不修改 `isProcessing` 切换时的 "Esc to cancel" 行** — 该行为已经正确。
3. **`hintText` 优先级不变** — 服务端 `session_info_update` 推送的 `hintText` 始终优先展示。
4. **通过可选 `inputController` prop 暴露给测试** — 这是最小侵入方式，生产代码中不传此 prop，App 行为不变。

## Verification

1. `bun test src/__tests__/visual-cell-assertions.test.ts` — 新增 4 个测试 + 原有 7 个全部 PASS
2. `bun test` — 整个 flitter-amp 测试套件无回归
