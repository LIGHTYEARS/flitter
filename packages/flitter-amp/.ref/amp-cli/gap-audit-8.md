# Gap 审计报告 #8: 主题与动画

## 审计范围

本审计覆盖 **主题系统** 和 **动画框架** 两大领域，对比 Amp CLI 二进制逆向源（混淆文件）与 flitter-amp/flitter-core 的实现现状。

### 审计输入

**Amp 分析报告**:
- `amp-tui-analysis-15.md` — 动画系统 + 定时器管理 + 性能监控深度分析

**Amp 混淆源文件**:
- `app-theme-x1.js` — AppTheme 类 (x1) 与 Theme 容器 (Qt)，含所有语义色定义
- `terminal-theme-DSH.js` — Terminal 主题 RGB 硬编码值 (DSH/tSH)
- `color-scheme-wd.js` — ColorScheme 基础调色板类 (wd) 与 BaseTheme (YB)
- `agent-mode-colors-Ym.js` — Agent 模式动态颜色函数 (Ym) 与 Perlin 噪声类 (kd)
- `rgb-theme-mapping-PC.js` — RGB 主题映射与模式匹配
- `braille-spinner-Af.js` — BrailleSpinner 细胞自动机实现 (Af)

**Flitter 主题文件**:
- `packages/flitter-amp/src/themes/amp-theme-data.ts` — AmpBaseTheme / AmpAppColors 接口
- `packages/flitter-amp/src/themes/dark.ts` — 暗色主题 RGB 值
- `packages/flitter-amp/src/themes/light.ts` — 亮色主题 RGB 值
- `packages/flitter-amp/src/themes/index.ts` — 主题注册、InheritedWidget、辅助函数

**Flitter 动画文件**:
- `packages/flitter-core/src/animation/animation-controller.ts` — AnimationController
- `packages/flitter-core/src/animation/curves.ts` — 缓动曲线库
- `packages/flitter-core/src/animation/ticker.ts` — 帧同步 Ticker

**Flitter 动画 Widget**:
- `packages/flitter-amp/src/widgets/density-orb-widget.ts` — DensityOrb（已迁移到共享 PerlinNoise）
- `packages/flitter-amp/src/widgets/glow-text.ts` — GlowText（已迁移到共享 PerlinNoise）
- `packages/flitter-amp/src/widgets/streaming-cursor.ts` — StreamingCursor 闪烁光标

---

## Gap 清单

### GAP-8-001: 缺少 Wave Spinner 状态栏动画
- **优先级**: P0
- **影响范围**: `flitter-amp/src/widgets/bottom-grid.ts`（状态栏 top-left 区域）
- **Amp 行为**: 状态栏在 streaming/processing/tool-running 时显示 Wave Spinner 动画，字符序列为 `[" ", "∼", "≈", "≋", "≈", "∼"]`，200ms 间隔循环。颜色随状态变化：submitting/inference → `colors.primary`（蓝色），其他 → `colors.mutedForeground`（灰色）。混淆源位于 `status-bar-iJH.js`。
- **Flitter 现状**: 状态栏完全无动画指示器。BottomGrid 的 top-left 区域显示静态文本。代码库中搜索 `WaveSpinner` / `wave-spinner` 得到零匹配。
- **已有 .gap 引用**: 无专门 .gap 文件。分析报告 amp-tui-analysis-15.md §1.2 和 §4.1 识别了此差异（差异等级 🔴 高）。
- **建议修复方向**: 新建 `WaveSpinner` StatefulWidget，帧序列 6 帧循环，200ms 定时器 + setState。条件启停由 `AppState.isProcessing` 控制。嵌入 BottomGrid 的 top-left 角。工作量约 1h。

