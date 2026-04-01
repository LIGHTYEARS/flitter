# Tasks

## Wave 1: 10 Agent 并行审计（全部可并行）

- [x] Task 1: [Agent-1] 渲染管线 Gap 审计 (ScreenBuffer / diff 算法 / SGR 序列 / 双缓冲)
  - [x] 读取 `packages/flitter-amp/.ref/amp-cli/amp-tui-analysis-1.md` 了解 Amp 渲染管线实现
  - [x] 读取 `packages/flitter-core/src/terminal/screen-buffer.ts`, `renderer.ts`, `cell.ts`
  - [x] 读取 `packages/flitter-core/src/scheduler/paint-context.ts`, `clip-canvas.ts`, `paint.ts`
  - [x] 读取 `packages/flitter-core/src/rendering/cell-layer.ts`, `render-repaint-boundary.ts`
  - [x] 交叉引用 `.gap/` 中 R01-R12 相关文件，标注哪些已修复
  - [x] 输出结构化报告到 `packages/flitter-amp/.ref/amp-cli/gap-audit-1.md`

- [x] Task 2: [Agent-2] 布局引擎 Gap 审计 (BoxConstraints / Flex 6步算法 / 边界条件)
  - [x] 读取 `packages/flitter-amp/.ref/amp-cli/amp-tui-analysis-2.md`
  - [x] 读取 `packages/flitter-core/src/core/box-constraints.ts`
  - [x] 读取 `packages/flitter-core/src/layout/render-flex.ts`, `render-constrained.ts`, `render-padded.ts`, `render-decorated.ts`, `render-table.ts`, `render-sticky-header.ts`
  - [x] 读取 `packages/flitter-core/src/layout/layout-helpers.ts`, `parent-data.ts`
  - [x] 交叉引用 `.gap/` 中 R01-R12 布局相关文件
  - [x] 输出结构化报告到 `packages/flitter-amp/.ref/amp-cli/gap-audit-2.md`

- [x] Task 3: [Agent-3] 输入系统 Gap 审计 (键盘协议 / Focus 树 / 鼠标 / HitTest)
  - [x] 读取 `packages/flitter-amp/.ref/amp-cli/amp-tui-analysis-4.md` (InputParser)
  - [x] 读取 `packages/flitter-amp/.ref/amp-cli/amp-tui-analysis-5.md` (Focus)
  - [x] 读取 `packages/flitter-amp/.ref/amp-cli/amp-tui-analysis-6.md` (鼠标)
  - [x] 读取 `packages/flitter-core/src/input/*.ts` 全部文件
  - [x] 交叉引用 `.gap/` 中 U07(focus-restoration), R03(hit-test), R12(unify-hit-test) 等
  - [x] 输出结构化报告到 `packages/flitter-amp/.ref/amp-cli/gap-audit-3.md`

- [x] Task 4: [Agent-4] 滚动与视口 Gap 审计 (ScrollView / Viewport / followMode / 虚拟化)
  - [x] 读取 `packages/flitter-amp/.ref/amp-cli/amp-tui-analysis-7.md`
  - [x] 读取 `packages/flitter-core/src/widgets/scroll-view.ts`, `scroll-controller.ts`, `scrollbar.ts`
  - [x] 读取 `packages/flitter-core/src/widgets/sticky-header.ts`
  - [x] 交叉引用 `.gap/` 中 R07(scrollbar), R09(breakpoints) 等
  - [x] 输出结构化报告到 `packages/flitter-amp/.ref/amp-cli/gap-audit-4.md`

- [x] Task 5: [Agent-5] 文本渲染 Gap 审计 (RenderText / wcwidth / Markdown / 语法高亮)
  - [x] 读取 `packages/flitter-amp/.ref/amp-cli/amp-tui-analysis-8.md` (文本)
  - [x] 读取 `packages/flitter-amp/.ref/amp-cli/amp-tui-analysis-9.md` (Markdown)
  - [x] 读取 `packages/flitter-core/src/widgets/text.ts`, `markdown.ts`, `syntax-highlight.ts`
  - [x] 读取 `packages/flitter-core/src/core/wcwidth.ts`, `text-style.ts`, `text-span.ts`
  - [x] 交叉引用 `.gap/` 中 R11(CJK), U15(inline-nesting), SH01, SH02 等
  - [x] 输出结构化报告到 `packages/flitter-amp/.ref/amp-cli/gap-audit-5.md`

- [x] Task 6: [Agent-6] 三树生命周期 Gap 审计 (Widget/Element/RenderObject reconciliation)
  - [x] 读取 `packages/flitter-amp/.ref/amp-cli/amp-tui-analysis-10.md` (三树)
  - [x] 读取 `packages/flitter-amp/.ref/amp-cli/amp-tui-analysis-11.md` (InheritedWidget)
  - [x] 读取 `packages/flitter-amp/.ref/amp-cli/amp-tui-analysis-12.md` (StatefulWidget)
  - [x] 读取 `packages/flitter-core/src/framework/widget.ts`, `element.ts`, `render-object.ts`, `build-owner.ts`, `pipeline-owner.ts`, `binding.ts`, `error-widget.ts`
  - [x] 交叉引用 `.gap/` 中 F01-F10 全部文件
  - [x] 输出结构化报告到 `packages/flitter-amp/.ref/amp-cli/gap-audit-6.md`

