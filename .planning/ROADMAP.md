# Flitter v1 Roadmap

**Created:** 2026-04-12
**Granularity:** fine (11 phases, 5-10 plans each)
**Mode:** yolo
**Method:** TDD — every phase includes test-first development

---

## Build Order Rationale

依赖链: `schemas → util → tui-foundation → tui-tree → tui-widgets → tui-advanced → llm-core → llm-mcp → data → agent-core → cli`

TUI 框架是最大单一子系统（26K 行逆向代码，12/26 陷阱），拆为 4 个阶段递进。LLM 层拆为核心 + MCP 两阶段。每阶段含 TDD 测试作为内置步骤。

---

## Phase 1: Schema 类型地基

**Package:** `@flitter/schemas`
**Effort:** S | **Risk:** Low
**Requirements:** SCHM-01, SCHM-02, SCHM-03, SCHM-04, SCHM-05

### Plans (5)
1. LLM 消息类型 Zod Schema 定义（user/assistant/tool_use/tool_result） — SCHM-01
2. MCP 协议 JSON Schema 定义（JSON-RPC 2.0 request/response/notification） — SCHM-02
3. 配置系统类型定义（全局/工作区/项目三级配置结构） — SCHM-03
4. Thread 持久化格式类型定义（含 dirty tracking 标记） — SCHM-04
5. 工具权限 DSL 类型定义（allow/ask/reject/delegate + glob 模式） — SCHM-05

### Success Criteria
1. `tsc --noEmit` 全量通过，零 `any` 类型
2. 所有 Zod schema 有对应的单元测试（roundtrip parse + 边界值）
3. 其他包可通过 `import { MessageSchema } from '@flitter/schemas'` 正确引用类型
4. JSON Schema 输出与 MCP 规范文档一致（通过 ajv 交叉验证）

### Depends on
_(none — foundation layer)_

---

## Phase 2: 基础设施工具层

**Package:** `@flitter/util`
**Effort:** M | **Risk:** Low-Medium
**Requirements:** INFR-01, INFR-02, INFR-03, INFR-04, INFR-05, INFR-06

### Plans (7)
1. Reactive 原语实现（BehaviorSubject/Observable/Disposable + 订阅管理） — INFR-01
2. URI 解析与路径操作工具（scheme/authority/path/query/fragment） — INFR-02
3. Git 状态检测工具（status/diff/current branch，基于子进程调用） — INFR-03
4. 文件扫描器实现（rg/fd 驱动的代码搜索 + glob 过滤） — INFR-04
5. Keyring 凭据存储（macOS Keychain / Linux Secret Service 适配） — INFR-05
6. 模糊文件搜索实现（精确/前缀/后缀/子串/模糊多层评分算法） — INFR-06
7. 通用断言/日志/错误处理工具函数

### Success Criteria
1. BehaviorSubject 订阅/取消/dispose 生命周期测试全部通过
2. URI 解析覆盖 RFC 3986 标准用例 + 边界用例
3. Git 工具在真实 git 仓库中返回正确的 status/diff/branch
4. 文件扫描器在 Flitter 仓库中搜索已知文件返回正确结果
5. 模糊搜索评分排序与预期优先级一致（精确 > 前缀 > 子串 > 模糊）

### Depends on
- Phase 1 (schemas — 部分工具需要引用类型定义)

---

## Phase 3: TUI 底层渲染基础

**Package:** `@flitter/tui` (子阶段 1/4)
**Effort:** L | **Risk:** High
**Requirements:** TUI-01, TUI-02

### Plans (6)
1. VT/ANSI 解析器状态机（CSI/OSC/DCS/SS3 序列识别） — TUI-01
2. 终端输入流解析为结构化事件（KeyEvent/MouseEvent/PasteEvent） — TUI-01
3. Screen Cell 数据结构（字符 + 前景色 + 背景色 + 属性） — TUI-02
4. Screen 缓冲区双缓冲实现（前/后缓冲 + Cell 矩阵） — TUI-02
5. 脏标记系统（Cell 级 dirty flag + 行级快速跳过） — TUI-02
6. ANSI 差分渲染输出（只输出变化的 Cell，最小化终端写入） — TUI-02

### Success Criteria
1. VT 解析器正确解析 CSI/OSC 序列并输出结构化事件（含 100+ 测试用例）
2. 键盘事件覆盖: 普通字符/Ctrl 组合/方向键/功能键/鼠标事件
3. Screen 缓冲区差分输出产出的 ANSI 转义序列正确（通过 golden file 对比）
4. 双缓冲 swap 后脏标记正确重置

### Depends on
- Phase 1 (schemas)

### Key Pitfalls
- PIT-C4: VT 解析器不完整（遗漏 DCS/OSC 序列）
- PIT-E1: CJK 宽度计算（双宽字符占位）