### GAP-8-002: AmpAppColors 缺少 Amp 的多个语义色字段
- **优先级**: P1
- **影响范围**: `flitter-amp/src/themes/amp-theme-data.ts` (AmpAppColors 接口)、`flitter-amp/src/themes/index.ts` (deriveAppColors)
- **Amp 行为**: Amp 的 `x1` 类（app-theme-x1.js）定义了 40+ 个语义色字段，包括：`assistantMessage`、`systemMessage`、`codeBlock`、`inlineCode`、`syntaxHighlight`（8 子字段）、`processing`、`completed`、`cancelled`、`suggestion`、`filename`、`button`、`shellModeHidden`、`handoffModeDim`、`selectionBackground`、`selectionForeground`、`selectedMessage`、`diffChanged`、`ideConnected`、`ideDisconnected`、`ideWarning`、`threadGraphNode`、`threadGraphNodeSelected`、`threadGraphConnector`、`recommendation`。
- **Flitter 现状**: `AmpAppColors` 接口定义了 22 个字段。缺失以下 Amp 存在的字段：
  - `assistantMessage` — Amp 默认 `gH.default()`, Flitter 无对应
  - `systemMessage` — Amp 默认 `gH.index(8)`, Flitter 无对应
  - `codeBlock` — Amp 默认 `gH.default()`, Flitter 无对应
  - `inlineCode` — Amp 默认 `gH.yellow`, Flitter 无对应
  - `syntaxHighlight` — Amp app 层有独立语法高亮色（8 子字段），Flitter 的语法高亮色仅在 AmpBaseTheme 中
  - `processing` — Amp 默认 `gH.blue`, Flitter 无对应（虽然 base.info 等价）
  - `completed` — Amp 默认 `gH.green`, Flitter 无对应
  - `cancelled` — Amp 默认 `gH.index(8)`, Flitter 无对应
  - `suggestion` — Amp 默认 `gH.magenta`, Flitter 无对应
  - `filename` — Amp 默认 `gH.cyan`, Flitter 无对应
  - `button` — Amp 默认 `gH.cyan`, Flitter 无对应
  - `shellModeHidden` — Amp 默认 `gH.index(8)`, Flitter 无对应
  - `handoffModeDim` — Amp 默认 `gH.rgb(128,0,128)`, Flitter 无对应
  - `selectionBackground` / `selectionForeground` — Amp 默认 `gH.yellow` / `gH.black`
  - `selectedMessage` — Amp 默认 `gH.green`
  - `diffChanged` — Amp 默认 `gH.yellow`, Flitter 仅有 diffAdded/diffRemoved/diffContext
  - `threadGraphNode` / `threadGraphNodeSelected` / `threadGraphConnector` — Amp 线程图专用色
  - `ideConnected` / `ideDisconnected` / `ideWarning` — IDE 连接状态色
- **已有 .gap 引用**: 无
- **建议修复方向**: 扩展 `AmpAppColors` 接口，增加缺失字段。在 `deriveAppColors()` 中补充默认映射逻辑。可分批进行：先添加当前组件实际使用的字段（如 `diffChanged`），再在实现对应功能时添加其余字段（如 `threadGraph*`、`ide*`）。

### GAP-8-003: Agent 模式颜色缺少动态 Perlin 噪声脉冲
- **优先级**: P1
- **影响范围**: `flitter-amp/src/themes/index.ts` (`agentModeColor` 函数)、`flitter-amp/src/widgets/input-area.ts`
- **Amp 行为**: Amp 的 `kd` 类（agent-mode-colors-Ym.js）使用 **open-simplex-noise** 的 `makeNoise2D(seed)` 生成动态模式颜色。`sample(H, L, A, I)` 方法在噪声空间中采样，`getColor` 通过 `JKH` / `QKH` 在 primary 和 secondary 颜色之间做线性插值。agent 模式标签（如 "smart"、"rush"）的颜色随时间动态变化，呈现脉冲/呼吸效果。颜色对从 `uiHints.primaryColor` / `uiHints.secondaryColor` 获取，或回退到默认值 `OvH` / `wvH`。
- **Flitter 现状**: `agentModeColor()` 是纯静态函数，返回固定 Color：`smart` → `Color.rgb(0, 255, 136)` 暗色 / `Color.rgb(0, 140, 70)` 亮色，`rush` → `Color.rgb(255, 215, 0)` 暗色 / `Color.rgb(180, 100, 0)` 亮色，其他模式 → `foreground`。无任何动态颜色或噪声驱动脉冲。
- **已有 .gap 引用**: 无专门 .gap 文件。amp-tui-analysis-15.md §1.4 和差异表标注为 🟠 中等差异。
- **建议修复方向**:
  - 方案 A（轻量）：在 agent 模式标签渲染处使用已有的 `GlowText` 组件替代纯 Text，利用现有 PerlinNoise 实现 primary/secondary 颜色间的脉冲效果。
  - 方案 B（完整）：移植 Amp 的 `kd` 类逻辑到 `agentModeColor`，使其接受时间参数并返回动态插值颜色。使用已提取的共享 `PerlinNoise` 模块。

