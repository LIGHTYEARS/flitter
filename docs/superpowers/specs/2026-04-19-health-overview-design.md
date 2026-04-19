# HEALTH.md — 项目架构健康度 Overview 设计文档

## 背景

Flitter 项目已有 `ARCHITECTURE.md`（静态设计意图 + ADR）和 `CLAUDE.md`（开发规则），但缺少一个反映**当前项目状态**的活文档。随着 parity sweep 快速推进，需要一个文件让人类开发者和 AI agents 在 5 秒内判断"项目整体健康还是有问题"，并在需要时深入每个维度的细节。

## 决策

- **文件名**：`HEALTH.md`，根目录，全大写（与 `CLAUDE.md`、`ARCHITECTURE.md` 风格一致）
- **受众**：人类开发者 + AI agents 两者兼顾
- **与 ARCHITECTURE.md 关系**：互补——ARCHITECTURE.md 讲"我们想建什么"，HEALTH.md 讲"现在是什么状态"
- **更新机制**：AI 每次 session 中如果做了有意义的代码变更，更新受影响的 section
- **语言**：中文为主，技术术语保留英文
- **健康维度**：测试覆盖、技术债务、依赖健康

## 文件结构

### Section 1: Header + Meta

```markdown
# HEALTH — 项目健康度 Overview

> 最后更新: 2026-04-19 | 更新者: claude-opus-4-6

Flitter 是 amp-cli 的逆向工程实现，基于 Flutter-for-Terminal 的 widget 框架。
```

固定内容：一句话项目定位。变化内容：更新时间和更新者。

### Section 2: Executive Summary

3-5 行，每个维度一行，用 emoji indicator + 一句话摘要。

状态 emoji 含义：
- 🟢 **健康**：该维度无需关注
- 🟡 **注意**：有轻微风险，需要在近期 session 处理
- 🔴 **告警**：有阻塞性问题，应立即关注

```markdown
## 总览

| 维度 | 状态 | 摘要 |
|------|------|------|
| 测试覆盖 | 🟢 | 4157 pass / 0 fail，218 文件，全包有测试（apps/flitter-cli 为 1 文件入口，豁免） |
| 技术债务 | 🟢 | 1 个真实 TODO，0 FIXME/HACK，极度干净 |
| 依赖健康 | 🟢 | 严格分层，无循环依赖，3 个外部 LLM SDK |

### ⚠️ Watch Items

- ApprovalWidget `_feedbackActive` state leak — 已记录在回归计划 Task 4，未修复
- 无 CI/CD pipeline — 仅有 pre-commit biome lint hook
```

Watch Items 是"当前需要人或 AI 关注的事项"列表。每次 session 根据发现新增或移除。

### Section 3: 测试覆盖

```markdown
## 测试覆盖

| 包 | 测试文件数 | E2E | 通过 | 失败 |
|---|---|---|---|---|
| @flitter/tui | 68 | 1 | ✓ | 0 |
| @flitter/agent-core | 46 | 0 | ✓ | 0 |
| @flitter/cli | 46 | 2 | ✓ | 0 |
| @flitter/llm | 25 | 0 | ✓ | 0 |
| @flitter/data | 11 | 0 | ✓ | 0 |
| @flitter/util | 10 | 0 | ✓ | 0 |
| @flitter/flitter | 6 | 0 | ✓ | 0 |
| @flitter/schemas | 5 | 0 | ✓ | 0 |
| apps/flitter-cli | 0 | 0 | — | — |
| **总计** | **218** | **3** | **4157** | **0** |

`apps/flitter-cli` 是 1 文件的薄入口层，委托给 `@flitter/cli` 和 `@flitter/flitter`，零测试可接受。

E2E 测试覆盖仍然较薄（3 文件），`tests/e2e/smoke-test.sh` 提供了 8 个 demo 的 tmux 断言（25 pass），但未集成到 `bun test` 中。
```

### Section 4: 技术债务

```markdown
## 技术债务

| 包 | TODO | FIXME | HACK | 跳过测试 |
|---|---|---|---|---|
| @flitter/cli | 1* | 0 | 0 | 0 |
| 其余 7 包 | 0 | 0 | 0 | 0 |

*唯一的真实 TODO：`packages/cli/src/widgets/thread-state-widget.ts:422` — `maxInputTokens: 200000` 硬编码，待从 model config 动态获取。

### 已知 Bug

| Bug | 位置 | 严重度 | 状态 |
|-----|------|--------|------|
| ApprovalWidget `_feedbackActive` 提交后未重置 | `approval-widget.ts:372` | 中 | 已记录，未修复 |
```

### Section 5: 依赖健康

```markdown
## 依赖健康

### 内部依赖图

```
schemas (leaf)
  ↑
util ← tui (独立 leaf，无内部依赖)
  ↑
data ← llm
  ↑     ↑
agent-core
  ↑
cli ← flitter (assembly)
  ↑
apps/flitter-cli
```

| 包 | 内部依赖 | 外部依赖 | 循环? |
|---|---|---|---|
| @flitter/schemas | 0 | zod | 否 |
| @flitter/tui | 0 | micromark | 否 |
| @flitter/util | 1 (schemas) | — | 否 |
| @flitter/data | 2 (schemas, util) | — | 否 |
| @flitter/llm | 2 (schemas, util) | anthropic-sdk, openai, genai | 否 |
| @flitter/agent-core | 4 | — | 否 |
| @flitter/cli | 6 | — | 否 |
| @flitter/flitter | 6 | — | 否 |

依赖方向严格自下向上，无循环。`@flitter/tui` 和 `@flitter/schemas` 是独立 leaf 包，可单独发布。
```

### Section 6: AI Agent 指南

```markdown
## AI Agent 使用指南

### 读取时机
每次 session 开始时浏览此文件，获取项目当前状态上下文。

### 更新协议
当你的 session 产生了以下变更时，更新对应 section：
- **新增/删除测试** → 更新「测试覆盖」表格和总计
- **修复 bug / 引入新 TODO** → 更新「技术债务」和「已知 Bug」
- **新增/移除依赖** → 更新「依赖健康」表格
- **发现新风险** → 添加到「Watch Items」
- **解决了 Watch Item** → 移除对应条目

更新时同时更新文件顶部的「最后更新」时间和更新者。

### 数据验证
更新前运行以下命令确认数据准确：
- `bun test 2>&1 | tail -5` — 获取测试通过/失败数
- `grep -r 'TODO\|FIXME\|HACK' packages/ --include='*.ts' -l` — 技术债务扫描
```

## 更新 CLAUDE.md

在 CLAUDE.md 的 Mandatory Rules 末尾添加第 6 条规则，要求 AI session 维护 HEALTH.md。

## 不包含的内容

以下维度经讨论决定不纳入 HEALTH.md：
- **功能完成度（amp parity）**：由 `docs/superpowers/specs/` 下的 parity sweep 文档追踪
- **性能指标**：项目尚未到性能调优阶段
- **代码复杂度指标**：Biome 已提供 lint，无需重复
