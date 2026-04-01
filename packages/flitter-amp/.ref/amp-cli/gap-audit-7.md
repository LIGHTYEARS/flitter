# Gap 审计报告 #7: 应用层组件

## 审计范围

**领域**: 应用层组件（TextField / Dialog / FilePicker / CommandPalette / Overlay）

**Amp 分析报告**:
- `amp-tui-analysis-13.md` — TextField/TextEditingController 完整能力对比
- `amp-tui-analysis-14.md` — Dialog/CommandPalette/FilePicker 模态系统

**flitter-core 组件**:
- `text-field.ts` — TextField + TextEditingController
- `dialog.ts` — Dialog 数据类
- `dialog-overlay.ts` — DialogOverlay 渲染 Widget
- `autocomplete.ts` — Autocomplete 补全组件

**flitter-amp 组件**:
- `command-palette.ts` — 命令面板 (Ctrl+O)
- `file-picker.ts` — 文件选择器 (@file mention)
- `permission-dialog.ts` — 权限对话框
- `input-area.ts` — 输入区域
- `shortcut-help-overlay.ts` — 快捷键帮助面板 (?)

**辅助模块**:
- `overlay-manager.ts` — 集中式 Overlay 管理器
- `overlay-ids.ts` — Overlay ID 和优先级常量
- `editor-launcher.ts` — 外部编辑器启动工具
- `fuzzy-match.ts` — 模糊匹配工具
- `shortcuts/registry.ts` — 快捷键注册表

**已有 .gap 文件**: #23, #24, #25, #26, #27, #28, #55

---

## Gap 清单

### GAP-7-001: TextField Ctrl+A 行为与 Amp 不一致
- **优先级**: P0
- **影响范围**: `flitter-core/src/widgets/text-field.ts` L762-763
- **Amp 行为**: Ctrl+A 在 TextField 上下文中为 Emacs 风格的**行首移动**（moveCursorLineHome）。Amp 的全选通过其他路径实现。
- **Flitter 现状**: Ctrl+A 映射为 `selectAll()`（全选），与 Amp 行为**冲突**。这意味着 Emacs 用户无法通过 Ctrl+A 移动到行首。
- **已有 .gap 引用**: 无专门 gap；amp-tui-analysis-13 §4.1 详细描述。
- **建议修复方向**: 将 TextField 的 Ctrl+A 改为 `moveCursorLineHome()`（多行）或 `moveCursorHome()`（单行）。全选可通过 Ctrl+Shift+A 或其他方式实现。需同时更新测试用例。

### GAP-7-002: TextField 缺少 Ctrl+X 剪切操作
- **优先级**: P0
- **影响范围**: `flitter-core/src/widgets/text-field.ts` handleKeyEvent Ctrl 分支
- **Amp 行为**: 有选区时 Ctrl+X = OSC 52 复制到剪贴板 + 删除选区。
- **Flitter 现状**: TextField 不处理 Ctrl+X。有选区时按 Ctrl+X 无响应。
- **已有 .gap 引用**: 无。amp-tui-analysis-13 §4.2 描述。
- **建议修复方向**: 在 handleKeyEvent 的 Ctrl 组合分支添加 `case 'x'`：调用 `_copySelectionToClipboard()` + `controller.deleteBackward()`（或直接删除选区）。

### GAP-7-003: TextField 缺少 Emacs 风格 Ctrl+E 行尾移动
- **优先级**: P1
- **影响范围**: `flitter-core/src/widgets/text-field.ts` handleKeyEvent Ctrl 分支
- **Amp 行为**: Ctrl+E 移动光标到当前行尾（Emacs end-of-line）。
- **Flitter 现状**: 未处理 Ctrl+E。
- **已有 .gap 引用**: 无。amp-tui-analysis-13 §4.3 描述。
- **建议修复方向**: 在 Ctrl 分支添加 `case 'e': this._controller.moveCursorLineEnd()`（多行）或 `moveCursorEnd()`（单行）。

### GAP-7-004: TextField 缺少 Alt+B / Alt+F Emacs 词移动
- **优先级**: P1
- **影响范围**: `flitter-core/src/widgets/text-field.ts` handleKeyEvent
- **Amp 行为**: Alt+B = backward-word（向后移动一个词），Alt+F = forward-word（向前移动一个词）。
- **Flitter 现状**: 未处理 Alt+B / Alt+F，无 Alt 组合的键盘分支。
- **已有 .gap 引用**: 无。amp-tui-analysis-13 §4.4 描述。
- **建议修复方向**: 添加 Alt 组合处理分支：`case 'b': moveCursorWordLeft()`, `case 'f': moveCursorWordRight()`。