---

## Phase 4: TUI 三棵树引擎

**Package:** `@flitter/tui` (子阶段 2/4)
**Effort:** XL | **Risk:** Critical
**Requirements:** TUI-03, TUI-04, TUI-05, TUI-06

### Plans (8)
1. BoxConstraints 约束模型（min/max width/height + tighten/loosen/enforce） — TUI-03
2. RenderObject 基类（layout/paint 抽象 + parentData + 坐标系） — TUI-03
3. RenderBox 实现（performLayout + performPaint + hitTest） — TUI-03
4. Element 基类与生命周期（mount/update/unmount/activate/deactivate） — TUI-04
5. ComponentElement 与 RenderObjectElement 分支 — TUI-04
6. Widget 基类（createElement/canUpdate + key 机制） — TUI-05
7. StatefulWidget/StatelessWidget/State 三件套（setState 触发重建） — TUI-05
8. FrameScheduler 帧调度器（Build → Layout → Paint → Render 四阶段管线 + 16ms 节奏） — TUI-06

### Success Criteria
1. `runApp(Text("Hello"))` 在终端渲染一行文本，无 crash（里程碑 M1）
2. Element mount/unmount 生命周期断言全部通过
3. StatefulWidget.setState 触发 Element 标记 dirty → 下一帧重建
4. BoxConstraints 传递链正确（父约束 → 子 layout → 报告尺寸）
5. FrameScheduler 四阶段严格按序执行（通过时序断言验证）

### Depends on
- Phase 3 (Screen 缓冲区 + VT 解析器)

### Key Pitfalls
- PIT-C1: 三棵树生命周期时序错误（mount 前访问 renderObject）
- PIT-D4: 背压帧率冲突（Layout 超时拖慢 Paint）

---

## Phase 5: TUI Widget 库与主题

**Package:** `@flitter/tui` (子阶段 3/4)
**Effort:** L | **Risk:** High
**Requirements:** TUI-07, TUI-08, TUI-11

### Plans (8)
1. Flex 布局引擎（mainAxis/crossAxis 分配 + Expanded/Flexible 弹性因子） — TUI-07
2. Row/Column Widget（水平/垂直排列 + MainAxisAlignment + CrossAxisAlignment） — TUI-07
3. Stack/Positioned Widget（层叠定位布局） — TUI-07
4. Padding/SizedBox/Container 基础容器 Widget — TUI-07
5. RichText/TextSpan 文本渲染（前景/背景/加粗/斜体/下划线组合） — TUI-08
6. CJK 双宽字符处理（wcwidth + Intl.Segmenter grapheme 分割） — TUI-08
7. Emoji 宽度处理（Emoji_Presentation + ZWJ 序列宽度计算） — TUI-08
8. AppColorScheme 主题系统（40+ 语义化颜色 + 暗色/亮色主题切换） — TUI-11

### Success Criteria
1. 多层嵌套 Widget（Column > Row > Container > Text）正确布局渲染（里程碑 M2）
2. CJK 字符（中文/日文/韩文）对齐正确，无错位（golden file 对比）
3. Emoji 渲染宽度正确（单 Emoji、ZWJ 序列、Skin Tone 变体）
4. 暗色/亮色主题切换后所有语义色正确映射

### Depends on
- Phase 4 (三棵树引擎)

### Key Pitfalls
- PIT-E1: CJK 宽度计算错误
- PIT-E2: Grapheme 分割（多码点字符被拆开）
- PIT-E3: 终端 Emoji 宽度不一致

---

## Phase 6: TUI 高级交互组件

**Package:** `@flitter/tui` (子阶段 4/4)
**Effort:** L | **Risk:** High
**Requirements:** TUI-09, TUI-10, TUI-12, TUI-13, TUI-14, TUI-15

### Plans (8)
1. ScrollController + Scrollable 容器（滚动偏移 + 视口裁剪） — TUI-09
2. ListView Widget（懒加载子项 + 键盘/鼠标滚动事件） — TUI-09
3. TextField 组件（多行编辑 + 光标移动 + 行为绑定） — TUI-10
4. TextField 选择与 Kill buffer（Emacs 风格编辑快捷键） — TUI-10
5. Markdown 渲染器（micromark 解析 + 代码块语法高亮 + 内联格式） — TUI-12
6. Overlay/Popup 系统（Command Palette + 层叠弹出 + 焦点管理） — TUI-13
7. 跨 Widget 文本选择与剪贴板复制 — TUI-14
8. 性能监控叠加层（P95/P99 帧时间 + 帧预算利用率指标） — TUI-15

