# Close Shell Mode Gaps — AMP 完全对齐 Spec

## Why

Shell mode 核心功能（命令解析、执行、输出显示）已完成，但与 AMP 源码对照后发现 7 个行为差距。这些差距涉及命令取消能力（P1）、hidden 命令过滤（P2）、状态栏提示（P2）、以及 UX 防闪烁优化（P3）。本次变更的目标是逐一关闭这 7 个 gap，达到与 AMP 的行为对齐。

## What Changes

- **G1**: 75ms pending→shown 延时防闪烁 — 新建 invocation 后放入 `pendingBashInvocations`，75ms 后仍在运行才转移到 `bashInvocations[]` 显示
- **G2**: 500ms 最小显示时间 — `removeBashInvocation` 检查 `shownAt`，不足 500ms 则延迟移除
- **G3**: AbortController 存储 — 每个 invocation 携带 `abortController`，支持从外部终止正在执行的命令
- **G4**: Double-Escape 取消 bash invocations — 第一次 Esc 进入确认模式，第二次 Esc 调用 `cancelBashInvocations()` 终止命令
- **G5**: `$$` hidden visibility 过滤 — BashInvocation 增加 `hidden` 字段，BJR 渲染时过滤 hidden invocations
- **G6**: Footer status 感知 bash invocations — 运行 shell 命令时状态栏显示 "Running shell command..."
- **G7**: Esc hint 感知 bash invocations — 当有 bash invocations 运行时，bottom-left overlay 显示 "Esc to cancel"

## Impact

- 受影响代码:
  - `packages/flitter-cli/src/state/types.ts` — BashInvocation 类型扩展
  - `packages/flitter-cli/src/state/app-state.ts` — invokeBashCommand、cancelBashInvocations、pending 延时、AbortController
  - `packages/flitter-cli/src/widgets/bash-invocations.ts` — hidden 过滤
  - `packages/flitter-cli/src/widgets/app-shell.ts` — Escape 处理、statusMessage 传递
  - `packages/flitter-cli/src/widgets/border-builders.ts` — bottom-left overlay Esc hint
  - `packages/flitter-cli/src/widgets/status-bar.ts` — getFooterText 中 bash invocations 感知

## AMP 源码参考

所有修改必须严格参考以下 AMP 源码（minified，需 `tr ';' '\n'` 格式化后阅读）：

| 功能 | AMP 源文件 | 关键行号（tr 后） | 关键函数/变量 |
|------|-----------|-------------------|--------------|
| invokeBashCommand + pending 延时 + AbortController | `tmux-capture/chunk-044.js` | 387-392 | `invokeBashCommand`, `pendingBashInvocations`, `setTimeout(…, 75)` |
| removeBashInvocation + 500ms 最小显示 | `tmux-capture/chunk-044.js` | 380-386 | `removeBashInvocation`, `bashInvocationShownAt`, `500` |
| cancelBashInvocations | `tmux-capture/chunk-044.js` | 393-396 | `cancelBashInvocations`, `abortController.abort()` |
| Double-Escape 取消逻辑 | `tmux-capture/chunk-044.js` | 806-810 | `isConfirmingCancelProcessing`, `bashInvocations.length > 0` |
| Esc hint 检测 | `tmux-capture/chunk-044.js` | 239 | `isProcessing() \|\| bashInvocations.length > 0 \|\| pendingBashInvocations.size > 0` |
| textChangeListener shell mode 检测 | `tmux-capture/chunk-044.js` | 308-315 | `textChangeListener`, `zS(R)`, `currentShellModeStatus` |
| hidden visibility 常量 | `tmux-capture/amp-source/22_providers_reasoning_modes.js` | 93 | `Qx="hidden"` |
| footer status | `tmux-capture/amp-source/07a_footer_status_yB.js` | 1-16 | `yB()`, `runningBashInvocations` |
| BJR 渲染 | `tmux-capture/amp-source/31_main_tui_build.js` | 15-17 | `new BJR({bashInvocations: ...})` |
| shell mode indicator | `tmux-capture/chunk-044.js` | 887 | `"shell mode (incognito)"` / `"shell mode"` |

## ADDED Requirements