### GAP-7-005: TextField 缺少 Ctrl+W 删除前一个词
- **优先级**: P1
- **影响范围**: `flitter-core/src/widgets/text-field.ts` handleKeyEvent Ctrl 分支
- **Amp 行为**: Ctrl+W = 删除光标前一个词（与 Ctrl+Backspace 等效，Emacs kill-word）。
- **Flitter 现状**: 未处理 Ctrl+W。已有 Ctrl+Backspace = `deleteWordBackward()` 但缺少等效的 Ctrl+W 绑定。
- **已有 .gap 引用**: 无。amp-tui-analysis-13 §4.5 描述。
- **建议修复方向**: 在 Ctrl 分支添加 `case 'w': this._controller.deleteWordBackward()`。

### GAP-7-006: FilePicker 缺少搜索/过滤功能
- **优先级**: P1
- **影响范围**: `flitter-amp/src/widgets/file-picker.ts`
- **Amp 行为**: Amp 的文件选择器支持搜索过滤（类似 CommandPalette 的 fuzzy search）。
- **Flitter 现状**: FilePicker 是一个 StatelessWidget，直接显示传入的文件列表，无搜索输入框，无模糊匹配过滤。用户只能通过方向键在全量列表中滚动。
- **已有 .gap 引用**: .gap/25 提到 FilePicker 的 onSelect 问题（已通过 #55 修复），但未提及搜索功能缺失。
- **建议修复方向**: 将 FilePicker 从 StatelessWidget 转换为 StatefulWidget，添加 TextField 搜索框和 fuzzy-match 过滤逻辑（可复用 `utils/fuzzy-match.ts`），类似 CommandPalette 的搜索架构。

### GAP-7-007: FilePicker 缺少内置文件系统遍历
- **优先级**: P1
- **影响范围**: `flitter-amp/src/widgets/file-picker.ts`, `flitter-amp/src/app.ts`
- **Amp 行为**: Amp 内置文件系统遍历 + glob 匹配，@触发时自动列出工作目录文件。
- **Flitter 现状**: FilePicker 接收外部传入的 `files: string[]`，自身不负责文件发现。App 层虽然导入了 FilePicker，但当前代码中**未找到触发 FilePicker overlay 的代码路径**（无 `OVERLAY_IDS.FILE_PICKER` 的 show 调用），FilePicker 实际上处于**未使用状态**。
- **已有 .gap 引用**: .gap/25 (file-picker-onselect), .gap/55 (expose-text-controller，含 FilePicker 路径插入方案)。
- **建议修复方向**: 1) 在 App 层或 InputArea 层实现 `@` 触发的 FilePicker overlay 显示逻辑；2) 创建 FileService 工具类处理文件系统遍历；3) 将 Autocomplete 的 `@` trigger 与 FilePicker 联动。

### GAP-7-008: InputArea 固定高度，缺少自动增高
- **优先级**: P2
- **影响范围**: `flitter-amp/src/widgets/input-area.ts` L178
- **Amp 行为**: PromptBar 通过自定义 RenderObject (`jJH`) 的 `maxHeight` 实现内容自动增高，内容增加时容器自动扩展。
- **Flitter 现状**: InputArea 的 Container 使用固定 `height: 5`，不论内容多少，输入框高度始终为 5 行。
- **已有 .gap 引用**: 无。amp-tui-analysis-13 §4.7 描述。
- **建议修复方向**: 将 Container height 改为动态计算（基于 controller.text 的行数），并增加 maxHeight 约束。或用 `ConstrainedBox` 替代固定高度。

### GAP-7-009: InputArea 缺少拖拽调整高度
- **优先级**: P2
- **影响范围**: `flitter-amp/src/widgets/input-area.ts`
- **Amp 行为**: PromptBar 顶部有 MouseRegion (NS_RESIZE cursor)，用户可拖拽调整输入框高度。
- **Flitter 现状**: 无拖拽调高功能。
- **已有 .gap 引用**: 无。amp-tui-analysis-13 §4.8 描述。
- **建议修复方向**: 在 InputArea 顶部添加 MouseRegion（cursor: NS_RESIZE），通过 onDrag 回调调整 Container 高度。