### Success Criteria
1. ListView 在 1000+ 行内容上滚动流畅、无渲染闪烁
2. TextField 支持多行中文输入、光标正确定位、kill-yank 操作
3. Markdown 渲染输出与 micromark AST 一致（golden file 对比）
4. Overlay 弹出/关闭不影响底层 Widget 状态
5. 性能叠加层显示实时帧时间指标

### Depends on
- Phase 5 (Widget 库 + 主题)

### Key Pitfalls
- PIT-C2: 差分渲染鬼影（Overlay 关闭后残留像素）
- PIT-D4: 背压帧率冲突（滚动期间 Layout 开销）

---

## Phase 7: LLM Provider 核心层

**Package:** `@flitter/llm`
**Effort:** L | **Risk:** High
**Requirements:** LLM-01, LLM-02, LLM-03, LLM-04, LLM-05, LLM-06

### Plans (8)
1. 统一消息格式抽象（FlitterMessage/FlitterTool 跨 Provider 标准化） — LLM-05
2. SSE 流式响应解析管线（TextDecoder → 事件提取 → Delta 构建） — LLM-06
3. 断流重连 + 指数退避重试策略（401/429/500 差异化处理） — LLM-06
4. Anthropic Claude Provider（SSE 流式 + Thinking Blocks + Cache Control） — LLM-01
5. OpenAI Provider（SSE 流式 + GPT/Codex + tool_calls 格式转换） — LLM-02
6. Google Gemini Provider（SSE 流式 + Vertex AI + generateContent 格式转换） — LLM-03
7. xAI Grok Provider（SSE 流式 + OpenAI 兼容格式） — LLM-04
8. Provider 集成测试（录制/回放 mock + 多 Provider 切换验证）

### Success Criteria
1. Anthropic Provider 流式输出到控制台（里程碑 M3 基础）
2. 四个 Provider 均通过录制/回放 mock 测试（含 thinking + tool_use 场景）
3. SSE 断流后自动重连并恢复状态（模拟网络中断测试）
4. 统一消息格式 roundtrip 测试: Provider 原生格式 → Flitter 格式 → Provider 原生格式

### Depends on
- Phase 1 (schemas — LLM 消息类型)
- Phase 2 (util — Reactive 原语)

### Key Pitfalls
- PIT-D1: SSE 半截消息（UTF-8 多字节切断）
- PIT-D2: 多 Provider 格式不统一（tool_use vs function_call vs functionCall）
- PIT-D3: thinking/tool_use 交错事件排序

---

## Phase 8: MCP 协议集成

**Package:** `@flitter/llm` (MCP 子模块)
**Effort:** M | **Risk:** Medium
**Requirements:** LLM-07, LLM-08, LLM-09, LLM-10

### Plans (6)
1. MCP JSON-RPC 2.0 协议基础（request/response/notification 编解码） — LLM-07
2. MCP Stdio 传输（子进程 spawn + stdin/stdout JSON-RPC + 生命周期管理） — LLM-07
3. MCP StreamableHTTP 传输（HTTP POST + SSE 事件流） — LLM-08
4. MCP SSE 传输（Server-Sent Events 长连接） — LLM-08
5. MCP OAuth 2.0 PKCE 认证流（401 → 发现 → 授权 → Token → 重试） — LLM-09
6. MCP 工具发现与调用（tools/list 枚举 + tools/call 执行 + 结果序列化） — LLM-10

### Success Criteria
1. 通过 Stdio 连接 MCP 参考 Server，成功调用工具（里程碑 M5）
2. StreamableHTTP 传输通过端到端测试
3. OAuth PKCE 认证流在 mock OAuth server 上完成完整握手
4. tools/list 返回的工具列表正确注入 LLM 调用上下文

### Depends on
- Phase 7 (LLM 核心层 — 消息格式 + SSE 管线)
- Phase 1 (schemas — MCP 协议类型)

---

## Phase 9: 数据持久化层

**Package:** `@flitter/data`
**Effort:** M | **Risk:** Low-Medium
**Requirements:** DATA-01, DATA-02, DATA-03, DATA-04, DATA-05

### Plans (7)
1. ThreadStore 线程 CRUD（create/read/update/delete + 列表查询） — DATA-01
2. ThreadStore JSON 持久化（文件系统 I/O + dirty tracking + 原子写入） — DATA-01
3. ConfigService 多级配置合并（全局 ~/.flitter → 工作区 .flitter → 项目 .flitter/config） — DATA-02
4. ConfigService 热重载（文件 watcher + 配置变更事件） — DATA-02
5. SkillService 三级发现路径（内置 → 项目 → 用户级 SKILL.md 文件扫描） — DATA-03
6. Guidance Files 加载器（AGENTS.md / CLAUDE.md 项目级指导文件解析） — DATA-04
7. 上下文管理器（Compaction 裁剪算法 + Token 计数 + 窗口滑动策略） — DATA-05

