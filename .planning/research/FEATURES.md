# AI Agent CLI -- 功能维度研究

> 生成时间: 2026-04-12
> 研究范围: 终端环境下的 AI Agent CLI 产品功能全景
> 参考产品: Claude CLI (Anthropic), Amp CLI (Sourcegraph), Aider, OpenAI Codex CLI, Gemini CLI (Google), Cursor Agent

---

## 1. 竞品概览

| 产品 | 开发商 | 开源 | 主要模型 | 核心定位 |
|------|--------|------|---------|---------|
| **Claude CLI** | Anthropic | 否 | Claude Sonnet/Opus 4.5 | 深度推理 + 安全重构 + 终端/IDE 双模式 |
| **Amp CLI** | Sourcegraph | 否 | 多模型 (Anthropic/OpenAI/Gemini/xAI) | 多模型 + 团队协作 + 线程共享 |
| **Aider** | 开源社区 | 是 | 多模型 (Claude/GPT/DeepSeek/本地) | Git-native 编辑 + 开放生态 |
| **Codex CLI** | OpenAI | 是 | o3/o4-mini/GPT | 沙盒执行 + 快速生成 + 多模态输入 |
| **Gemini CLI** | Google | 是 | Gemini 2.5 Pro | 百万 token 上下文 + 多模态 + 免费额度 |
| **Cursor Agent** | Cursor | 否 | 多模型 + 自研 Composer | IDE 原生 Agent + 多 Agent 并行 |

---

## 2. 功能分级矩阵

### 2.1 Table Stakes (入场券) -- 没有就不算 AI CLI Agent

这些功能是市场上所有成熟产品都具备的**最低功能门槛**。缺少任何一项都会被用户认为是"半成品"。

| # | 功能 | 描述 | 谁有 | Flitter 映射 |
|---|------|------|------|-------------|
| T1 | **交互式 REPL** | 终端对话式交互，支持多轮对话 | 全部 | `@flitter/cli` — cli-commander-system |
| T2 | **文件读写** | 读取、创建、编辑代码文件 | 全部 | `@flitter/agent-core` — 工具系统 (Read/edit_file/Write) |
| T3 | **Shell 命令执行** | 在终端执行 bash/shell 命令 | 全部 | `@flitter/agent-core` — Bash 工具 + process-runner |
| T4 | **代码搜索** | Grep/Glob/语义搜索代码库 | 全部 | `@flitter/util` — file-scanner (rg/fd 驱动) |
| T5 | **多模型支持** | 至少支持 2+ LLM Provider | Claude/Amp/Aider/Codex/Gemini | `@flitter/llm` — llm-sdk-providers (Anthropic/OpenAI/Gemini/xAI) |
| T6 | **流式输出** | SSE/Streaming 实时显示 LLM 响应 | 全部 | `@flitter/llm` — SSE 流式响应解析 |
| T7 | **会话持久化** | 保存和恢复对话线程 | Claude/Amp/Codex/Gemini | `@flitter/data` — ThreadStore |
| T8 | **权限控制** | 工具执行前需用户确认/审批 | Claude/Amp/Codex/Gemini | `@flitter/agent-core` — tool-permissions |
| T9 | **System Prompt 定制** | 自定义系统提示词 | Claude/Amp/Aider/Codex | `@flitter/agent-core` — prompt-routing |
| T10 | **Headless/非交互模式** | 管道输入 + JSON 输出，用于 CI/脚本 | Claude/Amp/Codex/Gemini | `@flitter/cli` — cli-entrypoint (stream-json) |
| T11 | **Markdown 渲染** | 终端中正确渲染 Markdown 内容 | 全部 | `@flitter/tui` — micromark-parser |
| T12 | **上下文管理** | 控制哪些文件/目录进入 LLM 上下文 | 全部 | `@flitter/data` — guidance files + SkillService |

**复杂度评注**: T1-T4 属于工程实现，复杂度中等；T5 (多模型) 是最大挑战，每个 Provider 的 API 差异巨大（格式转换、流式协议、认证方式各不相同），Amp 的 llm-sdk-providers 模块有 10,232 行足以说明问题。

---

### 2.2 Differentiators (差异化功能) -- 决定产品竞争力

这些功能并非所有产品都有，但拥有它们会显著提升用户体验和产品竞争力。

#### 2.2.1 TUI 渲染层

