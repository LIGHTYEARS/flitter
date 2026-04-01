# Amp vs Flitter 全面 Gap 审计汇总

> 审计日期: 2026-03-31
> 覆盖领域: 渲染管线、布局引擎、输入系统、滚动视口、文本渲染、三树生命周期、应用层组件、主题动画、ACP协议、视觉还原度

## 统计概览

| 优先级 | 数量 | 说明 |
|--------|------|------|
| P0 | 10 | 阻断核心功能 |
| P1 | 30 | 明显可见差异 |
| P2 | 39 | 质量提升 |

---

## P0 Gap 清单

### GAP-SUM-001: ReconnectionManager / HeartbeatMonitor / ActivityTracker 未集成到运行时（死代码）
- **来源**: Agent-9 (GAP-9-001)
- **优先级**: P0
- **影响范围**: `flitter-amp/src/index.ts`, `src/acp/reconnection-manager.ts`, `src/acp/heartbeat-monitor.ts`, `src/acp/activity-tracker.ts`
- **Amp 行为**: Amp 对网络中断有完备的恢复机制（指数退避重试）
- **Flitter 现状**: `ReconnectionManager`(116行)、`HeartbeatMonitor`(234行)、`ActivityTracker`(40行)、`shouldAutoReconnect`、`pingAgent` 已实现并通过单测，但**从未被 import 到运行时代码**。Agent 崩溃时 TUI 进入不可恢复错误状态
- **已有 .gap 引用**: `.gap/57`(标记 IMPLEMENTED 但未集成), `.gap/58`(同上)
- **建议修复方向**: 在 `index.ts` 的 `onExit` 回调中调用 `shouldAutoReconnect` 决策，启动 `ReconnectionManager`，集成 `HeartbeatMonitor`

### GAP-SUM-002: ConnectionHandle 无法热替换（缺少 LiveHandle 间接层）
- **来源**: Agent-9 (GAP-9-002)
- **优先级**: P0
- **影响范围**: `flitter-amp/src/index.ts`, `src/acp/connection.ts`
- **Amp 行为**: Amp 不使用 ACP 子进程模型，不存在此需求
- **Flitter 现状**: `handleSubmit`/`handleCancel` 闭包捕获的是 `handle` 初始值，重连后产生新 `ConnectionHandle` 时闭包仍持有已死亡的旧连接
- **已有 .gap 引用**: `.gap/57`(设计了 LiveHandle 但未实现)
- **建议修复方向**: 创建 `LiveHandle` 类，所有消费者通过 `liveHandle.current` 间接访问

### GAP-SUM-003: Renderer 缺少连续 cell 光标跳跃优化
- **来源**: Agent-1 (GAP-1-001)
- **优先级**: P0
- **影响范围**: `flitter-core/src/terminal/renderer.ts`
- **Amp 行为**: Amp 追踪 `currentX`/`currentY`，连续同色 cell 跳过 CUP/SGR 重输出
- **Flitter 现状**: 每个 `CellPatch` 无条件输出 `CURSOR_MOVE`，跨 patch 光标连续性未追踪
- **已有 .gap 引用**: 无
- **建议修复方向**: 添加 `currentCol`/`currentRow` 状态追踪，仅位置不连续时输出 CUP。预计减少 5-15% 输出字节

### GAP-SUM-004: RenderFlex 缺少溢出检测 (_overflow)
- **来源**: Agent-2 (GAP-2-001)
- **优先级**: P0
- **影响范围**: `flitter-core/src/layout/render-flex.ts`
- **Amp 行为**: Amp/Flutter 检测 `allocatedSize > maxMain`，设置 `_overflow` 字段，debug 模式输出警告
- **Flitter 现状**: 完全没有溢出检测逻辑，非弹性子项超出可用空间时弹性子项静默获得 0 空间，无诊断
- **已有 .gap 引用**: 无
- **建议修复方向**: 添加 `_overflow` 字段 + 检测逻辑 + debug 警告

### GAP-SUM-005: RenderFlex 在 Infinity 主轴下弹性子项行为不安全
- **来源**: Agent-2 (GAP-2-002)
- **优先级**: P0
- **影响范围**: `flitter-core/src/layout/render-flex.ts`
- **Amp 行为**: Flutter 在 `maxMain = Infinity` 且存在弹性子项时触发断言失败
- **Flitter 现状**: Column 在 ScrollView 内含 Expanded 子项时，`spacePerFlex = Infinity`，子项收到 `tight(Infinity)` 约束，不崩溃但布局不正确
- **已有 .gap 引用**: 无
- **建议修复方向**: 添加 `canFlex = Number.isFinite(mainAxisLimit)` 检查，不可 flex 时 `freeSpace = 0`

### GAP-SUM-006: TextField Ctrl+A 行为与 Amp 不一致
- **来源**: Agent-7 (GAP-7-001)
- **优先级**: P0
- **影响范围**: `flitter-core/src/widgets/text-field.ts`
- **Amp 行为**: Ctrl+A = Emacs 风格**行首移动** (moveCursorLineHome)
- **Flitter 现状**: Ctrl+A = `selectAll()` (全选)，与 Amp 语义冲突，Emacs 用户无法行首移动
- **已有 .gap 引用**: 无
- **建议修复方向**: 将 Ctrl+A 改为 `moveCursorLineHome()`

### GAP-SUM-007: TextField 缺少 Ctrl+X 剪切操作
- **来源**: Agent-7 (GAP-7-002)
- **优先级**: P0
- **影响范围**: `flitter-core/src/widgets/text-field.ts`
- **Amp 行为**: Ctrl+X = OSC 52 剪贴板复制 + 删除选区
- **Flitter 现状**: Ctrl+X 无响应，基础文本编辑操作缺失
- **已有 .gap 引用**: 无
- **建议修复方向**: 添加 Ctrl+X 处理分支

### GAP-SUM-008: Markdown StyleScheme 覆盖机制缺失
- **来源**: Agent-5 (GAP-5-001)
- **优先级**: P0
- **影响范围**: `flitter-core/src/widgets/markdown.ts`
- **Amp 行为**: Markdown Widget 接受 `styleScheme` 参数，Thinking block 使用 dim+italic 样式区分
- **Flitter 现状**: Markdown 构造函数无 styleOverrides 参数，Thinking block 中渲染的 Markdown 与 assistant message 无法区分
- **已有 .gap 引用**: 无
- **建议修复方向**: 添加 `styleOverrides?: MarkdownStyleOverrides` 参数，约 30 行修改

