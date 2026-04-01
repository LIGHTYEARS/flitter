# Tasks

> **执行模式**: 每个 Task 分配独立 executor agent 实现，完成后由独立 verifier agent 验证。
> **TDD 顺序**: Phase 1 写 failing tests → Phase 2-5 实现通过 → Phase 6 polish → Phase 7 全量回归。

## Phase 1 — Guardrails (TDD: Write Failing Tests First)

> Phase 1 的所有 Task 可并行执行（无相互依赖）。

- [x] Task 1: [executor] 编写 RenderFlex 安全性 failing tests
  - 文件: `packages/flitter-core/src/layout/__tests__/render-flex-safety.test.ts`
  - 测试用例:
    - 溢出检测: 非弹性子项总宽超约束 → `hasOverflow` 为 true
    - Infinity 安全: Column unbounded 主轴 + Expanded → 子项不收到 Infinity
    - 负 flex 值: flex < 0 → 回退 0 或抛错
    - debug 溢出警告: 溢出时 stderr 含 "overflowed"
  - 验收: 运行 `cd packages/flitter-core && bun test src/layout/__tests__/render-flex-safety.test.ts`，确认 ≥4 个测试且全部 FAIL
  - 需先读取 `packages/flitter-core/src/layout/render-flex.ts` 和 `packages/flitter-core/src/test-utils/pipeline-helpers.ts` 了解现有 API
- [x] Task 1V: [verifier] 验证 Task 1 产出
  - 确认文件存在且包含 ≥4 个 `test()` / `it()` 块
  - 确认运行后全部 FAIL（非语法错误导致的失败）
  - 确认测试逻辑合理（测的是行为而非实现细节）

- [x] Task 2: [executor] 编写 BoxConstraints API 补全 failing tests
  - 文件: `packages/flitter-core/src/core/__tests__/box-constraints-api.test.ts`
  - 测试用例:
    - `normalize()`: min > max → normalized
    - `tighten({width: 50})`: 仅收紧指定轴
    - `isNormalized`: 包含 `>= 0` 检查
    - `constrainWidth(w)` / `constrainHeight(h)`: clamp 到范围
    - `deflate()` 在 RenderPadding 中被调用（检查无手动构造）
  - 验收: `bun test src/core/__tests__/box-constraints-api.test.ts` 确认 ≥5 FAIL
  - 需先读取 `packages/flitter-core/src/core/box-constraints.ts` 了解现有 API
- [x] Task 2V: [verifier] 验证 Task 2 产出

- [x] Task 3: [executor] 编写 TextField Emacs 键绑定 failing tests
  - 文件: `packages/flitter-core/src/widgets/__tests__/text-field-emacs.test.ts`
  - 测试用例:
    - Ctrl+A → 行首移动（非 selectAll）
    - Ctrl+E → 行尾移动
    - Ctrl+X → 剪切选区
    - Ctrl+W → 删除前一个词
    - Alt+B → backward-word
    - Alt+F → forward-word
  - 验收: ≥6 FAIL
  - 需先读取 `packages/flitter-core/src/widgets/text-field.ts` 了解现有键绑定处理
- [x] Task 3V: [verifier] 验证 Task 3 产出

- [x] Task 4: [executor] 编写 Renderer 光标优化 + 控制字符过滤 failing tests
  - 文件: `packages/flitter-core/src/terminal/__tests__/renderer-cursor-opt.test.ts`
  - 测试用例:
    - 同行连续 cell 不输出 CUP 序列
    - 不连续 cell 仍输出 CUP
    - 跨行时输出 CUP
    - 控制字符 U+0000-U+001F 被替换为空格
  - 验收: ≥4 FAIL
  - 需先读取 `packages/flitter-core/src/terminal/renderer.ts` 了解现有 render 方法
- [x] Task 4V: [verifier] 验证 Task 4 产出

- [x] Task 5: [executor] 编写 Markdown StyleScheme 覆盖 failing tests
  - 文件: `packages/flitter-core/src/widgets/__tests__/markdown-style-override.test.ts`
  - 测试用例:
    - 传入 `styleOverrides: { paragraph: { fontStyle: 'italic', dim: true } }` → 段落使用 italic+dim
    - 不传 styleOverrides → 行为不变
  - 验收: ≥2 FAIL
  - 需先读取 `packages/flitter-core/src/widgets/markdown.ts` 了解构造函数签名
