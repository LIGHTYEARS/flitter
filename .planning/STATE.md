---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 12
status: executing
last_updated: "2026-04-14T16:00:22.540Z"
progress:
  total_phases: 12
  completed_phases: 11
  total_plans: 98
  completed_plans: 86
  percent: 88
---

# Flitter — Project State

**Initialized:** 2026-04-12
**Milestone:** v1.0
**Current phase:** 12
**Status:** Executing Phase 12

---

## Active Phase

| Field | Value |
|-------|-------|
| Phase | 12 — WidgetsBinding + runApp TUI 启动 |
| Package | `@flitter/tui` + `@flitter/cli` |
| Status | executing |
| Requirements | TUI-06, CLI-02 |
| Plans created | 15/15 |
| Plans completed | 3/15 |

---

## Phase Progress

| Phase | Name | Status | Plans | Requirements |
|-------|------|--------|-------|-------------|
| 1 | Schema 类型地基 | complete | 5/5 | SCHM-01..05 (5) |
| 2 | 基础设施工具层 | complete | 7/7 | INFR-01..06 (6) |
| 3 | TUI 底层渲染基础 | complete | 6/6 | TUI-01..02 (2) |
| 4 | TUI 三棵树引擎 | complete | 8/8 | TUI-03..06 (4) |
| 5 | TUI Widget 库与主题 | complete | 8/8 | TUI-07,08,11 (3) |
| 6 | TUI 高级交互组件 | complete | 8/8 | TUI-09,10,12..15 (6) |
| 7 | LLM Provider 核心层 | complete | 8/8 | LLM-01..06 (6) |
| 7b | SDK Migration + OAuth | complete | 11/11 | LLM-01..06 (SDK rewrite) |
| 8 | MCP 协议集成 | complete | 6/6 | LLM-07..10 (4) |
| 9 | 数据持久化層 | complete | 7/7 | DATA-01..05 (5) |
| 10 | Agent 核心引擎 | complete | 10/10 | AGNT-01..11 (11) |
| 11 | CLI 入口与端到端集成 | planned | 0/7 | CLI-01..05 (5) |
| 12 | WidgetsBinding + runApp TUI 启动 | executing | 3/15 | TUI-06, CLI-02 |

---

## Milestone Progress

