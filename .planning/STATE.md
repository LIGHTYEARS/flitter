# Flitter — Project State

**Initialized:** 2026-04-12
**Milestone:** v1.0
**Current phase:** 4 (TUI 三棵树引擎)
**Status:** in_progress

---

## Active Phase

| Field | Value |
|-------|-------|
| Phase | 4 — TUI 三棵树引擎 |
| Package | `@flitter/tui` |
| Status | planned |
| Requirements | TUI-03..06 |
| Plans created | 8/8 |
| Plans completed | 5/8 |

---

## Phase Progress

| Phase | Name | Status | Plans | Requirements |
|-------|------|--------|-------|-------------|
| 1 | Schema 类型地基 | complete | 5/5 | SCHM-01..05 (5) |
| 2 | 基础设施工具层 | complete | 7/7 | INFR-01..06 (6) |
| 3 | TUI 底层渲染基础 | complete | 6/6 | TUI-01..02 (2) |
| 4 | TUI 三棵树引擎 | in_progress | 8/8 (5 done) | TUI-03..06 (4) |
| 5 | TUI Widget 库与主题 | not_started | 0/8 | TUI-07,08,11 (3) |
| 6 | TUI 高级交互组件 | not_started | 0/8 | TUI-09,10,12..15 (6) |
| 7 | LLM Provider 核心层 | not_started | 0/8 | LLM-01..06 (6) |
| 8 | MCP 协议集成 | not_started | 0/6 | LLM-07..10 (4) |
| 9 | 数据持久化层 | not_started | 0/7 | DATA-01..05 (5) |
| 10 | Agent 核心引擎 | not_started | 0/10 | AGNT-01..11 (11) |
| 11 | CLI 入口与端到端集成 | not_started | 0/7 | CLI-01..05 (5) |

---

## Milestone Progress

| Milestone | Description | Status | Phase Gate |
|-----------|-------------|--------|------------|
| M1 | Hello TUI | pending | Phase 4 |
| M2 | Widget 树 | pending | Phase 5 |
| M3 | 流式对话 | pending | Phase 7 |
| M4 | 工具调用 | pending | Phase 10 |
| M5 | MCP 集成 | pending | Phase 8 |
| M6 | 完整对话 | pending | Phase 11 |

---

## Requirement Coverage

- **Total v1 requirements:** 53
- **Mapped to phases:** 53
- **Unmapped:** 0
- **Coverage:** 100%

---

## Key Decisions Log

| # | Decision | Phase | Date |
|---|----------|-------|------|
| KD-01 | 11 阶段细粒度路线图，TUI 拆 4 阶段，LLM 拆 2 阶段 | Roadmap | 2026-04-12 |
| KD-02 | TDD 模式——每阶段内置测试先行 | All | 2026-04-12 |
| KD-03 | 依赖链: schemas → util → tui(4) → llm(2) → data → agent → cli | Roadmap | 2026-04-12 |
| KD-04 | TUI 和 LLM 可并行推进（Phase 1 完成后） | Roadmap | 2026-04-12 |
| KD-05 | Zod v4 (非 v3) 用于 schemas，z.lazy() + interface 规避 TS2456 递归 | Phase 1 | 2026-04-12 |
| KD-06 | 沙箱无 bun，使用 npx pnpm@10 + npx tsx 替代 | Phase 1 | 2026-04-12 |
| KD-07 | Phase 2 零外部重量级依赖: Reactive/URI/Git/Scanner/FuzzySearch 全部自实现 | Phase 2 | 2026-04-12 |
| KD-08 | Phase 2 三波执行: Wave 1 (Reactive+工具) → Wave 2 (URI+Git+Keyring) → Wave 3 (Scanner+FuzzySearch) | Phase 2 | 2026-04-12 |
| KD-09 | Phase 3 零外部依赖: VT 解析器 + Screen 缓冲区全部自实现 (不用 xterm.js) | Phase 3 | 2026-04-12 |
| KD-10 | Phase 3 三波执行: Wave 1 (Cell/Color/TextStyle 数据结构 + VT 类型) → Wave 2 (VT 状态机 + Input 解析器) → Wave 3 (Screen 双缓冲 + ANSI 差分渲染) | Phase 3 | 2026-04-12 |
| KD-11 | Phase 4 四波执行: Wave 1 (BoxConstraints+RenderObject+RenderBox) → Wave 2 (Element+Widget) → Wave 3 (ComponentElement+StatefulWidget) → Wave 4 (FrameScheduler+BuildOwner+PipelineOwner) | Phase 4 | 2026-04-12 |