- [x] Task 5V: [verifier] 验证 Task 5 产出

- [ ] Task 6: [executor] 编写 ACP 重连集成 failing tests
  - 文件: `packages/flitter-amp/src/__tests__/acp-reconnection-integration.test.ts`
  - 测试用例:
    - LiveHandle.current 返回当前活跃连接
    - 连接替换后 LiveHandle.current 指向新连接
    - shouldAutoReconnect 对 crash exit code 返回 true
    - ReconnectionManager 被实际调用（mock 验证）
    - HeartbeatMonitor 被实际启动（mock 验证）
  - 验收: ≥5 FAIL
  - 需先读取 `packages/flitter-amp/src/acp/reconnection-manager.ts`, `heartbeat-monitor.ts`, `exit-classifier.ts`
- [x] Task 6V: [verifier] 验证 Task 6 产出

- [x] Task 7A: [executor] 编写 WaveSpinner failing tests
  - 文件: `packages/flitter-core/src/widgets/__tests__/wave-spinner.test.ts`
  - 测试用例:
    - 初始渲染 " " (空格)
    - 200ms 后渲染 "∼"
    - 6 帧循环后回到 " "
  - 验收: ≥3 FAIL
- [x] Task 7AV: [verifier] 验证 Task 7A 产出

- [ ] Task 7B: [executor] 编写 ShortcutRegistry failing tests
  - 文件: `packages/flitter-core/src/input/__tests__/shortcut-registry.test.ts`
  - 测试用例:
    - register() 注册快捷键
    - match() 匹配最高优先级
    - 冲突检测: 相同 key 不同 scope 不冲突
  - 验收: ≥3 FAIL
  - 需先读取 `packages/flitter-core/src/input/shortcuts.ts` 了解现有接口
- [x] Task 7BV: [verifier] 验证 Task 7B 产出

- [x] Task 7C: [executor] 编写 FocusTrap failing tests
  - 文件: `packages/flitter-core/src/input/__tests__/focus-trap.test.ts`
  - 测试用例:
    - trapFocus=true 时 Tab 不跳出 scope
    - trapFocus=false 时正常遍历
  - 验收: ≥2 FAIL
  - 需先读取 `packages/flitter-core/src/input/focus.ts` 了解 FocusScopeNode
- [x] Task 7CV: [verifier] 验证 Task 7C 产出

## Phase 2 — Core Engine Implementation (Make Tests Pass)

> Phase 2 的 Task 8-11 可并行执行（各自修改不同文件）。

- [x] Task 8: [executor] 实现 BoxConstraints API 补全
  - 修改: `packages/flitter-core/src/core/box-constraints.ts`
  - 添加: `normalize()`, `tighten()`, `constrainWidth()`, `constrainHeight()`
  - 修正: `isNormalized` 添加 `>= 0` 检查
  - 重构: `render-padded.ts` 和 `render-decorated.ts` 改用 `deflate()`
  - 验收: Task 2 测试全部 PASS + `bun test` 全量无回归
- [x] Task 8V: [verifier] 验证 Task 8 — 运行 `cd packages/flitter-core && bun test` 确认无回归

- [x] Task 9: [executor] 实现 RenderFlex 安全检查
  - 修改: `packages/flitter-core/src/layout/render-flex.ts`
  - 添加: `_hasOverflow` 字段 + 溢出检测 + debug 警告
  - 添加: `canFlex = Number.isFinite(mainAxisLimit)` 检查
  - 验收: Task 1 测试全部 PASS + `bun test` 全量无回归
- [x] Task 9V: [verifier] 验证 Task 9 — 运行 `cd packages/flitter-core && bun test` 确认无回归

- [x] Task 10: [executor] 实现 Renderer 光标优化 + 控制字符过滤
  - 修改: `packages/flitter-core/src/terminal/renderer.ts`
  - 添加: `_currentCol`/`_currentRow` 追踪，连续 cell 跳过 CUP
  - 添加: `isControlChar()` 过滤函数
  - 验收: Task 4 测试全部 PASS + `bun test` 全量无回归