| Milestone | Description | Status | Phase Gate |
|-----------|-------------|--------|------------|
| M1 | Hello TUI | complete | Phase 4 |
| M2 | Widget 树 | complete | Phase 5 |
| M3 | 流式对话 | complete | Phase 7b |
| M4 | 工具调用 | complete | Phase 10 |
| M5 | MCP 集成 | complete | Phase 8 |
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
| KD-12 | Phase 5 三波执行: Wave 1 (Flex引擎+CJK宽度+主题系统) → Wave 2 (Row/Column+Padding/SizedBox+Emoji宽度) → Wave 3 (Stack/Positioned+RichText/TextSpan) | Phase 5 | 2026-04-12 |
| KD-13 | Phase 5 逆向类映射: T0→Row, Ta/xR→Column, uR→Padding, XT→SizedBox, TR→EdgeInsets, G→TextSpan, cT→TextStyle(widget), Vk→AppColorScheme, Gt→Theme, J8→charWidth, B9→graphemeSegments, Hm0→isCjk | Phase 5 | 2026-04-12 |
| KD-14 | CJK/Emoji 宽度函数放在 text/ 子目录 (packages/tui/src/text/)，Widget 放在 widgets/ 子目录 | Phase 5 | 2026-04-12 |
| KD-15 | Theme.of() 在 Phase 5 使用简化全局引用方案，InheritedWidget 机制延后到 Phase 6 | Phase 5 | 2026-04-12 |
| KD-16 | Phase 7 不依赖任何官方 SDK (无 @anthropic-ai/sdk, openai, @google/generative-ai)，全部使用原生 fetch + SSE 自行封装 | Phase 7 | 2026-04-13 |
| KD-17 | xAI 使用 OpenAI-compatible ChatCompletion API (非 Responses API)，其余 Provider 各用原生 API | Phase 7 | 2026-04-13 |
| KD-18 | Phase 7 四波执行: Wave 1 (types+SSE) → Wave 2 (Anthropic+OpenAI) → Wave 3 (Gemini+xAI+Registry) → Wave 4 (Integration Tests) | Phase 7 | 2026-04-13 |
| KD-19 | Phase 7b 逆转 KD-16: 改用官方 SDK (@anthropic-ai/sdk, openai ^6.26, @google/genai) + OpenAI-compatible 通用层 + OAuth 基础设施。删除 stream/ (SSEParser/fetchSSE/RetryPolicy)，xAI 合并为 OpenAICompatProvider | Phase 7b | 2026-04-13 |
| KD-20 | MCP 协议版本: 支持 2025-03-26 (稳定版)，兼容 2024-11-05 和 2024-10-07 | Phase 8 | 2026-04-14 |
| KD-21 | MCPTransport 接口统一 Stdio/SSE/StreamableHTTP 三种传输: start() + send(msg) + close() + onmessage/onclose/onerror 回调 | Phase 8 | 2026-04-14 |
| KD-22 | MCPConnection 管理单个 MCP Server 生命周期: 连接/断开/重连(指数退避) + 能力协商 + Observable 暴露工具/资源/提示列表 | Phase 8 | 2026-04-14 |
| KD-23 | 工具名命名空间: mcp__<serverName>__<toolName>，非字母数字替换为 _ | Phase 8 | 2026-04-14 |
| KD-24 | Phase 8 零外部 MCP SDK 依赖: 不使用 @modelcontextprotocol/sdk，从逆向代码直译实现协议层 | Phase 8 | 2026-04-14 |
| KD-25 | 本地文件存储 (非 DTW): Flitter v1 只实现本地 JSON 文件持久化，不实现 DTW 远程同步 | Phase 9 | 2026-04-14 |
| KD-26 | 配置路径映射: ~/.config/amp → ~/.config/flitter, .amp/ → .flitter/, .agents/skills → .flitter/skills | Phase 9 | 2026-04-14 |
| KD-27 | JSONC 自实现: ConfigService 使用自实现的 JSONC stripper，不引入外部依赖 | Phase 9 | 2026-04-14 |
| KD-28 | 原子写入: write-to-temp + fsync + rename 防止断电丢失 | Phase 9 | 2026-04-14 |
| KD-29 | Context Manager 本地实现: LLM 驱动摘要 + 近似 token 计数 (chars/4 ASCII, chars/2 CJK) | Phase 9 | 2026-04-14 |
| KD-30 | SkillService 发现路径: .flitter/skills/ (project) + ~/.config/flitter/skills/ (global) | Phase 9 | 2026-04-14 |
| KD-31 | Guidance 文件: AGENTS.md/CLAUDE.md, cwd 向上遍历, 32768 字节预算, YAML frontmatter + globs 过滤 | Phase 9 | 2026-04-14 |
| KD-32 | ThreadWorker 状态机 3 态: idle → running → cancelled, 工具执行由 ToolOrchestrator 管理 | Phase 10 | 2026-04-14 |
| KD-33 | 工具并行执行: Promise.allSettled + 资源冲突检测 (读写键), batchToolsByDependency 分组 | Phase 10 | 2026-04-14 |
| KD-34 | 内置工具最小集: Read, Write, Edit, Bash, Grep, Glob, FuzzyFind (7 工具) | Phase 10 | 2026-04-14 |
| KD-35 | 权限 DSL: 自实现 glob→regex 匹配 (无 picomatch) + 四级决策 (allow/ask/reject/delegate) | Phase 10 | 2026-04-14 |
| KD-36 | 子代理共享 ThreadStore + 独立 ToolOrchestrator，超时可取消，嵌套深度限制=1 | Phase 10 | 2026-04-14 |
| KD-37 | Hook 系统: PreToolUse/PostToolUse/Notification 三类 hook，shell 命令执行，环境变量传递 | Phase 10 | 2026-04-14 |
| KD-38 | Prompt 组装: 基础角色 + 环境信息 + 工具列表 + Guidance + Skills 多段拼接, cache_control 分段 | Phase 10 | 2026-04-14 |
| KD-39 | Commander.js 命令树: flitter [message] / login / logout / threads / config / update | Phase 11 | 2026-04-14 |
| KD-40 | 模式判定: TTY → interactive, !TTY/--execute → execute, --headless → JSON 流 | Phase 11 | 2026-04-14 |
| KD-41 | DI 容器: 函数式 createContainer() 返回服务对象 + asyncDispose()，非 class-based | Phase 11 | 2026-04-14 |
| KD-42 | TUI 组件树: ThemeController → ConfigProvider → AppWidget → ThreadStateWidget | Phase 11 | 2026-04-14 |
| KD-43 | OAuth 认证: 复用 @flitter/llm oauth/pkce + 本地 HTTP 回调服务器 | Phase 11 | 2026-04-14 |
| KD-44 | 自动更新: CDN 二进制 + SHA-256 校验 + 原子文件替换 + npm/pnpm fallback | Phase 11 | 2026-04-14 |
| KD-45 | Headless JSON 流: stdin JSON Lines 输入 + stdout JSON 事件流输出 | Phase 11 | 2026-04-14 |

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