| # | 功能 | 描述 | 谁有 | 复杂度 | Flitter 映射 |
|---|------|------|------|--------|-------------|
| D1 | **全屏 TUI 框架** | Flutter-for-Terminal 三棵树架构，帧调度渲染 | Amp | 极高 | `@flitter/tui` — 26,243 行 TUI 框架 |
| D2 | **差分渲染** | 只更新变更的终端单元格（非全屏重绘） | Amp | 高 | `@flitter/tui` — ANSI 差分输出 |
| D3 | **富文本编辑器** | 终端内的多行文本编辑 (光标/选择/Kill buffer) | Amp/Claude | 高 | `@flitter/tui` — TextEditingController |
| D4 | **主题系统** | 语义化 40+ 颜色定义，暗色/亮色主题 | Amp | 中 | `@flitter/tui` — AppColorScheme |
| D5 | **滚动 & 选择** | 键盘/鼠标滚动、跨 Widget 文本选择复制 | Amp | 高 | `@flitter/tui` — ScrollController + SelectionArea |
| D6 | **性能监控叠加层** | "Gotta Go Fast" P95/P99 帧时间实时指标 | Amp | 低 | `@flitter/tui` — PerformanceTracker |

#### 2.2.2 Agent 引擎层

| # | 功能 | 描述 | 谁有 | 复杂度 | Flitter 映射 |
|---|------|------|------|--------|-------------|
| D7 | **子代理 (Subagents)** | 并行 spawn 子 Agent 处理子任务 | Claude/Amp/Cursor | 高 | `@flitter/agent-core` — subagent 执行框架 |
| D8 | **Checkpoint / Rewind** | 自动保存代码状态快照，支持回退 | Claude/Codex | 高 | 未映射 (逆向参考: experimental.autoSnapshot) |
| D9 | **Skill/Plugin 系统** | SKILL.md + YAML 前置声明式扩展机制 | Amp/Claude | 中 | `@flitter/data` — SkillService |
| D10 | **Hook 系统** | 工具生命周期钩子 (pre/post-execute, end-turn) | Amp/Claude | 中 | `@flitter/agent-core` — prompt-classification |
| D11 | **工具权限 DSL** | Glob 模式匹配 + picomatch 的细粒度权限规则 | Amp/Claude | 中 | `@flitter/agent-core` — tool-permissions + permission-dsl-parser |
| D12 | **代码审查引擎** | 自动 diff 分析 + 子代理检查 + 严重等级分类 | Amp/Claude | 高 | `@flitter/agent-core` — html-sanitizer-repl (code review) |
| D13 | **REPL 工具** | 交互式子进程 REPL (Python/Node.js) | Amp | 高 | `@flitter/agent-core` — html-sanitizer-repl (REPL) |
| D14 | **Git 集成** | status/diff/patch/commit 自动化 | Aider/Claude/Amp/Codex | 中 | `@flitter/util` — http-request-executor (Git 状态模块) |
| D15 | **模糊文件搜索** | 多层评分 (精确/前缀/后缀/子串/模糊) | Amp | 中 | `@flitter/util` — http-request-executor (fuzzy search) |

#### 2.2.3 协议与集成层

| # | 功能 | 描述 | 谁有 | 复杂度 | Flitter 映射 |
|---|------|------|------|--------|-------------|
| D16 | **MCP 协议** | Model Context Protocol (Stdio/SSE/StreamableHTTP) | Claude/Amp/Gemini | 高 | `@flitter/llm` — mcp-transport |
| D17 | **MCP OAuth 2.0** | MCP 服务器 PKCE 认证流 | Amp/Claude | 高 | `@flitter/llm` — oauth-auth-provider |
| D18 | **IDE Bridge** | VS Code/JetBrains WebSocket 双向通信 | Amp/Claude/Cursor | 高 | `@flitter/util` — connection-transport |
| D19 | **OpenTelemetry 遥测** | Traces/Metrics/Logs 全链路可观测 | Amp | 高 | `@flitter/util` — otel-instrumentation |
| D20 | **多模态输入** | 图片/截图/线框图粘贴到对话中 | Codex/Gemini/Amp | 中 | `@flitter/tui` — 跨平台图片粘贴 |
| D21 | **语音输入** | 语音转文字直接输入对话 | Aider | 中 | 未映射 |
| D22 | **Google Search 内置** | 实时网络搜索增强回答 | Gemini/Codex | 低 | 未映射 |

#### 2.2.4 数据与配置层

