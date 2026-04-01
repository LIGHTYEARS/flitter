# Gap 审计报告 #10: 视觉还原度

## 审计范围

### Amp 参考源（混淆后逆向）
- **消息渲染**: `user-message-Sa.js`, `assistant-message-XkL.js`, `selected-user-message-RQ.js`
- **思考块**: `thinking-block-zk.js`
- **工具调用**: `tool-header-wQ.js`, `tool-call-header-xD.js`, `status-icon-rR.js`, `status-color-j0.js`, `expand-collapse-lT.js`
- **状态栏/输入**: `prompt-bar-F0H.js`, `footer-status-dy.js`, `status-bar-iJH.js`
- **索引**: `INDEX.md`

### Flitter 实现
- **ChatView**: `widgets/chat-view.ts`
- **BottomGrid**: `widgets/bottom-grid.ts`
- **StatusBar**: `widgets/status-bar.ts` (已废弃)
- **ThinkingBlock**: `widgets/thinking-block.ts`
- **InputArea**: `widgets/input-area.ts`
- **DiffCard**: `widgets/diff-card.ts`
- **PlanView**: `widgets/plan-view.ts`
- **ToolCall 系列**: `tool-call/tool-call-widget.ts`, `tool-call/tool-header.ts`, `tool-call/bash-tool.ts`, `tool-call/edit-file-tool.ts`
- **StreamingCursor**: `widgets/streaming-cursor.ts`
- **主题系统**: `themes/` 全部 7 个主题 + `amp-theme-data.ts` + `index.ts`

### 已有 .gap 文件
- `33-session-id-display.md` ~ `46-truncation-consistency.md`（共 11 个）

---

## Gap 清单

### GAP-10-001: ThinkingBlock 展开/折叠指示符位置与 Amp 相反
- **优先级**: P1
- **影响范围**: ThinkingBlock 渲染
- **Amp 行为**: `zk` 中，展开/折叠指示符 (▶/▼) 位于行末（状态图标 + "Thinking" 文本之后），仅在有内容时显示。布局为 `Row([Text(icon + "Thinking"), SizedBox(1), chevronWidget])`。chevron 使用 `mutedForeground` 颜色，不带 dim。
- **Flitter 现状**: `thinking-block.ts` 中，chevron `▶/▼` 被放在行首（第 51 行 `const chevron = item.collapsed ? '\u25B6' : '\u25BC'`），位于状态图标之前。渲染为 `chevron + icon + "Thinking"`。始终显示 chevron，即使内容为空。
- **已有 .gap 引用**: 无
- **建议修复方向**: 
  1. 将 chevron 移至 "Thinking" 文本之后，使用 `Row` 布局
  2. 仅在有可展开内容时显示 chevron（`u` 条件检查，对应 `trim().length > 0`）
  3. 改用 `Text`/`dH` widget 单独渲染 chevron，而非内联到 label spans

### GAP-10-002: ThinkingBlock 缺少 Braille Spinner 动画
- **优先级**: P1
- **影响范围**: ThinkingBlock 流式状态渲染
- **Amp 行为**: `zk` 中 streaming 状态使用 `BrailleSpinner`（`Af` 类，200ms 步进），显示为 `spinner.toBraille() + " "` 前缀，使用 `accent` 颜色。这是一个 `StatefulWidget` 带定时器。
- **Flitter 现状**: `thinking-block.ts` 是 `StatelessWidget`，streaming 时使用静态 `'● '` 字符（第 41 行），无动画效果。
- **已有 .gap 引用**: 无
- **建议修复方向**: 
  1. 将 `ThinkingBlock` 重构为 `StatefulWidget`
  2. 引入 `BrailleSpinner`（已有 `flitter-core/src/utilities/braille-spinner`）
  3. 在 `isStreaming` 时启动 200ms 定时器，停止时清除