- Phase 4 完成: 8 个 plan 全部实现 — 226 个测试全部通过
  - Wave 1: BoxConstraints (57 tests) + RenderObject/types (27 tests) + RenderBox (28 tests) = 112 tests
  - Wave 2: Element (30 tests) + Widget/Key/GlobalKey (20 tests) = 50 tests
  - Wave 3: ComponentElement+RenderObjectElement 协调 (18 tests) + StatefulWidget/StatelessWidget/State (21 tests) = 39 tests
  - Wave 4: BuildOwner + PipelineOwner + FrameScheduler (25 tests)
- @flitter/tui 导出 tree/ 全部公共 API: constraints, types, render-object, render-box, element, widget, component-element, render-object-element, stateless-widget, stateful-widget, build-owner, pipeline-owner, frame-scheduler
- Phase 4 核心类映射 (逆向→TypeScript): Mn→Widget, qm→Element, wR→State, vH→RenderObject, o0→BoxConstraints, k8→FrameScheduler, YXT→BuildOwner, JXT→PipelineOwner
- 总测试数: 1087 (Phase 1: 315 + Phase 2: 276 + Phase 3: 270 + Phase 4: 226)

---

## Blockers

_(none)_

- Phase 5 完成: 8 个 plan 全部实现 — 133 个新测试 (Wave 1: 89 + Wave 2: 90 + Wave 3: 43), 741 总 TUI 测试全部通过
  - Wave 1: RenderFlex 弹性布局引擎 (34 tests) + CJK/零宽字符宽度 (33 tests) + AppColorScheme/Theme 主题系统 (22 tests)
  - Wave 2: Row/Column/Flexible/Expanded (32 tests) + EdgeInsets/Padding/SizedBox/Container (28 tests) + Emoji 宽度处理 (30 tests)
  - Wave 3: Stack/Positioned 层叠布局 (20 tests) + TextSpan/RenderParagraph/RichText/Text 文本渲染 (23 tests)
- @flitter/tui 新增 widgets/ + text/ 子目录: flex, row, column, flexible, stack, edge-insets, padding, sized-box, container, color-scheme, theme, text-span, rich-text, text, char-width, emoji
- Phase 5 零外部依赖: Flex 布局引擎 + CJK/Emoji 宽度计算 + 主题系统 + 全部 Widget 自实现
- 总测试数: 1220 (Phase 1: 315 + Phase 2: 276 + Phase 3: 270 + Phase 4: 226 + Phase 5: 133)

- Phase 6 完成: 8 个 plan 全部实现 — 321 个新测试, 1062 总 TUI 测试全部通过
  - Wave 1: ScrollController+Scrollable+ScrollKeyHandler (60 tests) + TextLayoutEngine+TextEditingController+TextField (52 tests) + MarkdownParser+MarkdownRenderer+SyntaxHighlighter (47 tests) + PerformanceTracker+FrameStatsOverlay (55 tests) = 214 tests
  - Wave 2: ListView 虚拟化列表 (18 tests) + TextEditing 选区+Kill buffer (41 new tests) = 59 tests
  - Wave 3: OverlayEntry+Overlay+LayerLink+AutocompleteController+CommandPalette (19 tests) + Clipboard+SelectionArea+SelectionKeepAliveBoundary (29 tests) = 48 tests
- @flitter/tui 新增 scroll/ + editing/ + markdown/ + perf/ + overlay/ + selection/ 六个子目录
- Phase 6 唯一外部依赖: micromark + GFM 扩展 (Markdown 解析)
- Phase 6 逆向类映射: ScrollController→Kw.scroll, TextLayoutEngine→Kw, TextEditingController→wc, PerformanceTracker→Yh, FrameStatsOverlay→ZXT, OverlayEntry→lZT, LayerLink→mZT, AutocompleteController→uZT, Clipboard→eA, SelectionArea→m1T
- 总测试数: 1541 (Phase 1: 315 + Phase 2: 276 + Phase 3: 270 + Phase 4: 226 + Phase 5: 133 + Phase 6: 321)

