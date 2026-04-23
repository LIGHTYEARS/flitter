# HEALTH — 项目健康度 Overview

> 最后更新: 2026-04-23 | 更新者: claude-sonnet-4-6

Flitter 是 amp-cli 的逆向工程实现，基于 Flutter-for-Terminal 的 widget 框架。本文件是项目当前状态的活快照，由 AI 在每次 session 中维护。静态架构设计见 [ARCHITECTURE.md](ARCHITECTURE.md)。

---

## 总览

| 维度 | 状态 | 摘要 |
|------|------|------|
| 测试覆盖 | 🟡 | 6355 pass / 1 fail (pre-existing: container integration inference roundtrip), 346 测试文件. Phase 2 chat-view alignment: +6 test files, +18 tests (cancellation-requested, manual-bash-tool, thinking-streaming, specialized-tools, disclosure, display-items extensions) |
| 技术债务 | 🟢 | 0 真实 TODO，0 FIXME/HACK，极度干净（grep.ts/todo-write.ts JSDoc 示例中的 'TODO' 不计入） |
| 依赖健康 | 🟢 | 严格分层 DAG，无循环依赖，2 个独立 leaf 包 |

### ⚠️ Watch Items

- 无 CI/CD pipeline — 仅有 pre-commit biome lint hook，测试靠手动运行

---

## 测试覆盖

| 包 | 测试文件 | E2E | 通过 | 失败 | 跳过 |
|----|---------|-----|------|------|------|
| @flitter/tui | 92 | 1 | ✓ | 0 | 0 |
| @flitter/agent-core | 59 | 0 | ✓ | 0 | 0 |
| @flitter/cli | 79 | 2 | ✓ | 0 | 0 |
| @flitter/llm | 30 | 0 | ✓ | 0 | 0 |
| @flitter/data | 17 | 0 | ✓ | 0 | 0 |
| @flitter/util | 11 | 0 | ✓ | 0 | 0 |
| @flitter/flitter | 6 | 0 | ✓ | 0 | 0 |
| @flitter/schemas | 5 | 0 | ✓ | 0 | 0 |
| apps/flitter-cli | 0 | 0 | — | — | — |
| **总计** | **346** | **3** | **6355** | **0** | **0** |

`apps/flitter-cli` 是 1 文件的薄入口层，委托给 `@flitter/cli` 和 `@flitter/flitter`，零测试可接受。

`tests/e2e/` 下有 1 个 TypeScript E2E 测试（tmux TUI 启动验证）和 2 个 bash 脚本（`smoke-test.sh` 25 assertions pass，`capture-demos.sh` 生成 HTML 可视化快照），但未集成到 `bun test` 中。

---

## 技术债务

| 包 | TODO | FIXME | HACK | 跳过测试 | 说明 |
|----|------|-------|------|---------|------|
| @flitter/cli | 0 真实 + 7 模板 | 0 | 0 | 0 | 7 个 TODO 在 `toolbox-templates.ts` 中，是 `tools make` 命令生成的脚手架占位符，非真实债务 |
| 其余 8 包 | 0 | 0 | 0 | 0 | |

**无真实 TODO** — 所有真实技术债务已清零。

### 已知 Bug

| Bug | 位置 | 严重度 | 状态 |
|-----|------|--------|------|
| 无已知 Bug | — | — | — |

### 待清理项

| 项目 | 位置 | 说明 |
|------|------|------|
| StatusBar 类未使用 | `packages/cli/src/widgets/status-bar.ts` | StatusBar 数据已迁移到 InputField border overlays (Gap B/F)。StatusBar 类保留但不再挂载，可考虑删除或改为纯函数。 |
| Disclosure widget 无消费者 | `packages/tui/src/widgets/disclosure.ts` | Phase 2 Task 7 创建，但 Task 8 activity group collapse 使用了内联 GestureDetector 方案。目前无消费者，可在 Phase 3 thinking collapse 中使用。 |

---

## 依赖健康

### 内部依赖图

```
schemas (leaf)         tui (独立 leaf，无 @flitter 依赖)
  ↑                      ↑
util                     │
  ↑                      │
data    llm              │
  ↑      ↑               │
agent-core               │
  ↑                      │
cli ─── flitter (assembly) ──┘
  ↑
apps/flitter-cli
```

| 包 | 内部依赖 | 关键外部依赖 | 循环? |
|----|---------|-------------|-------|
| @flitter/schemas | 0 | zod | 否 |
| @flitter/tui | 0 | micromark + GFM 扩展 | 否 |
| @flitter/util | 1 (schemas) | — | 否 |
| @flitter/data | 2 (schemas, util) | — | 否 |
| @flitter/llm | 2 (schemas, util) | @anthropic-ai/sdk, openai, @google/genai | 否 |
| @flitter/agent-core | 4 (data, llm, schemas, util) | — | 否 |
| @flitter/cli | 6 | commander | 否 |
| @flitter/flitter | 6 | — | 否 |
| apps/flitter-cli | 2 (cli, flitter) | — | 否 |

依赖方向严格自下向上，无循环。`@flitter/tui` 和 `@flitter/schemas` 是独立 leaf 包，可单独发布。

---

## AI Agent 使用指南

### 读取时机

每次 session 开始时浏览此文件，获取项目当前状态上下文。结合 `CLAUDE.md`（开发规则）和 `ARCHITECTURE.md`（设计意图）使用。

### 更新协议

当你的 session 产生了以下变更时，更新对应 section：

| 变更类型 | 更新哪里 |
|---------|---------|
| 新增/删除测试文件 | 「测试覆盖」表格和总计 |
| 修复 bug / 引入新 TODO | 「技术债务」表格和「已知 Bug」 |
| 新增/移除包依赖 | 「依赖健康」表格 |
| 发现新风险或问题 | 「Watch Items」新增条目 |
| 解决了 Watch Item | 移除对应条目 |

更新时同时更新文件顶部的「最后更新」时间和更新者。

### 数据验证命令

更新前运行以下命令确认数据准确：

```bash
# 测试通过/失败数
bun test 2>&1 | tail -3

# 测试文件计数
find packages/ -name '*.test.ts' | wc -l

# 技术债务扫描（排除模板文件）
grep -rn 'TODO\|FIXME\|HACK' packages/ --include='*.ts' --exclude='*templates*' --exclude='*.test.ts'

# 跳过的测试
grep -rn 'it\.skip\|describe\.skip\|test\.skip' packages/ --include='*.test.ts'
```