### Success Criteria
1. ThreadStore CRUD 全流程测试通过（含 dirty tracking 断言）
2. 三级配置合并优先级正确（项目 > 工作区 > 全局）
3. SkillService 在包含 SKILL.md 的测试目录中正确发现并解析 Skill 定义
4. 上下文 Compaction 裁剪后 Token 计数在预设阈值内

### Depends on
- Phase 1 (schemas — Thread/Config 类型)
- Phase 2 (util — 文件扫描器 + Reactive 原语)

---

## Phase 10: Agent 核心引擎

**Package:** `@flitter/agent-core`
**Effort:** XL | **Risk:** High
**Requirements:** AGNT-01, AGNT-02, AGNT-03, AGNT-04, AGNT-05, AGNT-06, AGNT-07, AGNT-08, AGNT-09, AGNT-10, AGNT-11

### Plans (10)
1. ThreadWorker 状态机（idle → streaming → tool:data → blocked → tool:processed → idle） — AGNT-01
2. 工具执行引擎（并行工具调用调度 + Promise.allSettled 结果收集） — AGNT-02
3. 文件操作工具集（Read/Write/Edit + 路径安全检查） — AGNT-03
4. Shell 命令执行工具（Bash subprocess + 超时守卫 + 输出捕获） — AGNT-04
5. 代码搜索工具集（Grep/Glob/FuzzyFind — 委托 @flitter/util） — AGNT-05
6. Prompt 路由与系统提示词组装（角色注入 + Skill 上下文 + Guidance 合并） — AGNT-06
7. 工具权限系统（四级决策引擎: allow/ask/reject/delegate） — AGNT-07
8. 权限 DSL 解析器（picomatch glob 模式匹配 + 规则优先级排序） — AGNT-08
9. 子代理框架（并行 spawn 子 Agent + 结果汇聚 + 超时取消） — AGNT-09
10. Skill/Plugin 系统（SKILL.md 解析 + YAML 前置声明 + Hook 注册） — AGNT-10, AGNT-11

### Success Criteria
1. ThreadWorker 状态机全路径覆盖测试通过（含 cancel/timeout 边界）
2. Agent 执行 Bash/Read/Edit 工具，结果回传 LLM 继续推理（里程碑 M4）
3. 权限系统正确拦截/允许工具调用（测试 allow/ask/reject/delegate 四种路径）
4. 子代理并行执行 + 超时取消测试通过
5. Skill 系统从 SKILL.md 加载并注入工具列表

### Depends on
- Phase 7 (LLM Provider — 流式对话)
- Phase 8 (MCP — 工具发现)
- Phase 9 (Data — ThreadStore + ConfigService + SkillService)
- Phase 2 (Util — Git/FileScanner/Reactive)

### Key Pitfalls
- PIT-A5: 权限假安全（glob 模式绕过）
- PIT-B4: 隐式状态共享（ThreadWorker 全局状态泄漏）

---

## Phase 11: CLI 入口与端到端集成

**Packages:** `@flitter/cli` + `@flitter/flitter` + `apps/flitter-cli`
**Effort:** L | **Risk:** Medium
**Requirements:** CLI-01, CLI-02, CLI-03, CLI-04, CLI-05
**Plans:** 10/10 plans complete

Plans:
- [x] 11-01-PLAN.md — Commander.js 命令树搭建
- [x] 11-02-PLAN.md — 交互式 TUI 模式入口
- [x] 11-03-PLAN.md — Headless JSON 流 + Execute 模式
- [x] 11-04-PLAN.md — 认证流程 (API Key + OAuth PKCE)
- [x] 11-05-PLAN.md — 自动更新 (SHA-256 + 原子替换)
- [x] 11-06-PLAN.md — DI 组装层 (ServiceContainer)
- [x] 11-07-PLAN.md — main() 入口 + apps/flitter-cli shebang
- [x] 11-08-PLAN.md — Gap closure: 依赖修复 + 安全修复 (CR-01, CR-02)
- [x] 11-09-PLAN.md — Gap closure: main.ts 完整布线 (模式路由 + 命令注册)

### Success Criteria
1. `flitter --help` 输出完整命令树
2. 交互式 TUI 模式下完成端到端对话（含工具使用）（里程碑 M6）
3. `echo "hello" | flitter --headless` 以 JSON 流模式输出 LLM 响应
4. 认证流程完成 API Key → Keyring 存储 → 后续请求自动携带
5. 自动更新 SHA-256 校验失败时正确拒绝安装

### Depends on
- Phase 6 (TUI 高级组件 — 交互式界面)
- Phase 10 (Agent 核心 — 完整对话引擎)
- Phase 2 (Util — Keyring)

### Key Pitfalls
- PIT-B5: process.exit 资源泄露（Dispose 链未执行）

---

## Requirement Coverage Matrix