### GAP-8-004: 缺少 Scanning Bar 水平扫描动画
- **优先级**: P2
- **影响范围**: 全局 — Amp 在处理中使用的视觉指示器
- **Amp 行为**: Amp 的 `q$$` 实现了水平扫描动画线（README §11.3）：字符 `━` (U+2501)，带尾部透明度梯度 `[1, 0.7, 0.5, 0.35, 0.25, 0.15]`，从左到右循环扫描。
- **Flitter 现状**: 完全未实现。代码库搜索 `ScanningBar` / `scanning` 得到零匹配。
- **已有 .gap 引用**: 无。amp-tui-analysis-15.md §1.3 和差异表标注为 🟠 中等差异。
- **建议修复方向**: 新建 `ScanningBar` StatefulWidget，使用 `━` 字符 + 多级灰度/透明度梯度实现扫描效果。每帧移动扫描头位置。可选：通过 `Color.withAlpha()` 或 `dim` 属性模拟梯度。

### GAP-8-005: Copy Highlight 缺少定时器驱动的自动消失
- **优先级**: P1
- **影响范围**: `flitter-core/src/widgets/text.ts` (RenderText)、Selection/Copy 操作处
- **Amp 行为**: Amp 的复制操作触发 `copyHighlight` 颜色（`(238, 170, 43)`）短暂高亮，然后自动消失（推断 ~300ms flash）。机制：`updateSelection(start, end, 'copy')` → 短暂显示 → `clearSelection()` 自动清除。
- **Flitter 现状**: `RenderText` 已实现 `highlightMode = 'copy'` 的 paint 层支持，`copyHighlightColor` 属性存在且工作正常（有完整单测覆盖）。但**缺少定时器驱动的自动消失**机制 — 一旦设置 copy 高亮，它会一直保持直到手动 `clearSelection()` 被调用。没有 setTimeout 驱动的 flash 效果。
- **已有 .gap 引用**: 无。amp-tui-analysis-15.md §1.6 和 §4.3 识别了此差异（差异等级 🟠 中）。
- **建议修复方向**: 在执行 copy 操作的位置（如 TextField 的 `_copySelectionToClipboard`）添加 `setTimeout(300, () => clearSelection())` 逻辑，并在 dispose 中清理该 timeout。

### GAP-8-006: agentModeColor 缺少 uiHints 动态颜色源
- **优先级**: P2
- **影响范围**: `flitter-amp/src/themes/index.ts` (`agentModeColor` 函数)
- **Amp 行为**: Amp 的 `Ym` 函数（app-theme-x1.js L118）除了 smart/rush 的硬编码颜色外，还从 `CE(H)?.uiHints?.secondaryColor` 动态获取自定义模式颜色。`ZKH` 函数从 `CE(H)?.uiHints?.primaryColor` / `secondaryColor` 获取模式颜色对。这支持服务端推送的自定义 agent 模式颜色。
- **Flitter 现状**: `agentModeColor(mode, theme)` 仅处理 `'smart'` 和 `'rush'` 两个硬编码模式，其他模式一律返回 `foreground`。无 `uiHints` 颜色源支持，不支持自定义 agent 模式的动态颜色。
- **已有 .gap 引用**: 无
- **建议修复方向**: 扩展 `agentModeColor` 接受可选的 `uiHints` 参数（或从 AppState 读取），当 uiHints 提供 `primaryColor` / `secondaryColor` 时优先使用。回退链：uiHints → 硬编码 smart/rush → foreground。