### GAP-SUM-009: 缺少 Wave Spinner 状态栏动画
- **来源**: Agent-8 (GAP-8-001), Agent-10 (GAP-10-016)
- **优先级**: P0
- **影响范围**: `flitter-amp/src/widgets/bottom-grid.ts` 状态栏
- **Amp 行为**: 状态栏在 streaming/processing 时显示 Wave Spinner 动画 `[" ", "∼", "≈", "≋", "≈", "∼"]`，200ms 循环
- **Flitter 现状**: 状态栏完全无动画指示器，代码库中搜索 `WaveSpinner` 零匹配
- **已有 .gap 引用**: 无
- **建议修复方向**: 新建 `WaveSpinner` StatefulWidget，6帧循环 200ms

### GAP-SUM-010: Shortcut 系统缺乏层级优先级和冲突检测
- **来源**: Agent-3 (GAP-3-008)
- **优先级**: P0（原 P1 提升，因快捷键系统仅 30% 对齐度）
- **影响范围**: `flitter-core/src/input/shortcuts.ts`, `event-dispatcher.ts`
- **Amp 行为**: 组件间快捷键集中管理，支持优先级和上下文限定
- **Flitter 现状**: `shortcuts.ts` 仅 37 行，无 `ShortcutRegistry` 类、无分类、无发现机制、无冲突检测。快捷键匹配散落在各组件 `onKey` 回调中
- **已有 .gap 引用**: `.gap/30`(shortcut-registry，未实现)
- **建议修复方向**: 按 .gap/30 设计实现 `ShortcutRegistry`

---

## P1 Gap 清单

### GAP-SUM-011: Focus Trap（焦点陷阱）未实现
- **来源**: Agent-3 (GAP-3-004)
- **优先级**: P1
- **影响范围**: `flitter-core/src/input/focus.ts`
- **Amp 行为**: Dialog/CommandPalette 使用 FocusTrap 限制 Tab 遍历范围
- **Flitter 现状**: Tab/Shift+Tab 在整棵树的所有可遍历节点间轮转，overlay 打开时焦点会跳出
- **已有 .gap 引用**: 无
- **建议修复方向**: 在 `FocusScopeNode` 上添加 `trapFocus: boolean` 属性

### GAP-SUM-012: Kitty CSI u 格式解析缺失
- **来源**: Agent-3 (GAP-3-001)
- **优先级**: P1
- **影响范围**: `flitter-core/src/input/input-parser.ts`
- **Amp 行为**: Amp 同样缺失，但终端层已启用 Kitty 协议
- **Flitter 现状**: InputParser 不识别 CSI u 格式，开启 Kitty 协议后所有按键事件以 CSI u 上报，全部丢失
- **已有 .gap 引用**: 无
- **建议修复方向**: 在 `_resolveCSI()` 增加 CSI u 终止符分支

### GAP-SUM-013: present() 冗余清除 back buffer
- **来源**: Agent-1 (GAP-1-002)
- **优先级**: P1
- **影响范围**: `flitter-core/src/terminal/screen-buffer.ts`
- **Amp 行为**: `present()` 是纯指针交换，不清除 back buffer
- **Flitter 现状**: `present()` 交换后立即 `backBuffer.clear()`，而 `paint()` 中也有 `screen.clear()`，back buffer 每帧被清除两次
- **已有 .gap 引用**: `.gap/12` Phase 2 提到消除全屏清除
- **建议修复方向**: 移除 `present()` 中的 `backBuffer.clear()` 调用

### GAP-SUM-014: 缺少控制字符过滤
- **来源**: Agent-1 (GAP-1-003)
- **优先级**: P1
- **影响范围**: `flitter-core/src/terminal/renderer.ts`
- **Amp 行为**: Amp 有 `isControlChar(char)` 检测和替换逻辑
- **Flitter 现状**: 直接 `parts.push(cell.char)`，无控制字符检查，可能导致终端钟声/ESC注入/状态异常
- **已有 .gap 引用**: 无
- **建议修复方向**: 增加控制字符过滤（U+0000-U+001F / U+007F / U+0080-U+009F → 空格）

### GAP-SUM-015: Hyperlink 缺少 OSC 8 `id` 参数支持
- **来源**: Agent-1 (GAP-1-004)
- **优先级**: P1
- **影响范围**: `flitter-core/src/terminal/cell.ts`, `renderer.ts`
- **Amp 行为**: Cell 使用 `hyperlink: { uri, id }`，终端用 id 识别跨行同一链接
- **Flitter 现状**: `Cell.hyperlink` 仅为 `string | undefined`（仅 URI），无 id 字段
- **已有 .gap 引用**: 无
- **建议修复方向**: 扩展 `Cell.hyperlink` 类型支持 id

### GAP-SUM-016: RepaintBoundary Phase 2/3 未实现（全屏 clear + 全量 diff）
- **来源**: Agent-1 (GAP-1-005, GAP-1-012)
- **优先级**: P1
- **影响范围**: `flitter-core/src/framework/binding.ts`, `screen-buffer.ts`
- **Amp 行为**: Amp 同样全量 paint+diff，但 Flitter 的 RepaintBoundary Phase 1 已超越
- **Flitter 现状**: `screen.clear()` 每帧全屏清除，破坏 clean boundary 的 blit 效果；`getDiff()` 仍全扫描 W×H
- **已有 .gap 引用**: `.gap/12` Phase 2 + Phase 3
- **建议修复方向**: 改为选择性区域清除 + dirty region diff

### GAP-SUM-017: BoxConstraints 缺少 normalize() 方法
- **来源**: Agent-2 (GAP-2-003)
- **优先级**: P1
- **影响范围**: `flitter-core/src/layout/box-constraints.ts`
- **Amp 行为**: Amp/Flutter 提供 `normalize()` 修复 `min > max` 非法状态
- **Flitter 现状**: 完全缺失，假设调用方总传合法值
- **已有 .gap 引用**: 无
- **建议修复方向**: 添加 `normalize(): BoxConstraints` 方法

### GAP-SUM-018: BoxConstraints.isNormalized 检查不完整
- **来源**: Agent-2 (GAP-2-004)
- **优先级**: P1
- **影响范围**: `flitter-core/src/layout/box-constraints.ts`
- **Amp 行为**: 检查 `minW >= 0 && minW <= maxW && minH >= 0 && minH <= maxH`（四条件）
- **Flitter 现状**: 仅检查 `minWidth <= maxWidth && minHeight <= maxHeight`，缺少 `min >= 0`
- **已有 .gap 引用**: 无
- **建议修复方向**: 补充 `>= 0` 条件

### GAP-SUM-019: BoxConstraints 缺少 tighten() 方法
- **来源**: Agent-2 (GAP-2-005)
- **优先级**: P1
- **影响范围**: `flitter-core/src/layout/box-constraints.ts`
- **Amp 行为**: `tighten({width, height})` 将指定轴 clamp 到给定值
- **Flitter 现状**: 完全缺失，实现 `IntrinsicHeight/Width` 时将需要
- **已有 .gap 引用**: 无
- **建议修复方向**: 添加 `tighten()` 方法

