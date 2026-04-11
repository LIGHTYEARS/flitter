# Flitter 研究综合报告 (SUMMARY)

> 综合日期: 2026-04-12
> 输入文档: STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md
> 目标: 跨四个维度提炼关键发现，输出可执行的构建决策

---

## 1. 关键发现摘要

### 1.1 技术栈 (STACK.md)

| 维度 | 决策 | 置信度 |
|------|------|--------|
| **运行时** | Bun >= 1.3.0 + TypeScript 5.8.x (strict) | HIGH |
| **模块系统** | ESM-only，跳过 8 个不需要的 Polyfill | HIGH |
| **Schema 验证** | Zod 4 (主) + ajv 8 (JSON Schema 兼容场景) | HIGH |
| **LLM SDK** | 直接调用官方 SDK (Anthropic/OpenAI/Gemini)，**不引入** Vercel AI SDK | HIGH |
| **MCP** | `@modelcontextprotocol/sdk` ^1.29.0，Stdio + SSE + StreamableHTTP 三传输 | MEDIUM |
| **TUI** | 自研 Flutter-for-Terminal 三棵树框架，**零外部 TUI 依赖** | HIGH |
| **状态管理** | RxJS 7.8 (事件流) + Immer 10 (不可变更新) | MEDIUM |
| **CLI** | Commander.js 14.x | MEDIUM |
| **可观测性** | OpenTelemetry 全栈 — **延后到 MVP 之后** | MEDIUM |

- 核心依赖精简为 **~26 个包**（原逆向 62 个），跳过 polyfill 8 个、延后 OTel/gRPC 18 个。
- Lint 工具推荐 `@biomejs/biome` (Rust 实现，与 Bun 生态契合)。

### 1.2 功能全景 (FEATURES.md)

- **12 项 Table Stakes (入场券)**: 交互式 REPL、文件读写、Shell 执行、代码搜索、多模型支持、流式输出、会话持久化、权限控制、System Prompt 定制、Headless 模式、Markdown 渲染、上下文管理。
- **30 项差异化功能**: 全屏 TUI 框架 (D1)、子代理 (D7)、MCP 协议 (D16)、Skill/Plugin 系统 (D9)、IDE Bridge (D18)、DTW 实时同步 (D28) 等。
- **MCP 正在从差异化功能转为 Table Stake** — Claude/Amp/Gemini 均已支持。
- **最大单一挑战**: 多模型支持 (T5) — 每个 Provider 的 API 差异巨大，逆向代码 10,232 行足以说明。
- **最大单一工作量**: TUI 框架 (D1) — 26,243 行逆向代码，在所有竞品中独一无二。

### 1.3 架构模式 (ARCHITECTURE.md)

**Flutter 三棵树 TUI**:
- Widget (声明式配置) → Element (生命周期管理) → RenderObject (布局与绘制)
- FrameScheduler 以 ~16ms (60fps) 驱动四阶段管线: Build → Layout → Paint → Render
- 脏标记增量更新: 只重建变化的 Element，只重绘变化的 Cell

**Agent 状态机 (ThreadWorker)**:
- `idle → streaming → tool:data → [blocked-on-user] → tool:processed → idle` 循环
- RxJS BehaviorSubject 驱动推理状态 (`idle | running | cancelled`)
- 支持并行工具执行和 `allow/ask/reject/delegate` 权限模型

**LLM 流式传输**:
- SSE → TextDecoder → 事件解析 → Provider 格式转换 → 统一 Delta → ThreadWorker → TUI
- 指数退避重试 + 401/429/500 差异化错误处理

**MCP 协议**:
- JSON-RPC 2.0 over Stdio/StreamableHTTP 双传输
- OAuth 2.0 PKCE 认证流 (401 → 发现 → 授权 → Token → 重试)

### 1.4 关键陷阱 (PITFALLS.md)

识别了 **26 个陷阱**，按严重度分布:

