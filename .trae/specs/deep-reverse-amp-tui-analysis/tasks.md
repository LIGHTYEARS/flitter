# Tasks

## 第 1 轮：渲染管线与布局引擎深度

- [x] Task 1: [Round-1 Agent-1] ScreenBuffer 双缓冲 + diff 算法 + SGR 序列优化对比分析
  - [x] 分析 Amp 的 RendererAPI / ScreenBuffer 混淆源码实现
  - [x] 对比 flitter-core screen-buffer.ts / renderer.ts 实现
  - [x] 记录差异并保存到 amp-tui-analysis-1.md

- [x] Task 2: [Round-1 Agent-2] BoxConstraints 布局协议 + Flex 6步算法 + 边界条件分析
  - [x] 分析 Amp 的 x0 (BoxConstraints) / RenderFlex 混淆源码
  - [x] 对比 flitter-core box-constraints.ts / render-flex.ts
  - [x] 记录差异并保存到 amp-tui-analysis-2.md

- [x] Task 3: [Round-1 Agent-3] PaintContext 裁剪栈 + 层合成 + Z-order 绘制顺序分析
  - [x] 分析 Amp 的 ClippedScreenBuffer / paint pipeline 实现
  - [x] 对比 flitter-core paint-context.ts / clip-canvas.ts
  - [x] 记录差异并保存到 amp-tui-analysis-3.md

## 第 2 轮：输入系统与终端协议

- [x] Task 4: [Round-2 Agent-4] InputParser 终端协议解析全对比
  - [x] 分析 Amp 的 InputParser 混淆源码（CSI/SS3/OSC/DCS/Kitty keyboard）
  - [x] 对比 flitter-core input-parser.ts
  - [x] 记录差异并保存到 amp-tui-analysis-4.md

- [x] Task 5: [Round-2 Agent-5] Focus 树 + 键盘事件冒泡 + Tab 遍历 + 快捷键
  - [x] 分析 Amp 的 c8 (FocusNode) / Xh (FocusManager) 混淆源码
  - [x] 对比 flitter-core focus.ts / keyboard.ts / shortcuts.ts
  - [x] 记录差异并保存到 amp-tui-analysis-5.md

- [x] Task 6: [Round-2 Agent-6] 鼠标系统 + HitTest + Cursor 管理
  - [x] 分析 Amp 的鼠标事件处理混淆源码
  - [x] 对比 flitter-core mouse.ts / mouse-manager.ts / hit-test.ts
  - [x] 记录差异并保存到 amp-tui-analysis-6.md

## 第 3 轮：滚动系统与文本渲染

- [x] Task 7: [Round-3 Agent-7] ScrollView/Viewport 实现 + followMode + 虚拟化
  - [x] 分析 Amp 的 U8 (ScrollView) / cr (ScrollController) 混淆源码
  - [x] 对比 flitter-core scroll-view.ts / scroll-controller.ts
  - [x] 记录差异并保存到 amp-tui-analysis-7.md

- [x] Task 8: [Round-3 Agent-8] RenderText 文本测量 + 换行 + 截断 + wcwidth + emoji
  - [x] 分析 Amp 的 RenderText 混淆源码中的文本布局算法
  - [x] 对比 flitter-core text.ts / wcwidth.ts
  - [x] 记录差异并保存到 amp-tui-analysis-8.md

- [x] Task 9: [Round-3 Agent-9] Markdown AST→Widget + 语法高亮 + 代码块渲染
  - [x] 分析 Amp 的 Markdown 渲染混淆源码
  - [x] 对比 flitter-core markdown.ts / syntax-highlight.ts
  - [x] 记录差异并保存到 amp-tui-analysis-9.md

## 第 4 轮：组件系统与状态管理

- [x] Task 10: [Round-4 Agent-10] Widget/Element/RenderObject 三树生命周期对比
  - [x] 分析 Amp 的三树 reconciliation + 更新 + 回收机制
  - [x] 对比 flitter-core widget.ts / element.ts / render-object.ts
  - [x] 记录差异并保存到 amp-tui-analysis-10.md

- [x] Task 11: [Round-4 Agent-11] InheritedWidget 依赖追踪 + Theme 传播机制
  - [x] 分析 Amp 的 Ea (InheritedWidget) / Y0 (Theme) 混淆源码
  - [x] 对比 flitter-core widget.ts (InheritedWidget) / theme.ts / app-theme.ts
  - [x] 记录差异并保存到 amp-tui-analysis-11.md

- [x] Task 12: [Round-4 Agent-12] StatefulWidget 状态管理 + setState 调度 + 错误边界
  - [x] 分析 Amp 的 zT (StatefulWidget) / UT (State) / BuildOwner 错误处理
  - [x] 对比 flitter-core widget.ts / build-owner.ts / error-widget.ts
  - [x] 记录差异并保存到 amp-tui-analysis-12.md

## 第 5 轮：应用层组件与交互

- [x] Task 13: [Round-5 Agent-13] TextField/TextEditingController 完整能力对比
  - [x] 分析 Amp 的 TextField 混淆源码（选区/剪贴板/IME/多行/undo）
  - [x] 对比 flitter-core text-field.ts
  - [x] 记录差异并保存到 amp-tui-analysis-13.md

- [x] Task 14: [Round-5 Agent-14] Dialog/CommandPalette/FilePicker 模态系统
  - [x] 分析 Amp 的模态/overlay 管理混淆源码
  - [x] 对比 flitter-core dialog.ts + flitter-amp command-palette.ts / permission-dialog.ts / file-picker.ts
  - [x] 记录差异并保存到 amp-tui-analysis-14.md

- [x] Task 15: [Round-5 Agent-15] 动画系统 + 定时器 + 性能监控
  - [x] 分析 Amp 的动画/定时器/PerformanceOverlay 混淆源码
  - [x] 对比 flitter-core braille-spinner.ts / frame-stats.ts / perf-overlay.ts + flitter-amp 动画实现
  - [x] 记录差异并保存到 amp-tui-analysis-15.md

# Task Dependencies
- Round 1 [Task 1, 2, 3] 可完全并行
- Round 2 [Task 4, 5, 6] 可完全并行
- Round 3 [Task 7, 8, 9] 可完全并行
- Round 4 [Task 10, 11, 12] 可完全并行
- Round 5 [Task 13, 14, 15] 可完全并行
- 各轮之间无依赖关系，但建议顺序执行以逐步深入