### GAP-10-003: ThinkingBlock "Thinking" 标签颜色与 Amp 不一致
- **优先级**: P2
- **影响范围**: ThinkingBlock 标签文本
- **Amp 行为**: `zk` 中完成状态下 "Thinking" 使用 `foreground` 颜色 + `dim: !A`（当非 cancelled 时 dim=true），cancelled 状态使用 `warning` 颜色且不 dim。关键差异：Amp 使用 `foreground`（非 `color` 状态色）作为 "Thinking" 文本的颜色。
- **Flitter 现状**: `thinking-block.ts` 中 "Thinking" 文本使用状态颜色 `color` + `dim: true`（第 63-64 行），即完成时 green+dim、streaming 时 magenta+dim，而非 Amp 的 foreground+dim。
- **已有 .gap 引用**: 无
- **建议修复方向**: 将 "Thinking" 文本 foreground 改为 `theme.base.foreground`，保留 `dim: true`（非 cancelled 时）

### GAP-10-004: ThinkingBlock 内容渲染缺少 Markdown 支持
- **优先级**: P2
- **影响范围**: ThinkingBlock 展开内容
- **Amp 行为**: `zk` 中使用 `EA$`（markdown widget）渲染思考内容（通过 `L0H(H)` 获取 markdown options），并有行计数截断逻辑（`I0H` 函数统计行数，`nQH` 按行截断）。
- **Flitter 现状**: `thinking-block.ts` 使用纯 `Text` widget 渲染思考内容（第 89-91 行），按字符截断 10000 字符，无 Markdown 渲染、无行级截断。
- **已有 .gap 引用**: 无
- **建议修复方向**: 使用 `Markdown` widget 渲染内容；实现行级截断而非字符级截断

### GAP-10-005: UserMessage 缺少中断状态 (interrupted) 渲染
- **优先级**: P1
- **影响范围**: 用户消息渲染
- **Amp 行为**: `Sa` 中检查 `L.interrupted`，如果 interrupted 则使用 `warning` 颜色（黄色）作为文本颜色和边框颜色，并通过 `kQ` 函数传递 interrupted 标志以追加截断标记。
- **Flitter 现状**: `chat-view.ts` 的 `buildUserStickyHeader` 方法（第 162-181 行）不接受也不渲染任何 interrupted 状态，始终使用 `success` 颜色（绿色）。`ConversationItem` 的 `user_message` 类型没有 `interrupted` 字段。
- **已有 .gap 引用**: 无
- **建议修复方向**: 
  1. 在 `ConversationItem` 的 `user_message` 类型中添加 `interrupted?: boolean`
  2. 在 `buildUserStickyHeader` 中根据 interrupted 状态切换颜色
  3. 使用 warning 颜色渲染中断的消息

### GAP-10-006: UserMessage 缺少图片附件渲染
- **优先级**: P2
- **影响范围**: 用户消息渲染
- **Amp 行为**: `Sa` 中调用 `lA$` 函数渲染图片附件（`L.content.filter(E => E.type === "image")`），支持点击预览（`onShowImagePreview`），在消息文本上方显示图片行。
- **Flitter 现状**: `chat-view.ts` 的 `buildUserStickyHeader` 仅渲染纯文本字符串，无图片附件渲染能力。
- **已有 .gap 引用**: 34-bottom-grid-props.md（imageAttachments 提及）
- **建议修复方向**: 在数据模型和渲染层添加图片附件支持

### GAP-10-007: UserMessage 缺少 discoveredGuidanceFiles 显示
- **优先级**: P2
- **影响范围**: 用户消息渲染
- **Amp 行为**: `Sa` 中检查 `L.discoveredGuidanceFiles`，通过 `dA$` 函数渲染已发现的 guidance 文件列表。
- **Flitter 现状**: 无此功能，数据模型和渲染层均未实现。
- **已有 .gap 引用**: 无
- **建议修复方向**: 在 ACP 事件处理和渲染层添加 guidance files 显示

### GAP-10-008: UserMessage info 角色缺少 Shell 命令渲染
- **优先级**: P1
- **影响范围**: 用户消息中的 shell 命令显示
- **Amp 行为**: `Sa` 中当 `L.role === "info"` 时，解析 shell 命令信息（`Q1(L)` 提取 hidden/cmd），显示为 `$ cmd` 或 `$$ cmd` 格式，并使用 `hA$` 获取特定颜色，还通过 `HuH` 渲染命令结果。
- **Flitter 现状**: Flitter 没有 info 角色消息的特殊处理，所有用户消息统一渲染为纯文本。
- **已有 .gap 引用**: 无
- **建议修复方向**: 实现 info role 的 shell 命令解析和渲染