| Req ID | Phase | Category |
|--------|-------|----------|
| SCHM-01 | 1 | Schema & Types |
| SCHM-02 | 1 | Schema & Types |
| SCHM-03 | 1 | Schema & Types |
| SCHM-04 | 1 | Schema & Types |
| SCHM-05 | 1 | Schema & Types |
| INFR-01 | 2 | Infrastructure |
| INFR-02 | 2 | Infrastructure |
| INFR-03 | 2 | Infrastructure |
| INFR-04 | 2 | Infrastructure |
| INFR-05 | 2 | Infrastructure |
| INFR-06 | 2 | Infrastructure |
| TUI-01 | 3 | TUI Framework |
| TUI-02 | 3 | TUI Framework |
| TUI-03 | 4 | TUI Framework |
| TUI-04 | 4 | TUI Framework |
| TUI-05 | 4 | TUI Framework |
| TUI-06 | 4 | TUI Framework |
| TUI-07 | 5 | TUI Framework |
| TUI-08 | 5 | TUI Framework |
| TUI-11 | 5 | TUI Framework |
| TUI-09 | 6 | TUI Framework |
| TUI-10 | 6 | TUI Framework |
| TUI-12 | 6 | TUI Framework |
| TUI-13 | 6 | TUI Framework |
| TUI-14 | 6 | TUI Framework |
| TUI-15 | 6 | TUI Framework |
| LLM-01 | 7 | LLM SDK |
| LLM-02 | 7 | LLM SDK |
| LLM-03 | 7 | LLM SDK |
| LLM-04 | 7 | LLM SDK |
| LLM-05 | 7 | LLM SDK |
| LLM-06 | 7 | LLM SDK |
| LLM-07 | 8 | LLM SDK (MCP) |
| LLM-08 | 8 | LLM SDK (MCP) |
| LLM-09 | 8 | LLM SDK (MCP) |
| LLM-10 | 8 | LLM SDK (MCP) |
| DATA-01 | 9 | Data Layer |
| DATA-02 | 9 | Data Layer |
| DATA-03 | 9 | Data Layer |
| DATA-04 | 9 | Data Layer |
| DATA-05 | 9 | Data Layer |
| AGNT-01 | 10 | Agent Core |
| AGNT-02 | 10 | Agent Core |
| AGNT-03 | 10 | Agent Core |
| AGNT-04 | 10 | Agent Core |
| AGNT-05 | 10 | Agent Core |
| AGNT-06 | 10 | Agent Core |
| AGNT-07 | 10 | Agent Core |
| AGNT-08 | 10 | Agent Core |
| AGNT-09 | 10 | Agent Core |
| AGNT-10 | 10 | Agent Core |
| AGNT-11 | 10 | Agent Core |
| CLI-01 | 11 | CLI |
| CLI-02 | 11 | CLI |
| CLI-03 | 11 | CLI |
| CLI-04 | 11 | CLI |
| CLI-05 | 11 | CLI |

**Total: 53 requirements mapped to 11 phases. Coverage: 53/53 = 100%**

---

## Milestone Map

| Milestone | Description | Phase Gate |
|-----------|-------------|------------|
| **M1: Hello TUI** | `runApp(Text("Hello"))` 渲染一行文本 | Phase 4 |
| **M2: Widget 树** | 多层嵌套 Widget 正确布局渲染 | Phase 5 |
| **M3: 流式对话** | 连接 LLM Provider 流式输出 | Phase 7 |
| **M4: 工具调用** | Agent 执行工具并回传 LLM | Phase 10 |
| **M5: MCP 集成** | Stdio MCP Server 工具调用 | Phase 8 |
| **M6: 完整对话** | 端到端交互式 TUI 对话体验 | Phase 11 |

---

## Phase Dependency Graph

```
Phase 1 (Schemas)
  ├──> Phase 2 (Util)
  ├──> Phase 3 (TUI Render) ──> Phase 4 (TUI Tree) ──> Phase 5 (TUI Widgets) ──> Phase 6 (TUI Advanced)
  ├──> Phase 7 (LLM Core) ──> Phase 8 (MCP)
  └──> Phase 9 (Data)

Phase 2 (Util) ──> Phase 9 (Data)
                ──> Phase 10 (Agent Core)

Phase 7 (LLM) + Phase 8 (MCP) + Phase 9 (Data) ──> Phase 10 (Agent Core)

Phase 6 (TUI Advanced) + Phase 10 (Agent Core) ──> Phase 11 (CLI)
```

**Parallelization opportunities:**
- Phase 3-6 (TUI track) can run in parallel with Phase 7-8 (LLM track) after Phase 1
- Phase 9 (Data) can run in parallel with Phase 5-6 (TUI) and Phase 8 (MCP)

