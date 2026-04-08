# Tasks

## Task 1: 修复 PerlinNoise.fbm() 值域 (GAP-C1 + GAP-M1)

> `PerlinNoise.fbm()` 注释标称返回 `[0, 1]` (line 286) 但实际返回 `[-1, 1]`，因为 `noise.value()` 返回 `[-1, 1]` (line 276) 而 `fbm()` (line 222) 仅做 `total / maxValue` 归一化，没有偏移。同文件中独立函数 `fbm2D()` (line 72) 已正确做 `(value / maxAmplitude + 1) * 0.5`。

- [x] SubTask 1.1: 在 `perlin-animation.ts` line 222，将 `return total / maxValue` 改为 `return (total / maxValue + 1) * 0.5`
- [x] SubTask 1.2: 验证 `density-orb-widget.ts:149-168` 的渲染路径——GAP-M1 的 per-cell RGB 渐变逻辑（line 165-168 已有 `Color.rgb()` 调用）将因 level 值正确而自动生效
- [x] SubTask 1.3: 运行 `bun test` 确保 DensityOrb 和 WelcomeScreen 测试通过

## Task 2: 恢复 Footer StatusBar 到 AppShell (GAP-C2 + GAP-M2)

> AMP 的 footer 在 `07a_footer_status_yB.js` 中实现完整的状态判定，`07b_footer_status_zB0.js` 做 message 提取。flitter-cli 的 `StatusBar` (status-bar.ts) 已有完整实现但在 Phase 23 被标记 `@deprecated` 并从 `app-shell.ts` Column children 中移除。需要恢复它。
>
> AMP analysis-44 确认: "StatusBar (static): Static wave chars (`" ", "~", "~", "~", "~", "~"`), not animated"。golden files 显示 `≋` (U+224B) 和 `∼` (U+223C) 作为静态前缀。

- [x] SubTask 2.1: 取消 `status-bar.ts` 的 `@deprecated` 标记
- [x] SubTask 2.2: 更新 `StatusBar.getFooterText()` 适配 AMP `yB()`/`iO0()` 状态映射表：
  - `isProcessing && isToolRunning` → `"Running tools..."`（AMP: `interactionState==="tool-running"` 且多工具时 `Running N tools...`）
  - `isProcessing && isAwaitingPermission` → `"Waiting for approval..."`（AMP: `waitingForConfirmation || interactionState==="user-tool-approval"`）
  - `isStreaming && hasStartedStreamingResponse` → `"Streaming response..."`
  - `isStreaming && !hasStartedStreamingResponse` → `"Waiting for response..."`
  - idle → 返回 `""` (不渲染)
- [x] SubTask 2.3: 在 `StatusBar.buildLeft()` 中增加静态波浪字符前缀：当 footer 有状态文本时，前缀 `≋ ` 或 `∼ `（从 AMP golden 中提取的确切字符）。按 AMP analysis-44，这是静态的，不需要动画。
- [x] SubTask 2.4: 在 `app-shell.ts` 的 Column children 中，InputArea 之后有条件地添加 StatusBar:
  ```
  children: [
    Expanded(content),
    ...bashInvocations,
    InputArea(...),
    // 仅在 isProcessing || isStreaming || isAwaitingPermission 时显示
    ...(shouldShowFooter ? [new StatusBar({...})] : []),
  ]
  ```
  - 传入: `cwd`, `gitBranch`, `isProcessing`, `isStreaming`, `isAwaitingPermission` 等
  - 需从 AppState 读取 `pendingPermissionRequest` (非 null 时为 `isAwaitingPermission`)
- [x] SubTask 2.5: 运行 typecheck 和测试确保无回归

## Task 3: Permission Reason 数据管道 (GAP-M3)

> AMP `10_confirmation_dialog_eTT.js`: `eTT` class 接收 `content` prop 包含 reason 文本。flitter-cli 的 `PermissionContentPreview.reason` 类型已定义（permission-types.ts:81）且 `permission-dialog.ts:320-327` 已有渲染逻辑，但 `app-state.ts` 的 `_buildContentPreview()` 从未设置 `reason` 字段。