### GAP-8-007: 展开/折叠动画框架已就位但未接入 Widget
- **优先级**: P1
- **影响范围**: `flitter-core/src/animation/` 目录与 `flitter-amp/src/widgets/` 中所有使用 setInterval 的 Widget
- **Amp 行为**: Amp 使用纯 `setInterval + setState` 模式，无独立动画框架。所有动画（BrailleSpinner 200ms、HandoffBlink 700ms、GlowText 100ms 等）各自管理定时器。
- **Flitter 现状**: flitter-core 已实现了完整的动画框架：`Ticker`（帧同步定时器）、`AnimationController`（value/status/forward/reverse/stop）、`Curves`（linear/easeIn/easeOut/easeInOut/decelerate）。**但这些设施目前未被任何 flitter-amp widget 使用**。所有动画 widget（GlowText、DensityOrb、HandoffTool、ToolHeader、StreamingCursor）仍使用原始 `setInterval + setState` 模式。
- **已有 .gap 引用**: `.gap/65-animation-framework.md` — 完整描述了动画框架的设计和实现计划。该 gap 的基础设施部分（Ticker/AnimationController/Curves）**已完成**，但 widget 迁移部分**未开始**。
- **建议修复方向**: 这不是 bug，而是增量迁移机会。将现有 setInterval 动画逐步迁移到 Ticker/AnimationController 可以实现帧同步、统一生命周期管理。优先迁移 `ScrollController.animateTo`（已使用线性插值的 setInterval 16ms），然后是条件启停的 widget（ToolHeader、HandoffTool）。GlowText/DensityOrb 的无条件动画可最后迁移。注意：Amp 本身也使用 setInterval，所以此项属于 Flitter 的架构改进而非 Amp 保真度差异。

### GAP-8-008: Amp terminal 主题 RGB 色值 tableBorder 差异
- **优先级**: P2
- **影响范围**: `flitter-amp/src/themes/dark.ts`
- **Amp 行为**: Amp 的 DSH 暗色主题中，`tableBorder` 使用带 alpha 的颜色：`gH.rgb(135, 139, 134, 0.2)`（20% 不透明度）。
- **Flitter 现状**: `darkTheme.tableBorder` 为 `Color.rgb(135, 139, 134)`（无 alpha，100% 不透明度）。
- **已有 .gap 引用**: 无
- **建议修复方向**: 将 `dark.ts` 中 `tableBorder` 修改为 `Color.rgb(135, 139, 134).withAlpha(0.2)` 以匹配 Amp。需确认 flitter-core 的 Color 渲染管线是否正确处理 alpha < 1 的前景色（在终端中通常通过 dim 属性模拟或直接丢弃 alpha）。

### GAP-8-009: 已废弃的 OrbWidget 仍残留
- **优先级**: P2
- **影响范围**: ~~`flitter-amp/src/widgets/orb-widget.ts`~~
- **Amp 行为**: Amp 的 splash orb 概念已被 DensityOrbWidget 完全取代。
- **Flitter 现状**: `orb-widget.ts` 文件**已删除**。`DensityOrbWidget` 已成为唯一的 orb 实现。`chat-view.ts` 仅导入 `DensityOrbWidget`。Perlin 噪声也已迁移到共享 `utils/perlin-noise.ts` 模块。**此 gap 已修复**。
- **已有 .gap 引用**: `.gap/67-remove-deprecated-orb.md` — 完整删除方案。
- **建议修复方向**: 无需操作，已完成。

### GAP-8-010: Perlin 噪声重复实现已统一
- **优先级**: P2
- **影响范围**: ~~`glow-text.ts`、`density-orb-widget.ts` 中的内联噪声代码~~
- **Amp 行为**: Amp 的 `kd` 类使用 `open-simplex-noise` 库。
- **Flitter 现状**: 共享 `utils/perlin-noise.ts` 模块**已就位**，导出 `PerlinNoise` 类（含 `shared` 单例）、`value1d`、`noise2d`、`fbm` 函数。`glow-text.ts` 和 `density-orb-widget.ts` 都已迁移到 `import { PerlinNoise } from '../utils/perlin-noise'` + `PerlinNoise.shared`。完整单测覆盖存在于 `utils/__tests__/perlin-noise.test.ts`。**此 gap 已修复**。
- **已有 .gap 引用**: `.gap/66-duplicate-perlin-noise.md` — 完整迁移方案。
- **建议修复方向**: 无需操作，已完成。

