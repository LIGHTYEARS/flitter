# Flitter — Project State

**Initialized:** 2026-04-12
**Milestone:** v1.0
**Current phase:** 1 (Schema 类型地基)
**Status:** planning

---

## Active Phase

| Field | Value |
|-------|-------|
| Phase | 1 — Schema 类型地基 |
| Package | `@flitter/schemas` |
| Status | planning |
| Requirements | SCHM-01, SCHM-02, SCHM-03, SCHM-04, SCHM-05 |
| Plans created | 5/5 |
| Plans completed | 0/5 |

---

## Phase Progress

| Phase | Name | Status | Plans | Requirements |
|-------|------|--------|-------|-------------|
| 1 | Schema 类型地基 | planning | 5/5 | SCHM-01..05 (5) |
| 2 | 基础设施工具层 | not_started | 0/7 | INFR-01..06 (6) |
| 3 | TUI 底层渲染基础 | not_started | 0/6 | TUI-01..02 (2) |
| 4 | TUI 三棵树引擎 | not_started | 0/8 | TUI-03..06 (4) |
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

---

## Context Window

最近的决策和发现，帮助在上下文丢失后恢复:

- 项目是从 Amp CLI 逆向工程迁移到 TypeScript 的 AI Agent 终端客户端
- 逆向参考代码在 `amp-cli-reversed/` 目录（1073 模块，116K 行）
- TUI 框架是最大单一子系统（26K 行，12/26 陷阱），也是项目最大赌注
- 开发方法: JS → TS 直译，保持相同函数签名，TDD 先测试后实现
- 运行时: Bun >= 1.3.0，TypeScript 5.8.x strict，ESM-only
- 注释规范: JSDoc 中文，含功能说明 + 使用示例

---

## Blockers

_(none)_

---

*State initialized: 2026-04-12*
*Last updated: 2026-04-12 (Phase 1 planning complete)*