### GAP-10-009: AssistantMessage 缺少 "You're absolutely right" 特殊处理
- **优先级**: P2
- **影响范围**: 助手消息渲染
- **Amp 行为**: `XkL` 函数检查 `L.trimStart().startsWith("You're absolutely right")`，如果匹配则使用不同的 Markdown 渲染器（`EA$` 带 `defaultColor: I.foreground`），否则使用标准 `ht` markdown widget。
- **Flitter 现状**: `chat-view.ts` 的 `buildAssistantMessage` 统一使用 `StreamingCursor`/`Markdown`，无条件分支。
- **已有 .gap 引用**: 无
- **建议修复方向**: 这是 Amp 的一个特定行为检测，可能影响消息的文本颜色。考虑是否需要还原此细节。

### GAP-10-010: ToolHeader — toolName 颜色映射差异
- **优先级**: P1
- **影响范围**: 所有工具调用头部
- **Amp 行为**: `wQ` 中工具名称使用 `t.app.toolName` 颜色 + `bold: true`。根据 INDEX.md，`toolName = default`（即 foreground 颜色，非 cyan）。Amp `x1.default` 中 `toolName` 映射到 `foreground`（即默认前景色）。
- **Flitter 现状**: `tool-header.ts` 第 110 行使用 `theme?.app.toolName ?? Color.cyan` 回退到 cyan。但 `deriveAppColors` 中 `toolName: base.foreground`，主题正确。然而在无主题回退时使用 `Color.cyan` 而 Amp 使用 `default`（foreground）。
- **已有 .gap 引用**: 无
- **建议修复方向**: 将回退颜色从 `Color.cyan` 改为 `Color.defaultColor`（foreground），以匹配 Amp 的 `toolName = default` 行为

### GAP-10-011: ToolHeader — 状态映射中缺少 cancelled/rejected-by-user 状态
- **优先级**: P1
- **影响范围**: 工具调用状态显示
- **Amp 行为**: `rR` 和 `j0` 函数处理 6 种状态：`done`, `error`, `cancelled`, `rejected-by-user`, `cancellation-requested`, `in-progress`, `queued`, `blocked-on-user`。其中 `cancelled/rejected-by-user/cancellation-requested` 使用 `✗` 图标和 `toolCancelled`（黄色）颜色；`queued/blocked-on-user` 使用 `⋯` 和 `waiting`（黄色）。
- **Flitter 现状**: `tool-header.ts` 只处理 4 种状态：`completed`, `failed`, `in_progress`, `pending`。`ToolCallItem.status` 类型也只有这 4 种。缺少 `cancelled`、`rejected-by-user`、`queued`、`blocked-on-user` 状态。
- **已有 .gap 引用**: 无
- **建议修复方向**: 
  1. 扩展 `ToolCallItem.status` 联合类型加入 `cancelled`, `queued`, `blocked-on-user`
  2. 在 `getStatusIcon` 和 `getStatusColor` 中添加对应分支
  3. cancelled/rejected → `✗` + `toolCancelled`; queued → `⋯` + `waiting`

### GAP-10-012: ToolHeader — Spinner 位置差异
- **优先级**: P2
- **影响范围**: 工具调用头部动画
- **Amp 行为**: `wQ` 中 in-progress 状态的 spinner（`⋯`）作为状态图标出现在行首，即 `[⋯] [ToolName] [detail]`。而 `xD` 类中 spinner 也在行首作为状态图标替代：`[spinner] [ToolName]`。
- **Flitter 现状**: `tool-header.ts` 中 spinner 追加在行末（第 132-136 行），在 details 之后：`[⋯] [ToolName] [details] [spinner]`。状态图标和 spinner 同时出现。
- **已有 .gap 引用**: 无
- **建议修复方向**: in-progress 时用 braille spinner 替代静态 `⋯` 状态图标（而非同时显示两者），或按 Amp 的方式仅在状态图标位置显示 spinner