- Phase 7 完成: 8 个 plan 全部实现 — 207 个新测试, 207 总 LLM 测试全部通过
  - Wave 1: TransformState+types (27 tests) + SSEParser+RetryPolicy+fetchSSE (38 tests) = 65 tests
  - Wave 2: Anthropic Provider+Transformer (26 tests) + OpenAI Provider+Transformer (29 tests) = 55 tests
  - Wave 3: Gemini Provider+Transformer (24 tests) + xAI Provider+Transformer (23 tests) + Registry+index.ts (38 tests) = 85 tests
  - Wave 4: Cross-Provider Integration Tests (29 tests) — MockSSEServer + Fixtures + e2e
- @flitter/llm 导出 providers/ + stream/ + transformers/ + testing/ 全部公共 API
- Phase 7 零 SDK 依赖: Anthropic/OpenAI/Gemini/xAI 全部使用原生 fetch + SSE 自行封装
- Phase 7 核心设计: TransformState (block-level tracking), BaseMessageTransformer/BaseToolTransformer, SSEParser, fetchSSE, RetryPolicy, Provider Registry (3-tier resolution)
- 总测试数: 1748 (Phase 1: 315 + Phase 2: 276 + Phase 3: 270 + Phase 4: 226 + Phase 5: 133 + Phase 6: 321 + Phase 7: 207)

- Phase 7b 完成: 11 个 plan 全部实现 (5 waves) — 289 总 LLM 测试全部通过 (净增 82 tests)
  - Wave 1: SDK 依赖安装 (@anthropic-ai/sdk, openai ^6.26, @google/genai) + types 更新 + 新工具函数 (calculateCost, isContextOverflow, sanitizeSurrogates)
  - Wave 2: Anthropic Provider → SDK (client.messages.stream) + OpenAI Provider → SDK (client.responses.create)
  - Wave 3: Gemini Provider → SDK (client.models.generateContentStream) + OpenAI-Compatible 通用层 (xAI/Groq/DeepSeek/OpenRouter/Cerebras)
  - Wave 4: OAuth 基础设施 (PKCE + callback server + registry + Anthropic/GitHub Copilot/OpenAI Codex providers)
  - Wave 5: 删除 stream/ 基础设施 + 重写 fixtures + 重写集成测试 + 全面验证
- @flitter/llm 导出 providers/ + oauth/ + testing/ + utils/ 公共 API (stream/ 已删除)
- Phase 7b 架构变更: 零 SDK → 官方 SDK, xAI 独立 Provider → OpenAICompatProvider 子配置, 新增 OAuth 模块
- Phase 7b 核心设计: 构造函数注入 (所有 Provider 接受可选 SDK client 用于测试), KNOWN_COMPAT_CONFIGS (5 preset), mergeWithDefaults, OAuthProviderInterface + registry
- 总测试数: 1830 (Phase 1: 315 + Phase 2: 276 + Phase 3: 270 + Phase 4: 226 + Phase 5: 133 + Phase 6: 321 + Phase 7b: 289)

- Phase 8 完成: 6 个 plan 全部实现 (3 waves) — 242 个新测试, 531 总 LLM 测试通过 (含 Phase 7b 289 + Phase 8 242)
  - Wave 1: 08-01 (JSON-RPC 2.0 协议 types/protocol/McpError/RequestManager, 38 tests) + 08-02 (Stdio 传输 ReadBuffer+StdioTransport, 19 tests) = 57 tests
  - Wave 2: 08-03 (StreamableHTTP 传输 + SSEEventParser, 43 tests) + 08-04 (SSE 传输 legacy fallback + SSELineParser, 31 tests) = 74 tests
  - Wave 3: 08-05 (MCP OAuth 2.0 PKCE 完整认证流, 35 tests) + 08-06 (MCPClient+MCPConnection+MCPServerManager+tools, 76 tests) = 111 tests
  - 关键逆向映射: Uq→MCPConnection, jPR→MCPServerManager, T7→StreamableHTTPTransport, JD→SSETransport, TDT→StdioTransport, PDT→namespacedToolName, Q_/Dq→auth(), ZD→parseWWWAuthenticate
  - 零外部 MCP SDK (KD-24): 从逆向代码直译 JSON-RPC 2.0 + MCP 协议 + 三种传输 + OAuth 流程
  - 复用已有: @flitter/util Reactive (BehaviorSubject/Subscription), @flitter/llm oauth/pkce.ts (generatePKCE)
  - 文件结构: packages/llm/src/mcp/ (types, protocol, tools, connection, server-manager, index) + transport/ (read-buffer, stdio, sse-parser, streamable-http, sse) + auth/ (types, oauth-provider)
  - Milestone M5 (MCP 集成) 达成
  - 总测试数: 2072 (Phase 1: 315 + Phase 2: 276 + Phase 3: 270 + Phase 4: 226 + Phase 5: 133 + Phase 6: 321 + Phase 7b: 289 + Phase 8: 242)