### GAP-SUM-020: RenderPadding / RenderDecoratedBox 手动约束收缩未使用 deflate()
- **来源**: Agent-2 (GAP-2-006)
- **优先级**: P1
- **影响范围**: `flitter-core/src/layout/render-padded.ts`, `render-decorated.ts`
- **Amp 行为**: Flutter/Amp 的 `deflate()` 确保 `max >= min`
- **Flitter 现状**: 手动构造约束，未保证 `max >= min`，既是代码重复也是潜在边界 bug
- **已有 .gap 引用**: 无
- **建议修复方向**: 改用 `constraints.deflate()` 方法

### GAP-SUM-021: RenderFlex 缺少测试覆盖 — 溢出/边界场景
- **来源**: Agent-2 (GAP-2-014)
- **优先级**: P1
- **影响范围**: `render-flex.test.ts`
- **Amp 行为**: 非弹性溢出是 Flutter 最常见布局错误
- **Flitter 现状**: 缺少 4 个关键测试场景：溢出检测、Infinity弹性、负flex、NaN约束
- **已有 .gap 引用**: 无
- **建议修复方向**: 添加对应测试用例

### GAP-SUM-022: SelectionList 长列表无自动滚动
- **来源**: Agent-4 (GAP-4-001)
- **优先级**: P1
- **影响范围**: `flitter-core/src/widgets/selection-list.ts`
- **Amp 行为**: SelectionList 确保当前选中项始终可见（ensureVisible 语义）
- **Flitter 现状**: 所有项放入 `Column({ mainAxisSize: 'min' })`，超出视口高度的项被裁剪且不可达
- **已有 .gap 引用**: 无
- **建议修复方向**: 用 SingleChildScrollView 包裹 + ensureVisible 逻辑

### GAP-SUM-023: ScrollController 缺少 ensureVisible API
- **来源**: Agent-4 (GAP-4-002)
- **优先级**: P1
- **影响范围**: `flitter-core/src/widgets/scroll-controller.ts`
- **Amp 行为**: 通过 followMode 自动跟随解决可见性需求
- **Flitter 现状**: 只有 `jumpTo`/`scrollBy`，缺少 `ensureVisible(offset, size)` 高层 API
- **已有 .gap 引用**: 无
- **建议修复方向**: 添加 `ensureVisible` 方法

### GAP-SUM-024: 代码块 Fallback 路径多余的背景色
- **来源**: Agent-5 (GAP-5-002)
- **优先级**: P1
- **影响范围**: `flitter-core/src/widgets/markdown.ts`
- **Amp 行为**: 不识别语言时代码块无背景色
- **Flitter 现状**: Fallback 路径额外添加 `background: bgColor`，与 Amp 不一致
- **已有 .gap 引用**: 无
- **建议修复方向**: 移除 fallback 中的 `background: bgColor`，2行修改

### GAP-SUM-025: GFM 表格列对齐标记未实际应用
- **来源**: Agent-5 (GAP-5-003)
- **优先级**: P1
- **影响范围**: `flitter-core/src/widgets/markdown.ts`
- **Amp 行为**: GFM 表格支持居中/右对齐语法并应用
- **Flitter 现状**: 解析器能匹配对齐标记，但渲染时始终左对齐
- **已有 .gap 引用**: 无
- **建议修复方向**: 解析对齐信息并按类型使用不同 pad 策略，约 30 行修改

### GAP-SUM-026: 语法高亮 Amp RGB 主题色桥接可能不完整
- **来源**: Agent-5 (GAP-5-008)
- **优先级**: P1
- **影响范围**: `flitter-core/src/widgets/app-theme.ts`, `flitter-amp` 桥接层
- **Amp 行为**: 使用精确 RGB 色值（8色语法高亮）
- **Flitter 现状**: 默认使用 ANSI named 色，桥接链路不完整时可能回退
- **已有 .gap 引用**: 无
- **建议修复方向**: 审计 `AmpThemeProvider` → `AppTheme` 桥接路径完整性

### GAP-SUM-027: `any` 类型在框架边界的系统性使用（~58 处）
- **来源**: Agent-6 (G6-01, G6-14)
- **优先级**: P1
- **影响范围**: `widget.ts`, `element.ts`, `render-object.ts`, `binding.ts`, `pipeline-owner.ts`
- **Amp 行为**: Amp 为混淆 JS，无类型系统
- **Flitter 现状**: 约 58 处 `any`，Element 基类缺少 `mount()` 方法导致 12 处 duck-typing
- **已有 .gap 引用**: `.gap/09`(type-safety-any-removal，未实现)
- **建议修复方向**: 按 .gap/09 四阶段计划执行；优先添加 Element 基类 `mount()` 方法

### GAP-SUM-028: TextField 缺少 Ctrl+E 行尾移动
- **来源**: Agent-7 (GAP-7-003)
- **优先级**: P1
- **影响范围**: `flitter-core/src/widgets/text-field.ts`
- **Amp 行为**: Ctrl+E = Emacs end-of-line
- **Flitter 现状**: 未处理 Ctrl+E
- **已有 .gap 引用**: 无
- **建议修复方向**: 添加 `case 'e': moveCursorLineEnd()`

### GAP-SUM-029: TextField 缺少 Alt+B / Alt+F Emacs 词移动
- **来源**: Agent-7 (GAP-7-004)
- **优先级**: P1
- **影响范围**: `flitter-core/src/widgets/text-field.ts`
- **Amp 行为**: Alt+B = backward-word，Alt+F = forward-word
- **Flitter 现状**: 无 Alt 组合键处理分支
- **已有 .gap 引用**: 无
- **建议修复方向**: 添加 Alt 组合处理分支

### GAP-SUM-030: TextField 缺少 Ctrl+W 删除前一个词
- **来源**: Agent-7 (GAP-7-005)
- **优先级**: P1
- **影响范围**: `flitter-core/src/widgets/text-field.ts`
- **Amp 行为**: Ctrl+W = Emacs kill-word（等效 Ctrl+Backspace）
- **Flitter 现状**: 未处理 Ctrl+W，已有 Ctrl+Backspace 但缺少等效绑定
- **已有 .gap 引用**: 无
- **建议修复方向**: 添加 `case 'w': deleteWordBackward()`

### GAP-SUM-031: FilePicker 缺少搜索过滤 + 文件系统遍历 + 未接入 Overlay
- **来源**: Agent-7 (GAP-7-006, GAP-7-007)
- **优先级**: P1
- **影响范围**: `flitter-amp/src/widgets/file-picker.ts`, `src/app.ts`
- **Amp 行为**: 支持搜索过滤 + 内置文件系统遍历，@ 触发
- **Flitter 现状**: StatelessWidget，无搜索/过滤；App 层未找到 `OVERLAY_IDS.FILE_PICKER` 的 show 调用，FilePicker 处于**未使用状态**
- **已有 .gap 引用**: `.gap/25`(部分解决), `.gap/55`(基础设施就绪)
- **建议修复方向**: 转为 StatefulWidget + fuzzy-match + 文件遍历 + 接入 OverlayManager