### GAP-7-010: TextField 选区颜色未对接主题
- **优先级**: P2
- **影响范围**: `flitter-core/src/widgets/text-field.ts`, `flitter-amp/src/widgets/input-area.ts`
- **Amp 行为**: 选区使用 `theme.selection` 颜色（从主题中获取）。
- **Flitter 现状**: TextField 默认选区颜色为硬编码的 `Color.rgb(50, 50, 180)`。InputArea 创建 TextField 时**未传入 selectionColor**，未对接 AmpTheme。
- **已有 .gap 引用**: 无。amp-tui-analysis-13 §4.12 描述。
- **建议修复方向**: InputArea 创建 TextField 时传入 `selectionColor: theme?.base.selection`。

### GAP-7-011: TextField 光标无 blink 效果
- **优先级**: P2
- **影响范围**: `flitter-core/src/widgets/text-field.ts`
- **Amp 行为**: 利用终端原生光标（DECSCUSR），支持 blink 闪烁效果。
- **Flitter 现状**: 使用字符级光标（插入 cursorChar 到文本中），光标始终可见，无闪烁。
- **已有 .gap 引用**: 无。amp-tui-analysis-13 §4.6 描述。
- **建议修复方向**: 可通过 Timer 定时切换光标可见性（500ms 间隔）实现简单 blink；或考虑对接终端原生光标（需重构渲染管线）。优先级较低，字符级光标在终端中已是可接受实践。

### GAP-7-012: PermissionDialog 使用 Dialog 数据类但 Dialog 类的 buttons/footer 能力未被利用
- **优先级**: P2
- **影响范围**: `flitter-core/src/widgets/dialog.ts`, `flitter-amp/src/widgets/permission-dialog.ts`
- **Amp 行为**: PermissionDialog 通过 SelectionList 呈现选项，不使用按钮。
- **Flitter 现状**: PermissionDialog 已成功集成 Dialog 数据类 + DialogOverlay 渲染（Gap 26 已实现）。但 Dialog 数据类的 `buttons`, `footerStyle`, `dimensions` 等属性在整个 flitter-amp 中**从未被使用**。这些 API 占据 flitter-core 的公共表面但无实际消费者。
- **已有 .gap 引用**: .gap/26 (dialog-class，已实现基本集成)。
- **建议修复方向**: 评估是否需要保留 Dialog 数据类的完整 API（buttons/footer）。如果 PermissionDialog 是唯一消费者且永远使用 SelectionList 作为 body，考虑简化 Dialog 类或标记未使用字段为 Deprecated。

### GAP-7-013: Prompt History UI Overlay 缺失
- **优先级**: P2
- **影响范围**: `flitter-amp/src/app.ts`
- **Amp 行为**: Ctrl+R 弹出可视化的历史搜索 overlay（增量反向搜索模式）。
- **Flitter 现状**: Ctrl+R 已实现增量反向搜索模式（Gap 64），但其 UI 是通过 InputArea 的 `searchState` 属性内嵌在输入框上方的提示文本中显示（非独立 overlay）。当前行为是：搜索查询显示在输入框上方，匹配结果直接注入输入框文本。这与 Amp 的行为基本对齐（Amp 也不是独立 overlay 而是在 PromptBar 上方显示搜索状态），**这个 gap 已基本解决**。
- **已有 .gap 引用**: .gap/64 (incremental-history-search)。
- **建议修复方向**: 当前实现已足够。如需增强，可考虑在搜索模式中高亮匹配的历史文本片段。

### GAP-7-014: Skill 浏览器模态未实现
- **优先级**: P2
- **影响范围**: `flitter-amp/src/app.ts`
- **Amp 行为**: Amp 有 Skill Modal（技能列表 + invoke 调用），在 binary reverse-engineering 中观察到。
- **Flitter 现状**: 完全未实现。无 SkillBrowser widget，无触发路径。AppState 有 `skillCount` 字段和 InputArea 有 skills badge 渲染，但无实际 skill 浏览交互。
- **已有 .gap 引用**: 无专门 gap。amp-tui-analysis-14 §4.8 描述。
- **建议修复方向**: 创建 SkillBrowser overlay Widget，通过 ACP 协议获取已安装 skills 列表，支持搜索和调用。添加 keyboard shortcut 触发。

