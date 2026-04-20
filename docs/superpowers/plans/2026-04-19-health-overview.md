# HEALTH.md Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a root-level `HEALTH.md` living document that provides a project architecture health overview, covering test coverage, technical debt, and dependency health — maintained by AI at each session.

**Architecture:** Two deliverables: (1) `HEALTH.md` at the project root with executive summary, three health dimension sections, and an AI agent guide; (2) a new Rule 6 in `CLAUDE.md` that requires AI sessions to maintain HEALTH.md when they make meaningful code changes. No amp reference exists for this feature — it is flitter-specific project governance.

**Tech Stack:** Markdown only. No code, no scripts, no dependencies.

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `HEALTH.md` | Living project health overview — test coverage, tech debt, dependency health |
| Modify | `CLAUDE.md:57` | Add Rule 6: AI session maintenance of HEALTH.md |

---

### Task 1: Create HEALTH.md

**Files:**
- Create: `HEALTH.md`

- [ ] **Step 1: Write the complete HEALTH.md file**

Create `HEALTH.md` at the project root:

```markdown
# HEALTH — 项目健康度 Overview

> 最后更新: 2026-04-19 | 更新者: claude-opus-4-6

Flitter 是 amp-cli 的逆向工程实现，基于 Flutter-for-Terminal 的 widget 框架。本文件是项目当前状态的活快照，由 AI 在每次 session 中维护。静态架构设计见 [ARCHITECTURE.md](ARCHITECTURE.md)。

---

## 总览

| 维度 | 状态 | 摘要 |
|------|------|------|
| 测试覆盖 | 🟢 | 4157 pass / 0 fail，239 测试文件，全包有测试 |
| 技术债务 | 🟢 | 1 个真实 TODO，0 FIXME/HACK，极度干净 |
| 依赖健康 | 🟢 | 严格分层 DAG，无循环依赖，2 个独立 leaf 包 |

### ⚠️ Watch Items

- ApprovalWidget `_feedbackActive` 提交后未重置 — `packages/cli/src/widgets/approval-widget.ts:372`，已记录在回归计划 Task 4，未修复
- 无 CI/CD pipeline — 仅有 pre-commit biome lint hook，测试靠手动运行

---

## 测试覆盖

| 包 | 测试文件 | E2E | 通过 | 失败 | 跳过 |
|----|---------|-----|------|------|------|
| @flitter/tui | 79 | 1 | ✓ | 0 | 0 |
| @flitter/agent-core | 55 | 0 | ✓ | 0 | 0 |
| @flitter/cli | 46 | 2 | ✓ | 0 | 0 |
| @flitter/llm | 25 | 0 | ✓ | 0 | 0 |
| @flitter/data | 12 | 0 | ✓ | 0 | 0 |
| @flitter/util | 10 | 0 | ✓ | 0 | 0 |
| @flitter/flitter | 6 | 0 | ✓ | 0 | 0 |
| @flitter/schemas | 5 | 0 | ✓ | 0 | 0 |
| apps/flitter-cli | 0 | 0 | — | — | — |
| **总计** | **239** | **3** | **4157** | **0** | **0** |

`apps/flitter-cli` 是 1 文件的薄入口层，委托给 `@flitter/cli` 和 `@flitter/flitter`，零测试可接受。

`tests/e2e/` 下有 1 个 TypeScript E2E 测试（tmux TUI 启动验证）和 2 个 bash 脚本（`smoke-test.sh` 25 assertions pass，`capture-demos.sh` 生成 HTML 可视化快照），但未集成到 `bun test` 中。

---

## 技术债务

| 包 | TODO | FIXME | HACK | 跳过测试 | 说明 |
|----|------|-------|------|---------|------|
| @flitter/cli | 1 真实 + 7 模板 | 0 | 0 | 0 | 7 个 TODO 在 `toolbox-templates.ts` 中，是 `tools make` 命令生成的脚手架占位符，非真实债务 |
| 其余 8 包 | 0 | 0 | 0 | 0 | |

**唯一的真实 TODO：**
- `packages/cli/src/widgets/thread-state-widget.ts:422` — `maxInputTokens: 200000` 硬编码，待从 model config 动态获取

### 已知 Bug

| Bug | 位置 | 严重度 | 状态 |
|-----|------|--------|------|
| ApprovalWidget `_feedbackActive` 提交后未重置，下次审批请求会卡在 feedback 模式 | `packages/cli/src/widgets/approval-widget.ts:372` | 中 | 已记录在回归计划 Task 4，未修复 |

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
```

- [ ] **Step 2: Verify the file renders correctly**

Run: `head -20 HEALTH.md`
Expected: Header, meta line, project description, and start of summary table visible.

- [ ] **Step 3: Commit**

```bash
git add HEALTH.md
git commit -m "docs: create HEALTH.md project health overview

Living document tracking test coverage, technical debt, and
dependency health. Maintained by AI at each session. Complements
ARCHITECTURE.md (static design intent) with current project state.

No amp reference exists — this is flitter-specific governance."
```

---

### Task 2: Add Rule 6 to CLAUDE.md

**Files:**
- Modify: `CLAUDE.md:57` (append after Rule 5)

- [ ] **Step 1: Append Rule 6 to CLAUDE.md**

At the end of `CLAUDE.md` (after the Rule 5 section ending at line 57), add:

```markdown

### 6. Maintain HEALTH.md

When your session produces meaningful code changes (new/deleted tests, bug fixes, dependency changes), update the affected sections of `HEALTH.md` before ending the session. See the "AI Agent 使用指南" section in HEALTH.md for the update protocol and data verification commands.

You do NOT need to update HEALTH.md for:
- Pure research / exploration sessions with no code changes
- Documentation-only changes
- Changes that don't affect the three tracked dimensions (tests, debt, dependencies)
```

- [ ] **Step 2: Verify CLAUDE.md structure**

Run: `grep -n '### [0-9]' CLAUDE.md`
Expected: Rules 1 through 6 listed, numbered sequentially.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude): add Rule 6 — maintain HEALTH.md at each session

Requires AI sessions to update HEALTH.md when they make meaningful
code changes affecting test coverage, technical debt, or dependencies."
```

---

### Task 3: Verify end-to-end

**Files:**
- (no new files)

- [ ] **Step 1: Verify HEALTH.md data accuracy against live codebase**

Run each verification command from HEALTH.md's "数据验证命令" section:

```bash
# Test count
bun test 2>&1 | tail -3
# Expected: 4157 pass (or more if tests were added), 0 fail

# Test file count
find packages/ -name '*.test.ts' | wc -l
# Expected: ~239

# Tech debt scan
grep -rn 'TODO\|FIXME\|HACK' packages/ --include='*.ts' --exclude='*templates*' --exclude='*.test.ts'
# Expected: 1 result (thread-state-widget.ts:422)

# Skipped tests
grep -rn 'it\.skip\|describe\.skip\|test\.skip' packages/ --include='*.test.ts'
# Expected: 0 results
```

- [ ] **Step 2: Verify both files are well-formed markdown**

Run: `cat HEALTH.md | head -5 && echo "---" && grep -c '|' HEALTH.md`
Expected: Header visible, table pipe count > 30 (indicates tables are present).

Run: `grep -n '### [0-9]' CLAUDE.md`
Expected: Six rules numbered 1-6.

- [ ] **Step 3: Run existing tests to confirm no regressions**

Run: `bun test 2>&1 | tail -5`
Expected: All pass, 0 fail.
