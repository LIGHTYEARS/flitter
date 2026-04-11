# Flitter — Personal Amp CLI

## What This Is

Flitter 是一个通过逆向工程 Sourcegraph Amp CLI 并逐模块迁移到 TypeScript 的 AI Agent 终端客户端。项目采用 Bun + TypeScript monorepo 架构，目标是将 `amp-cli-reversed/` 中的 116K 行逆向 JS 代码忠实翻译为类型安全的 TypeScript 模块，最终对齐原版 Amp CLI 的完整交互体验。面向开发者个人使用。

## Core Value

在终端中提供与原版 Amp CLI 功能对等的 AI Agent 交互体验——包括完整的 Flutter 三棵树 TUI 框架、多 LLM Provider 对话、MCP 工具集成和 Thread 管理。

## Requirements

### Validated

- ✓ Monorepo 骨架（8 packages + 1 app）— existing
- ✓ 四层架构分层（schemas → util → domain core → cli/app）— existing
- ✓ 包间单向依赖约束 — existing
- ✓ Bun + TypeScript + ESM 构建基础 — existing
- ✓ 逆向参考代码完整提取（1073 模块）— existing
- ✓ 第三方依赖识别（75 个 npm 包）— existing
- ✓ tmux-capture 视觉回归测试工具 — existing

### Active

- [ ] Flutter 三棵树 TUI 框架（Widget/Element/RenderObject + 帧调度 + 布局引擎）
- [ ] Agent 核心引擎（ThreadWorker 状态机 + 工具执行循环 + Prompt 路由）
- [ ] 多 LLM Provider SDK（Anthropic/OpenAI/Gemini/xAI + SSE 流式）
- [ ] MCP 协议集成（Stdio/SSE/StreamableHTTP 传输 + JSON-RPC）
- [ ] CLI 入口与命令系统（交互式 TUI 模式 + Headless JSON 流模式）
- [ ] 数据层（ThreadStore + ConfigService + SkillService）
- [ ] 基础设施层（Reactive 原语 + URI + Git + FileScanner + OTel + Keyring）
- [ ] Schema 层（Zod 类型定义 + JSON Schema + 协议定义）

### Out of Scope

- 功能差异化（Shell Mode、快捷键面板等个人定制）— 纯还原优先，后续里程碑考虑
- 移动端/Web 端 — 仅终端 CLI
- 自定义 LLM Provider — 还原原版支持的 Provider 即可
- IDE 插件开发 — 仅 CLI 本体

## Context

- **逆向参考**: `amp-cli-reversed/` 包含 1073 个从 Amp CLI Mach-O 二进制提取的 JS 模块，分类为 `app/`（CLI 核心）、`framework/`（TUI 框架）、`vendor/`（包装依赖）、`bun-internal/`（运行时模块）
- **已有分析**: `DEPENDENCIES.md` 记录了 75 个第三方依赖及 11 个已确认版本
- **已有架构文档**: `ARCHITECTURE.md` 描述了四层架构和核心抽象
- **GAP 检查**: `.gaps/v0.4.0/` 包含之前的手动 UAT 验证追踪
- **开发方法**: TDD 模式——先为 primitive 函数/类编写测试，再实现功能
- **文档规范**: 所有函数/类必须包含 JSDoc 中文注释（功能说明 + 使用示例）

## Constraints

- **运行时**: Bun >= 1.1.0，不考虑 Node.js 兼容
- **语言**: TypeScript 5.4+ strict mode，ESM-only
- **迁移方式**: JS → TS 直译，保持相同的函数签名和数据结构
- **测试**: TDD 模式，每个迁移模块先写测试后实现
- **注释**: JSDoc 中文为主，包含功能说明和使用示例
- **依赖**: 复用逆向识别的第三方库版本（如 Zod 4.3.6、@grpc/grpc-js 1.13.4 等）
- **还原度**: 纯还原，不做功能差异化改动

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| JS → TS 直译（非理解后重写）| 保持与原版逻辑一致性，减少引入新 bug 的风险 | — Pending |
| TDD 开发模式 | 逐模块迁移需要测试保证正确性，先测试后实现 | — Pending |
| TUI 框架优先 | Flutter 三棵树是最核心的渲染基础，其他子系统都依赖它 | — Pending |
| Bun 内置测试 | 项目已用 Bun 运行时，内置测试器零配置 | — Pending |
| JSDoc 中文注释 | 面向个人使用，中文注释提高可读性和可维护性 | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-12 after initialization*
