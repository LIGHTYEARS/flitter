# Tasks

## Task 1: G3+G1+G2 — BashInvocation 类型扩展 + invokeBashCommand 重写 + removeBashInvocation 重写
- [x] Task 1: 重写 BashInvocation 类型和 invokeBashCommand/removeBashInvocation 核心逻辑

**必须参考的 AMP 源码：**
- `tmux-capture/chunk-044.js`，用 `cat chunk-044.js | tr ';' '\n'` 格式化后阅读
- **invokeBashCommand**: tr 后 line 387-392 — 完整的 pending→shown 延时 + AbortController + Observable 模式
- **removeBashInvocation**: tr 后 line 380-386 — 500ms 最小显示时间 + pending 清理逻辑
- **doRemoveBashInvocation**: tr 后 line 386 — 实际移除操作

**具体步骤：**
  - [x] 1.1: 在 `packages/flitter-cli/src/state/types.ts` 的 `BashInvocation` interface 中增加两个字段：
    - `abortController: AbortController` — 用于从外部终止命令执行
    - `hidden: boolean` — 标记 `$$` 前缀的隐身命令（不在 UI 中显示）
  - [x] 1.2: 重写 `packages/flitter-cli/src/state/app-state.ts` 的 `invokeBashCommand` 方法。严格参照 AMP chunk-044.js tr 后 line 387-392 的逻辑
  - [x] 1.3: 重写 `removeBashInvocation` 方法。严格参照 AMP chunk-044.js tr 后 line 380-386
  - [x] 1.4: 新增 `doRemoveBashInvocation(id)` 私有方法
  - [x] 1.5: 修改 `pendingBashInvocations` 的 Map value 类型为 `{ invocation: BashInvocation; showTimer: ReturnType<typeof setTimeout> }`
  - [x] 1.6: `clearCompletedBashInvocations()` 处理 pending invocations
  - [x] 1.7: `npx tsc --noEmit` 编译通过

## Task 2: G4 — cancelBashInvocations + Double-Escape 取消
- [x] Task 2: 实现 cancelBashInvocations 和 Double-Escape 取消逻辑

**必须参考的 AMP 源码：**
- `tmux-capture/chunk-044.js`，用 `cat chunk-044.js | tr ';' '\n'` 格式化后阅读
- **cancelBashInvocations**: tr 后 line 393-396 — 清除 pending timers + abort pending + 清除 remove timers + abort in-progress
- **Double-Escape handler**: tr 后 line 806-810 — `isConfirmingCancelProcessing` + 1 秒超时 + `cancelBashInvocations()`
- **Esc hint**: tr 后 line 239 — `isProcessing() || bashInvocations.length > 0 || pendingBashInvocations.size > 0`

**具体步骤：**
  - [x] 2.1: 在 `app-state.ts` 中新增 `cancelBashInvocations()` 方法
  - [x] 2.2: 在 `app-state.ts` 中增加 `isConfirmingCancelProcessing` 和 `cancelProcessingConfirmTimeout` 字段
  - [x] 2.3: 在 `app-shell.ts` 中修改 Escape 键处理逻辑（Double-Escape + 1s 超时）
  - [x] 2.4: `npx tsc --noEmit` 编译通过

## Task 3: G5 — hidden visibility 过滤 + BashInvocationsWidget 更新
- [x] Task 3: BashInvocationsWidget 过滤 hidden invocations

**必须参考的 AMP 源码：**
- `tmux-capture/chunk-044.js` tr 后 line 388 — `hidden: T===Qx` (Qx="hidden")
- `tmux-capture/amp-source/31_main_tui_build.js` tr 后 line 15-17 — `new BJR({bashInvocations: this.bashInvocations})` — BJR 接收所有 invocations，内部过滤 hidden
- `tmux-capture/chunk-044.js` tr 后 line 887 — `"shell mode (incognito)"` / `"shell mode"`

**具体步骤：**
  - [x] 3.1: 修改 `bash-invocations.ts` 的 `build()` 方法：在 for 循环中跳过 `inv.hidden === true`
  - [x] 3.2: 确认 `isRunningShell` getter 仍然包含 hidden invocations
  - [x] 3.3: `npx tsc --noEmit` 编译通过

## Task 4: G6+G7 — Footer status + Esc hint 感知 bash invocations
- [x] Task 4: 更新 StatusBar 和 border-builders 使其感知 bash invocations

**必须参考的 AMP 源码：**
- `tmux-capture/amp-source/07a_footer_status_yB.js` tr 后 line 1-16 — `yB()` 函数中 `runningBashInvocations` 的检测逻辑和优先级
- `tmux-capture/chunk-044.js` tr 后 line 239 — Esc hint 的触发条件
- `tmux-capture/chunk-044.js` tr 后 line 887 — shell mode indicator 文案

**具体步骤：**
  - [x] 4.1: 修改 `status-bar.ts` 的 `getFooterText` 函数
  - [x] 4.2: 在 `StatusBarProps` 中增加 `runningBashInvocations` 字段
  - [x] 4.3: 在 `app-shell.ts` 中向 StatusBar 传递 `runningBashInvocations`
  - [x] 4.4: 修改 `border-builders.ts` 的 `buildBottomLeftOverlay` 函数
  - [x] 4.5: 在 AppShell 中向 InputArea 传递新增 props
  - [x] 4.6: `npx tsc --noEmit` 编译通过

# Task Dependencies
- Task 2 depends on Task 1（cancelBashInvocations 需要 AbortController 字段和重写后的 invocation 结构）
- Task 3 depends on Task 1（hidden 字段在 Task 1 中添加）
- Task 4 可与 Task 2/3 并行（仅依赖 Task 1 中的类型变更）