| 严重度 | 数量 | 代表性陷阱 |
|--------|------|-----------|
| **严重 (Critical)** | 6 | PIT-A1 架构过度设计零实现、PIT-A2 混淆代码语义黑洞、PIT-B1 `any`类型传染、PIT-C1 三棵树生命周期时序错误、PIT-D1 SSE 半截消息、PIT-E1 CJK 宽度计算 |
| **高 (High)** | 10 | PIT-A3 SDK版本漂移、PIT-B2 Bun/Node差异、PIT-B3 ESM/CJS互操作、PIT-C2 差分渲染鬼影、PIT-D2 多Provider格式不统一、PIT-E2 Grapheme分割 |
| **中等 (Medium)** | 10 | PIT-A5 权限假安全、PIT-B5 process.exit泄露、PIT-C4 VT解析器不完整、PIT-D4 背压帧率冲突、PIT-E3 终端Emoji宽度不一致 |

**陷阱热区**: TUI 框架 (12个) 和 LLM Provider (10个) 合计占 85%。

---

## 2. 推荐构建顺序

基于依赖链分析、功能优先级和陷阱密度，推荐以下 7 阶段构建路线:

```
Phase 1: 地基层 (无外部依赖)                    [预计最低复杂度]
─────────────────────────────────────────────
  @flitter/schemas    Zod 类型定义 (Thread/Message/Config/MCP)
  @flitter/util 子集  Reactive 原语 + URI + 断言工具
  验收: tsc --noEmit 通过 + Zod schema 单元测试

Phase 2: TUI 渲染引擎 (核心攻坚)               [最大工作量 + 最高陷阱密度]
─────────────────────────────────────────────
  @flitter/tui 分 6 子阶段:
    2a. VT/ANSI 解析器状态机
    2b. Screen 缓冲区 + ANSI 差分渲染器
    2c. RenderObject + BoxConstraints + Layout 引擎
    2d. Widget + Element + State 三棵树
    2e. FrameScheduler + WidgetsBinding 帧调度
    2f. Widget 库 + 主题系统 + 输入处理
  里程碑 M1: runApp(Text("Hello")) 渲染一行文本
  里程碑 M2: 多层嵌套 Widget 正确布局渲染
  ⚠ 关键陷阱: PIT-C1 生命周期时序、PIT-E1 CJK宽度、PIT-C2 差分渲染

Phase 3: LLM 接入层 (单 Provider 先行)          [集成复杂度高]
─────────────────────────────────────────────
  @flitter/llm 分 3 子阶段:
    3a. 统一消息格式 + Provider 抽象接口
    3b. Anthropic Provider (SSE流式 + thinking + tool_use)
    3c. MCP 协议传输 (Stdio + StreamableHTTP + OAuth)
  里程碑 M3: 连接 Anthropic，流式输出到 TUI
  里程碑 M5: Stdio MCP Server 集成
  ⚠ 关键陷阱: PIT-D1 SSE断流、PIT-D3 thinking/tool_use交错、PIT-E5 CJK UTF-8切断

Phase 4: 数据与状态层                           [中等复杂度]
─────────────────────────────────────────────
  @flitter/data:
    ThreadStore (会话持久化)
    ConfigService (多作用域配置合并)
    SkillService (SKILL.md 发现加载)

Phase 5: Agent 核心引擎                         [核心复杂度]
─────────────────────────────────────────────
  @flitter/agent-core:
    ThreadWorker 状态机 (idle → streaming → tool → idle)
    工具执行循环 (Bash/Read/Edit/Grep)
    权限管理 (allow/ask/reject/delegate + picomatch DSL)
    Prompt 路由 + Skill 注入
  里程碑 M4: Agent 执行 Bash/Read/Edit 工具并回传结果
  ⚠ 关键陷阱: PIT-A5 权限假安全、PIT-B4 隐式状态共享

Phase 6: CLI 集成                               [组装层]
─────────────────────────────────────────────
  @flitter/cli:
    Commander.js 命令树
    交互式 TUI 模式 (runApp)
    Headless JSON 流模式
  @flitter/flitter: 依赖注入组装层
  apps/flitter-cli: #!/usr/bin/env bun 入口
  里程碑 M6: 完整交互式对话体验
  ⚠ 关键陷阱: PIT-B5 process.exit资源泄露

Phase 7: 功能完整性与高级功能                    [增量扩展]
─────────────────────────────────────────────
  多 Provider (OpenAI + Gemini + xAI)
  子代理框架 + 代码审查引擎
  IDE Bridge (VS Code WebSocket)
  Git 集成 + 模糊搜索 + Keyring
  OTel 遥测 (延后到此阶段)
  DTW 实时同步 (可选，需服务端)
  里程碑 M7: tmux-capture 视觉回归测试对比原版
```

