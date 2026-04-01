# Checklist

## Phase 1 — Test Scaffolds
- [x] `render-flex-safety.test.ts` 存在且包含 ≥4 个测试用例
- [x] `box-constraints-api.test.ts` 存在且包含 ≥5 个测试用例
- [x] `text-field-emacs.test.ts` 存在且包含 ≥6 个测试用例
- [x] `renderer-cursor-opt.test.ts` 存在且包含 ≥4 个测试用例
- [x] `markdown-style-override.test.ts` 存在且包含 ≥2 个测试用例
- [x] `acp-reconnection-integration.test.ts` 存在且包含 ≥5 个测试用例
- [x] `wave-spinner.test.ts` 存在且包含 ≥3 个测试用例
- [x] `shortcut-registry.test.ts` 存在且包含 ≥3 个测试用例
- [x] `focus-trap.test.ts` 存在且包含 ≥2 个测试用例

## Phase 2 — Core Engine
- [x] `BoxConstraints.normalize()` 存在且通过测试
- [x] `BoxConstraints.tighten()` 存在且通过测试
- [x] `BoxConstraints.isNormalized` 包含 `>= 0` 检查
- [x] `RenderFlex._hasOverflow` 字段存在且溢出时为 true
- [x] `RenderFlex` 在 Infinity 主轴 + Expanded 时子项不收到 Infinity
- [x] `Renderer` 连续 cell 不输出 CUP
- [x] `Renderer` 过滤控制字符
- [x] `Markdown` 接受 `styleOverrides` 参数

## Phase 3 — Input & Focus
- [x] Ctrl+A 在 TextField 中执行行首移动
- [x] Ctrl+E 在 TextField 中执行行尾移动
- [x] Ctrl+X 在 TextField 中执行剪切
- [x] Alt+B / Alt+F 在 TextField 中执行词移动
- [x] `ShortcutRegistry` 类存在且有 register/match API
- [x] `FocusScopeNode.trapFocus` 属性存在

## Phase 4 — ACP Runtime
- [x] `LiveHandle` 类存在于 `acp/live-handle.ts`
- [x] `index.ts` 使用 `liveHandle.current` 而非直接捕获 handle
- [x] `onExit` 回调中调用 `shouldAutoReconnect`
- [x] `ReconnectionManager` 在运行时被实际 import 和调用
- [x] `HeartbeatMonitor` 在运行时被实际 import 和启动

## Phase 5 — Visual Components
- [x] `WaveSpinner` widget 存在且渲染 6 帧动画
- [x] StatusBar 在 streaming 时展示 WaveSpinner
- [x] UserMessage 区分 interrupted 状态

## Phase 6 — Polish
- [ ] `present()` 不再冗余清除 back buffer
- [ ] `Cell.hyperlink` 支持 `{uri, id}` 结构
- [ ] GFM 表格列对齐生效
- [ ] `ScrollController.ensureVisible()` API 存在
- [ ] ThinkingBlock chevron 在行末
- [ ] AmpAppColors 接口包含 ≥30 个语义色字段

## Final
- [ ] `cd packages/flitter-core && bun test` 全部通过
- [ ] `cd packages/flitter-amp && bun test` 全部通过
- [ ] `pnpm -r run typecheck` 全部通过
