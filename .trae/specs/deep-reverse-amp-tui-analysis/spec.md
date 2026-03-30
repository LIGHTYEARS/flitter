# Amp CLI TUI 深度逆向分析 Spec

## Why

前一轮分析 (`analyze-amp-chatview-tui`) 已完成 Amp CLI Chat View 的组件级分析并实现了核心功能（StickyHeader、Autocomplete、主题系统、ToolCallWidget、PromptBar、BottomGrid）。但仍有大量**实现细节级差异**未被系统性发现和记录，包括：渲染管线的微观行为、布局算法的边界条件处理、输入系统的协议级兼容性、滚动/焦点/选区的交互细节、错误恢复机制、性能优化手段等。

本轮分析旨在**代码指令级**深挖 Amp CLI 混淆源码中的 TUI framework 实现，与 flitter-core / flitter-amp 逐一对比，找出所有遗漏的能力差异。

## What Changes

- 产出 **15 个独立分析文件**（5 轮 × 3 个 subagent），保存于 `packages/flitter-amp/.ref/amp-cli/` 目录
- 每个文件命名为 `amp-tui-analysis-{N}.md`（N=1..15）
- 每个文件聚焦一个具体子系统或功能域，包含：逆向发现、Amp 实现细节、flitter 对应实现、差异对比表、建议修复方案

## Impact

- Affected code: `packages/flitter-core/`、`packages/flitter-amp/`
- 产出物为分析文档，不涉及代码修改
- 为后续精确补齐 flitter 能力提供完整路线图

## 分析域规划（5 轮 × 3 subagent）

### 第 1 轮：渲染管线与布局引擎深度
- Agent 1: ScreenBuffer 双缓冲 + diff 算法 + SGR 序列优化（对比 Amp 的 RendererAPI）
- Agent 2: BoxConstraints 布局协议 + Flex 6步算法 + 边界条件（Infinity/Zero/Intrinsic）
- Agent 3: PaintContext 裁剪栈 + 层合成 + Z-order 绘制顺序

### 第 2 轮：输入系统与终端协议
- Agent 4: InputParser 协议解析（CSI/SS3/OSC/DCS/Kitty keyboard protocol）对比
- Agent 5: Focus 树 + 键盘事件冒泡 + Tab 遍历 + 快捷键系统
- Agent 6: 鼠标系统（SGR mouse/X10/URxvt）+ HitTest + Cursor 管理

### 第 3 轮：滚动系统与文本渲染
- Agent 7: ScrollView/ScrollController/Viewport 实现 + followMode + 虚拟化
- Agent 8: RenderText 文本测量 + 换行 + 截断 + wcwidth + emoji 处理
- Agent 9: Markdown AST→Widget 映射 + 语法高亮 + 代码块渲染

### 第 4 轮：组件系统与状态管理
- Agent 10: Widget/Element/RenderObject 三树生命周期 + 更新/差异/回收
- Agent 11: InheritedWidget 依赖追踪 + Theme/AppTheme 传播机制
- Agent 12: StatefulWidget 状态管理 + setState 调度 + 错误边界

### 第 5 轮：应用层组件与交互
- Agent 13: TextField/TextEditingController 完整能力对比（选区/剪贴板/IME/多行）
- Agent 14: Dialog/CommandPalette/FilePicker 模态系统 + overlay 管理
- Agent 15: 动画系统 + 定时器管理 + 性能监控（PerformanceOverlay/FrameStats）

## ADDED Requirements

### Requirement: 深度逆向分析报告
系统 SHALL 产出 15 份独立的深度分析文档，每份覆盖一个特定子系统。

#### Scenario: 每份分析文档的结构
- **WHEN** subagent 完成分析
- **THEN** 文档包含：1) Amp 混淆源码中的实现细节，2) flitter 对应实现的代码位置，3) 逐项差异对比表，4) 优先级排序的差异修复建议