### GAP-10-013: ToolHeader — 缺少 apply_patch 工具的特殊头部渲染
- **优先级**: P2
- **影响范围**: apply_patch 工具显示
- **Amp 行为**: `wQ` 中 `apply_patch` 工具有专门的渲染函数 `ykL`，显示文件数、变更数、添加/删除统计（`fileCount files totalChanges changes +additions -deletions`），使用 `diffAdded/diffRemoved` 颜色。
- **Flitter 现状**: `tool-call-widget.ts` 将 `apply_patch` 路由到 `EditFileTool`（第 75-77 行），无特殊统计渲染。
- **已有 .gap 引用**: 无
- **建议修复方向**: 为 `apply_patch` 创建专门的渲染分支或子组件，解析 patch 内容并显示统计信息

### GAP-10-014: ToolHeader — 工具输入详情提取逻辑差异
- **优先级**: P1
- **影响范围**: 所有工具头部的详情文本
- **Amp 行为**: `FkL` 函数从 `normalizedInput` 或 `input` 中按优先级提取字段：`path → filePattern → pattern → query → url → objective → cmd → command → description → prompt`。使用 `maxLines: 1` + `overflow: "ellipsis"` 截断。
- **Flitter 现状**: 各工具单独实现详情提取逻辑（如 `bash-tool.ts` 取 `command/cmd`，`grep-tool.ts` 取 `pattern/path`），在 `ToolHeader` 层无统一的 `normalizedInput` 字段，也无 `maxLines/ellipsis` 截断。
- **已有 .gap 引用**: 44-raw-input-type-safety.md（相关但不同焦点）
- **建议修复方向**: 
  1. 在 `ToolCallItem` 中添加 `normalizedInput` 字段
  2. 实现统一的字段提取链 (`FkL` 对应逻辑)
  3. 在 `ToolHeader` 或 `Text` 中添加 `maxLines: 1` + ellipsis 溢出处理

### GAP-10-015: ExpandCollapse — 缺少独立的可点击组件
- **优先级**: P1
- **影响范围**: 工具调用和思考块的展开/折叠交互
- **Amp 行为**: `lT` 是一个独立的 `StatefulWidget`（`ExpandCollapse`），使用 `GestureDetector`(`GL`)包裹标题区域，支持点击 toggle，chevron 使用 `mutedForeground` 颜色。子组件在 expanded 时显示。
- **Flitter 现状**: 没有对应的 `ExpandCollapse` 组件。工具卡片的展开/折叠通过 `isExpanded` prop 被动控制，`ThinkingBlock` 通过 `collapsed` 字段。点击 toggle 已通过 Gap #39/40 提案但尚未完全落地。
- **已有 .gap 引用**: 39-per-card-toggle.md, 40-ontoggle-propagation.md
- **建议修复方向**: 按照 Amp 的 `lT` 模式实现统一的 ExpandCollapse widget，或确保 Gap #39/#40 方案充分覆盖此需求

### GAP-10-016: StatusBar — Wave Spinner 动画差异
- **优先级**: P1
- **影响范围**: 底部状态栏
- **Amp 行为**: `iJH` 使用 wave spinner（动画帧 `[" ", "∼", "≈", "≋", "≈", "∼"]`，200ms 步进），在处理中显示波浪动画。spinner 颜色根据状态动态变化（submitting → primary, inference → primary, 其他 → mutedForeground）。
- **Flitter 现状**: `status-bar.ts`（已废弃）使用静态 `≈` 字符（第 58 行），无动画。`BottomGrid` 在处理状态上方行显示 token usage 但无波浪 spinner。
- **已有 .gap 引用**: 无
- **建议修复方向**: 在 `BottomGrid` 的处理状态指示中实现 wave spinner 动画

### GAP-10-017: StatusBar — 缺少上下文窗口使用量警告
- **优先级**: P1
- **影响范围**: 状态栏/底部区域
- **Amp 行为**: `dy` 函数检测 token 用量阈值（`BFL` 函数返回 `recommendation`/`warning`/`danger`），`iJH` 中根据阈值使用不同颜色显示警告：recommendation → recommendation色, warning → warning色, danger → destructive色。显示格式如 "Optimize context. 80% used" 或 "Context near full."。
- **Flitter 现状**: `BottomGrid` 的 `buildTopLeft` 只显示 `used / size · cost` 文本（第 159-171 行），无阈值检测、无颜色变化、无警告文案。
- **已有 .gap 引用**: 无
- **建议修复方向**: 
  1. 实现 token 使用量阈值计算（类似 `BFL` 函数）
  2. 在达到阈值时改变颜色并显示警告前缀