---

## 3. 关键里程碑验收标准

| 里程碑 | 验收标准 | 依赖阶段 |
|--------|---------|---------|
| **M1: Hello TUI** | `runApp(Text("Hello"))` 在终端渲染一行文本，无 crash | Phase 2a-2e |
| **M2: Widget 树** | 多层嵌套 Widget (Column/Row/Container) 正确布局渲染 | Phase 2f |
| **M3: 流式对话** | 连接 Anthropic API，流式输出 Markdown 到 TUI | Phase 3a-3b |
| **M4: 工具调用** | Agent 执行 Bash/Read/Edit 工具，结果回传 LLM 继续推理 | Phase 5 |
| **M5: MCP 集成** | 通过 Stdio 连接外部 MCP Server，调用工具 | Phase 3c |
| **M6: 完整对话** | 交互式 TUI 模式下完成端到端对话，含工具使用 | Phase 6 |
| **M7: 功能对等** | 多 Provider + tmux-capture 视觉回归测试 Pass | Phase 7 |

---

## 4. 关键风险总览

### 4.1 TOP 5 技术风险

| # | 风险 | 影响 | 概率 | 缓解策略 |
|---|------|------|------|---------|
| R1 | **TUI 三棵树复杂度失控** | 26K 行逆向代码迁移，生命周期时序 bug 难调试 | 高 | 严格分 6 子阶段，每阶段独立可测；保留逆向代码中 10 处 `(bug)` 断言；帧级集成测试 |
| R2 | **LLM SDK 版本漂移** | 逆向代码基于旧版 SDK，当前版本可能 breaking change | 高 | 版本锁定 + 适配器层隔离；Provider 隔离测试 + 录制/回放；显式设置 API 版本 header |
| R3 | **`any` 类型传染瓦解类型安全** | 混淆代码无类型信息，迁移时 `any` 扩散导致 strict mode 形同虚设 | 高 | `unknown` 优先原则；Zod 运行时验证外部输入；CI 跟踪 `any` 比例阈值 |
| R4 | **CJK/Emoji 宽度计算错误** | 中文用户的 TUI 对齐全面崩溃 | 中 | 字符宽度函数完整单元测试 (6 类 Unicode 分区)；DSR 运行时校准；`Intl.Segmenter` grapheme 分割 |
| R5 | **SSE 流中途断开导致状态不一致** | 半截消息 + 未闭合 Markdown + 不完整 JSON tool_use | 中 | 流状态机处理 error/close/abort；Block 级独立缓冲区；超时守卫 + AbortController |

### 4.2 项目级风险

| 风险 | 说明 | 缓解 |
|------|------|------|
| **架构过度设计** (PIT-A1) | 当前 8 个空壳包 + 完善文档，零可运行代码 | 垂直切片优先：尽快跑通 "输入 → LLM → 输出" 端到端路径 |
| **混淆代码语义丢失** (PIT-A2) | 直译混淆名 (k8, YXT, Mn, qm) 产出不可维护的 TS | 每模块迁移前建立语义映射表；单元测试作行为锚点 |
| **DTW 远程服务依赖** (反特性 A5) | DTW 需 Sourcegraph 后端，Flitter 应独立 | 提供纯本地 ThreadStore 替代，DTW 作可选增强 |
| **依赖树过大** (反特性 A6) | OTel 全家桶 18 包增加体积和攻击面 | OTel 延后到 Phase 7；MVP 阶段用 `debug` 包替代 |