- [x] SubTask 3.1: 在 `app-state.ts` 的 `_buildContentPreview()` 方法中：
  - bash/command case: `reason: 'Matches built-in permissions rule: ask Bash'`
  - edit case: `reason: 'Matches built-in permissions rule: ask Edit'`
  - create case: `reason: 'Matches built-in permissions rule: ask Create'`
  - default case: `reason: 'Matches built-in permissions rule: ask Tool'`
- [x] SubTask 3.2: 运行 typecheck 确认无类型错误

## Task 4: Bottom-Right 路径格式修复 (GAP-m3)

> AMP `input-area-bottom-right-builder.js` 精确流程:
> ```
> let RR = g.getInitialTreeURI(), rR;
> if (RR) rR = qT.parse(RR).fsPath;
> else rR = process.cwd();
> let gR = this.toHomeRelative(rR);
> let U = this.shorten(gR);
> let K = this.buildDisplayText(U, this.currentGitBranch || void 0, q, m);
> ```
> 其中 `toHomeRelative` 替换 `$HOME` → `~`，`shorten` 截断路径，`buildDisplayText` 拼接 `path (branch)` 格式。
> flitter-cli 的 `border-helpers.ts:76-86` 已有 `shortenPath()` 做 `~/` 替换，`border-builders.ts:494` 已有 `(branch)` 拼接。但 cwd 值传入可能不正确。

- [x] SubTask 4.1: 检查 `app-shell.ts:916` 传给 InputArea 的 `cwd` 值: `this.widget.appState.metadata?.cwd ?? process.cwd()`
  - 验证 `metadata.cwd` 是项目根目录 (`~/.oh-my-coco/studio/flitter`) 还是子目录 (`packages/flitter-cli`)
  - 检查 `index.ts`/启动入口中 `metadata.cwd` 的设置逻辑
- [x] SubTask 4.2: 如果 `metadata.cwd` 指向子目录，修正为项目根目录（AMP 使用 `getInitialTreeURI()` 获取项目根）
- [x] SubTask 4.3: 确认 `buildBottomRightOverlay` (border-builders.ts:487-508) 正确使用 `shortenPath(cwd)` + `(branch)` 格式

## Task 5: BashTool 精简显示 (GAP-m4 + GAP-c2)

> AMP golden 中:
> - 已完成: `$ sleep 60` (无 checkmark，无 "Bash" 名称)
> - 运行中: `⣓ sleep 60` (spinner + 命令，无 "Bash" 名称)
> 当前 flitter-cli `bash-tool.ts`:
> - 已完成: `✓ Bash $ sleep 60` (checkmark + "Bash" + $ + command)
> - 运行中: `⣓ Bash $ sleep 60` (spinner + "Bash" + $ + command)

- [x] SubTask 5.1: 修改 `bash-tool.ts` 的 `_buildHeader()` 方法:
  - 将 `name: 'Bash'` 改为 `name: ''` (空字符串，不显示工具名)
  - 已完成态: details 中 `$ {command}` 保留 `$` 前缀
  - 运行中: details 中只传 `command` 不加 `$` 前缀（spinner 已由 ToolHeader 提供）
- [x] SubTask 5.2: 检查 `tool-header.ts` 在 name 为空字符串时是否正确省略空格（不渲染 ` ` + name）
- [x] SubTask 5.3: 运行 `bun test packages/flitter-cli` 确保无回归

## Not-Fixing (by design)

| Gap | 原因 |
|-----|------|
| GAP-m1 | "Welcome to Amp" 逐字符绿色渐变 — cosmetic，且 GlowText widget 需要额外实现 |
| GAP-m2 | skillCount=0 — 配置层面问题，skills 未加载，非代码缺陷 |
| GAP-m5 | 命令列表多 2 条 — flitter-cli 扩展功能 |
| GAP-m6 | Scrollbar 始终渲染 — flitter-core Scrollbar 行为问题，低优先级 |
| GAP-c1 | 光标 `█` vs 反色空格 — cosmetic |

# Task Dependencies
- Task 1, 3, 4, 5 无依赖，可并行
- Task 2 SubTask 2.2-2.3 依赖 SubTask 2.1（取消 deprecated）
- Task 2 SubTask 2.4 依赖 SubTask 2.2-2.3