### GAP-SUM-032: AmpAppColors 缺少 Amp 的多个语义色字段（~20个）
- **来源**: Agent-8 (GAP-8-002)
- **优先级**: P1
- **影响范围**: `flitter-amp/src/themes/amp-theme-data.ts`
- **Amp 行为**: Amp 定义 40+ 个语义色字段
- **Flitter 现状**: `AmpAppColors` 仅 22 个字段，缺少 `assistantMessage`、`systemMessage`、`codeBlock`、`processing`、`cancelled`、`suggestion`、`filename`、`selectionBackground/Foreground`、`diffChanged`、`threadGraph*`、`ide*` 等
- **已有 .gap 引用**: 无
- **建议修复方向**: 分批扩展 `AmpAppColors` 接口

### GAP-SUM-033: Agent 模式颜色缺少动态 Perlin 噪声脉冲
- **来源**: Agent-8 (GAP-8-003)
- **优先级**: P1
- **影响范围**: `flitter-amp/src/themes/index.ts`
- **Amp 行为**: 使用 open-simplex-noise 生成动态模式颜色，primary/secondary 间线性插值呈现脉冲效果
- **Flitter 现状**: `agentModeColor()` 是纯静态函数，返回固定 Color，无动态效果
- **已有 .gap 引用**: 无
- **建议修复方向**: 使用已有的 `GlowText` 或共享 PerlinNoise 模块实现脉冲

### GAP-SUM-034: Copy Highlight 缺少定时器驱动的自动消失
- **来源**: Agent-8 (GAP-8-005)
- **优先级**: P1
- **影响范围**: `flitter-core/src/widgets/text.ts`
- **Amp 行为**: 复制操作触发短暂高亮（~300ms flash）后自动消失
- **Flitter 现状**: copy 高亮一旦设置就一直保持，无自动消失机制
- **已有 .gap 引用**: 无
- **建议修复方向**: 添加 `setTimeout(300, () => clearSelection())` 逻辑

### GAP-SUM-035: `session_info_update` 及工具结果解析的 `as unknown as` 类型强转
- **来源**: Agent-9 (GAP-9-003, GAP-9-004, GAP-9-005)
- **优先级**: P1
- **影响范围**: `src/state/app-state.ts`, `src/widgets/tool-call/tool-output-utils.ts`
- **Amp 行为**: Amp 直接控制协议，类型天然对齐
- **Flitter 现状**: 多处 `as unknown as` 双重强转绕过 TypeScript 类型保护
- **已有 .gap 引用**: `.gap/59`(acp-type-safety，部分解决)
- **建议修复方向**: 使用运行时类型守卫 + `ExtendedToolCall` 交叉类型替代强转

### GAP-SUM-036: 重连后对话状态无分隔标识
- **来源**: Agent-9 (GAP-9-006)
- **优先级**: P1
- **影响范围**: `src/state/conversation.ts`, `src/index.ts`
- **Amp 行为**: 通过 Thread 模型区分会话段
- **Flitter 现状**: `addSystemMessage()` 已实现但未集成，重连从未发生，无法区分新旧会话
- **已有 .gap 引用**: `.gap/57`(设计了分隔符但未集成)
- **建议修复方向**: GAP-SUM-001 修复后，重连成功时插入 SystemMessage

### GAP-SUM-037: 健康状态 UI 指示不存在
- **来源**: Agent-9 (GAP-9-007)
- **优先级**: P1
- **影响范围**: `src/widgets/status-bar.ts`, `src/widgets/header-bar.ts`
- **Amp 行为**: 对网络状态无显式指示（API 调用模型）
- **Flitter 现状**: `AppState` 已声明 healthStatus 等字段，永远停留在初始值；HeaderBar/StatusBar 未读取/渲染健康状态
- **已有 .gap 引用**: `.gap/58`(设计了 TUI 健康指示器，Widget 侧未实现)
- **建议修复方向**: 在 StatusBar 中读取并渲染 healthStatus

### GAP-SUM-038: 动画框架已就位但未接入 Widget（setInterval 未迁移）
- **来源**: Agent-8 (GAP-8-007)
- **优先级**: P1
- **影响范围**: `flitter-core/src/animation/` 与所有使用 setInterval 的 Widget
- **Amp 行为**: Amp 也使用 setInterval，此项为架构改进而非保真度差异
- **Flitter 现状**: Ticker/AnimationController/Curves 已实现，但所有动画 Widget 仍使用 setInterval+setState
- **已有 .gap 引用**: `.gap/65`(animation-framework，基础设施完成，Widget 迁移未开始)
- **建议修复方向**: 逐步迁移，优先 ScrollController.animateTo

### GAP-SUM-039: ThinkingBlock 展开/折叠指示符位置与 Amp 相反 + 缺 Braille Spinner
- **来源**: Agent-10 (GAP-10-001, GAP-10-002)
- **优先级**: P1
- **影响范围**: `flitter-amp/src/widgets/thinking-block.ts`
- **Amp 行为**: chevron 在行末，streaming 时使用 BrailleSpinner 动画
- **Flitter 现状**: chevron 在行首，streaming 时用静态 `'● '`，是 StatelessWidget 无动画
- **已有 .gap 引用**: 无
- **建议修复方向**: 将 chevron 移至行末 + 重构为 StatefulWidget + 引入 BrailleSpinner

### GAP-SUM-040: UserMessage 缺少中断状态 (interrupted) 渲染
- **来源**: Agent-10 (GAP-10-005)
- **优先级**: P1
- **影响范围**: `flitter-amp/src/widgets/chat-view.ts`
- **Amp 行为**: interrupted 消息使用 warning 颜色（黄色）
- **Flitter 现状**: 不区分 interrupted，始终使用 success 颜色（绿色）
- **已有 .gap 引用**: 无
- **建议修复方向**: 添加 `interrupted` 字段 + 根据状态切换颜色

---

## P2 Gap 清单

### GAP-SUM-041: Renderer 帧末 SGR reset 策略差异
- **来源**: Agent-1 (GAP-1-006)
- **优先级**: P2
- **影响范围**: `renderer.ts`
- **Flitter 现状**: 帧末 `SGR_RESET`，Amp 在帧首。行为等价但 Amp 更健壮
- **已有 .gap 引用**: 无