---

## 5. 跨维度洞察

### 5.1 TUI 框架是项目的最大赌注

- **技术栈**: 零外部 TUI 依赖，全部自研 (STACK.md)
- **功能**: 全屏 TUI 是 Amp 的最大差异化点，在竞品中独一无二 (FEATURES.md)
- **架构**: Flutter 三棵树 + 60fps 帧调度，是最复杂的单一子系统 (ARCHITECTURE.md)
- **陷阱**: 12/26 个陷阱集中在 TUI，严重/高占比 58% (PITFALLS.md)

**结论**: TUI 框架决定项目成败。Phase 2 必须投入最多精力，并严格按子阶段递进。如果 M1 (Hello TUI) 无法按时达成，应评估降级为轻量级 TUI 方案。

### 5.2 LLM 集成是第二大风险区

- **技术栈**: 3 个官方 SDK 直接调用，不使用 Vercel AI SDK 抽象层 (STACK.md)
- **功能**: 多模型支持 (T5) 是 Table Stake 中复杂度最高的 (FEATURES.md)
- **架构**: SSE 流式 + 多 Provider 格式转换 + 重试退避 (ARCHITECTURE.md)
- **陷阱**: 10/26 个陷阱涉及 LLM，含 2 个严重级 (PITFALLS.md)

**结论**: Phase 3 先用 Anthropic 单 Provider 跑通全链路，验证流式架构正确性后再扩展多 Provider。

### 5.3 Schemas 包是稳定之锚

- 所有上层包 (util/tui/llm/agent-core/data/cli) 都依赖 `@flitter/schemas`
- Zod 4 提供类型安全 + 运行时验证双重保障
- Schema 定义变更会波及全栈 — 必须在 Phase 1 稳定 API

**结论**: Phase 1 的 schema 设计应投入充分时间 review，因为后续所有阶段都基于此。

### 5.4 Headless 模式是最快的价值验证路径

- Headless 模式 (T10) 不依赖 TUI 框架
- 管道输入 + JSON 输出可绕过整个 Phase 2
- 可在 Phase 1 + Phase 3 完成后立即提供可用的 CLI 工具

**结论**: 考虑在 Phase 3b 完成后发布 "Headless-only" alpha 版本，在 TUI 框架完成前就获得用户反馈。

---

## 6. 决策清单

以下决策已在四份研究报告中达成共识，可直接执行:

| # | 决策 | 来源 |
|---|------|------|
| D1 | Bun 1.3.x + TypeScript 5.8.x strict ESM-only | STACK |
| D2 | Zod 4 作为主 schema 验证工具 | STACK |
| D3 | 不引入 Vercel AI SDK，直接调用官方 SDK | STACK |
| D4 | 跳过 8 个 Polyfill (crypto-browserify 等)，使用 Bun 原生 API | STACK |
| D5 | OTel + gRPC 延后到 Phase 7，MVP 使用 `debug` 包 | STACK |
| D6 | TUI 框架自研，不依赖 ink/blessed 等 | STACK + ARCH |
| D7 | 构建顺序: Schemas → Util → TUI → LLM → Data → Agent → CLI | ARCH + FEATURES |
| D8 | 每个迁移阶段前建立混淆名 → 语义名映射表 | PITFALLS |
| D9 | `unknown` 优先于 `any`，CI 跟踪 `any` 比例 | PITFALLS |
| D10 | DTW 提供纯本地替代，远程同步作为可选增强 | FEATURES |
| D11 | Lint 工具推荐 `@biomejs/biome` | STACK |
| D12 | 保留逆向代码中所有 `(bug)` 断言，转为 TypeScript `assert()` | PITFALLS |

---

*本综合报告基于 STACK.md、FEATURES.md、ARCHITECTURE.md、PITFALLS.md 四份研究文档交叉分析。应在每个 Phase 开始时 review 并更新。*
