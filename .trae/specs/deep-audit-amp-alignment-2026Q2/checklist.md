# Checklist — 审计完整性验证

## 审计覆盖完整性

- [x] 原始 GAP-AUDIT-SUMMARY.md 96 条逐条核验状态 (P0: 10条, P1: 30条, P2: 56条)
- [x] 71 个 `.gap/` 文件状态扫描
- [x] 15 份 `amp-tui-analysis-*.md` 深度逆向分析文档二次扫描
- [x] TUI-CHATVIEW-SPEC.md 交叉比对
- [x] Amp README / BINARY-RE-SPEC 功能特性交叉比对
- [x] 现有 `align-partial-and-missing-gaps` spec 进度核查

## 源码级验证

- [x] P0 Gap 源码验证: RenderFlex (`_hasOverflow`, `canFlex`), TextField (Ctrl+A/X), Markdown (styleOverrides)
- [x] P0 Gap 源码验证: WaveSpinner (wave-spinner.ts), ShortcutRegistry (shortcut-registry.ts)
- [x] P0 Gap 源码验证: ACP 模块 (reconnection-manager.ts, heartbeat-monitor.ts, live-handle.ts) 存在但未集成
- [x] P1 Gap 源码验证: FocusTrap (focus.ts), Hyperlink id (cell.ts), BoxConstraints API (box-constraints.ts)
- [x] P1 Gap 源码验证: TextField Emacs (text-field.ts), ensureVisible (scroll-controller.ts)
- [x] P1 Gap 源码验证: ThinkingBlock (thinking-block.ts) StatefulWidget + BrailleSpinner
- [x] P1 Gap 源码验证: UserMessage interrupted (chat-view.ts), AmpAppColors (amp-theme-data.ts)
- [x] 未修复项验证: present() 仍有 backBuffer.clear(), input-parser 无 CSI u, deflate() 未被使用

## 新 Gap 发现

- [x] 识别出 24 条原审计未覆盖的新 Gap
- [x] 新 Gap 按 P1/P2 分级 (P1: 4条, P2: 20条)
- [x] 新 Gap 与原 96 条去重校验 (无重复)
- [x] 已实现项标注 (NEW-009 DensityOrbWidget, NEW-010 GlowText 已实现)

## 产出文档质量

- [x] spec.md 包含完整数据表格 (P0/P1/P2 状态核验)
- [x] spec.md 包含新发现 Gap 列表 (24 条)
- [x] spec.md 包含按维度汇总和总数据统计
- [x] tasks.md 按优先级分层 (Tier 0 / 1 / 2)
- [x] tasks.md 包含依赖关系和推荐执行顺序
- [x] tasks.md 已完成项标记为 [x], 待实施项标记为 [ ]

## 数据一致性

- [x] 总 Gap 数 = 96 (原始) + 24 (新发现) = 120
- [x] 已修复数 = ~26 (原始) + 2 (新发现已实现) = ~28
- [x] P0+P1 对齐度计算: 19 已修复 / 44 总 = ~43%
- [x] 全量对齐度计算: ~28 已修复 / 120 总 = ~23-29%