- [x] Task 10V: [verifier] 验证 Task 10 — 运行 `cd packages/flitter-core && bun test` 确认无回归

- [x] Task 11: [executor] 实现 Markdown StyleScheme 覆盖
  - 修改: `packages/flitter-core/src/widgets/markdown.ts`
  - 添加: `styleOverrides?: Partial<MarkdownStyleScheme>` 参数
  - 在各 block 渲染路径 merge styleOverrides
  - 验收: Task 5 测试全部 PASS + `bun test` 全量无回归
- [x] Task 11V: [verifier] 验证 Task 11 — 运行 `cd packages/flitter-core && bun test` 确认无回归

## Phase 3 — Input & Focus Implementation

> Task 12-14 可并行执行（各自修改不同文件）。

- [x] Task 12: [executor] 实现 TextField Emacs 键绑定
  - 修改: `packages/flitter-core/src/widgets/text-field.ts`
  - 添加: Ctrl+A(行首), Ctrl+E(行尾), Ctrl+X(剪切), Ctrl+W(删前词), Alt+B(前词), Alt+F(后词)
  - 验收: Task 3 测试全部 PASS + `bun test` 全量无回归
- [x] Task 12V: [verifier] 验证 Task 12 — 运行 `cd packages/flitter-core && bun test` 确认无回归

- [x] Task 13: [executor] 实现 ShortcutRegistry scaffold
  - 新建: `packages/flitter-core/src/input/shortcut-registry.ts`
  - 实现: `register()`, `unregister()`, `match(key, context)` 基础 API
  - 验收: Task 7B 测试全部 PASS
- [x] Task 13V: [verifier] 验证 Task 13 — 运行 shortcut-registry.test.ts 确认 PASS

- [x] Task 14: [executor] 实现 FocusTrap
  - 修改: `packages/flitter-core/src/input/focus.ts`
  - 添加: `FocusScopeNode.trapFocus: boolean` 属性
  - 修改 Tab 遍历逻辑: trapFocus 时限制在 scope 内
  - 验收: Task 7C 测试全部 PASS
- [x] Task 14V: [verifier] 验证 Task 14 — 运行 focus-trap.test.ts 确认 PASS

## Phase 4 — ACP Runtime Integration

- [x] Task 15: [executor] 实现 LiveHandle + ACP 运行时集成
  - 新建: `packages/flitter-amp/src/acp/live-handle.ts` — `LiveHandle` 类
  - 重构: `index.ts` 闭包捕获改用 `liveHandle.current`
  - 集成: `onExit` 中接入 `shouldAutoReconnect` → `ReconnectionManager`
  - 集成: `HeartbeatMonitor` 启动
  - 验收: Task 6 测试全部 PASS + `bun test` 全量无回归
- [x] Task 15V: [verifier] 验证 Task 15 — 运行 `cd packages/flitter-amp && bun test` 确认无回归

## Phase 5 — Visual Components

- [x] Task 16: [executor] 实现 WaveSpinner widget
  - 新建: `packages/flitter-core/src/widgets/wave-spinner.ts`
  - 帧序列: `[" ", "∼", "≈", "≋", "≈", "∼"]`，200ms 循环
  - 验收: Task 7A 测试全部 PASS
- [x] Task 16V: [verifier] 验证 Task 16 — 运行 wave-spinner.test.ts 确认 PASS

- [x] Task 17: [executor] StatusBar 集成 WaveSpinner + 多状态消息
  - 修改: `packages/flitter-amp/src/widgets/status-bar.ts`, `bottom-grid.ts`
  - streaming 时渲染 WaveSpinner
  - 添加 interrupted 状态消息（warning 色）
  - 编写集成测试验证
  - 验收: 集成测试 PASS + `bun test` 无回归
- [x] Task 17V: [verifier] 验证 Task 17 — 运行 `cd packages/flitter-amp && bun test` 确认无回归

## Phase 6 — P1 Polish (各子项可并行)

- [ ] Task 18A: [executor] present() 冗余清除修复 (GAP-SUM-013)
  - 修改: `packages/flitter-core/src/terminal/screen-buffer.ts`
  - 移除 `present()` 中的 `backBuffer.clear()`
  - 编写测试验证 present 后 back buffer 不被清除
- [ ] Task 18AV: [verifier] 验证 Task 18A — 运行 `bun test` 确认无回归