---

## Context Window

最近的决策和发现，帮助在上下文丢失后恢复:

- 项目是从 Amp CLI 逆向工程迁移到 TypeScript 的 AI Agent 终端客户端
- 逆向参考代码在 `amp-cli-reversed/` 目录（1073 模块，116K 行）
- TUI 框架是最大单一子系统（26K 行，12/26 陷阱），也是项目最大赌注
- 开发方法: JS → TS 直译，保持相同函数签名，TDD 先测试后实现
- 运行时: 沙箱环境使用 Node.js v24 + npx tsx + npx pnpm@10（bun 不可用）
- Zod v4.3.6（非 v3），z.lazy() 递归需用 interface 规避 TS2456
- Phase 1 完成: 5 个 schema 模块 + 315 个测试全部通过
- 注释规范: JSDoc 中文，含功能说明 + 使用示例

- Phase 2 完成: 7 个 plan 全部实现 — 276 个测试全部通过
  - Wave 1: error.ts + logger.ts + assert.ts + process.ts (49 tests) + reactive/ (74 tests)
  - Wave 2: uri/ (48 tests) + git/ (32 tests) + keyring/ (21 tests)
  - Wave 3: scanner/ (19 tests) + search/ (33 tests)
- @flitter/util 导出 10 个模块: error, logger, assert, process, reactive, uri, git, keyring, scanner, search
- Phase 2 零外部依赖验证通过: Reactive/URI/Git/Scanner/FuzzySearch 全部自实现

- Phase 3 完成: 6 个 plan 全部实现 — 270 个测试全部通过
  - Wave 1: Cell/Color/TextStyle (30 tests) + VT 事件类型 (14 tests)
  - Wave 2: VtParser 状态机 (77 tests) + InputParser (64 tests)
  - Wave 3: Screen 双缓冲 (41 tests) + ANSI 差分渲染器 (44 tests)
- @flitter/tui 导出 vt/ + screen/ 全部公共 API
- Phase 3 零外部依赖验证通过: VT 解析器 + Screen 缓冲区 + ANSI 渲染全部自实现
- 总测试数: 812 (Phase 1: 315 + Phase 2: 227 + Phase 3: 270)

- Phase 4 规划完成: 8 个 plan (4 waves), 预计 ≥162 个测试
  - Wave 1: BoxConstraints (04-01) + RenderObject/types (04-02) + RenderBox (04-03) — 基础渲染层
  - Wave 2: Element 生命周期 (04-04) + Widget/Key (04-05) — 元素与组件层
  - Wave 3: ComponentElement/RenderObjectElement 协调 (04-06) + StatefulWidget/State (04-07) — 组合与状态层
  - Wave 4: FrameScheduler + BuildOwner + PipelineOwner (04-08) — 帧调度引擎
- Phase 4 核心类映射 (逆向→TypeScript): Mn→Widget, qm→Element, wR→State, vH→RenderObject, o0→BoxConstraints, k8→FrameScheduler, YXT→BuildOwner, JXT→PipelineOwner

---

## Blockers

_(none)_

---

*State initialized: 2026-04-12*
*Last updated: 2026-04-12 (Phase 4 Wave 2 complete — 5/8 plans, 162 total tree tests)*