### GAP-SUM-042: Buffer.resize() 冗余的旧内容拷贝
- **来源**: Agent-1 (GAP-1-007)
- **优先级**: P2
- **影响范围**: `screen-buffer.ts`
- **Flitter 现状**: resize 后必然全量重绘，旧内容拷贝是冗余工作
- **已有 .gap 引用**: 无

### GAP-SUM-043: RenderRepaintBoundary.paint() 脏状态语义不清
- **来源**: Agent-1 (GAP-1-008)
- **优先级**: P2
- **影响范围**: `render-repaint-boundary.ts`
- **Flitter 现状**: `_needsPaint` 在 paint 阶段总为 false，与 `_layer.isDirty` 关系不清
- **已有 .gap 引用**: `.gap/12`

### GAP-SUM-044: getDiff() 全量刷新包含大量 EMPTY_CELL
- **来源**: Agent-1 (GAP-1-009)
- **优先级**: P2
- **影响范围**: `screen-buffer.ts`
- **Flitter 现状**: 全量刷新每行产生含所有 cell 的 patch（含空 cell），性能微损
- **已有 .gap 引用**: 无

### GAP-SUM-045: CellLayer blit 缺少裁剪边界防御
- **来源**: Agent-1 (GAP-1-011)
- **优先级**: P2
- **影响范围**: `cell-layer.ts`
- **Flitter 现状**: 当前实际安全，但缺少防御性 bounds 检查
- **已有 .gap 引用**: `.gap/12` 风险表

### GAP-SUM-046: Renderer 缺少帧首 reset+home 语义
- **来源**: Agent-1 (GAP-1-013)
- **优先级**: P2
- **影响范围**: `renderer.ts`
- **Flitter 现状**: 行为等价，Amp 更健壮
- **已有 .gap 引用**: 无

### GAP-SUM-047: BoxConstraints 缺少 constrainWidth/constrainHeight 便利方法
- **来源**: Agent-2 (GAP-2-007)
- **优先级**: P2
- **影响范围**: `box-constraints.ts`
- **已有 .gap 引用**: 无

### GAP-SUM-048: BoxConstraints 缺少 tightForFinite() / flipped / widthConstraints / heightConstraints
- **来源**: Agent-2 (GAP-2-008, GAP-2-009)
- **优先级**: P2
- **影响范围**: `box-constraints.ts`
- **已有 .gap 引用**: 无

### GAP-SUM-049: RenderFlex 缺少溢出 Paint 指示器
- **来源**: Agent-2 (GAP-2-010)
- **优先级**: P2
- **影响范围**: `render-flex.ts`
- **Flitter 现状**: 依赖 GAP-SUM-004 溢出检测先实现
- **已有 .gap 引用**: 无

### GAP-SUM-050: RenderDecoratedBox 缺少 borderRight/Bottom getter
- **来源**: Agent-2 (GAP-2-011)
- **优先级**: P2
- **影响范围**: `render-decorated.ts`
- **已有 .gap 引用**: 无

### GAP-SUM-051: RenderTable intrinsic 测量硬编码回退值 1000
- **来源**: Agent-2 (GAP-2-012)
- **优先级**: P2
- **影响范围**: `render-table.ts`
- **已有 .gap 引用**: 无

### GAP-SUM-052: FlexParentData 缺少 toString() 调试方法
- **来源**: Agent-2 (GAP-2-013)
- **优先级**: P2
- **影响范围**: `parent-data.ts`
- **已有 .gap 引用**: 无

### GAP-SUM-053: 遗留 hit-test 自由函数未删除
- **来源**: Agent-3 (GAP-3-002)
- **优先级**: P2
- **影响范围**: `hit-test.ts`
- **已有 .gap 引用**: `.gap/13` Phase 3, `.gap/22`

### GAP-SUM-054: MouseManager / EventDispatcher 懒加载 require() 残留
- **来源**: Agent-3 (GAP-3-003, GAP-3-006)
- **优先级**: P2
- **影响范围**: `mouse-manager.ts`, `event-dispatcher.ts`
- **Flitter 现状**: 运行时 require() 绕过 TypeScript 类型检查
- **已有 .gap 引用**: `.gap/13` Phase 4

### GAP-SUM-055: OSC/DCS 输入响应序列未处理
- **来源**: Agent-3 (GAP-3-005)
- **优先级**: P2
- **影响范围**: `input-parser.ts`
- **Flitter 现状**: 终端能力检测响应被误解析为用户输入（幽灵按键）
- **已有 .gap 引用**: `.gap/20`

### GAP-SUM-056: In-Band Resize 序列解析未接入 InputParser
- **来源**: Agent-3 (GAP-3-007)
- **优先级**: P2
- **影响范围**: `input-parser.ts`, `renderer.ts`
- **已有 .gap 引用**: `.gap/20`

### GAP-SUM-057: RenderStickyHeader / RenderScrollViewport `as any` 类型安全问题
- **来源**: Agent-4 (GAP-4-003, GAP-4-008)
- **优先级**: P2
- **影响范围**: `render-sticky-header.ts`, `scroll-view.ts`
- **已有 .gap 引用**: `.gap/09`, `.gap/17` Phase 1

### GAP-SUM-058: 鼠标滚轮步长硬编码 3
- **来源**: Agent-4 (GAP-4-004)
- **优先级**: P2
- **影响范围**: `scroll-view.ts`
- **Flitter 现状**: 与 Amp 一致（都硬编码 3），但缺乏可配置性
- **已有 .gap 引用**: 无

### GAP-SUM-059: animateTo 缺少缓动曲线支持
- **来源**: Agent-4 (GAP-4-005)
- **优先级**: P2
- **影响范围**: `scroll-controller.ts`
- **Flitter 现状**: 与 Amp 一致（线性插值），但 Flutter 支持 Curve 参数
- **已有 .gap 引用**: `.gap/65`

### GAP-SUM-060: 嵌套滚动无事件溢出传播
- **来源**: Agent-4 (GAP-4-006)
- **优先级**: P2
- **影响范围**: `scroll-view.ts`
- **Flitter 现状**: 与 Amp 一致（都不支持），内层 ScrollView 吞掉所有事件
- **已有 .gap 引用**: 无

### GAP-SUM-061: 虚拟化（ListView.builder）基础设施缺失
- **来源**: Agent-4 (GAP-4-007), Agent-10 (GAP-10-021)
- **优先级**: P2
- **影响范围**: `flitter-core`（新功能）
- **Flitter 现状**: 与 Amp 一致（都无虚拟化），当前性能足够但极长对话可能瓶颈
- **已有 .gap 引用**: 无

### GAP-SUM-062: Scrollbar hover 视觉反馈缺失
- **来源**: Agent-4 (GAP-4-009)
- **优先级**: P2
- **影响范围**: `scrollbar.ts`
- **已有 .gap 引用**: `.gap/17` Phase 4