---

## 已有 .gap 交叉引用

| .gap 编号 | 标题 | 状态 | 是否仍然有效 |
|-----------|------|------|-------------|
| #23 | ShortcutHelpOverlay — 快捷键帮助面板 | ✅ **已解决** | 否。`shortcut-help-overlay.ts` 已完整实现，App 中已通过 `_showShortcutHelp()` + OverlayManager 集成，`?` 键触发正常工作，并支持从 ShortcutRegistry 动态生成快捷键列表。 |
| #24 | Editor Integration — Ctrl+G $EDITOR 集成 | ✅ **已解决** | 否。`editor-launcher.ts` 已实现完整的 suspend/resume 流程（`_openInEditor()`），通过 `WidgetsBinding.suspend()/resume()` 暂停 TUI、启动外部编辑器、回写编辑文本，并已注册到 ShortcutRegistry。 |
| #25 | FilePicker onSelect — 文件路径插入 | ⚠️ **部分解决** | 是（部分）。Gap #55 (expose-text-controller) 通过 controller hoisting 解决了文本注入的基础设施问题，但 FilePicker overlay 本身**未在 App 中通过 OverlayManager 触发**（无 `OVERLAY_IDS.FILE_PICKER` 的 show 调用）。FilePicker 处于导入但未使用状态。 |
| #26 | Dialog 数据类 — 未连接 | ✅ **已解决** | 否。PermissionDialog 已重构为使用 Dialog 数据类 + DialogOverlay（见 permission-dialog.ts L45-67）。但 Dialog 类的 buttons/footer 等高级 API 仍无消费者（见 GAP-7-012）。 |
| #27 | Overlay Manager — Ad-Hoc 管理 | ✅ **已解决** | 否。`overlay-manager.ts` 已完整实现集中式 overlay 管理（优先级栈、show/dismiss/dismissTop/buildOverlays），App.build() 中使用 `this.overlayManager.buildOverlays(mainContent)` 替代了原有的 if/else-if 链。有完整测试覆盖（312 行）。 |
| #28 | CommandPalette Search — 搜索过滤 | ✅ **已解决** | 否。CommandPalette 已从 StatelessWidget 转为 StatefulWidget，包含 TextField 搜索框 + fuzzy-match 过滤 + scoreCommand 排序。命令列表已扩展为从 ShortcutRegistry 动态获取（10+ 命令），包含 result count 提示和 "No matching commands" 空态。 |
| #55 | Expose TextEditingController — Controller Hoisting | ✅ **已解决** | 否。InputArea 已支持 `controller` 外部传入（externalController 模式 + ownsController 生命周期管理），App 层已创建 `inputController` 并通过 BottomGrid 传递到 InputArea。Ctrl+R/Ctrl+S 历史导航、Ctrl+G 编辑器集成均使用 hoisted controller。 |

---

## 审计总结

### 已解决 Gap 统计
- **完全解决**: 5 个（#23 ShortcutHelp, #24 Editor, #27 OverlayManager, #28 CommandPaletteSearch, #55 ExposeController）
- **大部分解决**: 1 个（#26 DialogClass — 基本集成完成，buttons/footer API 未使用）
- **部分解决**: 1 个（#25 FilePickerOnSelect — 基础设施就绪但 FilePicker 未接入 Overlay）

### 新发现 Gap 统计
- **P0（功能冲突/缺失）**: 2 个（Ctrl+A 行为冲突, Ctrl+X 剪切缺失）
- **P1（功能缺失）**: 4 个（Ctrl+E, Alt+B/F, Ctrl+W, FilePicker 搜索 + 文件遍历）
- **P2（体验/完善性）**: 6 个（自动增高, 拖拽调高, 选区主题, 光标 blink, Dialog API 冗余, Skill 浏览器）

### 关键风险评估
1. **Ctrl+A 冲突是最高优先级问题** — 直接影响 Emacs 用户（终端用户群体中的重要组成部分），且与 Amp 行为语义不一致。
2. **Ctrl+X 剪切缺失影响所有用户** — 剪切是基础文本编辑操作。
3. **FilePicker 未接入是功能性断裂** — 文件选择器虽已实现 Widget，但整个触发链路未连通，用户无法通过 `@` 进入文件选择流程（Autocomplete 的 `@` trigger 当前使用空的 `optionsBuilder: () => []`）。
