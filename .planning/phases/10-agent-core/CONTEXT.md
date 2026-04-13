# Phase 10: Agent 核心引擎 — Context

**Package:** `@flitter/agent-core`
**Requirements:** AGNT-01..11 (11 requirements)
**Risk:** High
**Depends on:** Phase 1 (schemas), Phase 2 (util), Phase 7b (llm), Phase 8 (mcp), Phase 9 (data)

---

## 概述

Phase 10 是 Flitter 最核心的阶段 — 实现 Agent 引擎，将 LLM Provider、MCP 协议、数据持久化、工具系统全部串联。包含 ThreadWorker 状态机、工具执行引擎、内置工具集、系统提示词组装、权限系统、子代理框架、Hook 系统。

完成后达成 Milestone M4 (工具调用)：Agent 能执行工具并回传 LLM 继续推理。

---

## 逆向源码映射

### 核心文件

| 逆向文件 | 行数 | 主要内容 |
|----------|------|----------|
| `tool-execution-engine.js` | ~2900 行 | ThreadWorker (ov), ToolOrchestrator (FWT), 系统提示词 (LO), 工具批处理 |
| `tool-permissions.js` | ~500 行 | ToolPermissionsService, 四级决策引擎, picomatch 模式匹配, 受保护文件检查 |
| `skills-agents-system.js` | ~3400 行 | ThreadStore, SkillService, Sub-agent 生命周期 |
| `permission-rule-defs.js` | ~200 行 | 内置权限规则定义 |
| `prompt-routing.js` | ~300 行 | Prompt 路由和分类 |
| `process-runner.js` | ~1800 行 | Bash 工具实现, 子进程管理 |

### 关键符号映射

| 混淆名 | 清晰名 | 文件 | 行号 | 说明 |
|--------|--------|------|------|------|
| `ov` | ThreadWorker | tool-execution-engine.js | 2450-2876 | Agent 状态机 + 推理循环 |
| `FWT` | ToolOrchestrator | tool-execution-engine.js | 857-1444 | 工具调度 + 并行执行 |
| `LO` | buildSystemPrompt | tool-execution-engine.js | 591-816 | 系统提示词组装 |
| `fwR` | collectContextBlocks | tool-execution-engine.js | 434-547 | 上下文块收集 (env/guidance/skills) |
| `wwR` | batchToolsByDependency | tool-execution-engine.js | 838-856 | 工具依赖分析 + 批处理 |
| `MwR` | hasResourceConflict | tool-execution-engine.js | 820-837 | 资源冲突检测 (读写) |
| `Vf` | matchToolPattern | tool-permissions.js | 304-321 | picomatch 模式匹配 |
| `Xf` | matchDisablePattern | tool-permissions.js | 323-340 | 禁用列表匹配 |
| `yy` | checkToolEnabled | tool-permissions.js | 342-382 | 工具启用/禁用检查 |
| `jmR` | getToolFilePaths | tool-permissions.js | 388-400 | 工具将访问的文件路径 |
| `rcT` | checkGuardedFile | tool-permissions.js | ~410 | 受保护文件检查 |
| `QwR` | checkAllToolsComplete | tool-execution-engine.js | ~2213 | 检查所有工具完成后重新推理 |
| `_IR` | trimIncompleteToolUse | llm-sdk-providers.js | 1345-1370 | 修剪不完整 tool_use |
| `P3T` | compactMessageHistory | llm-sdk-providers.js | ~1200 | 消息历史压缩 |

---

## 依赖关系

```
@flitter/schemas  ─── types: ThreadMessage, PermissionEntry, ToolApprovalRequest, Config
@flitter/util     ─── reactive: BehaviorSubject/Subject/Observable
                  ─── git: GitService (diff/status)
                  ─── scanner: FileScanner (grep/glob)
                  ─── search: FuzzySearch
@flitter/llm      ─── providers: LLMProvider.stream()
                  ─── types: ToolDefinition, StreamMessage
                  ─── mcp: MCPServerManager, namespacedToolName
@flitter/data     ─── thread: ThreadStore, ThreadPersistence
                  ─── config: ConfigService
                  ─── skill: SkillService, loadSkill
                  ─── guidance: discoverGuidanceFiles
                  ─── context: ContextManager
```

---

## 设计决策