### GAP-SUM-063: SelectionList 缺少滚动条视觉指示
- **来源**: Agent-4 (GAP-4-010)
- **优先级**: P2
- **影响范围**: `selection-list.ts`
- **已有 .gap 引用**: 无

### GAP-SUM-064: RenderText 超链接未传递到 Cell
- **来源**: Agent-5 (GAP-5-004)
- **优先级**: P2
- **影响范围**: `text.ts`, `paint-context.ts`
- **Flitter 现状**: `drawChar` 签名无 hyperlink 参数，RenderText 直接渲染的超链接不生成 OSC 8
- **已有 .gap 引用**: 无

### GAP-SUM-065: _emojiWidthSupported 标志未实际使用（死代码）
- **来源**: Agent-5 (GAP-5-005)
- **优先级**: P2
- **影响范围**: `text.ts`
- **已有 .gap 引用**: 无

### GAP-SUM-066: _getLines() 在 performLayout 和 paint 中双重调用
- **来源**: Agent-5 (GAP-5-006)
- **优先级**: P2
- **影响范围**: `text.ts`
- **Flitter 现状**: 与 Amp 一致，每帧 TextSpan 遍历翻倍
- **已有 .gap 引用**: 无

### GAP-SUM-067: Rust 嵌套块注释 / JS 模板字符串插值深度追踪缺失
- **来源**: Agent-5 (GAP-5-010, GAP-5-011)
- **优先级**: P2
- **影响范围**: `syntax-highlight.ts`
- **Flitter 现状**: 与 Amp 一致（简化处理），边界 case 高亮不正确
- **已有 .gap 引用**: `.gap/70` §7.1, §7.2

### GAP-SUM-068: Rainbow 彩蛋 Markdown / AssistantMessage 特殊检测
- **来源**: Agent-5 (GAP-5-009), Agent-10 (GAP-10-009)
- **优先级**: P2
- **影响范围**: `flitter-amp` 层
- **Flitter 现状**: "You're absolutely right" 前缀触发彩虹色效果未实现
- **已有 .gap 引用**: 无

### GAP-SUM-069: setState() 缺少 build 中调用的防护检查
- **来源**: Agent-6 (G6-11)
- **优先级**: P2
- **影响范围**: `widget.ts`, `build-owner.ts`
- **已有 .gap 引用**: 无

### GAP-SUM-070: BuildOwner.buildScope() 全量排序性能问题
- **来源**: Agent-6 (G6-12)
- **优先级**: P2
- **影响范围**: `build-owner.ts`
- **Flitter 现状**: 每次 while 迭代全量 sort，应使用优先队列
- **已有 .gap 引用**: 无

### GAP-SUM-071: InheritedModel 未被 Theme/MediaQuery/AppTheme 采用
- **来源**: Agent-6 (G6-13)
- **优先级**: P2
- **影响范围**: `widgets/theme.ts`, `widgets/media-query.ts`, `widgets/app-theme.ts`
- **已有 .gap 引用**: `.gap/08` §2.7-2.8

### GAP-SUM-072: 缺少 RepaintBoundary Widget（用户面）
- **来源**: Agent-6 (G6-15)
- **优先级**: P2
- **影响范围**: `render-object.ts`
- **Flitter 现状**: `isRepaintBoundary` getter 存在，但缺少 `RepaintBoundary` Widget
- **已有 .gap 引用**: 无

### GAP-SUM-073: InputArea 固定高度，缺少自动增高
- **来源**: Agent-7 (GAP-7-008)
- **优先级**: P2
- **影响范围**: `flitter-amp/src/widgets/input-area.ts`
- **Amp 行为**: PromptBar 通过 maxHeight 实现内容自动增高
- **Flitter 现状**: 固定 `height: 5`
- **已有 .gap 引用**: 无

### GAP-SUM-074: InputArea 缺少拖拽调整高度
- **来源**: Agent-7 (GAP-7-009)
- **优先级**: P2
- **影响范围**: `flitter-amp/src/widgets/input-area.ts`
- **已有 .gap 引用**: 无

### GAP-SUM-075: TextField 选区颜色未对接主题
- **来源**: Agent-7 (GAP-7-010)
- **优先级**: P2
- **影响范围**: `text-field.ts`, `input-area.ts`
- **Flitter 现状**: 硬编码 `Color.rgb(50,50,180)`，未使用 `theme.base.selection`
- **已有 .gap 引用**: 无

### GAP-SUM-076: TextField 光标无 blink 效果
- **来源**: Agent-7 (GAP-7-011)
- **优先级**: P2
- **影响范围**: `text-field.ts`
- **已有 .gap 引用**: 无

### GAP-SUM-077: `capabilities.ts` / `shortcut-help-overlay` / `command-palette` 类型强转
- **来源**: Agent-9 (GAP-9-008, GAP-9-009)
- **优先级**: P2
- **影响范围**: ACP 能力检测 + UI 组件边框样式
- **已有 .gap 引用**: `.gap/59`

### GAP-SUM-078: `connectToAgentWithResume` fallback 时缺少 UI 通知
- **来源**: Agent-9 (GAP-9-010)
- **优先级**: P2
- **影响范围**: `src/acp/connection.ts`, `src/index.ts`
- **已有 .gap 引用**: `.gap/61`

### GAP-SUM-079: Agent 退出后 handleSubmit/handleCancel 仍尝试已死连接
- **来源**: Agent-9 (GAP-9-011)
- **优先级**: P2
- **影响范围**: `src/index.ts`
- **已有 .gap 引用**: `.gap/57`

---

## P2 Gap 清单（续 — 视觉还原度）

### GAP-SUM-080: ThinkingBlock "Thinking" 标签颜色与 Amp 不一致
- **来源**: Agent-10 (GAP-10-003)
- **优先级**: P2
- **Flitter 现状**: 使用状态色+dim，Amp 使用 foreground+dim
- **已有 .gap 引用**: 无

### GAP-SUM-081: ThinkingBlock 内容渲染缺少 Markdown 支持
- **来源**: Agent-10 (GAP-10-004)
- **优先级**: P2
- **Flitter 现状**: 纯 Text 渲染，按字符截断，无 Markdown/行级截断
- **已有 .gap 引用**: 无

### GAP-SUM-082: ToolHeader toolName 回退颜色差异
- **来源**: Agent-10 (GAP-10-010)
- **优先级**: P2（原 P1，与 Agent-8 语义色问题合并后降级为主题修复子项）
- **Flitter 现状**: 无主题时回退 cyan，Amp 用 foreground
- **已有 .gap 引用**: 无

### GAP-SUM-083: ToolHeader 缺少 cancelled/queued/blocked-on-user 等状态
- **来源**: Agent-10 (GAP-10-011)
- **优先级**: P2
- **Flitter 现状**: 仅 4 种状态，Amp 有 8 种
- **已有 .gap 引用**: 无