### Phase 12: WidgetsBinding and runApp — TUI application bootstrap

**Package:** `@flitter/tui` + `@flitter/cli`
**Effort:** L | **Risk:** High
**Goal:** 迁移 WidgetsBinding 和 runApp() 到 @flitter/tui，将 interactive.ts 中的 stub 替换为真实 TUI 引擎，使 `flitter` CLI 启动后进入持久的终端交互界面。
**Requirements**: TUI-06 (补充), CLI-02

### Scope

核心任务:
1. **WidgetsBinding 单例** — 组合 BuildOwner + PipelineOwner + FrameScheduler + 事件系统，管理 TUI 应用生命周期
2. **runApp() 顶层函数** — 初始化终端 (alt screen)、挂载根 Widget、启动帧调度、waitForExit 阻塞直到退出
3. **事件绑定** — 键盘/鼠标/粘贴/resize 事件从终端输入流分发到 Widget 树
4. **MediaQuery** — 终端尺寸感知，包裹根 Widget 提供 rows/cols 信息
5. **interactive.ts 集成** — 将 _runApp stub 替换为 @flitter/tui 的真实 runApp 导入

逆向参考:
- `T1T()` → `runApp` (tui-render-pipeline.js:199-203)
- `d9` → `WidgetsBinding` (tui-layout-engine.js:1182 + tui-render-pipeline.js:7-28)

### Depends on
- Phase 4 (三棵树引擎 — FrameScheduler, BuildOwner, PipelineOwner)
- Phase 3 (VT 解析器 + Screen 缓冲区 + 输入流解析)
- Phase 6 (高级交互组件 — 依赖事件系统)
- Phase 11 (CLI 入口 — interactive.ts stub 替换)

**Plans:** 15/15 plans complete

Plans:
- [x] 12-01-PLAN.md — InheritedWidget + InheritedElement (Wave A)
- [x] 12-02-PLAN.md — FocusNode + FocusScopeNode (Wave A)
- [x] 12-03-PLAN.md — FocusManager 单例 (Wave A)
- [x] 12-04-PLAN.md — HitTestResult + RenderObject.hitTest (Wave A)
- [x] 12-05-PLAN.md — TuiController 终端控制器 (Wave B)
- [x] 12-06-PLAN.md — MouseManager 鼠标事件管理器 (Wave B)
- [x] 12-07-PLAN.md — MediaQuery InheritedWidget (Wave B)
- [x] 12-08-PLAN.md — WidgetsBinding 核心编排器 (Wave C)
- [x] 12-09-PLAN.md — runApp() 顶层入口函数 (Wave C)
- [x] 12-10-PLAN.md — ThemeController + ConfigProvider (Wave D)
- [x] 12-11-PLAN.md — AppWidget + ThreadStateWidget (Wave D)
- [x] 12-12-PLAN.md — InputField + ConversationView (Wave D)
- [x] 12-13-PLAN.md — interactive.ts stub 替换 (Wave E)
- [x] 12-14-PLAN.md — Theme 系统迁移 (Wave E)
- [x] 12-15-PLAN.md — E2E 集成测试 (Wave E)

### Key Pitfalls
- PIT-C1: 三棵树生命周期时序错误（mount 前访问 renderObject）
- PIT-D4: 背压帧率冲突（Layout 超时拖慢 Paint）
- 终端 alt screen 进入/退出 + 清理不彻底导致终端状态污染
- waitForExit 阻塞机制需正确响应 SIGINT/SIGTERM 优雅退出

---

### Phase 12.1: Close TUI launch gaps — /dev/tty input, CLI routing fix, real widget tree, reactive ThreadState (INSERTED)

**Goal:** Fix the three-layer gap preventing `flitter` CLI from launching a working interactive TUI session. Layer 1: TuiController uses process.stdin instead of /dev/tty. Layer 2: resolveCliContext TTY logic diverges from amp's S8(). Layer 3: Application-layer widgets return placeholders and ConversationView is not wired into the widget tree. End state: `flitter` launches a real TUI with visible conversation UI.
**Requirements**: GAP-01, GAP-02, GAP-03, GAP-04, GAP-05
**Depends on:** Phase 12
**Plans:** 5/5 plans complete

Plans:
- [x] 12.1-01-PLAN.md — /dev/tty input strategy + TuiController refactor (Wave 1)
- [x] 12.1-02-PLAN.md — RenderScrollable + layout widget barrel exports (Wave 1)
- [x] 12.1-03-PLAN.md — ConversationView markdown + StatusBar + InputField visual fidelity (Wave 2)
- [x] 12.1-04-PLAN.md — CLI routing fix + ThreadStateWidget reactive state + layout assembly (Wave 2)
- [x] 12.1-05-PLAN.md — E2E tmux-capture verification + human UAT (Wave 3)