### Requirement: G1 — 75ms pending→shown 延时

系统 SHALL 在创建 bash invocation 时不立即显示到 UI，而是放入 pendingBashInvocations Map，设置 75ms setTimeout。仅当 75ms 后 invocation 仍存在于 pending 中时，才转移到 bashInvocations[] 触发 UI 渲染。

#### Scenario: 快速完成的命令不闪烁
- **WHEN** 用户执行 `$echo hi`（命令在 <75ms 完成）
- **THEN** BashInvocationsWidget 不会出现闪烁（invocation 在 pending 阶段就被移除）

#### Scenario: 慢命令正常显示
- **WHEN** 用户执行 `$sleep 1`（命令耗时 >75ms）
- **THEN** 75ms 后 invocation 出现在 BashInvocationsWidget 中

### Requirement: G2 — 500ms 最小显示时间

`removeBashInvocation` SHALL 检查 invocation 的 `bashInvocationShownAt` 时间戳。如果显示时间不足 500ms，SHALL 设置定时器延迟移除至 500ms 时刻，确保用户至少能看到状态条 500ms。

#### Scenario: 快速完成的命令保证可见时间
- **WHEN** invocation 在显示后 100ms 即完成
- **THEN** 该 invocation 在显示满 500ms 后才被移除

### Requirement: G3 — AbortController 存储与传递

BashInvocation 类型 SHALL 增加 `abortController: AbortController` 字段。`invokeBashCommand` SHALL 创建一个 AbortController 并存储在 invocation 中，将其 `signal` 传递给 `BashExecutor.execute()`。

#### Scenario: 外部可以终止正在运行的命令
- **WHEN** 用户按 Esc 取消，且有运行中的 bash invocation
- **THEN** 系统通过 `invocation.abortController.abort()` 终止命令执行

### Requirement: G4 — Double-Escape 取消 bash invocations

AppShell 的 Escape 处理 SHALL 增加 bash invocations 感知。当 `bashInvocations.length > 0 || isProcessing` 时，第一次 Esc 进入 `isConfirmingCancelProcessing` 状态，第二次 Esc 调用 `cancelBashInvocations()` 终止命令。1 秒无操作后自动退出确认状态。

#### Scenario: Double-Escape 终止运行中的 shell 命令
- **WHEN** 用户执行 `$sleep 60` 后按两次 Esc
- **THEN** 命令被 abort，invocation 被从 UI 中移除

### Requirement: G5 — hidden ($$) visibility 过滤

BashInvocation 类型 SHALL 增加 `hidden: boolean` 字段。`invokeBashCommand` SHALL 在 `visibility === 'hidden'` 时设置 `hidden: true`。BashInvocationsWidget SHALL 过滤掉 `hidden === true` 的 invocations（不渲染），但 hidden invocations 仍参与 `isRunningShell` 判断和 Esc 取消。

#### Scenario: $$ 命令不显示在 UI 中
- **WHEN** 用户执行 `$$secret-cmd`
- **THEN** BashInvocationsWidget 不显示该命令，但 footer 显示 "Running shell command..."

### Requirement: G6 — Footer status 感知 bash invocations

`getFooterText` 和 `yB` 等效逻辑 SHALL 在检测到 `runningBashInvocations: true`（即 `bashInvocations.length > 0`）时返回 "Running shell command..."。当 streaming 中同时有 bash invocations 时返回 "Running tools..."。

#### Scenario: 运行 shell 命令时状态栏显示状态
- **WHEN** 用户执行 `$ls` 且命令正在运行
- **THEN** StatusBar 显示 "Running shell command..."

### Requirement: G7 — Esc hint 感知 bash invocations

`buildBottomLeftOverlay` SHALL 在 `bashInvocations.length > 0 || pendingBashInvocations.size > 0` 时也显示 "Esc to cancel" 提示（当前仅在 `isStreaming` 时显示）。在 `isConfirmingCancelProcessing` 状态时显示 "Esc again to cancel"。

#### Scenario: 运行 shell 命令时显示 Esc 提示
- **WHEN** 用户执行 `$sleep 10`
- **THEN** InputArea bottom-left overlay 显示 "Esc to cancel"