- [x] Task 7: [Agent-7] 应用层组件 Gap 审计 (TextField / Dialog / FilePicker / CommandPalette)
  - [x] 读取 `packages/flitter-amp/.ref/amp-cli/amp-tui-analysis-13.md` (TextField)
  - [x] 读取 `packages/flitter-amp/.ref/amp-cli/amp-tui-analysis-14.md` (模态系统)
  - [x] 读取 `packages/flitter-core/src/widgets/text-field.ts`, `dialog.ts`, `dialog-overlay.ts`, `autocomplete.ts`
  - [x] 读取 `packages/flitter-amp/src/widgets/command-palette.ts`, `file-picker.ts`, `permission-dialog.ts`, `input-area.ts`
  - [x] 交叉引用 `.gap/` 中 U01-U06, S10 等
  - [x] 输出结构化报告到 `packages/flitter-amp/.ref/amp-cli/gap-audit-7.md`

- [x] Task 8: [Agent-8] 主题与动画 Gap 审计 (RGB 主题 / Perlin Noise / 动画框架)
  - [x] 读取 `packages/flitter-amp/.ref/amp-cli/amp-tui-analysis-15.md` (动画)
  - [x] 读取 Amp 主题源: `app-theme-x1.js`, `terminal-theme-DSH.js`, `color-scheme-wd.js`, `agent-mode-colors-Ym.js`, `rgb-theme-mapping-PC.js`
  - [x] 读取 `packages/flitter-amp/src/themes/*.ts` 全部主题文件
  - [x] 读取 `packages/flitter-core/src/animation/*.ts`
  - [x] 读取 `packages/flitter-amp/src/widgets/density-orb-widget.ts`, `glow-text.ts`, `streaming-cursor.ts`
  - [x] 交叉引用 `.gap/` 中 A01-A04, U14(动画), U16(cursor blink) 等
  - [x] 输出结构化报告到 `packages/flitter-amp/.ref/amp-cli/gap-audit-8.md`

- [x] Task 9: [Agent-9] ACP 协议与状态管理 Gap 审计 (连接/重连/心跳/类型安全/会话持久化)
  - [x] 读取 `packages/flitter-amp/src/acp/*.ts` 全部文件 (client.ts, connection.ts, types.ts, heartbeat-monitor.ts, reconnection-manager.ts, graceful-shutdown.ts, ping.ts, timeout.ts, capabilities.ts, exit-classifier.ts, activity-tracker.ts)
  - [x] 读取 `packages/flitter-amp/src/state/*.ts` 全部文件 (app-state.ts, conversation.ts, session-store.ts, config.ts, history.ts, overlay-manager.ts, immutable-types.ts, connection-state.ts)
  - [x] 交叉引用 `.gap/` 中 P01-P06, S03-S08 全部文件
  - [x] 输出结构化报告到 `packages/flitter-amp/.ref/amp-cli/gap-audit-9.md`

- [x] Task 10: [Agent-10] 视觉还原度 Gap 审计 (ChatView / BottomGrid / StatusBar / ToolCall / 消息渲染)
  - [x] 读取 Amp 消息渲染源: `user-message-Sa.js`, `assistant-message-XkL.js`, `selected-user-message-RQ.js`, `thinking-block-zk.js`
  - [x] 读取 Amp 工具源: `tool-header-wQ.js`, `tool-call-header-xD.js`, `status-icon-rR.js`, `status-color-j0.js`, `expand-collapse-lT.js`
  - [x] 读取 Amp 状态栏源: `prompt-bar-F0H.js`, `footer-status-dy.js`, `status-bar-iJH.js`, `braille-spinner-Af.js`
  - [x] 读取 `packages/flitter-amp/src/widgets/*.ts` 全部文件
  - [x] 读取 `packages/flitter-amp/src/widgets/tool-call/*.ts` 全部文件
  - [x] 交叉引用 `.gap/` 中 T01-T06, U11-U16 等
  - [x] 输出结构化报告到 `packages/flitter-amp/.ref/amp-cli/gap-audit-10.md`

## Wave 2: 汇总（依赖 Wave 1 全部完成）

- [x] Task 11: 汇总 10 份报告，去重合并，产出 `GAP-AUDIT-SUMMARY.md`
  - [x] 读取 gap-audit-1.md 到 gap-audit-10.md
  - [x] 去重（同一 gap 被多个 agent 提到时合并）
  - [x] 按 P0/P1/P2 分类排序
  - [x] 交叉引用已有 `.gap/` 编号
  - [x] 写入 `packages/flitter-amp/.ref/amp-cli/GAP-AUDIT-SUMMARY.md`

# Task Dependencies
- Task 1-10 全部可并行（Wave 1）
- Task 11 依赖 Task 1-10 全部完成（Wave 2）