### GAP-8-011: BrailleSpinner 已对齐 Amp 参考实现
- **优先级**: P2
- **影响范围**: ~~`flitter-core/src/utilities/braille-spinner.ts`、`tool-header.ts` 定时器间隔~~
- **Amp 行为**: Amp 的 `Af` 类使用平铺 8 cell 数组、hardcoded neighborMap、Conway-like 规则（survive 2/3, birth 3/6）、maxGenerations=15、40% 密度重播种、200ms 间隔。
- **Flitter 现状**: `BrailleSpinner` 已完全重写，使用平铺 `boolean[8]`、hardcoded `NEIGHBOR_MAP`、正确的 survive/birth 规则、`MAX_GENERATIONS = 15`、40% 密度 do-while 重播种、`BRAILLE_BIT_MAP = [0,1,2,6,3,4,5,7]`、`String.fromCharCode`。`ToolHeader` 已修改为 200ms 间隔。**此 gap 已修复**。
- **已有 .gap 引用**: `.gap/68-braille-spinner-alignment.md` — 完整对齐方案。
- **建议修复方向**: 无需操作，已完成。

---

## 已有 .gap 交叉引用

| .gap 编号 | 标题 | 状态 | 是否仍然有效 |
|-----------|------|------|-------------|
| #36 | 展开/折叠动画 (expand-collapse-animation) | 未修复 | ✅ 仍有效 — 所有 expand/collapse 仍为瞬间切换，无高度插值。但属于增强项，非 Amp 保真度差异（Amp 也是瞬间切换）。 |
| #38 | 流式光标闪烁 (streaming-cursor-blink) | **已修复** | ❌ 已失效 — `StreamingCursor` 已实现为独立 StatefulWidget，使用 530ms 定时器驱动闪烁，在 `initState` / `didUpdateWidget` / `dispose` 中正确管理生命周期。 |
| #65 | 动画框架 (animation-framework) | **部分完成** | ✅ 部分有效 — 基础设施（Ticker / AnimationController / Curves）已实现并存在于 `flitter-core/src/animation/`。但尚未迁移现有 Widget 使用新框架。框架本身完整可用，Widget 迁移为未来增量工作。 |
| #66 | 重复 Perlin 噪声 (duplicate-perlin-noise) | **已修复** | ❌ 已失效 — 共享 `utils/perlin-noise.ts` 模块已就位，`glow-text.ts` 和 `density-orb-widget.ts` 已完成迁移，`orb-widget.ts` 已删除。 |
| #67 | 移除废弃 Orb (remove-deprecated-orb) | **已修复** | ❌ 已失效 — `orb-widget.ts` 已删除，零导入残留。 |
| #68 | BrailleSpinner 对齐 (braille-spinner-alignment) | **已修复** | ❌ 已失效 — BrailleSpinner 已完全重写匹配 Amp 的 `Af` 类，ToolHeader 间隔已修改为 200ms。 |

---

## 差异严重程度汇总

| 优先级 | 数量 | Gap 编号 |
|--------|------|---------|
| P0 | 1 | GAP-8-001 (Wave Spinner) |
| P1 | 4 | GAP-8-002 (App 语义色缺失), GAP-8-003 (Agent 模式脉冲), GAP-8-005 (Copy Highlight 自动消失), GAP-8-007 (动画框架迁移) |
| P2 | 3 | GAP-8-004 (Scanning Bar), GAP-8-006 (uiHints 颜色源), GAP-8-008 (tableBorder alpha) |
| 已修复 | 3 | GAP-8-009 (OrbWidget 删除), GAP-8-010 (Perlin 噪声统一), GAP-8-011 (BrailleSpinner 对齐) |

---

## 审计结论

在主题与动画领域，Flitter 已完成多个关键对齐工作（BrailleSpinner、Perlin 噪声、StreamingCursor、OrbWidget 清理），动画框架基础设施也已就绪。

**最高优先级差距**是缺少 Wave Spinner 状态栏动画（P0），这是 Amp 在处理中最明显的视觉指示器之一。

**中等优先级差距**集中在主题系统的完整性：AmpAppColors 缺少约 20 个 Amp 存在的语义色字段、agent 模式颜色缺少动态脉冲效果、Copy Highlight 缺少自动消失机制。

**低优先级项**包括 Scanning Bar（视觉增强型指示器）、uiHints 动态颜色源（需要服务端配合）、tableBorder alpha 精度。

动画框架从 setInterval 迁移到 Ticker/AnimationController 是架构改进机会，但不影响 Amp 保真度（Amp 本身也用 setInterval）。