### GAP-10-018: StatusBar — 缺少多种执行状态消息
- **优先级**: P1
- **影响范围**: 状态栏状态文本
- **Amp 行为**: `dy` 函数返回 10+ 种不同状态消息：`"Running shell command..."`, `"Auto-compacting..."`, `"Submitting message..."`, `"Waiting for approval..."`, `"Handing off to new thread..."`, `"Running N tools..."`, `"Stream interrupted, retrying..."`, `"Waiting for response..."`, `"Streaming response..."`, `"Cancelled"`, 以及执行命令消息 `"Executing /command..."`。
- **Flitter 现状**: `BottomGrid` 只有 `"Streaming..."` 和 `"Esc to cancel"` 两种状态（第 158-178 和 226-241 行）。
- **已有 .gap 引用**: 无
- **建议修复方向**: 扩展 `AppState` 和 `BottomGrid` 以支持更细粒度的状态消息

### GAP-10-019: PromptBar — 边框样式差异
- **优先级**: P2
- **影响范围**: 输入区域边框
- **Amp 行为**: `F0H` 使用 `borderStyle: "rounded"` + 主题 `borderColor`，并支持 `overlayTexts` 叠加在边框上（通过 `ContainerWithOverlays`/`qt`），支持拖拽调整高度（`onDrag`, `onDragRelease`, resize handle）。有 `hasBanner` 标志和 `maxHeight` 约束。
- **Flitter 现状**: `InputArea` 使用 `Border.all(rounded)` + `Stack/Positioned` 实现 overlay（第 263-270 行），无拖拽调整高度功能，无 banner 支持，固定 `height: 5`（第 178 行）。
- **已有 .gap 引用**: 无
- **建议修复方向**: 
  1. 实现可拖拽调整输入框高度（需要 `GestureDetector` 拖拽支持）
  2. 使用 `ContainerWithOverlays` 对应的 `BorderOverlayContainer` 组件统一 overlay 处理

### GAP-10-020: SelectedUserMessage — 缺少选中消息的差异化渲染
- **优先级**: P2
- **影响范围**: 用户消息选中态
- **Amp 行为**: `RQ` (SelectedUserMessage) 使用 `selectedMessage` 颜色高亮全边框（`ZL.all`，非仅 left border），支持 restore/edit 确认对话框（`isShowingRestoreConfirmation`, `isShowingEditConfirmation`），pendingEditText，forceDim 覆盖等。`width: Infinity` 确保全宽。
- **Flitter 现状**: `chat-view.ts` 不区分选中/非选中用户消息，统一使用 `buildUserStickyHeader`（仅 left border）。无消息选中、编辑、恢复功能。
- **已有 .gap 引用**: 无
- **建议修复方向**: 实现消息选中态的差异化渲染是一个较大功能，建议在实现消息导航后再处理

### GAP-10-021: ChatView — 缺少消息列表滚动优化 (ListBuilder 模式)
- **优先级**: P1
- **影响范围**: 消息列表性能
- **Amp 行为**: `_A$` 类实现了虚拟化列表模式（`getRenderItems`, `getSourceIndex`, `getCacheIdentity`, `getRenderSignature`），对消息和工具调用进行 cache identity 计算和签名比较，避免不必要的重建。
- **Flitter 现状**: `chat-view.ts` 的 `build` 方法每次重建都创建所有子 widget（第 84-149 行），无虚拟化、无 cache identity、无签名比较。
- **已有 .gap 引用**: 无
- **建议修复方向**: 实现 ListBuilder 或 LazyColumn 模式，利用 `key` 和 cache identity 进行增量重建

### GAP-10-022: DiffCard — 与 Amp apply_patch 统计渲染不匹配
- **优先级**: P2
- **影响范围**: Diff 显示
- **Amp 行为**: `ykL` 中 apply_patch 头部渲染 `[icon] Apply Patch [fileCount files] [totalChanges changes] [+additions] [-deletions]`，additions 使用 `diffAdded` 颜色，deletions 使用 `diffRemoved` 颜色。
- **Flitter 现状**: `DiffCard` 是独立的 diff 显示组件，显示文件路径和 DiffView，但不在工具头部显示统计摘要。
- **已有 .gap 引用**: 无
- **建议修复方向**: 在 EditFileTool 或新 ApplyPatchTool 中集成统计摘要显示

