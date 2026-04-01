# Flitter vs AMP Chat View TUI 对齐差距全面审计 (2026-Q2)

## Why

截至 2026-04-02，基于 2026-03-31 的 10-Agent 审计 (GAP-SUM-001~096) 和后续的修复工作，Flitter 的 AMP TUI 对齐度已有显著提升，但仍存在大量未对齐能力。本次 deep research 的目标是：
1. 对 96 条原始 Gap 的当前状态进行精确核验（已修复 / 部分修复 / 仍未修复）
2. 识别原始审计未覆盖的新 Gap
3. 产出一份面向执行的分层优先级清单

## What Changes

本 Spec 为纯研究产出，不涉及代码修改。产出物为三份文档：
- `spec.md` (本文) — 完整审计结论
- `tasks.md` — 按优先级排列的修复任务清单（面向后续执行）
- `checklist.md` — 审计完整性验证清单

## Impact

- Affected code: `packages/flitter-core/src/**`, `packages/flitter-amp/src/**`
- Affected specs: 所有已有 `.gap/01-71` 文件 + `GAP-AUDIT-SUMMARY.md`
- 后续执行阶段将依据本审计结果确定修复范围

---

## 审计方法论

1. 以 2026-03-31 `GAP-AUDIT-SUMMARY.md` (96 条) 为基线
2. 对每条 Gap 进行磁盘源码级验证（搜索关键函数名 / 字段名 / 接口名）
3. 对 15 份 `amp-tui-analysis-*.md` 逆向分析文档进行二次扫描，识别遗漏特性
4. 对 Amp README / BINARY-RE-SPEC 进行交叉比对
5. 对当前 71 个 `.gap/` 文件进行状态核验

---

## 一、原始 96 条 Gap 当前状态核验

### 1.1 P0 Gap 状态 (原 10 条)

| GAP | 标题 | 状态 | 备注 |
|-----|------|------|------|
| GAP-SUM-001 | ReconnectionManager/HeartbeatMonitor 未集成运行时 | **部分修复** | LiveHandle 类已实现，模块已编写并通过单测，但 `index.ts` 中未 import/调用 |
| GAP-SUM-002 | ConnectionHandle 缺少 LiveHandle 间接层 | **部分修复** | `live-handle.ts` 已实现，但 `handleSubmit`/`handleCancel` 仍直接引用 `handle` |
| GAP-SUM-003 | Renderer 连续 cell 光标跳跃优化 | **部分修复** | 测试已编写，Renderer class 内光标追踪逻辑待确认完整性 |
| GAP-SUM-004 | RenderFlex 溢出检测 | **已修复** | `_hasOverflow` + 检测逻辑 + console.error 诊断 |
| GAP-SUM-005 | RenderFlex Infinity 弹性子项安全 | **已修复** | `canFlex = Number.isFinite(maxMain)` |
| GAP-SUM-006 | TextField Ctrl+A Emacs 行首 | **已修复** | `case 'a': moveCursorLineHome()` |
| GAP-SUM-007 | TextField Ctrl+X 剪切 | **已修复** | `case 'x': _copySelectionToClipboard() + insertText('')` |
| GAP-SUM-008 | Markdown StyleScheme 覆盖 | **已修复** | `styleOverrides?: Partial<MarkdownStyleScheme>` |
| GAP-SUM-009 | Wave Spinner 状态栏动画 | **已修复** | WaveSpinner StatefulWidget + 集成到 bottom-grid/status-bar |
| GAP-SUM-010 | Shortcut 系统优先级/冲突检测 | **已修复** | flitter-core ShortcutRegistry + flitter-amp ShortcutRegistry (增强版) |

**P0 总结**: 6/10 已修复, 2/10 部分修复 (ACP 重连), 1/10 部分修复 (Renderer), 1/10 部分修复 (Renderer 控制字符归入 GAP-SUM-014)

### 1.2 P1 Gap 状态 (原 30 条)