| # | 功能 | 描述 | 谁有 | 复杂度 | Flitter 映射 |
|---|------|------|------|--------|-------------|
| D23 | **多作用域配置** | 全局/工作区/项目层级设置合并 | Amp/Claude | 中 | `@flitter/data` — ConfigService |
| D24 | **Guidance Files** | AGENTS.md / CLAUDE.md 项目级 AI 指导文件 | Amp/Claude | 低 | `@flitter/data` — session-management (guidance files) |
| D25 | **线程共享** | 团队内共享对话线程 | Amp | 高 | `@flitter/data` — ThreadStore (远程同步) |
| D26 | **自动更新** | CLI 二进制自动下载 + SHA-256 校验 + 原子替换 | Amp/Claude | 中 | process-runner (self-update) |
| D27 | **Keyring 凭据存储** | OS 原生密钥链安全存储 API Key | Amp | 中 | `@flitter/util` — keyring-native-loader |
| D28 | **DTW 实时同步** | Durable Thread Worker 远程线程实时同步 | Amp | 极高 | `@flitter/llm` — rpc-protocol-layer + realtime-sync |
| D29 | **沙盒执行** | 网络隔离 + 目录限制的安全沙盒 | Codex | 高 | 未映射 |
| D30 | **后台任务** | 长时间运行的进程不阻塞 Agent | Claude | 中 | 未映射 |

---

### 2.3 Anti-Features (反特性) -- 应该避免或谨慎对待

| # | 反特性 | 问题 | 涉及产品 | 建议 |
|---|--------|------|---------|------|
| A1 | **过度 UI 复杂度** | TUI 框架 26K+ 行，维护成本极高；大多数用户只需要流式文本输出 | Amp | Flitter 还原 Amp，不得不承担。但应考虑是否后续提供 lite mode |
| A2 | **强制云端依赖** | 要求登录/认证才能使用基本功能 | Amp/Claude | 支持纯 API Key 模式，降低入门门槛 |
| A3 | **无限工具权限** | --dangerously-skip-permissions / --yolo 模式 | Claude/Codex | 提供但默认关闭，强制确认警告 |
| A4 | **隐式 Git 提交** | 自动 commit 可能产生大量碎片提交 | Aider | 默认关闭，用户 opt-in |
| A5 | **DTW 远程依赖** | Durable Thread Worker 需要 Sourcegraph 后端 | Amp | 提供纯本地替代，DTW 作为可选增强 |
| A6 | **过大的依赖树** | 75 个第三方包 (含 OTel 全家桶) 增加体积和攻击面 | Amp | 延迟加载 OTel；精简非核心依赖 |
| A7 | **模型厂商锁定** | 仅支持单一 Provider 的 CLI | Claude/Gemini | Flitter 已通过多 Provider SDK 避免 |
| A8 | **无离线能力** | 无法在断网环境下使用任何功能 | Claude/Amp | 考虑本地模型 fallback (ollama) |

---

## 3. 功能复杂度分析

### 3.1 实现难度热力图

```
极高 ████████████████████ D1(TUI框架) D28(DTW实时同步)
 高 ████████████████     T5(多模型) D7(子代理) D8(Checkpoint) D12(代码审查)
                        D16(MCP) D17(OAuth) D18(IDE Bridge) D19(OTel)
                        D29(沙盒)
 中 ████████████         T7(会话持久化) D3(富文本编辑) D5(滚动选择)
                        D9(Skill) D10(Hook) D11(权限DSL) D14(Git)
                        D15(模糊搜索) D20(多模态) D23(配置) D26(自更新) D27(Keyring)
 低 ████████             T1(REPL) T6(流式输出) T11(Markdown)
                        D4(主题) D6(性能监控) D22(搜索) D24(Guidance)
```

### 3.2 各层工作量估计

| 架构层 | 包 | 参考逆向代码量 | 核心功能数 | 评估 |
|--------|---|---------------|-----------|------|
| TUI 框架 | `@flitter/tui` | ~26,243 行 (10 模块) | D1-D6 | **最大工作量**。Flutter 三棵树独立实现，含 VT 解析器、帧调度、布局引擎 |
| Agent 核心 | `@flitter/agent-core` | ~14,944 行 (8 模块) | T2-T3, T8-T9, D7-D15 | **核心复杂度**。ThreadWorker 状态机 + 工具编排 + 权限系统 |
| LLM & MCP | `@flitter/llm` | ~26,263 行 (6 模块) | T5-T6, D16-D18 | **集成复杂度**。每个 Provider 是独立适配器，MCP 协议规范 |
| 数据层 | `@flitter/data` | ~7,342 行 (4 模块) | T7, T12, D23-D25 | 中等。ThreadStore + ConfigService + SkillService |
| 基础设施 | `@flitter/util` | ~27,869 行 (9 模块) | T4, D14-D15, D19, D27 | 高但可分批。Reactive/URI/Git/FileScanner/OTel/Keyring 均独立 |
| Schema | `@flitter/schemas` | ~100 ESM 模块 | — | 低。纯 Zod 类型定义 |
| CLI 入口 | `@flitter/cli` | ~7,722 行 (2 模块) | T1, T10 | 中等。Commander.js 命令树 + REPL + Headless |