### GAP-10-023: ToolCallWidget 缺少 Task (ci) 工具的特殊处理
- **优先级**: P2
- **影响范围**: Task 子代理工具渲染
- **Amp 行为**: `wQ` 中对 `ci`（Task 工具）有特殊处理：当 status 不是 done 时，显示修改后的 status（queued/blocked-on-user 映射为 "in-progress"），并在 `xD` (ToolCallHeader) 中渲染为可折叠的 task 组合（`_buildCollapsibleTaskItem`）。
- **Flitter 现状**: `TaskTool` 仅委托到 `GenericToolCard`，无特殊的 task status 映射和 collapsible task item 渲染。子工具通过 `childWidgets` 传递但缺少 Amp 的嵌套折叠行为。
- **已有 .gap 引用**: 39-per-card-toggle.md（部分相关）
- **建议修复方向**: 实现 Task 工具的嵌套折叠渲染，包括 status 映射和子工具列表

### GAP-10-024: InputArea — mode label 定位差异
- **优先级**: P2
- **影响范围**: 输入框模式标签
- **Amp 行为**: `F0H` 中 mode label 通过 `overlayTexts` 系统作为边框文本叠加，位置由 `_toBorderTextOverlays` 精确控制，支持 `offsetX` 偏移。overlay 层通过 `qt`/`ContainerWithOverlays` 管理，定位在边框线上（非边框内部）。
- **Flitter 现状**: `InputArea` 使用 `Stack/Positioned` 将 mode label 放在 `top: 0, right: 1`（第 220-228 行）。这是 border 内部叠加，而非 border 线上叠加。视觉上 label 可能与边框不精确对齐。
- **已有 .gap 引用**: 无
- **建议修复方向**: 实现类似 `ContainerWithOverlays` 的 border text overlay 机制，使标签精确叠加在边框线上

### GAP-10-025: PlanView — 与 Amp TodoListTool 渲染格式差异
- **优先级**: P2
- **影响范围**: Plan 计划视图
- **Amp 行为**: Amp 中 plan/todo 渲染通过 `_A$.buildWidget` 分派，todo_write 工具的内容作为 tool call result 显示，与消息流集成。优先级标签在 Amp CLI 原版中并不存在于 plan 渲染——plan 条目只显示 status icon + content。
- **Flitter 现状**: `PlanView` 已实现 `[H]/[M]/[L]` 优先级标签（基于 Gap #35 提案已实施）。这实际上是一个 Flitter 增强而非 Amp 还原。
- **已有 .gap 引用**: 35-plan-priority-display.md（已实施）
- **建议修复方向**: 当前实现合理，优先级标签作为 Flitter 增强保留。确认 Amp 原版确实不显示优先级标签。

---

## 已有 .gap 交叉引用

| .gap 编号 | 标题 | 状态 | 是否仍然有效 | 与视觉还原度的关系 |
|-----------|------|------|-------------|-------------------|
| #33 | SessionId Accepted but Unused | 已分析 | ✅ 有效（建议删除 HeaderBar） | 低：HeaderBar 已废弃，sessionId 不影响视觉还原 |
| #34 | BottomGrid Props Not Wired | 已分析 | ✅ 有效 | 中：`agentMode/shellMode` 已被标记为死代码，`hintText` 等扩展点影响状态栏丰富度 |
| #35 | PlanEntry.priority Not Rendered | 已实施 | ✅ 已修复 | 低：这是 Flitter 增强非 Amp 还原（见 GAP-10-025） |
| #39 | Per-Card Toggle Not Wired | 已分析 | ✅ 有效 | 高：直接影响 GAP-10-015 展开/折叠交互还原 |
| #40 | onToggle Not Propagated | 已分析 | ✅ 有效 | 高：是 #39 的前提依赖，所有工具的 toggle 传播 |
| #41 | Tool Locations Not Rendered | 已分析 | ✅ 有效 | 中：影响工具卡片信息密度，但 Amp 原版也未在工具头部显示 locations |
| #42 | Streaming Tool Output | 已分析 | ✅ 有效 | 高：直接影响 GAP-10-002 和工具执行期间的视觉反馈 |
| #43 | CreateFile Ignores Result | 已分析 | ✅ 有效 | 中：影响 create_file 完成后的视觉反馈 |
| #44 | Raw Input Type Safety | 已分析 | ✅ 有效 | 低：类型安全问题，不直接影响视觉但防止运行时崩溃 |
| #45 | Shared Output Extraction | 已分析 | ✅ 有效 | 中：输出文本提取一致性影响各工具的视觉输出 |
| #46 | Truncation Consistency | 已分析 | ✅ 有效 | 中：截断行为不一致导致视觉体验差异 |

