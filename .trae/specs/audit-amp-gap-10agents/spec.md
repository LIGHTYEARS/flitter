# Amp vs Flitter 全面 Gap 审计 Spec

## Why
已有的 `.gap/` 目录中 71 个 gap 文件是早期分析产物，部分已被修复但状态未更新，且缺少对最新代码变更（Border 独立绘制、focus 修复、工具名映射重构、主题系统、BottomGrid 等）的覆盖。需要 10 个 subagent 并行对比 Amp 源码（`.ref/amp-cli/` 中的混淆 JS + 15 份分析报告）与当前 flitter-core / flitter-amp 实现，产出一份去重、分优先级、可直接执行的 gap 清单。

## What Changes
- 10 个 subagent 分别负责一个领域，阅读 Amp 混淆源码 + 已有分析报告 + flitter 当前实现，输出结构化 gap 报告
- 每个 subagent 的报告写入 `packages/flitter-amp/.ref/amp-cli/gap-audit-{N}.md`
- 最终由主 agent 汇总去重，产出 `packages/flitter-amp/.ref/amp-cli/GAP-AUDIT-SUMMARY.md`

## Impact
- Affected code: `packages/flitter-core/src/**`, `packages/flitter-amp/src/**`
- Affected specs: 所有后续功能迭代的优先级排序
- Affected docs: `.gap/` 目录的状态更新

## ADDED Requirements

### Requirement: 10 领域并行 Gap 审计
系统 SHALL 通过 10 个独立 subagent 完成以下领域的 gap 审计：

| Agent | 领域 | Amp 参考源 | Flitter 对比文件 |
|-------|------|-----------|-----------------|
| 1 | 渲染管线 (ScreenBuffer/diff/SGR) | analysis-1.md + renderer 源码 | `terminal/screen-buffer.ts`, `terminal/renderer.ts`, `scheduler/paint-context.ts` |
| 2 | 布局引擎 (BoxConstraints/Flex) | analysis-2.md + flex 源码 | `core/box-constraints.ts`, `layout/render-flex.ts`, `layout/render-constrained.ts` |
| 3 | 输入系统 (键盘/鼠标/Focus) | analysis-4,5,6.md | `input/*.ts` |
| 4 | 滚动与视口 (ScrollView/Viewport) | analysis-7.md | `widgets/scroll-view.ts`, `widgets/scrollbar.ts`, `widgets/scroll-controller.ts` |
| 5 | 文本渲染 (RenderText/wcwidth/Markdown) | analysis-8,9.md | `widgets/text.ts`, `core/wcwidth.ts`, `widgets/markdown.ts`, `widgets/syntax-highlight.ts` |
| 6 | 三树生命周期 (Widget/Element/RenderObject) | analysis-10,11,12.md | `framework/widget.ts`, `framework/element.ts`, `framework/render-object.ts` |
| 7 | 应用层组件 (TextField/Dialog/FilePicker) | analysis-13,14.md | `widgets/text-field.ts`, `widgets/dialog.ts`, flitter-amp `widgets/*.ts` |
| 8 | 主题与动画 | analysis-15.md + theme JS | flitter-amp `themes/*.ts`, `widgets/density-orb-widget.ts`, `core/animation/` |
| 9 | ACP 协议与状态管理 | Amp 运行时行为 | flitter-amp `acp/*.ts`, `state/*.ts` |
| 10 | 视觉还原度 (像素级对比) | Amp TUI 截图 + `.ref/amp-cli/*.js` | flitter-amp `widgets/chat-view.ts`, `widgets/bottom-grid.ts`, `widgets/status-bar.ts` |

#### Scenario: 每个 Agent 完成审计
- **WHEN** subagent 读取 Amp 参考源和 flitter 对应文件
- **THEN** 输出结构化报告，包含：gap 编号、标题、优先级(P0/P1/P2)、影响范围、Amp 行为描述、flitter 当前行为、建议修复方向
- **AND** 标注已有 `.gap/` 文件中已覆盖但未修复的 gap 编号

### Requirement: 汇总去重报告
系统 SHALL 汇总 10 份报告为一份 `GAP-AUDIT-SUMMARY.md`。

#### Scenario: 汇总完成
- **WHEN** 所有 10 个 subagent 完成
- **THEN** 主 agent 合并去重，按 P0/P1/P2 分类排序
- **AND** 对已有 `.gap/` 编号进行交叉引用标注