---

## 4. 功能依赖图

```
Layer 1 (无依赖)
  schemas ────────────────────────────────────────────────────

Layer 2 (依赖 schemas)
  util ──── Reactive, URI, Git, FileScanner, OTel, Keyring ──

Layer 3 (依赖 schemas + util)
  ┌── agent-core ── ThreadWorker, Tools, Permissions, Hooks
  │        ↑ 需要 llm 提供 LLM 推理能力
  │        ↑ 需要 data 提供 Skill/Config
  │
  ├── llm ───────── LLM Providers, MCP Transport, OAuth
  │        ↑ 需要 schemas 的消息格式定义
  │
  └── data ──────── ThreadStore, ConfigService, SkillService
           ↑ 需要 schemas 的 Thread/Config 类型

Layer 4 (依赖全部 Layer 3)
  ┌── tui ──────── Widget/Element/RenderObject, 帧调度
  │        (无内部依赖，但被 cli 使用)
  │
  └── cli ──────── Commander.js 命令树, REPL, Headless
           ↑ 组装: agent-core + tui + data + llm
```

### 4.1 关键依赖链

```
用户输入
  → cli (T1: REPL 解析)
    → agent-core (ThreadWorker 接收消息)
      → data/SkillService (D9: 加载 Skill)
      → agent-core/prompt-routing (T9: 生成 System Prompt)
      → llm (T5: LLM 推理, T6: 流式输出)
      → agent-core/tool-permissions (T8: 权限检查)
      → [工具执行: T2 文件读写, T3 Shell, T4 搜索]
      → llm (回传 tool_result, 继续推理)
      → data/ThreadStore (T7: 持久化)
    → tui (D1: Widget 树更新 → 差分渲染)
  → 终端输出
```

### 4.2 功能间的前置依赖

| 目标功能 | 前置依赖 | 说明 |
|---------|---------|------|
| T1 交互式 REPL | D1 TUI 框架 (交互模式) 或 纯文本 fallback | Amp 的 REPL 完全依赖 TUI；可先实现 lite REPL |
| T5 多模型 | schemas (消息格式) | 统一的内部消息格式是多 Provider 适配的基础 |
| T7 会话持久化 | schemas (Thread 类型) | ThreadStore 需要 Thread 数据结构 |
| T8 权限控制 | D11 权限 DSL | 权限匹配需要 glob 模式引擎 |
| D7 子代理 | T5 多模型 + T8 权限 | 子代理是受限的 Agent 实例 |
| D8 Checkpoint | D14 Git 集成 | Checkpoint 基于 git stash/commit 实现 |
| D9 Skill 系统 | D24 Guidance Files | Skill 发现依赖目录扫描和 YAML 解析 |
| D10 Hook 系统 | D9 Skill 系统 | Hook 在 Skill 上下文中定义和执行 |
| D12 代码审查 | D7 子代理 + D14 Git | 审查使用 Haiku 子代理 + git diff |
| D16 MCP | schemas (MCP 协议类型) | JSON-RPC 消息需要严格的 schema 验证 |
| D17 MCP OAuth | D16 MCP | OAuth 是 MCP 的认证层 |
| D18 IDE Bridge | util (WebSocket) | IDE 通信基于 WebSocket 传输 |
| D25 线程共享 | T7 持久化 + D28 DTW | 共享需要远程同步能力 |
| D28 DTW 实时同步 | T7 持久化 + util (CBOR/WebSocket) | DTW 需要二进制协议 + 双向同步 |

---

## 5. 竞品功能覆盖对照表