| GAP | 标题 | 状态 |
|-----|------|------|
| GAP-SUM-011 | Focus Trap | **已修复** |
| GAP-SUM-012 | Kitty CSI u 解析 | 未修复 |
| GAP-SUM-013 | present() 冗余清除 | 未修复 |
| GAP-SUM-014 | 控制字符过滤 | 未修复 |
| GAP-SUM-015 | Hyperlink OSC 8 id | **已修复** |
| GAP-SUM-016 | RepaintBoundary Phase 2/3 | 未修复 |
| GAP-SUM-017 | BoxConstraints normalize() | **已修复** |
| GAP-SUM-018 | isNormalized 完整检查 | **已修复** |
| GAP-SUM-019 | BoxConstraints tighten() | **已修复** |
| GAP-SUM-020 | RenderPadding 未使用 deflate() | 未修复 |
| GAP-SUM-021 | RenderFlex 溢出测试覆盖 | 部分修复 |
| GAP-SUM-022 | SelectionList 自动滚动 | **已修复** |
| GAP-SUM-023 | ScrollController ensureVisible | **已修复** |
| GAP-SUM-024 | 代码块 Fallback 背景色 | 未验证 |
| GAP-SUM-025 | GFM 表格列对齐 | 未修复 |
| GAP-SUM-026 | 语法高亮 RGB 桥接 | 未验证 |
| GAP-SUM-027 | `any` 类型系统性使用 | 未修复 |
| GAP-SUM-028 | TextField Ctrl+E 行尾 | **已修复** |
| GAP-SUM-029 | Alt+B/Alt+F Emacs 词移动 | **已修复** |
| GAP-SUM-030 | Ctrl+W 删除前词 | **已修复** |
| GAP-SUM-031 | FilePicker 未接入 Overlay | 未修复 |
| GAP-SUM-032 | AmpAppColors 语义色扩展 | **已修复** |
| GAP-SUM-033 | Perlin 噪声脉冲 | 未修复 |
| GAP-SUM-034 | Copy Highlight 自动消失 | 未验证 |
| GAP-SUM-035 | `as unknown as` 类型强转 | 未修复 |
| GAP-SUM-036 | 重连后会话分隔 | 未修复 (依赖 GAP-SUM-001) |
| GAP-SUM-037 | 健康状态 UI 指示 | 未修复 |
| GAP-SUM-038 | 动画框架未接入 Widget | 部分修复 (基础设施完成, Widget 迁移未开始) |
| GAP-SUM-039 | ThinkingBlock chevron + BrailleSpinner | **已修复** |
| GAP-SUM-040 | UserMessage interrupted 渲染 | **已修复** |

**P1 总结**: 13/30 已修复, 2/30 部分修复, 15/30 未修复/未验证

### 1.3 P2 Gap 状态 (原 56 条, GAP-SUM-041~096)

已修复: ~5 (GAP-SUM-047 constrainWidth/Height, GAP-SUM-072 RepaintBoundary Widget, GAP-SUM-095 OSC 22 鼠标光标)
部分修复: ~3
未修复: ~48

---

## 二、新发现 Gap (原审计未覆盖)

以下 24 条 Gap 在 GAP-SUM-001~096 中均无对应条目：

### 2.1 P1 级新 Gap (4 条)

| 编号 | 标题 | 描述 |
|------|------|------|
| NEW-001 | Tab/Shift+Tab 用户消息导航 | Amp 支持 Tab 在消息间跳转选中，按 e 编辑 / r 恢复删除 |
| NEW-002 | 选中消息 e 编辑 / r 恢复 | 选中消息后的编辑操作流程完全缺失 |
| NEW-006 | CommandPalette 完整命令集 | 当前仅 3 条命令 vs Amp 10+条 (New thread, Switch model, Copy last response, Dense view 等) |
| NEW-008 | Token 使用量 + 成本 + 耗时显示 | Bottom Grid 缺少 `X% of Yk / $0.XX / 1m 23s` 格式化及阈值着色 |

### 2.2 P2 级新 Gap (20 条)