---

## 优先级汇总

### P0（阻断级 — 无）
无 P0 级别的视觉还原度 gap。

### P1（高优先级 — 需尽快修复）
| GAP | 标题 | 复杂度 |
|-----|------|--------|
| GAP-10-001 | ThinkingBlock chevron 位置 | 低 |
| GAP-10-002 | ThinkingBlock 缺少 Braille Spinner | 中 |
| GAP-10-005 | UserMessage 缺少 interrupted 渲染 | 低 |
| GAP-10-010 | ToolHeader toolName 回退颜色 | 低 |
| GAP-10-011 | ToolHeader 缺少 cancelled/queued 等状态 | 中 |
| GAP-10-014 | ToolHeader 工具详情提取逻辑差异 | 中 |
| GAP-10-015 | ExpandCollapse 缺少独立组件 | 中（依赖 #39/#40） |
| GAP-10-016 | StatusBar Wave Spinner | 低 |
| GAP-10-017 | StatusBar 上下文窗口警告 | 中 |
| GAP-10-018 | StatusBar 多种执行状态消息 | 中 |
| GAP-10-021 | ChatView 消息列表虚拟化 | 高 |

### P2（中优先级 — 计划修复）
| GAP | 标题 | 复杂度 |
|-----|------|--------|
| GAP-10-003 | ThinkingBlock 标签颜色 | 低 |
| GAP-10-004 | ThinkingBlock 内容 Markdown | 中 |
| GAP-10-006 | UserMessage 图片附件 | 高 |
| GAP-10-007 | UserMessage guidanceFiles | 中 |
| GAP-10-008 | UserMessage info 角色 shell 命令 | 中 |
| GAP-10-009 | AssistantMessage 特殊检测 | 低 |
| GAP-10-012 | ToolHeader Spinner 位置 | 低 |
| GAP-10-013 | apply_patch 特殊头部 | 中 |
| GAP-10-019 | PromptBar 可拖拽高度 | 高 |
| GAP-10-020 | SelectedUserMessage 差异化渲染 | 高 |
| GAP-10-022 | DiffCard 统计渲染 | 中 |
| GAP-10-023 | Task 工具嵌套折叠 | 中 |
| GAP-10-024 | InputArea mode label 定位 | 中 |
| GAP-10-025 | PlanView 格式确认 | 低 |

---

## 总结

共发现 **25 个视觉还原度 Gap**，其中 P1 级别 11 个，P2 级别 14 个。

主要差异集中在以下领域：
1. **ThinkingBlock**（4 个 gap）：动画、布局、颜色、内容渲染全面偏离
2. **ToolHeader/状态系统**（5 个 gap）：状态映射不完整、颜色回退不准确、详情提取逻辑分散
3. **StatusBar/底部区域**（3 个 gap）：缺少动画、警告、细粒度状态消息
4. **UserMessage**（4 个 gap）：缺少 interrupted、图片、guidance files、info role
5. **交互/结构**（4 个 gap）：展开折叠、消息选中、列表虚拟化、输入框调整

建议修复顺序：
1. **立即可修复**（低复杂度 P1）：GAP-10-001, GAP-10-005, GAP-10-010, GAP-10-016
2. **近期修复**（中复杂度 P1）：GAP-10-002, GAP-10-011, GAP-10-014, GAP-10-017, GAP-10-018
3. **需要架构支持**（高复杂度 P1）：GAP-10-015（等 #39/#40 落地）, GAP-10-021
4. **P2 按需处理**：根据功能开发节奏逐步覆盖
