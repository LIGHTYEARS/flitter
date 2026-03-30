# Plan: 状态行条件展示 — 对齐 Amp 原版行为

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

`BottomGrid.buildBottomLeft` 逻辑：
1. `searchState` → 搜索指示器
2. `hintText` → 自定义 hint
3. `isProcessing` → `"Esc to cancel"`
4. **兜底**（总是）→ `"? for shortcuts"` ← **问题：无论输入框是否有内容都展示**

**问题**：
- 输入框有内容时仍显示 `"? for shortcuts"`，信息冗余
- 没有"输入非空时隐藏整行"的逻辑，导致始终占据一行高度
- 从 streaming 状态切回时，直接跳到 `"? for shortcuts"` 而非空行，造成抖动

## Proposed Changes

### 文件 1: `packages/flitter-amp/src/widgets/bottom-grid.ts`

**What**: 在 `BottomGrid` 的 `buildBottomLeft` 方法中增加"输入框为空"的条件判断，控制 `"? for shortcuts"` 的显示。

**Why**: 对齐 Amp 原版 `suppressHint` 逻辑 — 只有输入为空时才展示 hint。

**How**: 
- 在 `buildBottomLeft` 的兜底分支增加检查：通过 `w.controller?.text` 判断输入是否为空
- 如果输入框有内容（`controller?.text.length > 0`），返回 `SizedBox.shrink()` 而不是 `"? for shortcuts"`
- 这样当输入框有内容时，bottom-left 行不占空间

```typescript
// 修改 buildBottomLeft 的末尾兜底分支:
// 原:
//   return new Text({ text: new TextSpan({ children: [... "? for shortcuts" ...] }) });
// 改为:
const hasInput = (w.controller?.text.length ?? 0) > 0;
if (hasInput) {
  return SizedBox.shrink();
}
return new Text({ text: new TextSpan({ children: [... "? for shortcuts" ...] }) });
```

**注意**: `BottomGridState.build()` 已经能通过 `this.widget.controller` 访问 controller。但当前 `buildBottomLeft` 是从 `build()` 中以 `this.buildBottomLeft(w, ...)` 调用的，`w = this.widget`，已包含 `controller` 字段。

### 文件 2: `packages/flitter-amp/src/widgets/bottom-grid.ts` (同文件，`build` 方法)

**What**: 当 bottom-left 为空时（`SizedBox.shrink`），不应该还 push 一个 `Padding` 包裹它，否则仍然占据 padding 空间。

**How**: 将 `buildBottomLeft` 的结果存储到变量，判断是否为 shrink 后再决定是否加 Padding 包裹。或者更简洁地：直接在 `buildBottomLeft` 内处理，让 shrink widget 自然不占空间（`SizedBox.shrink()` 的尺寸为 0×0，Padding 包裹 0×0 的 widget 在 Column 中高度为 padding 高度）。

**更优方案**: 把"是否显示 bottom-left 行"的逻辑提取到 `build()` 方法，条件 push bottom row：

```typescript
// 在 build() 中:
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

并让 `buildBottomLeft` 返回 `Widget | null`，当输入框有内容且非 processing 时返回 `null`。

### 关于 controller 监听的问题

当前 `BottomGrid` 是 `StatefulWidget`，但 `buildBottomLeft` 读取 `w.controller?.text` 时，**如果 controller 上的文本变化不会触发 BottomGrid 的 rebuild**，则状态不会更新。

分析：`BottomGrid` 的 rebuild 触发路径是其父 `App` 在 `appState.notifyListeners()` 后调 `setState`，此时会传入新的 props。但是输入框文本变化**不经过** `appState.notifyListeners()` — 它只通过 `TextEditingController` 内部通知 `TextField` 重绘。

**解决方案**: 在 `BottomGridState.initState/dispose` 中监听 `controller`，当文本变化时调用 `setState` 触发 rebuild。这样 `buildBottomLeft` 就能响应输入框内容变化。

### 完整修改方案

#### `bottom-grid.ts` 修改点：

1. **`BottomGridState`** 增加 `initState` 和 `dispose` 用于监听 controller 文本变化
2. **`build`** 方法中条件 push bottom-left 行
3. **`buildBottomLeft`** 返回 `Widget | null`，输入非空 + 非 processing + 非 searchState + 非 hintText 时返回 `null`

## Assumptions & Decisions

1. **不引入独立的 "Cancelled" 状态文案** — Amp 原版有 `inferenceState === "cancelled"` 对应的 "Cancelled" 斜体文案（通过 `dy()` 决策引擎），但在 flitter-amp 的 ACP 协议中没有 `inferenceState` 对等物。当前 cancel 后 `isProcessing` 直接变为 false，此时如果输入为空就显示 `"? for shortcuts"`，否则空行。这已经足够——Amp 原版的 "Cancelled" 也只是一个瞬态状态。
2. **不修改 `isProcessing` 切换时的 "Esc to cancel" 行** — 该行为已经正确（processing 时显示，非 processing 时消失）。
3. **`hintText` 优先级不变** — 服务端通过 `session_info_update` 推送的 `hintText` 始终优先展示，不受输入框是否为空的影响（与 Amp 原版一致）。

## Verification

1. **启动 flitter-amp**，验证初始状态（输入框空）显示 `"? for shortcuts"`
2. **输入任何文字**，验证底部行消失（不占空间）
3. **清空输入框**，验证底部行恢复 `"? for shortcuts"`
4. **发送消息触发 streaming**，验证底部行变为 `"Esc to cancel"`
5. **streaming 结束**，如果输入框为空则恢复 `"? for shortcuts"`，否则空行
6. **按 Esc 取消 streaming**，验证无抖动
7. 运行单元测试确认无回归