---

## Gap Closure Phases (from Amp Cross-Reference Audit 2026-04-15)

> **Required reading before any gap closure work:**
> `.planning/AMP-CROSS-REFERENCE-AUDIT.md` — Full 176-file audit with specific amp references, line numbers, and divergence analysis

---

### Phase 13: TUI Launch Blocker Fix — getSize() + hitTest + async cleanup

**Package:** `@flitter/tui`
**Effort:** S | **Risk:** Critical
**Goal:** Fix the three blocking issues preventing TUI from launching: getSize() Infinity bug, hitTest missing allowHitTestOutsideBounds (breaks overlays), and async cleanup races leaving terminal in raw mode. End state: `flitter` launches a real TUI in a terminal.
**Requirements:** TUI-06 (fix)
**Gap Closure:** CR-09, CR-10, CR-05; Flow "Interactive TUI conversation"
**Depends on:** Phase 12.1

**Tasks (~4):**
1. Port amp's `Uk0()` 4-layer terminal size detection to `TuiController.getSize()`
2. Fix `cleanup()` async race — port amp's async signal handler pattern
3. Add `allowHitTestOutsideBounds` to `RenderObject.hitTest()` per amp's `Dy0`
4. Real terminal verification — human TTY launch test

---

### Phase 14: LLM Provider Reliability + Security — retry, sanitization, thinking budget

**Package:** `@flitter/llm`
**Effort:** M | **Risk:** High
**Goal:** Port amp's retry infrastructure (exponential backoff, Retry-After parsing, idempotency headers), prompt injection defense (invisible Unicode tag removal, pattern redaction), thinking budget dynamics, and cache_control to all LLM providers. Fix hardcoded values in OpenAI/Gemini.
**Requirements:** LLM-01 (fix), LLM-06 (fix)
**Gap Closure:** CR-01, CR-02, CR-03; Flow "LLM retry on transient error"
**Depends on:** _(none — independent)_

**Tasks (~6):**
1. Anthropic retry layer — exponential backoff + Retry-After + maxRetries:0 + idempotency headers
2. Anthropic thinking budget dynamics + cache_control on last message + speed mode guard
3. Unicode sanitization — invisible tag removal (`kwT` pattern) + API key/credential redaction (`EfR`)
4. OpenAI fixes — 409 retry status, encrypted thinking parsing, dynamic maxInputTokens
5. Gemini fixes — Vertex AI service account auth, correct maxInputTokens (1M), provider distinction
6. OpenAI-compat updates — add missing compat configs, wire thinkingFormat to delta processing

---

### Phase 15: MCP Transport Resilience — auth recovery, reconnection, permissions

**Package:** `@flitter/llm` (MCP submodule)
**Effort:** M | **Risk:** High
**Goal:** Port amp's MCP transport resilience: OAuth re-auth on 401, insufficient_scope handling on 403, SSE reconnection with backoff, dynamic transport factory, ping/keepalive, and tool permission enforcement via mcpPermissions.
**Requirements:** LLM-07 (fix), LLM-08 (fix), LLM-09 (fix)
**Gap Closure:** CR-06, CR-07, CR-08, HI-06; Flow "MCP server reconnection"
**Depends on:** _(none — independent)_

**Tasks (~5):**
1. StreamableHTTP — 401 OAuth re-auth flow + 403 insufficient_scope + SSE reconnection
2. SSE transport — `_scheduleReconnection` with configurable attempts + 401 re-auth
3. MCPConnection — dynamic transport factory + ping/keepalive + notification payload forwarding
4. MCPServerManager — mcpPermissions check + includeToolsBySkill filtering + tool cache with TTL
5. Integration tests — auth recovery E2E, reconnection E2E, permission filtering

---

### Phase 16: Agent Core Correctness — ThreadWorker, permissions, prompt, orchestrator

**Package:** `@flitter/agent-core`
**Effort:** XL | **Risk:** Critical
**Goal:** Deep-port ThreadWorker from amp's `ov` class (retry/backoff/snapshots/blocked-on-user/title-gen), fix permission matcher inverted precedence, rewrite system prompt from amp source, add context-blocks mode awareness + 32KB budget, fix orchestrator batch conflict checking.
**Requirements:** AGNT-01 (fix), AGNT-02 (fix), AGNT-06 (rewrite), AGNT-07 (fix), AGNT-08 (fix)
**Gap Closure:** CR-04, HI-01, HI-02, HI-05, HI-07
**Depends on:** Phase 14 (provider retry feeds ThreadWorker retry)