- [ ] Task 18B: [executor] Hyperlink OSC 8 id 支持 (GAP-SUM-015)
  - 修改: `packages/flitter-core/src/terminal/cell.ts`, `renderer.ts`
  - 扩展 `Cell.hyperlink` 为 `string | {uri: string, id?: string}`
  - 更新 renderer 输出 OSC 8 时包含 id
- [ ] Task 18BV: [verifier] 验证 Task 18B

- [ ] Task 18C: [executor] GFM 表格列对齐 (GAP-SUM-025)
  - 修改: `packages/flitter-core/src/widgets/markdown.ts`
  - 解析 `:---`, `:---:`, `---:` 对齐标记
  - 对应使用 padEnd / center / padStart
- [ ] Task 18CV: [verifier] 验证 Task 18C

- [ ] Task 18D: [executor] 代码块 fallback 背景色移除 (GAP-SUM-024)
  - 修改: `packages/flitter-core/src/widgets/markdown.ts`
  - 移除 fallback 中的 `background: bgColor`
- [ ] Task 18DV: [verifier] 验证 Task 18D

- [ ] Task 18E: [executor] ScrollController.ensureVisible API (GAP-SUM-023)
  - 修改: `packages/flitter-core/src/widgets/scroll-controller.ts`
  - 新增 `ensureVisible(offset, size)` 方法
  - 编写单元测试
- [ ] Task 18EV: [verifier] 验证 Task 18E

- [ ] Task 18F: [executor] SelectionList 自动滚动 (GAP-SUM-022)
  - 修改: `packages/flitter-core/src/widgets/selection-list.ts`
  - 用 SingleChildScrollView 包裹 + ensureVisible 调用
- [ ] Task 18FV: [verifier] 验证 Task 18F

- [ ] Task 18G: [executor] ThinkingBlock chevron 位置 + BrailleSpinner (GAP-SUM-039)
  - 修改: `packages/flitter-amp/src/widgets/thinking-block.ts`
  - 将 chevron 移至行末，重构为 StatefulWidget，streaming 时用 BrailleSpinner
- [ ] Task 18GV: [verifier] 验证 Task 18G

- [ ] Task 18H: [executor] UserMessage interrupted 状态 (GAP-SUM-040)
  - 修改: `packages/flitter-amp/src/widgets/chat-view.ts`
  - 添加 interrupted 字段 + 状态色切换（黄色 warning）
- [ ] Task 18HV: [verifier] 验证 Task 18H

- [ ] Task 18I: [executor] Copy highlight 自动消失 (GAP-SUM-034)
  - 修改: 调用 `updateSelection` 的位置
  - 添加 `setTimeout(300, () => clearSelection())` + dispose 清理
- [ ] Task 18IV: [verifier] 验证 Task 18I

- [ ] Task 18J: [executor] AmpAppColors 语义色补全 (GAP-SUM-032)
  - 修改: `packages/flitter-amp/src/themes/amp-theme-data.ts`
  - 扩展接口至 ≥30 个字段
  - 更新 `dark.ts`, `light.ts`, `index.ts` 中 `deriveAppColors()`
- [ ] Task 18JV: [verifier] 验证 Task 18J

## Phase 7 — Full Regression

- [ ] Task 19: [executor] 全量回归测试
  - 运行: `cd packages/flitter-core && bun test`
  - 运行: `cd packages/flitter-amp && bun test`
  - 运行: `pnpm -r run typecheck`
  - 所有必须通过
- [ ] Task 19V: [verifier] 验证 Task 19 — 独立运行所有命令确认结果

# Task Dependencies
- Task 1-7C 全部可并行（Phase 1: test scaffolds）
- 每个 V task 依赖其对应的 executor task
- Task 8 依赖 Task 2V | Task 9 依赖 Task 1V | Task 10 依赖 Task 4V | Task 11 依赖 Task 5V
- Task 12 依赖 Task 3V | Task 13 依赖 Task 7BV | Task 14 依赖 Task 7CV
- Task 15 依赖 Task 6V
- Task 16 依赖 Task 7AV | Task 17 依赖 Task 16V
- Task 18A-18J 可在 Phase 2-5 完成后并行
- Task 19 依赖所有 18*V