| # | 决策 | 理由 |
|---|------|------|
| KD-32 | ThreadWorker 状态机 6 态: idle → streaming → tool:data → blocked → tool:processed → idle | 从 ov 逆向直译，覆盖完整 Agent 循环 |
| KD-33 | 工具并行执行: Promise.allSettled + 资源冲突检测 (读写键) | 从 FWT/wwR 直译，安全并行 |
| KD-34 | 内置工具最小集: Read, Write, Edit, Bash, Grep, Glob, FuzzyFind, TodoWrite, Task | 匹配 Amp CLI 核心工具集 |
| KD-35 | 权限 DSL: picomatch glob 匹配 + 四级决策 (allow/ask/reject/delegate) | 从 Vf/tool-permissions.js 直译 |
| KD-36 | 子代理共享 ThreadStore + 独立 ToolOrchestrator，超时可取消 | 从 skills-agents-system.js 直译 |
| KD-37 | Hook 系统: PreToolUse, PostToolUse, Notification 三类 hook | 从逆向 hooks 配置翻译 |
| KD-38 | Prompt 组装: 基础角色 + 环境信息 + 工具列表 + Guidance + Skills 多段拼接 | 从 LO/fwR 直译 |

---

## Wave 分解

### Wave 1: 核心引擎基础 (serial)
- **10-01**: 工具类型与注册表 — ToolSpec/ToolRegistry/ExecutionProfile
- **10-02**: 工具执行引擎 — ToolOrchestrator (批处理/并行/结果收集)

### Wave 2: 内置工具集 (parallel)
- **10-03**: 文件操作工具 — Read/Write/Edit
- **10-04**: Shell 命令工具 — Bash (subprocess + timeout + output capture)
- **10-05**: 代码搜索工具 — Grep/Glob/FuzzyFind (委托 @flitter/util)

### Wave 3: 权限系统 (serial)
- **10-06**: 权限 DSL 解析器 — picomatch matcher + 规则优先级
- **10-07**: 权限执行引擎 — 四级决策 + 受保护文件检查 + 审批流

### Wave 4: Prompt + State Machine (serial)
- **10-08**: 系统提示词组装 — 角色/环境/工具/Guidance/Skills 组装
- **10-09**: ThreadWorker 状态机 — Agent 推理循环 + 取消/重试

### Wave 5: 扩展系统 (parallel)
- **10-10**: 子代理框架 + Hook 系统 — spawn/cancel + pre/post hooks

---

## 文件结构预览

```
packages/agent-core/src/
├── tools/
│   ├── types.ts           (ToolSpec, ToolResult, ExecutionProfile, ToolRegistry)
│   ├── registry.ts        (ToolRegistry 实现)
│   ├── orchestrator.ts    (ToolOrchestrator — 批处理 + 并行执行)
│   ├── builtin/
│   │   ├── read.ts        (Read 工具)
│   │   ├── write.ts       (Write 工具)
│   │   ├── edit.ts        (Edit 工具)
│   │   ├── bash.ts        (Bash 工具)
│   │   ├── grep.ts        (Grep 工具)
│   │   ├── glob.ts        (Glob 工具)
│   │   ├── fuzzy-find.ts  (FuzzyFind 工具)
│   │   └── index.ts       (注册所有内置工具)
│   ├── orchestrator.test.ts
│   └── builtin.test.ts
├── permissions/
│   ├── matcher.ts         (picomatch glob 匹配)
│   ├── engine.ts          (PermissionEngine — 四级决策)
│   ├── guarded-files.ts   (受保护文件检查)
│   ├── matcher.test.ts
│   └── engine.test.ts
├── prompt/
│   ├── system-prompt.ts   (系统提示词组装)
│   ├── context-blocks.ts  (上下文块收集)
│   └── system-prompt.test.ts
├── worker/
│   ├── thread-worker.ts   (ThreadWorker 状态机)
│   ├── events.ts          (Agent 事件类型)
│   └── thread-worker.test.ts
├── subagent/
│   ├── subagent.ts        (子代理 spawn/cancel)
│   ├── hooks.ts           (Hook 系统)
│   ├── subagent.test.ts
│   └── hooks.test.ts
└── index.ts               (barrel export)
```

---

## 验收标准

1. ThreadWorker 状态机全路径覆盖: idle → streaming → tool_use → tool_result → idle
2. 工具并行执行: 无冲突工具并行, 有冲突工具串行, Promise.allSettled
3. 内置工具集: Read/Write/Edit/Bash/Grep/Glob 全部可执行并返回结果
4. 权限系统: picomatch 模式匹配 + 四级决策 (allow/ask/reject/delegate)
5. 子代理: 并行 spawn + 超时取消
6. Hook 系统: PreToolUse/PostToolUse/Notification 正确触发
7. 系统提示词: 环境信息 + 工具列表 + Guidance + Skills 正确组装
8. Milestone M4 达成: Agent 执行工具并回传 LLM 继续推理