- Phase 9 完成: 7 个 plan 全部实现 (4 waves) — 167 个新测试, 167 总 Data 测试通过
  - Wave 1: 09-01 (ThreadStore CRUD — snapshotToEntry/entryEquals/dirty tracking/Observable, 25 tests) + 09-02 (ThreadPersistence — atomic JSON writes/autoSave/Zod validation, 26 tests) = 51 tests
  - Wave 2: 09-03 (ConfigService 3-tier merge + JSONC stripper, 12 tests) + 09-04 (FileSettingsStorage + hot reload, 21 tests) = 33 tests
  - Wave 3: 09-05 (SkillService — SKILL.md frontmatter parse/validate/scan/install/remove, 25 tests) + 09-06 (Guidance Files — AGENTS.md/CLAUDE.md discovery/walk-up/@references/glob filter, 36 tests) = 61 tests
  - Wave 4: 09-07 (Context Manager — approx token count/compaction threshold/LLM summary/tool_use trim, 22 tests)
  - 关键逆向映射: azT→ThreadStore, fuT→snapshotToEntry, T4→entryEquals, HqR→computeUserLastInteractedAt, f_0→FileSettingsStorage, LX→ConfigService, SqR→parseSkillFrontmatter, vqR→validateSkillName, OqR→loadSkill, UqR→SkillService, XDT→parseFrontmatter, kkR→discoverGuidanceFiles, Q9T→isRootDirectory, _IR→trimIncompleteToolUse
  - 零外部依赖 (KD-25..31): JSONC stripper/YAML parser/glob matcher/token counter 全部自实现
  - 文件结构: packages/data/src/ — thread/ (types, store, persistence) + config/ (jsonc, settings-storage, config-service) + skill/ (types, parser, service) + guidance/ (types, loader) + context/ (token-counter, context-manager)
  - 总测试数: 2239 (Phase 1: 315 + Phase 2: 276 + Phase 3: 270 + Phase 4: 226 + Phase 5: 133 + Phase 6: 321 + Phase 7b: 289 + Phase 8: 242 + Phase 9: 167)

- Phase 10 完成: 10 个 plan 全部实现 (5 waves) — 266 个新测试, 266 总 Agent-Core 测试通过
  - Wave 1 (serial): 10-01 (Tool Types + Registry, 20 tests) + 10-02 (ToolOrchestrator 批处理/并行, 32 tests) = 52 tests
  - Wave 2 (parallel): 10-03 (Read/Write/Edit 文件工具, 27 tests) + 10-04 (Bash Shell 工具, 14 tests) + 10-05 (Grep/Glob/FuzzyFind 搜索工具, 27 tests) = 68 tests
  - Wave 3 (serial): 10-06 (Permission DSL 解析器 — glob→regex 匹配, 27 tests) + 10-07 (Permission 执行引擎 — 四级决策 + 受保护文件, 25 tests) = 52 tests
  - Wave 4 (serial): 10-08 (系统提示词组装 — 角色/环境/工具/Guidance/Skills, 16 tests) + 10-09 (ThreadWorker 状态机 — Agent 推理循环, 39 tests) = 55 tests
  - Wave 5 (parallel): 10-10 (子代理框架 SubAgentManager, 17 tests + Hook 系统 parseHooksConfig/executePreHook/executePostHook, 22 tests) = 39 tests
  - 关键逆向映射: ov→ThreadWorker, FWT→ToolOrchestrator, fwR→collectContextBlocks, wwR→batchToolsByDependency, MwR→hasResourceConflict, Vf→matchToolPattern, Xf→matchDisablePattern, yy→checkToolEnabled, jmR→getToolFilePaths, rcT→checkGuardedFile
  - 关键设计决策: KD-32..38 (状态机/并行执行/内置工具/权限DSL/子代理/Hook/Prompt组装)
  - 文件结构: packages/agent-core/src/ — tools/ (types, registry, orchestrator, builtin/) + permissions/ (matcher, engine, guarded-files) + prompt/ (context-blocks, system-prompt) + worker/ (events, thread-worker) + subagent/ (hooks, subagent)
  - 回调注入模式: 所有组件使用回调接口 (getConfig, getThread, etc.) 而非直接依赖服务类
  - Milestone M4 (工具调用) 达成
  - 总测试数: 2505 (Phase 1: 315 + Phase 2: 276 + Phase 3: 270 + Phase 4: 226 + Phase 5: 133 + Phase 6: 321 + Phase 7b: 289 + Phase 8: 242 + Phase 9: 167 + Phase 10: 266)