**Tasks (~7):**
1. ThreadWorker deep port — exponential retry (5s base/60s max/5 auto), blocked-on-user queue, title gen, message truncation on retry
2. Permission matcher — fix enable/disable precedence to match amp's `yy`, use glob matching not string includes
3. System prompt rewrite — derive BASE_ROLE_PROMPT from amp's actual prompt (prompt-routing.js / _preamble.js)
4. Context blocks — add deep/smart mode distinction, 32KB byte budget with truncation, `<instructions>` tag wrapping
5. Tool orchestrator — fix batch conflict to check ALL batches not just last, add preprocessArgs support
6. Builtin tools — add `逆向:` references to all 7 tools, add preprocessArgs + timeout support
7. Integration tests — retry loop E2E, permission precedence E2E, prompt assembly verification

---

### Phase 17: Data Layer Fidelity — config 3-tier, guidance loader, skill parser

**Package:** `@flitter/data`
**Effort:** M | **Risk:** Medium
**Goal:** Upgrade ConfigService to 3-tier with admin/managed scope, rewrite guidance loader with real YAML parser + picomatch + byte budget + subtree type, fix skill parser with proper YAML + file validation + path traversal security.
**Requirements:** DATA-02 (fix), DATA-03 (fix), DATA-04 (rewrite)
**Gap Closure:** HI-03, HI-04, HI-08
**Depends on:** _(none — independent)_

**Tasks (~5):**
1. ConfigService — add admin/managed settings tier, permission normalization (I0T), proper array merge semantics
2. Guidance loader — replace parseSimpleYaml with real YAML parser, picomatch for glob, 32KB byte budget, subtree type, relative glob resolution, safety checks
3. Skill parser — replace hand-rolled YAML, add jqR file size/count validation, $qR path traversal check
4. SkillService — add 3rd discovery tier (project .flitter/skills/), align with amp's 3-tier
5. Integration tests — 3-tier config merge, guidance discovery with complex YAML, skill validation

---

### Phase 18: CLI Completeness — stubs, interactive.ts, modes

**Package:** `@flitter/cli`
**Effort:** M | **Risk:** Medium
**Goal:** Implement config/threads command handlers from amp source, fix interactive.ts with dynamic theme subscription and safe typing, add auth gating + error framing to execute/headless modes.
**Requirements:** CLI-01 (fix), CLI-02 (fix), CLI-03 (fix)
**Gap Closure:** HI-09, HI-10
**Depends on:** Phase 17 (ConfigService 3-tier needed for dynamic theme)

**Tasks (~5):**
1. config command — implement handleConfigGet/Set/List from amp's `uC0`
2. threads command — implement handleThreadsList/New/Continue/Archive/Delete from amp source
3. interactive.ts — dynamic theme via configService.config subscription, remove unsafe casts, add inspector support
4. execute/headless modes — add auth gating, timing instrumentation, protocol-level error framing
5. Integration tests — config get/set roundtrip, threads CRUD, mode switching

---

### Phase 19: Amp Cross-Reference Annotation Pass — formalize `逆向:` across all packages

**Package:** All packages
**Effort:** L | **Risk:** Low
**Goal:** Add formal `逆向:` annotations to ~130 source files that currently lack them. Formalize informal "Reversed: Xxx" comments in @flitter/llm. Add inline references to @flitter/schemas. Spot-check implementations during annotation and flag any additional divergences found.
**Requirements:** _(cross-cutting quality improvement)_
**Gap Closure:** P2 annotation debt across all packages
**Depends on:** Phases 13-18 (annotate after fixes, not before)

**Tasks (~7):**
1. `@flitter/tui` — screen/ (6), vt/ (3), widgets/ (14), tree/ (10) annotation with amp class/function mapping
2. `@flitter/tui` — selection/ (3), markdown/ (3), text/ (2), perf/ (1), scroll/ (5) annotation
3. `@flitter/llm` — formalize all 38 files from "Reversed: Xxx" to `逆向:` format with specific line numbers
4. `@flitter/util` — all 16 files: find amp counterparts and annotate
5. `@flitter/schemas` — all 6 files: add inline `逆向:` per schema field/variant
6. `@flitter/agent-core` — builtin tools and remaining unannotated files
7. `@flitter/data` — all 13 files: formalize informal docstring refs to `逆向:` format

---

## Gap Closure Dependency Graph

```
Phase 13 (TUI blocker) ─────────────────────────────────────────────────────────┐
Phase 14 (LLM reliability) ──> Phase 16 (Agent Core) ──> Phase 18 (CLI) ──> Phase 19 (Annotation)
Phase 15 (MCP resilience) ─────────────────────────────────────────────────────  │
Phase 17 (Data fidelity) ──────────────────────────> Phase 18 (CLI) ────────────┘
```

**Parallelization:** Phases 13, 14, 15, 17 are all independent and can run in parallel.

---

*Roadmap created: 2026-04-12*
*Last updated: 2026-04-15 — Gap closure phases 13-19 added from Amp Cross-Reference Audit*