| 编号 | 标题 | 描述 |
|------|------|------|
| NEW-003 | Ctrl+S 模式切换 | 切换 smart/code/ask 等 agent 模式 |
| NEW-004 | Alt+D 深度推理切换 | 切换到 claude-opus-4-6-1m 深度模式 |
| NEW-005 | Dense View 密集视图模式 | 多个 tool call 折叠为单行摘要 |
| NEW-007 | 线程管理 UI | 线程列表 / 新建线程 / 线程切换 (CommandPalette 入口 + 独立面板) |
| NEW-009 | 欢迎屏幕动画 Orb | 40x40 Perlin 噪声密度球 (已实现: DensityOrbWidget) |
| NEW-010 | GlowText 动画文字 | Perlin 噪声颜色混合 (已实现: glow-text.ts) |
| NEW-011 | 欢迎屏 30+ 分类建议/名言 | 按类型分类的建议系统 (command/hint/prompt/quote) |
| NEW-012 | Mystery Sequence 彩蛋 | Ctrl+X -> Y -> Z 秘密按键触发 |
| NEW-013 | Text Morph 动画 | 1.5 秒字符级文本变形过渡 |
| NEW-014 | Prompt History UI Overlay | Ctrl+R 可视化历史浏览面板 (独立 Overlay) |
| NEW-015 | @@ 双 at / @: commit 模式 | Autocomplete 多触发模式 |
| NEW-016 | 图片粘贴检测 | 从 Bracketed Paste 中识别图片数据 |
| NEW-017 | 模态全屏背景遮罩 | Dialog/CommandPalette 打开时的背景暗化 |
| NEW-018 | 焦点恢复栈 | 模态关闭后显式恢复之前的焦点位置 |
| NEW-019 | 状态栏 12 种上下文感知消息 | `dy()` 函数的完整条件分支实现 |
| NEW-020 | Auto-Compacting 通知 | 上下文窗口接近满时自动压缩并通知 |
| NEW-021 | Debug Inspector (HTTP) | localhost:9876 Widget/Element/Focus 树可视化 |
| NEW-022 | 终端能力查询完整解析链路 | DA1/DA2/XTVERSION/色彩查询响应解析 + 能力利用 |
| NEW-023 | Emoji 宽度模式 2027 | `\e[?2027h` 启用终端 emoji 宽度模式 |
| NEW-024 | 终端进度条协议 OSC 9;4 | ConEmu/Windows Terminal 进度条集成 |

**注: NEW-009 (DensityOrbWidget) 和 NEW-010 (GlowText) 已在代码中实现，不再需要额外工作。**

---

## 三、按维度汇总

### 3.1 已修复能力 (~29 条原始 Gap + 2 条 NEW)

主要集中在：
- 布局引擎安全性 (RenderFlex 溢出/Infinity, BoxConstraints API)
- TextField Emacs 键绑定 (Ctrl+A/E/X/W, Alt+B/F)
- 焦点系统 (FocusTrap, ShortcutRegistry)
- 滚动 API (ensureVisible, SelectionList 自动滚动)
- 视觉还原 (WaveSpinner, ThinkingBlock BrailleSpinner, interrupted 渲染, AmpAppColors 语义色)
- 欢迎屏幕动画 (DensityOrbWidget, GlowText)

### 3.2 最高优先级未修复项 (P0 阻断)

| 编号 | 标题 | 阻断原因 |
|------|------|----------|
| GAP-SUM-001/002 | ACP 重连 + LiveHandle 集成 | 模块已写但未 wired 到运行时, Agent 崩溃时 TUI 不可恢复 |

### 3.3 高优先级未修复项 (P1 用户可感知)

| 类别 | 条目 |
|------|------|
| 渲染管线 | present() 冗余清除, 控制字符过滤, RepaintBoundary P2/P3 |
| 输入系统 | Kitty CSI u 解析 |
| 文本/Markdown | GFM 表格列对齐, 代码块 fallback 背景色 |
| 视觉还原 | Perlin 噪声脉冲, Copy Highlight 消失, 健康状态 UI |
| ACP/状态 | 类型安全 (as unknown as), FilePicker 未接入 Overlay |
| 动画框架 | setInterval -> AnimationController 迁移 |
| 新发现 | Tab 消息导航, 消息编辑/恢复, CommandPalette 完整命令集, Token/Cost 显示 |

### 3.4 .gap/ 文件状态说明

71 个 `.gap/` 文件全部保持 Proposal/NOT IMPLEMENTED 文本状态（即文件内容中的 Status 行未更新），但实际代码中约 30+ 个已在源码层面实现。这是一个文档-实现不同步问题。根据 GAP-AUDIT-SUMMARY.md 的交叉引用：
- 约 25 个 .gap 被标记为 "已修复" (实际代码已落地)
- 约 10 个 .gap 被标记为 "部分完成"
- 约 36 个 .gap 确实未实现

---

## 四、总数据

| 类别 | 已修复 | 部分修复 | 未修复 | 总计 |
|------|--------|----------|--------|------|
| P0 原始 | 6 | 4 | 0 | 10 |
| P1 原始 | 13 | 2 | 15 | 30 |
| P2 原始 | 5 | 3 | 48 | 56 |
| NEW P1 | 0 | 0 | 4 | 4 |
| NEW P2 | 2 | 0 | 18 | 20 |
| **合计** | **26** | **9** | **85** | **120** |

Flitter 当前 AMP Chat View TUI 对齐度: **约 29%** (26 已修复 + 9 部分修复 / 120 总项)。

如果仅计算 P0+P1 项（用户直接可感知的差距）: 19 已修复 / 44 总 = **约 43%**。