- Phase 11 计划完成: 7 个 plan 全部编写 (4 waves), ~110 tests 预估
  - Wave 1 (基础设施, serial): 11-06 (DI 组装层 createContainer/ServiceContainer/asyncDispose, ~20 tests) + 11-01 (Commander.js 命令树 + CliContext, ~20 tests)
  - Wave 2 (核心模式, serial): 11-02 (交互式 TUI 模式 launchInteractiveMode, ~15 tests) + 11-03 (Headless JSON 流 + Execute 模式, ~15 tests)
  - Wave 3 (辅助功能, parallel): 11-04 (认证流程 API Key + OAuth PKCE, ~15 tests) + 11-05 (自动更新 SHA-256 + 原子替换, ~15 tests)
  - Wave 4 (入口, serial): 11-07 (main() 入口 + apps/flitter-cli shebang + 信号处理, ~10 tests)
  - 关键逆向映射: aF0→main, Yz0→createProgram, S8→resolveCliContext, X3→createContainer, _70→launchTuiApp, SB→runMainAction, eF0→handleLogin, tF0→handleLogout, r3R→performOAuth, pm0→createUpdateService, mm0→handleUpdateCommand
  - 关键设计决策: KD-39..45 (Commander树/模式判定/DI容器/TUI组件树/OAuth复用/自动更新/JSON流)
  - 包结构: @flitter/cli (commands/ + modes/ + auth/ + update/) + @flitter/flitter (container + factory) + apps/flitter-cli (bin/flitter.ts)
  - 外部依赖: commander (Commander.js CLI 框架)
  - Milestone M6 (完整对话) 将在 Phase 11 完成后达成

---

## Accumulated Context

### Roadmap Evolution

- Phase 12 added: WidgetsBinding and runApp — TUI application bootstrap

- Phase 12 计划完成: 15 个 plan 全部编写 (5 waves), ~120 tests 预估
  - Wave A (基础原语, parallel): 12-01 (InheritedWidget+InheritedElement, ~12 tests) + 12-02 (FocusNode, ~14 tests) + 12-03 (FocusManager, ~14 tests) + 12-04 (HitTestResult+RenderObject.hitTest, ~10 tests)
  - Wave B (终端事件, partial-parallel): 12-05 (TuiController 终端控制器, ~12 tests) + 12-06 (MouseManager, ~8 tests) + 12-07 (MediaQuery InheritedWidget, ~10 tests)
  - Wave C (核心编排, serial): 12-08 (WidgetsBinding 核心编排器单例, ~14 tests) + 12-09 (runApp 顶层函数, ~4 tests)
  - Wave D (应用层, serial): 12-10 (ThemeController+ConfigProvider, ~8 tests) + 12-11 (AppWidget+ThreadStateWidget, ~8 tests) + 12-12 (InputField+ConversationView, ~10 tests)
  - Wave E (集成, serial): 12-13 (interactive.ts stub 替换, ~6 tests) + 12-14 (Theme 全局变量→InheritedWidget 迁移, ~6 tests) + 12-15 (E2E 集成测试, ~12 tests)
  - 关键逆向映射: d9→WidgetsBinding, T1T→runApp, XXT→TuiController, ic→FocusManager, l8→FocusNode, ha→MouseManager, BM→MediaQueryData, I9→MediaQuery, oXT/nXT→HitTestResult, Dy0→RenderObject.hitTest
  - 关键设计: WidgetsBinding 组合 BuildOwner+PipelineOwner+FrameScheduler+FocusManager+MouseManager+TuiController, 6 个 frame callbacks (frame-start, resize, build, layout, paint, render)
  - 文件结构: @flitter/tui 新增 binding/ + focus/ + gestures/ + tui/, @flitter/cli 新增 widgets/ (ThemeController, ConfigProvider, AppWidget, ThreadStateWidget, InputField, ConversationView)
  - 目标: 替换 interactive.ts 中所有 stub，使 `flitter` CLI 启动后进入持久终端交互界面

---

*State initialized: 2026-04-12*
*Last updated: 2026-04-14 (Phase 12 planned — 15 plans across 5 waves: A→E)*