### GAP-SUM-084: ToolHeader 工具详情提取逻辑差异（无统一 normalizedInput）
- **来源**: Agent-10 (GAP-10-014)
- **优先级**: P2
- **影响范围**: 工具头部详情文本
- **已有 .gap 引用**: `.gap/44`

### GAP-SUM-085: ExpandCollapse 缺少独立可点击组件
- **来源**: Agent-10 (GAP-10-015)
- **优先级**: P2
- **已有 .gap 引用**: `.gap/39`, `.gap/40`

### GAP-SUM-086: StatusBar 缺少上下文窗口使用量警告 + 多种执行状态消息
- **来源**: Agent-10 (GAP-10-017, GAP-10-018)
- **优先级**: P2
- **Flitter 现状**: 只有 "Streaming..." 和 "Esc to cancel"，Amp 有 10+ 种状态消息 + 颜色阈值
- **已有 .gap 引用**: 无

### GAP-SUM-087: UserMessage 缺少图片附件 / guidanceFiles / info 角色 shell 命令
- **来源**: Agent-10 (GAP-10-006, GAP-10-007, GAP-10-008)
- **优先级**: P2
- **已有 .gap 引用**: `.gap/34`(imageAttachments)

### GAP-SUM-088: Scanning Bar 水平扫描动画缺失
- **来源**: Agent-8 (GAP-8-004)
- **优先级**: P2
- **Flitter 现状**: 完全未实现，Amp 使用 `━` 字符+透明度梯度扫描
- **已有 .gap 引用**: 无

### GAP-SUM-089: agentModeColor 缺少 uiHints 动态颜色源
- **来源**: Agent-8 (GAP-8-006)
- **优先级**: P2
- **Flitter 现状**: 仅处理 smart/rush 两个硬编码模式，不支持服务端推送颜色
- **已有 .gap 引用**: 无

### GAP-SUM-090: Amp terminal 主题 tableBorder 缺少 alpha
- **来源**: Agent-8 (GAP-8-008)
- **优先级**: P2
- **Flitter 现状**: `tableBorder = Color.rgb(135, 139, 134)` 无 alpha，Amp 有 `alpha=0.2`
- **已有 .gap 引用**: 无

### GAP-SUM-091: SessionStore 缺少并发写入保护（原子写入）
- **来源**: Agent-9 (GAP-9-012)
- **优先级**: P2
- **影响范围**: `src/state/session-store.ts`
- **已有 .gap 引用**: 无

### GAP-SUM-092: PromptHistory encode/decode 缺少极端输入边界处理
- **来源**: Agent-9 (GAP-9-013)
- **优先级**: P2
- **影响范围**: `src/state/history.ts`
- **已有 .gap 引用**: `.gap/53`

### GAP-SUM-093: SelectedUserMessage 差异化渲染 / PromptBar 可拖拽 / mode label 定位
- **来源**: Agent-10 (GAP-10-019, GAP-10-020, GAP-10-024)
- **优先级**: P2
- **Flitter 现状**: 不区分选中/非选中消息；固定高度；border 内叠加非线上叠加
- **已有 .gap 引用**: 无

### GAP-SUM-094: apply_patch / DiffCard 特殊头部统计渲染 + Task 工具嵌套折叠
- **来源**: Agent-10 (GAP-10-013, GAP-10-022, GAP-10-023)
- **优先级**: P2
- **已有 .gap 引用**: `.gap/39`

### GAP-SUM-095: 鼠标光标形状管理缺少 OSC 22 支持
- **来源**: Agent-3 (GAP-3-009)
- **优先级**: P2
- **Flitter 现状**: 仅 DECSCUSR（文本光标），不改变鼠标指针形状
- **已有 .gap 引用**: 无

### GAP-SUM-096: Skill 浏览器 / Dialog buttons API / Prompt History UI 增强
- **来源**: Agent-7 (GAP-7-012, GAP-7-013, GAP-7-014)
- **优先级**: P2
- **Flitter 现状**: Skill 浏览器完全未实现；Dialog buttons/footer 无消费者；History UI 已基本解决
- **已有 .gap 引用**: `.gap/26`, `.gap/64`

---

## 已有 .gap 交叉引用汇总