| 功能 | Claude CLI | Amp CLI | Aider | Codex CLI | Gemini CLI | Cursor Agent |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| **Table Stakes** | | | | | | |
| T1 交互式 REPL | Y | Y | Y | Y | Y | Y(IDE) |
| T2 文件读写 | Y | Y | Y | Y | Y | Y |
| T3 Shell 命令 | Y | Y | Y | Y | Y | Y |
| T4 代码搜索 | Y | Y | Y | Y | Y | Y |
| T5 多模型 | 仅Claude | Y(8+) | Y(任意) | 仅OpenAI | 仅Gemini | Y(多) |
| T6 流式输出 | Y | Y | Y | Y | Y | Y |
| T7 会话持久化 | Y | Y | 部分 | Y | Y | Y |
| T8 权限控制 | Y | Y | N | Y | Y | Y |
| T9 System Prompt | Y | Y | Y | Y | Y | Y |
| T10 Headless 模式 | Y | Y | N | Y | Y | N |
| T11 Markdown 渲染 | Y | Y | Y | Y | Y | Y |
| T12 上下文管理 | Y | Y | Y | Y | Y | Y |
| **Differentiators** | | | | | | |
| D1 全屏 TUI | N | Y | N | N | N | N(IDE) |
| D7 子代理 | Y | Y | N | N | N | Y |
| D8 Checkpoint | Y | 部分 | N | N | Y | N |
| D9 Skill/Plugin | Y | Y | N | N | N | N |
| D10 Hook 系统 | Y | Y | N | N | N | N |
| D12 代码审查 | Y | Y | N | N | N | Y |
| D14 Git 集成 | Y | Y | Y | Y | Y | Y |
| D16 MCP 协议 | Y | Y | N | N | Y | Y |
| D18 IDE Bridge | Y | Y | N | N | N | Y(原生) |
| D19 OTel 遥测 | N | Y | N | N | N | N |
| D20 多模态输入 | N | Y | N | Y | Y | Y |
| D21 语音输入 | N | N | Y | N | N | N |
| D22 网络搜索 | N | N | N | Y | Y | N |
| D25 线程共享 | N | Y | N | N | N | N |
| D28 DTW 同步 | N | Y | N | N | N | N |
| D29 沙盒执行 | N | N | N | Y | N | Y |

---

## 6. Flitter 还原优先级建议

基于 PROJECT.md "纯还原优先" 的约束，以下是按依赖链排列的推荐实现顺序：

### Phase 1 -- 基础可运行 (能打字、能对话)
1. **schemas** -- Zod 类型定义 (Thread, Message, Config, MCP)
2. **util 核心子集** -- Reactive 原语 + URI + FileScanner
3. **llm 单 Provider** -- Anthropic SDK (含流式)
4. **agent-core 最小集** -- ThreadWorker 状态机 + Bash/Read/edit_file 工具
5. **cli Headless 模式** -- 管道输入/JSON 输出 (不依赖 TUI)

### Phase 2 -- TUI 交互式体验
6. **tui 框架** -- Widget/Element/RenderObject 三棵树 + 帧调度
7. **tui 组件** -- TextEditor + Theme + Markdown 渲染
8. **cli 交互模式** -- Commander.js 命令树 + TUI REPL

### Phase 3 -- 功能完整性
9. **llm 多 Provider** -- OpenAI + Gemini + xAI 适配器
10. **MCP 协议** -- Stdio + SSE 传输 + OAuth
11. **data 全量** -- ThreadStore + ConfigService + SkillService
12. **agent-core 完整** -- 权限 DSL + Hook + Skill 注入

### Phase 4 -- 高级功能
13. **子代理框架** -- 并行子 Agent + token 预算
14. **代码审查引擎** -- diff 分析 + 子代理检查
15. **IDE Bridge** -- VS Code WebSocket 通信
16. **DTW 实时同步** -- CBOR 协议 + WebSocket 传输
17. **OTel 遥测** -- Traces/Metrics/Logs

---

## 7. 关键洞察

1. **TUI 是 Amp 的最大差异化点也是最大技术债务**。26K 行的 Flutter-for-Terminal 框架在所有竞品中独一无二，但维护成本极高。Claude CLI 和 Codex CLI 都选择了更轻量的终端输出方案，用户体验依然优秀。

2. **多模型支持是技术护城河**。Amp 的 10K 行 LLM SDK 说明每个 Provider 的适配都是独立工程。Aider 通过 litellm 抽象层解决此问题，值得参考。

3. **MCP 正在成为新的 table stake**。Claude CLI、Amp CLI、Gemini CLI 都已支持 MCP 协议，它正从差异化功能向入场券功能转变。

4. **Skill/Plugin 系统是扩展性的关键**。Amp 和 Claude 的 SKILL.md + YAML 前置方案优雅地将扩展能力暴露给非开发者用户。

5. **DTW 是 Amp 独有的服务端依赖**。Flitter 作为个人使用工具，应提供纯本地 ThreadStore 替代，避免依赖 Sourcegraph 基础设施。

6. **沙盒执行 (Codex) 和 Checkpoint (Claude) 代表安全方向的两种路径**。前者通过隔离防止损害，后者通过快照允许回退。两者可互补。

---

*Last updated: 2026-04-12*