| .gap 编号 | 标题 | 审计结论 | 来源 Agent |
|-----------|------|----------|-----------|
| #01 | didChangeDependencies | ✅ 已修复 | Agent-6 |
| #02 | deactivate lifecycle | ✅ 已修复 | Agent-6 |
| #03 | hot-reload reassemble | ✅ 已修复 | Agent-6 |
| #04 | GlobalKey implementation | ✅ 已修复 | Agent-6 |
| #05 | ErrorWidget | ✅ 已修复 | Agent-6 |
| #06 | ProxyWidget / ProxyElement | ✅ 已修复 | Agent-6 |
| #07 | InheritedWidget Map O(1) | ✅ 已修复 | Agent-6 |
| #08 | InheritedModel | ⚠️ 基础设施完成，核心组件未迁移 | Agent-6 |
| #09 | type-safety-any-removal | ❌ 未实现（~58处 any） | Agent-6, Agent-4 |
| #10 | ParentDataWidget (Positioned) | ✅ 已修复 | Agent-6 |
| #11 | RelayoutBoundary | ⚠️ Phase 1 已实现，Phase 2/3 待做 | Agent-1, Agent-2 |
| #12 | RepaintBoundary | ⚠️ Phase 1 已实现，Phase 2/3 未实现 | Agent-1 |
| #13 | render-object-hit-test | ⚠️ Phase 1-2 完成，Phase 3-4 待清理 | Agent-3 |
| #14 | sizedByParent | ❌ 未实现（Proposal） | Agent-2 |
| #15 | parentUsesSize | ❌ 未实现（Proposal） | Agent-2 |
| #16 | nodesNeedingLayout | ❌ 未实现（Proposal） | Agent-2 |
| #17 | scrollbar-enhancements | ⚠️ Phase 1-3 完成，Phase 4 未实现 | Agent-4 |
| #18 | LayoutBuilder | ❌ 架构性破损未修复 | Agent-2 |
| #19 | responsive-breakpoints | ❌ 未实现（Proposal） | Agent-4 |
| #20 | terminal-capabilities-wiring | ⚠️ 查询已定义，响应解析未接入 | Agent-3 |
| #21 | GFM table CJK width | ✅ 已修复 | Agent-5 |
| #22 | unify-hit-test | ⚠️ 核心完成，残留待清理 | Agent-3 |
| #23 | shortcut-help-overlay | ✅ 已修复 | Agent-7 |
| #24 | editor-integration | ✅ 已修复 | Agent-7 |
| #25 | file-picker-onselect | ⚠️ 部分解决（FilePicker 未接入 Overlay） | Agent-7 |
| #26 | dialog-class | ✅ 基本集成完成 | Agent-7 |
| #27 | overlay-manager | ✅ 已修复 | Agent-7 |
| #28 | command-palette-search | ✅ 已修复 | Agent-7 |
| #29 | focus-restoration | ✅ 已修复 | Agent-3 |
| #30 | shortcut-registry | ❌ 未实现 | Agent-3 |
| #31 | border-styles | — 未在本次审计范围内审查 | — |
| #32 | ConstrainedBox Widget | ❌ 未实现（Proposal） | Agent-2 |
| #33 | session-id-display | ✅ 有效（建议删除 HeaderBar） | Agent-10 |
| #34 | bottom-grid-props | ✅ 有效 | Agent-10 |
| #35 | plan-priority-display | ✅ 已修复（Flitter 增强） | Agent-10 |
| #36 | expand-collapse-animation | ⚠️ 未修复（Amp 也是瞬间切换） | Agent-8 |
| #37 | markdown-inline-nesting | ✅ 已修复 | Agent-5 |
| #38 | streaming-cursor-blink | ✅ 已修复 | Agent-8 |
| #39 | per-card-toggle | ❌ 未落地 | Agent-10 |
| #40 | onToggle-propagation | ❌ 未落地 | Agent-10 |
| #41 | tool-locations-display | ✅ 有效 | Agent-10 |
| #42 | streaming-tool-output | ✅ 有效 | Agent-10 |
| #43 | create-file-result | ✅ 有效 | Agent-10 |
| #44 | raw-input-type-safety | ✅ 有效 | Agent-10 |
| #45 | shared-output-extraction | ✅ 有效 | Agent-10 |
| #46 | truncation-consistency | ✅ 有效 | Agent-10 |
| #47 | remove-vestigial-session-state | — 未在本次审计范围内审查 | — |
| #48 | session-info-update | — 未在本次审计范围内审查 | — |
| #49 | tool-call-index | ✅ 已修复 | Agent-9 |
| #50 | state-immutability | ✅ 已修复 | Agent-9 |
| #51 | prompt-history-fix | ✅ 已修复 | Agent-9 |
| #52 | history-size-wiring | ✅ 已修复 | Agent-9 |
| #53 | history-persistence | ⚠️ 大部分完成，encode/decode 边界问题 | Agent-9 |
| #54 | session-persistence | ⚠️ 大部分完成，缺少并发写入保护 | Agent-9 |
| #55 | expose-text-controller | ✅ 已修复 | Agent-7, Agent-9 |
| #56 | prompt-history-tests | — 未在本次审计范围内审查 | — |
| #57 | reconnection-logic | ❌ 模块已实现但**未集成运行时** | Agent-9 |
| #58 | heartbeat-monitoring | ❌ 模块已实现但**未集成运行时** | Agent-9 |
| #59 | acp-type-safety | ⚠️ 部分解决，多处 as 强转残留 | Agent-9 |
| #60 | graceful-session-close | ✅ 已修复且已集成 | Agent-9 |
| #61 | load-session | ⚠️ 已实现，fallback UI 通知缺失 | Agent-9 |
| #62 | terminal-buffer-mismatch | ✅ 有效（flitter-amp 包范围） | Agent-1 |
| #63 | arrow-history-navigation | — 未在本次审计范围内审查 | — |
| #64 | incremental-history-search | ✅ 已修复 | Agent-7 |
| #65 | animation-framework | ⚠️ 基础设施完成，Widget 迁移未开始 | Agent-8, Agent-4 |
| #66 | duplicate-perlin-noise | ✅ 已修复 | Agent-8 |
| #67 | remove-deprecated-orb | ✅ 已修复 | Agent-8 |
| #68 | braille-spinner-alignment | ✅ 已修复 | Agent-8 |
| #69 | syntax-highlight-languages | ✅ 已修复（8→30 种语言） | Agent-5 |
| #70 | multiline-syntax-support | ⚠️ 核心完成，Open Questions 未解决 | Agent-5 |
| #71 | test-coverage-plan | — 未在本次审计范围内审查 | — |

---

## 已确认与 Amp 完全对齐的子系统（无 gap）

- **BoxConstraints 核心操作**: tight/tightFor/loose/loosen/constrain/enforce/deflate/isTight/hasBounded/biggest/smallest/equals
- **RenderFlex 六步算法**: 弹性/非弹性分离、unbounded 主轴、Math.floor 取整、FlexFit tight/loose、所有 6 种 MainAxisAlignment、所有 5 种 CrossAxisAlignment
- **FlexParentData / Widget 层默认值**: flex=0/fit='tight'、mainAxisAlignment='start'、crossAxisAlignment='center'、mainAxisSize='max'
- **RenderConstrainedBox**: enforce+constrain 无子项→smallest
- **滚动管线核心**: SingleChildScrollView → Scrollable → ScrollViewport → RenderScrollViewport → ScrollController → followMode → ClipCanvas，算法 100% 一致
- **ScrollController 状态模型**: offset/maxExtent/followMode/listeners（Flitter 超集含 viewportSize/isAnimating）
- **followMode 全生命周期**: 启用/禁用/自动重新启用
- **键盘滚动**: j/k/g/G/PgUp/PgDn/Ctrl+U/D，完全一致
- **Scrollbar 亚字符精度**: 1/8 Unicode 块元素（Flitter 超集：拖拽+水平+可配置）
- **ClipCanvas 嵌套裁剪**: Rect.intersect()，CJK 宽字符裁剪
- **文本测量/换行/截断**: wcwidth 逐 codepoint 累加、仅 `\n` 显式换行、maxLines/ellipsis/clip
- **TextSpan 树遍历**: DFS + 样式 merge + hyperlink/onClick 继承
- **TextStyle 9 字段**: merge/copyWith/equals/toSgr
- **Markdown 解析器**: 逐行状态机、块类型、LRU 缓存
- **DiffView**: Myers diff + word-level diff + 语法高亮整合
- **三树生命周期核心**: Widget/Element/RenderObject reconciliation、updateChild 4-case、updateChildren O(N)、BuildOwner.buildScope、4 阶段流水线
- **InheritedWidget 依赖追踪**: notifyDependents + _inheritedWidgets O(1) Map
- **ACP 传输层**: ndJsonStream stdio 管道、ClientSideConnection、sendPrompt/cancelPrompt 超时
- **权限请求流程**: Promise-based，完全一致
- **终端管理**: create/output/kill/release，完全一致
- **会话恢复/导出**: --resume + connectToAgentWithResume、--export md|txt|json（Flitter 超集）
- **增量历史搜索**: Ctrl+R searchBackward/searchForward
