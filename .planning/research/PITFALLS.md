# Flitter 项目陷阱研究 (PITFALLS)

> 生成日期: 2026-04-12
> 数据来源: PROJECT.md, CONCERNS.md, ARCHITECTURE.md, STACK.md, INTEGRATIONS.md, amp-cli-reversed/ 逆向代码分析
> 目标: 预判并防御 Flitter 开发过程中最可能遭遇的技术陷阱

---

## 目录

1. [AI CLI 项目常见失败模式](#1-ai-cli-项目常见失败模式)
2. [JS-to-TS 迁移关键错误](#2-js-to-ts-迁移关键错误)
3. [TUI 渲染陷阱](#3-tui-渲染陷阱)
4. [LLM 流式传输边缘情况](#4-llm-流式传输边缘情况)
5. [CJK/Emoji 终端渲染问题](#5-cjkemoji-终端渲染问题)
6. [阶段映射总表](#6-阶段映射总表)

---

## 1. AI CLI 项目常见失败模式

### PIT-A1: 架构过度设计 vs 零实现 [严重]

**描述**: 花大量时间在架构文档、目录结构、依赖关系图上，但实际可运行代码为零。Flitter 当前正处于这个状态——8 个空壳包 + 完善的 ARCHITECTURE.md。

**警告信号**:
- 架构文档超过 300 行但没有一个通过的集成测试
- 包之间的依赖关系已定义但没有实际导出
- 花超过 20% 的时间在 "脚手架" 上而非业务逻辑

**防御策略**:
- **垂直切片优先**: 选一个最小端到端路径（如: 用户输入 → LLM 调用 → 文本输出到终端），先跑通再完善
- **每个阶段必须产出可运行代码**: 即使只是 `console.log` 级别的原型
- **引入 Smoke Test**: 一个简单的 `bun run apps/flitter-cli/bin/flitter.ts` 启动测试

**应在哪个阶段解决**: Phase 1 (TUI 框架) — 第一帧渲染必须可工作

---

### PIT-A2: 逆向代码"直译"陷阱 — 混淆代码的语义黑洞 [严重]

**描述**: PROJECT.md 明确选择了 "JS → TS 直译" 策略。但逆向代码中变量名全部被混淆（`k8`, `YXT`, `QXT`, `$_`），直译混淆代码会产出同样不可理解的 TypeScript——类型安全了但语义依然不透明。

**警告信号**:
- TypeScript 函数名和参数名直接使用逆向代码中的混淆名
- 迁移后的代码无法通过 code review（人类读不懂）
- 测试只能验证 "行为一致" 但无法验证 "意图正确"

**防御策略**:
- **语义恢复阶段**: 每个模块迁移前，先用 AMP-MODULES.md 建立语义映射表（混淆名 → 语义名）
- **分层迁移**: 先翻译接口签名（类型层），再翻译实现（逻辑层），最后优化命名
- **单元测试作为行为锚点**: 先从逆向代码的行为中提取测试用例，确保重命名不破坏行为
- **JSDoc 中文注释**（项目已有此约束）: 每个函数必须解释 "做什么"，而非 "怎么做"

**应在哪个阶段解决**: 每个迁移阶段的前置步骤 — 建立语义映射是所有迁移的前提

---

### PIT-A3: Provider SDK 版本漂移 [高]

**描述**: 逆向代码基于 2025 年某个时间点的 SDK 版本。到 2026 年 4 月，Anthropic SDK、OpenAI SDK、Google GenAI SDK 可能已经发生 breaking change。CONCERNS.md 已识别了 8 个 deprecated API（`generationConfig`、`function_call` stop reason、`thinking.type=enabled` 等）。

**警告信号**:
- `npm install @anthropic-ai/sdk` 安装的版本与逆向代码中的行为不一致
- 测试通过但生产环境 API 返回 400/422
- 流式响应的事件类型/字段名已变

**防御策略**:
- **版本锁定 + 兼容层**: 如果可能，锁定到逆向代码使用的 SDK 版本；同时建立适配器层隔离 SDK API
- **Provider 隔离测试**: 每个 Provider 独立的集成测试套件，使用录制/回放（MSW 或类似）
- **Deprecated API 跟踪清单**: 将 CONCERNS.md 中 FRAG-4 的 8 项作为待办，逐一替换
- **API 版本 header 显式设置**: 如 `anthropic-version: 2023-06-01`，避免服务端默认升级

**应在哪个阶段解决**: LLM Provider SDK 迁移阶段

---

### PIT-A4: MCP 协议多版本兼容性地雷 [高]

**描述**: MCP 协议正在快速演进（2025-03-26 → 2025-06-18 → 更新版本）。Flitter 需要同时支持 Stdio、SSE、StreamableHTTP 三种传输。旧版 MCP 服务器可能不支持新协议特性。

**警告信号**:
- `initialize` 握手成功但 `tools/list` 返回空或格式不匹配
- OAuth PKCE 流程在某些 MCP 服务器上失败
- `parsed` 等 deprecated 字段导致运行时 TypeError

**防御策略**:
- **协议版本嗅探**: `initialize` 阶段从 `capabilities` 推断服务器版本，选择兼容的通信方式
- **传输层抽象**: 统一 MCP 客户端接口，传输层可热切换
- **最小 MCP 测试服务器**: 用 Bun 写一个简单的 Stdio MCP 测试服务器，作为 CI 中的集成测试对手

**应在哪个阶段解决**: MCP 协议集成阶段

---

### PIT-A5: 工具权限系统的"假安全" [中等]

**描述**: CONCERNS.md 指出 secret-file 保护仅靠 prompt 指令（SEC-2），空 catch 块吞噬安全异常（SEC-3）。如果迁移时照搬这些模式，安全问题会持续存在甚至恶化。

**警告信号**:
- 安全测试全部通过但实际上没有测试 prompt injection 场景
- 权限检查代码中存在 `catch {}` 空块
- 工具执行绕过了权限检查路径

**防御策略**:
- **代码级硬阻断**: 敏感文件检测不仅靠 prompt，还要在工具执行层做路径匹配拦截
- **消灭空 catch**: 迁移时建立 ESLint 规则禁止空 catch 块（`no-empty` + `@typescript-eslint/no-empty-function`）
- **权限代码 100% 分支覆盖**: 工具权限模块（`tool-permissions`）的测试必须覆盖每个 `allow/ask/reject/delegate` 分支

**应在哪个阶段解决**: Agent 核心引擎迁移阶段 + 安全审计阶段

---

## 2. JS-to-TS 迁移关键错误

### PIT-B1: `any` 类型传染 [严重]

**描述**: 混淆的逆向代码没有类型信息。最大的诱惑是对不确定的类型使用 `any`，导致 TypeScript strict mode 名存实亡。一旦核心模块（如 `ThreadWorker`）的参数或返回值为 `any`，下游所有消费者的类型安全都会崩溃。

**警告信号**:
- `any` 出现频率超过 5%
- 泛型参数使用 `any` 作为默认值
- 类型断言（`as`）超过每 100 行 2 次

**防御策略**:
- **`unknown` 优先**: 所有不确定的类型先用 `unknown`，强制消费者做类型收窄
- **Zod 运行时验证**: 项目已使用 Zod 4.3.6 — 对外部输入（LLM 响应、MCP 消息、用户配置）使用 Zod schema 做运行时验证
- **tsconfig strict 全开**: 确认 `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes` 全部为 `true`
- **CI 类型覆盖率**: 考虑使用 `type-coverage` 工具跟踪 `any` 比例，设阈值

**应在哪个阶段解决**: 贯穿所有迁移阶段 — 每次 PR 检查 `any` 使用

---

### PIT-B2: 运行时行为差异 — Bun vs Node.js 的隐式差异 [高]

**描述**: 逆向代码原本在 Bun 中运行。但 Bun 的某些 API 实现与 Node.js 存在差异。CONCERNS.md 已发现 6 处 Bun 未实现的 TODO（FRAG-3: `FileHandle.getAsyncId`、非标准 stdio 等）。此外 `bun-internal/` 中的补丁代码可能掩盖了 Bun 本身的 bug。

**警告信号**:
- 单元测试通过但集成测试中 `fs.promises` 的 `FileHandle` 高级方法抛出 `BUN TODO` 异常
- 子进程 stdio 行为（pipe、inherit、ipc）与预期不一致
- `import.meta.resolve` 或 `Bun.file()` 在 edge case 下行为不同

**防御策略**:
- **Bun 版本锁定**: 在 `package.json` 中记录最低 Bun 版本要求（当前 >= 1.1.0），并在 CI 中固定版本
- **`bun-internal/` 不直译**: 这些是 Bun 运行时补丁，应视为 "Bun 版本相关的 workaround"，迁移时检查对应 Bun 版本是否已修复
- **集成测试覆盖关键 API**: `child_process.spawn` 的 stdio 配置、`fs.promises.FileHandle` 方法、`WebSocket` 连接

**应在哪个阶段解决**: 基础设施层迁移阶段 (`@flitter/util`)

---

### PIT-B3: ESM/CJS 互操作地雷 [高]

**描述**: 逆向代码的 `vendor/cjs/` 包含 500+ 个 CJS 模块（OpenTelemetry、gRPC、YAML 等），`vendor/esm/` 包含 200+ 个 ESM 模块。项目目标是 ESM-only（`"type": "module"`），但许多第三方依赖仍然是 CJS。

**警告信号**:
- `require is not defined in ES module scope` 运行时错误
- `ERR_REQUIRE_ESM` 循环 — CJS 模块尝试 require ESM 包
- 默认导出与命名导出混淆（`import pkg from 'pkg'` vs `import { fn } from 'pkg'`）
- `__dirname` / `__filename` 在 ESM 中未定义

**防御策略**:
- **Bun 的 CJS-in-ESM 兼容**: 利用 Bun 内置的 CJS/ESM 互操作能力（比 Node.js 更宽松），但不要依赖它
- **第三方依赖升级策略**: 优先选择提供 ESM 导出的包版本；对纯 CJS 包使用 `import()` 动态导入
- **`__dirname` 替换**: 全局搜索替换为 `import.meta.dir`（Bun）或 `path.dirname(fileURLToPath(import.meta.url))`
- **CI 中运行 `bun build --bundle`**: 确保构建产物无模块系统错误

**应在哪个阶段解决**: 基础设施层 (`@flitter/util`) 和 LLM 集成层 (`@flitter/llm`) — 第三方依赖最密集的两层

---

### PIT-B4: 混淆代码中的隐式状态共享 [高]

**描述**: 逆向代码中大量使用模块级变量作为隐式单例/全局状态。当这些代码被拆分到不同 `@flitter/*` 包时，原本共享同一闭包的变量可能变成独立的副本，导致状态不同步。

**警告信号**:
- 拆分后的代码行为与原始代码不一致，但各单元测试都通过
- 单例模式被 "意外多实例化"（Bun 的模块缓存键与预期不同）
- 配置修改在 A 模块生效但 B 模块未感知

**防御策略**:
- **状态映射表**: 迁移前识别每个逆向模块中的模块级变量和闭包状态，标记哪些是全局共享的
- **显式依赖注入**: 共享状态通过组装层 (`packages/flitter/`) 的依赖注入传递，而非模块级副作用
- **集成测试验证状态一致性**: 跨包的状态同步场景必须有集成测试

**应在哪个阶段解决**: 每个迁移阶段 — 特别是 Agent 核心引擎（`ThreadWorker` 大量内部状态）

---

### PIT-B5: `process.exit()` 的资源泄露 [中等]

**描述**: CONCERNS.md 记录了 50+ 处 `process.exit()` 散布在多个模块中（FRAG-2）。直译这些调用会导致: async 清理代码不执行、文件锁不释放、临时目录不清除、OTel span 不 flush。

**警告信号**:
- 测试中出现 "orphaned" 临时文件
- OTel exporter 报 "spans dropped" 告警
- MCP 子进程在主进程退出后成为僵尸进程

**防御策略**:
- **退出信号集中管理**: 建立 `GracefulShutdown` 模块注册 cleanup handler
- **`process.exit()` 替换为异常**: 迁移时逐一替换为 `throw new ExitError(code)` 或 graceful shutdown 路径
- **ESLint 规则**: 禁止直接调用 `process.exit()`（`no-process-exit` 或自定义规则）

**应在哪个阶段解决**: CLI 入口与命令系统阶段 (`@flitter/cli`)

---

### PIT-B6: 逆向代码中 10,000+ 行单文件的拆分策略 [中等]

**描述**: `llm-sdk-providers.js` (~10,232 行) 合并了 5+ 个 LLM Provider 适配器; `_preamble.js` (~16,000 行) 合并了 Bun 运行时补丁; `micromark-parser.js` (~12,483 行) 合并了 Markdown 和 HTML5 解析器。拆分时边界判断错误会导致循环依赖或功能断裂。

**警告信号**:
- 拆分后出现循环 `import` 导致运行时 `undefined`
- 拆分后某个 Provider 的 edge case 行为变化
- 拆分到一半发现模块内部耦合过强无法继续

**防御策略**:
- **AMP-MODULES.md 作为拆分指南**: 该文档已为每个模块标注了 "Architecture Role" 和子系统边界
- **先拆类型再拆实现**: 先提取 interface/type，确定包间 API 契约，再迁移实现
- **逐 Provider 渐进式拆分**: `llm-sdk-providers.js` 先拆一个 Provider（如 Anthropic），验证后再拆其他
- **构建验证**: 每次拆分后运行 `tsc --noEmit` 确认无循环依赖

**应在哪个阶段解决**: 各领域模块的迁移阶段 — 特别是 LLM 和 TUI 框架

---

## 3. TUI 渲染陷阱

### PIT-C1: Flutter 三棵树生命周期时序错误 [严重]

**描述**: Flitter 的 TUI 框架实现了完整的 Flutter Widget → Element → RenderObject 三棵树架构。这是终端 UI 中罕见的复杂设计。时序错误是此类框架最常见的致命 bug：`build()` 中触发 `setState()`（无限重建循环）、`layout()` 中修改子树（脏标记传播异常）、`paint()` 后遗留的脏 RenderObject 导致下一帧 crash。

**警告信号**:
- "Maximum build iterations exceeded" 或类似的无限循环
- 帧率骤降到个位数（脏元素队列膨胀）
- `(bug) ...` 断言触发（逆向代码中 10 处 `throw Error("(bug) ...")` — FRAG-1）
- `RenderFlex overflowed by Infinitypx`（GAP-C6 已出现此问题）

**防御策略**:
- **FrameScheduler 调试模式**: 记录每帧的 build/layout/paint 耗时和脏元素数量（逆向代码中已有 `PerformanceTracker` — `P95/P99` 统计）
- **断言保留**: 逆向代码中的 10 处 `(bug)` 断言全部保留为 TypeScript `assert()`，不要吞掉
- **帧级集成测试**: 模拟 Widget 变更 → 验证 Element 树差分 → 验证 RenderObject 布局结果
- **BuildOwner 深度排序验证**: 脏元素按深度排序重建是正确性的关键——迁移后必须验证

**应在哪个阶段解决**: TUI 框架迁移阶段 (`@flitter/tui`) — Phase 1

---

### PIT-C2: ANSI 差分渲染的"假省优化" [高]

**描述**: 逆向代码的 ANSI 渲染器 (`ktT` in `tui-widget-framework.js`) 实现了单元格级差分输出——只重绘变化的单元格。但如果差分算法有 bug（遗漏了脏单元格、光标位置计算错误），用户会看到"鬼影"——旧内容残留在屏幕上。

**警告信号**:
- 终端 resize 后屏幕出现乱码或内容残留
- 滚动后上一帧的文本片段仍可见
- 光标跳到错误位置

**防御策略**:
- **全量渲染回退路径**: 当差分渲染后内容与预期不符时，可触发一次全量重绘（逆向代码中已有 `screen.markForRefresh()` 和 `forcePaintOnNextFrame`）
- **tmux-capture 视觉回归**: 项目已有 `tmux-capture/` 工具，在每次 TUI 修改后进行截屏对比
- **Resize 事件特殊处理**: resize 后必须触发全量重绘 + 约束重传 (逆向代码中 `processResizeIfPending()` 已有此逻辑)

**应在哪个阶段解决**: TUI 框架迁移阶段 (`@flitter/tui`)

---

### PIT-C3: 约束传递 (Constraint Propagation) 中的 Infinity 问题 [高]

**描述**: Flutter 布局系统使用自顶向下的约束传递。在终端中，约束就是终端尺寸（width, height）。如果某个 Widget 不正确地传递了无边界约束（如 `Infinity` 宽度给 Flex 子元素），会导致 GAP-C6 式的 `overflowed by Infinitypx` 崩溃。

**警告信号**:
- 布局阶段抛出 `Infinity` 相关异常
- 某些 Widget 计算出的 size 为 NaN 或 Infinity
- 嵌套 Scroll + Flex 组合出现布局异常

**防御策略**:
- **约束断言**: 在 `RenderObject.performLayout()` 入口添加 `assert(constraints.maxWidth < Infinity)` 检查
- **调试工具**: 输出 Widget 树的约束传递链（类似 Flutter 的 `debugDumpRenderTree()`）
- **Overlay 特殊处理**: Command Palette 等 overlay Widget 的约束计算需特别注意——不能从 unbounded 的父约束继承

**应在哪个阶段解决**: TUI 框架迁移阶段 (`@flitter/tui`)

---

### PIT-C4: VT/ANSI 解析器状态机不完整 [中等]

**描述**: 逆向代码的 VT 解析器支持 CSI、OSC、DCS、APC 等序列，还支持 Kitty 键盘协议。但终端模拟器的多样性意味着总有新的序列需要处理。常见问题: iTerm2 的私有 OSC 序列、tmux 的 passthrough 序列、Windows Terminal 的特殊 CSI 参数。

**警告信号**:
- 在 iTerm2 中正常但在 Ghostty/Alacritty/Windows Terminal 中异常
- 某些键盘快捷键不响应或产生错误输入
- 粘贴含 ANSI 转义序列的文本导致解析器状态错乱

**防御策略**:
- **终端兼容矩阵**: 维护一个测试矩阵（iTerm2 / Ghostty / Alacritty / macOS Terminal / tmux / Zellij）
- **Bracket paste 完整支持**: 确保 `\x1b[200~` / `\x1b[201~` 包裹的粘贴内容不被解析为命令
- **解析器 fuzzing**: 对 VT 解析器输入随机字节序列，检测 crash 和状态泄露

**应在哪个阶段解决**: TUI 框架迁移阶段 (`@flitter/tui`) — 基础层

---

### PIT-C5: 键盘事件被 TextField 消费导致快捷键失效 [中等]

**描述**: 这不是假设性风险——GAP-C4 和 GAP-C5 已经确认了此问题。`?` 和 `/` 被 TextField 作为可打印字符消费，ShortcutRegistry 中的绑定永远不触发。这是 TUI 中焦点管理与键盘事件分发的经典难题。

**警告信号**:
- 新增的快捷键在有文本输入框焦点时不工作
- 用户按 `Escape` 后仍有 Widget 持有焦点
- 焦点链 (focus chain) 中的优先级不符合预期

**防御策略**:
- **键盘事件传播链明确化**: 定义 capture → target → bubble 三阶段传播
- **焦点管理器 (`FocusManager`) 优先级**: TextField 不应该消费所有可打印字符——需检查 ShortcutRegistry 优先级
- **热键 vs 文本输入分离**: 某些热键（如 `?`, `/`）需要在焦点管理器层面拦截，而非在 Widget 层面

**应在哪个阶段解决**: TUI 框架迁移阶段 — 输入系统子模块

---

## 4. LLM 流式传输边缘情况

### PIT-D1: SSE 流中途断开 — 半截消息处理 [严重]

**描述**: LLM Provider 的 SSE 流可能在任意时刻断开: 网络波动、Provider 端超时、Token 超限。断开时可能正在传输一个 `content_block_delta` 事件——拼接到一半的文本、未闭合的 Markdown code fence、截断的 JSON `tool_use` 参数。

**警告信号**:
- 流断开后 UI 显示截断的 Markdown（未闭合的 ``` 导致后续全部变成代码块）
- `tool_use` 的 JSON 参数不完整导致工具执行崩溃
- 用户看到 "loading" 状态永远不消失

**防御策略**:
- **流状态机必须处理 `error`/`close`/`abort` 三种终结事件**: 不能只处理正常 `done`
- **部分消息缓冲**: 在 `delta` 事件拼接时维护结构化状态（当前 content block 类型、是否在 code fence 内、tool_use JSON 是否完整）
- **超时守卫**: 每个流设独立 AbortController，超过 N 秒无新 event 自动断开并给用户提示
- **重试语义**: 区分 "可重试" (网络超时) 和 "不可重试" (Token 超限、内容策略拦截)

**应在哪个阶段解决**: LLM Provider SDK 迁移阶段 (`@flitter/llm`)

---

### PIT-D2: 多 Provider SSE 格式不统一 [高]

**描述**: 每个 LLM Provider 的流式响应格式完全不同:
- **Anthropic**: `message_start → content_block_start → content_block_delta → content_block_stop → message_delta → message_stop`
- **OpenAI**: `response.created → response.output_item.added → response.content_part.delta → response.completed`（Responses API）或传统 `data: {"choices":[{"delta":...}]}` 格式
- **Gemini**: 非 SSE 格式，使用 `generateContentStream()` 返回 async iterator

逆向代码用一个 10,232 行的巨型文件处理所有这些——拆分时每个分支的边缘情况都可能遗漏。

**警告信号**:
- Provider A 的流正常但 Provider B 偶发截断
- `thinking` blocks / `tool_use` blocks / `image` blocks 的起止事件不配对
- OpenAI 的 `function_call` deprecated stop reason 触发未知分支

**防御策略**:
- **Provider 适配器模式**: 每个 Provider 实现统一的 `AsyncIterableIterator<StreamEvent>` 接口，内部格式差异在适配器层消化
- **流事件录制/回放测试**: 录制真实的 Provider SSE 响应，作为固化测试数据
- **状态机验证**: 每个 Provider 的流事件序列应符合其状态机规范（如 Anthropic 的 `message_start` 必须在 `content_block_start` 之前）

**应在哪个阶段解决**: LLM Provider SDK 迁移阶段 (`@flitter/llm`)

---

### PIT-D3: Thinking Blocks 和 Tool Use 的交错流 [高]

**描述**: Claude 的 `thinking` blocks（extended thinking / chain of thought）与普通 `text` blocks、`tool_use` blocks 可能在同一消息中交错出现。流式传输时，事件的顺序是: `content_block_start(thinking)` → N 个 `thinking_delta` → `content_block_stop` → `content_block_start(text)` → N 个 `text_delta` → `content_block_stop` → `content_block_start(tool_use)` → `input_json_delta` → ...

如果状态机在 thinking block 阶段进入了错误状态，后续的 text 和 tool_use 都会乱掉。

**警告信号**:
- Thinking block 的内容泄露到用户可见的消息中
- `tool_use` 的 JSON 参数被 thinking block 的残余文本污染
- 逆向代码中 `(bug) corresponding tool_result not found for tool_use` 断言触发

**防御策略**:
- **Block 级别的状态机**: 不要全局拼接 delta，而是维护每个 content_block 的独立缓冲区
- **Block ID 追踪**: 使用 Anthropic 返回的 `index` 字段匹配 start/delta/stop 事件
- **Thinking block 隔离**: thinking 内容不进入主消息流，单独存储和展示

**应在哪个阶段解决**: LLM Provider SDK 迁移阶段 — Anthropic 适配器

---

### PIT-D4: 背压 (Backpressure) 与 TUI 渲染帧率冲突 [中等]

**描述**: LLM 流式生成速度可能远超 TUI 的 ~16ms 帧间隔（~60fps）。如果每个 SSE delta 都触发一次 Widget 重建 → Element 协调 → RenderObject 布局 → ANSI 渲染，会导致: 帧堆积、内存膨胀、输入响应延迟。

**警告信号**:
- 长回答生成时终端明显卡顿
- 键盘输入在流式输出期间有可感知的延迟
- 内存持续增长直到流结束

**防御策略**:
- **批量更新**: 累积 delta 到下一个 `requestAnimationFrame` 周期再一次性 commit（逆向代码的 `FrameScheduler` 应已实现此模式）
- **优先级调度**: 用户输入事件优先于流式 delta 处理
- **流量阈值**: 当未处理的 delta 超过阈值时暂停消费（ReadableStream 的背压机制）

**应在哪个阶段解决**: TUI 框架阶段 (帧调度) + LLM 集成阶段 (流式消费)

---

### PIT-D5: 重试与幂等性 [中等]

**描述**: LLM 请求可能因网络问题需要重试。但重试一个已经部分流式返回的请求会导致: 重复的文本片段、重复的 tool_use 调用。逆向代码中已有幂等性 header (`X-Stainless-Retry-Count`)，但流式场景下的幂等性更复杂。

**警告信号**:
- 网络重试后用户看到重复的部分回答
- 同一个 `tool_use` 被执行了两次
- 指数退避在流式场景中等待时间过长

**防御策略**:
- **流式请求不重试部分结果**: 重试时丢弃已接收的所有 delta，从头开始
- **工具执行幂等性**: `tool_use` 的 `id` 作为去重键，相同 `id` 不重复执行
- **用户可感知的重试状态**: 重试时 UI 应显示 "正在重新连接..." 而非静默

**应在哪个阶段解决**: LLM Provider SDK 迁移阶段

---

## 5. CJK/Emoji 终端渲染问题

### PIT-E1: 字符宽度计算错误 — CJK 和 Emoji 的二倍宽 [严重]

**描述**: CJK 字符（中文/日文/韩文）在终端中占 2 列宽度，而 ASCII 占 1 列。Emoji 的宽度更复杂（skin tone modifier、ZWJ sequence 等可能导致 1-4 列宽度不等）。如果布局引擎使用 `string.length` 代替 `wcwidth()` 来计算宽度，整个 TUI 的对齐都会崩溃。

逆向代码中 `process-runner.js` 已包含 "CJK/emoji character width calculation, grapheme segmentation"（见 AMP-MODULES.md），说明原版已处理此问题。但迁移时遗漏此逻辑是高概率事件。

**警告信号**:
- 中文文本后面的光标位置偏移
- 混合 CJK/ASCII 的表格列不对齐
- Emoji 后的文本被截断或重叠

**防御策略**:
- **字符宽度函数单元测试**: 覆盖以下分类
  - ASCII (width 1)
  - CJK Unified Ideographs U+4E00-U+9FFF (width 2)
  - 全角字母 U+FF01-U+FF60 (width 2)
  - 半角片假名 U+FF61-U+FFDC (width 1)
  - 基础 Emoji U+1F600-U+1F64F (width 2，部分终端)
  - ZWJ Emoji Sequence 如 `👨‍👩‍👧‍👦` (终端相关，1-8 列不等)
  - 控制字符 U+0000-U+001F (width 0)
  - 零宽字符 U+200B-U+200F (width 0)
- **终端实际宽度探测**: 使用 `\x1b[6n` (DSR) 查询光标位置来校验字符宽度计算
- **`wcwidth` 实现选择**: 使用 Unicode 15.0+ 的字符宽度表，或直接使用 `@xterm/headless` 的宽度计算

**应在哪个阶段解决**: TUI 框架迁移阶段 — 屏幕缓冲区和布局引擎

---

### PIT-E2: Grapheme Cluster 分割错误 [高]

**描述**: 一个 "用户感知的字符" (grapheme cluster) 可能由多个 Unicode 码点组成:
- `é` = `e` + `\u0301` (组合重音符)
- `👩‍💻` = `👩` + `\u200D` + `💻` (ZWJ sequence)
- `🇨🇳` = `\uD83C\uDDE8` + `\uD83C\uDDF3` (regional indicator)

如果按码点而非 grapheme 分割文本，光标移动、删除、选区操作都会出错。逆向代码中 `tui-widget-library.js` 的 `TextEditingController` 已有 "grapheme-aware indexing"。

**警告信号**:
- 按一次删除键删掉了半个 Emoji
- 光标停在 grapheme cluster 中间，显示为乱码
- 中文输入法的组合字符（拼音标调）渲染异常

**防御策略**:
- **使用 `Intl.Segmenter` API**: Bun 支持 `Intl.Segmenter('zh', { granularity: 'grapheme' })` — 这是最可靠的 grapheme 分割方案
- **TextEditingController 迁移时保持 grapheme-aware**: 光标位置、选区边界、删除操作全部基于 grapheme index
- **测试用例必须包含组合字符**: `"中文"`, `"café"`, `"👨‍👩‍👧‍👦"`, `"🇨🇳"`, `"ñ"` (两种编码形式)

**应在哪个阶段解决**: TUI 框架迁移阶段 — 文本编辑器子系统

---

### PIT-E3: 终端 Emoji 宽度不一致 [中等]

**描述**: 不同终端模拟器对 Emoji 宽度的处理不同:
- iTerm2: 大部分 Emoji 宽度 2，支持 `emojiWidth` 查询
- macOS Terminal: 部分 Emoji 宽度 1
- Ghostty: Emoji 宽度精确但与 iTerm2 不同
- tmux: 在不同终端之间转发时可能改变 Emoji 宽度

逆向代码中已有 `emojiWidth` 能力检测（见 `tui-layout-engine.js` L210, L328, L1053）和 `enableEmojiWidth()` 切换。

**警告信号**:
- 同一个 Emoji 在不同终端中光标偏移量不同
- tmux 内运行时 Emoji 后文本错位但直接运行正常
- `DensityOrb` 的密度字符（GAP-m8）在某些终端中错位

**防御策略**:
- **终端能力查询**: 迁移 `clipboard-and-input.js` 中的终端能力检测逻辑（查询 RGB 色、Kitty 键盘、emoji width）
- **运行时宽度校准**: 利用 `\x1b[6n` DSR 响应校准字符宽度表
- **降级策略**: 无法确定 Emoji 宽度时，回退到 "所有 Emoji 宽度 2" 的保守策略
- **Kitty 图形协议**: 对于支持 Kitty 的终端，使用 `\x1b]66;w=...` 显式指定宽度（逆向代码中已有此路径: `tui-widget-framework.js` L468）

**应在哪个阶段解决**: TUI 框架迁移阶段 — 终端能力检测子系统

---

### PIT-E4: ANSI 转义序列中断 CJK 文本渲染 [中等]

**描述**: 当 CJK 文本中间插入 ANSI 颜色/样式序列（如语法高亮）时，如果转义序列恰好在一个双宽字符的中间位置产生差分输出，终端会显示乱码——因为双宽字符必须在同一次写入中完整输出。

**警告信号**:
- 带颜色的中文文本中偶尔出现半个字的乱码
- 差分渲染更新了双宽字符的右半列但未更新左半列
- Markdown 代码块中的中文注释渲染异常

**防御策略**:
- **双宽字符原子写入**: 差分渲染引擎在处理宽字符时，必须将左右两个 cell 视为不可分割的原子单元
- **脏标记扩展**: 当一个双宽字符的任一 cell 被标记为脏时，两个 cell 都必须重绘
- **屏幕缓冲区中双宽字符占位**: 第二个 cell 标记为 "continuation"，不独立渲染

**应在哪个阶段解决**: TUI 框架迁移阶段 — 屏幕缓冲区和 ANSI 渲染器

---

### PIT-E5: LLM 流式输出中的 CJK 字符被 UTF-8 字节切断 [中等]

**描述**: SSE 流式传输是基于字节的。一个 CJK 字符需要 3 个 UTF-8 字节（如 `中` = `E4 B8 AD`）。如果 SSE 的 `data:` 行恰好在字节边界切割了一个多字节字符，解码器会产生替换字符 `U+FFFD` 或抛出异常。

**警告信号**:
- LLM 中文回答中偶尔出现 `�` 替换字符
- 相同 prompt 在不同网络环境下输出不同（因为分包位置不同）
- 长中文回答尾部出现截断乱码

**防御策略**:
- **TextDecoder 的 `stream: true` 选项**: `new TextDecoder('utf-8', { fatal: false }).decode(chunk, { stream: true })` — 这会在跨 chunk 边界时正确缓冲不完整的多字节字符
- **SSE 解析器在行级而非字节级操作**: 确保 `data:` 行是完整的 UTF-8 字符串后再处理
- **流式 JSON 解析**: `tool_use` 的 `input_json_delta` 也可能在多字节字符中间切割——JSON 解析器需容忍此情况

**应在哪个阶段解决**: LLM Provider SDK 迁移阶段 — SSE 解析器

---

## 6. 阶段映射总表

| 陷阱 ID | 严重度 | 所属维度 | 应在哪个阶段解决 | 包 |
|---------|--------|---------|-----------------|-----|
| PIT-A1 | 严重 | AI CLI | Phase 1 — TUI 框架 | 全局 |
| PIT-A2 | 严重 | AI CLI | 每个迁移阶段前置 | 全局 |
| PIT-A3 | 高 | AI CLI | LLM Provider 阶段 | `@flitter/llm` |
| PIT-A4 | 高 | AI CLI | MCP 集成阶段 | `@flitter/llm` |
| PIT-A5 | 中等 | AI CLI | Agent 引擎阶段 | `@flitter/agent-core` |
| PIT-B1 | 严重 | JS→TS | 贯穿所有迁移阶段 | 全局 |
| PIT-B2 | 高 | JS→TS | 基础设施层阶段 | `@flitter/util` |
| PIT-B3 | 高 | JS→TS | 基础设施 + LLM 阶段 | `@flitter/util`, `@flitter/llm` |
| PIT-B4 | 高 | JS→TS | 每个迁移阶段 | 全局 |
| PIT-B5 | 中等 | JS→TS | CLI 入口阶段 | `@flitter/cli` |
| PIT-B6 | 中等 | JS→TS | 各领域模块阶段 | 多包 |
| PIT-C1 | 严重 | TUI | TUI 框架阶段 | `@flitter/tui` |
| PIT-C2 | 高 | TUI | TUI 框架阶段 | `@flitter/tui` |
| PIT-C3 | 高 | TUI | TUI 框架阶段 | `@flitter/tui` |
| PIT-C4 | 中等 | TUI | TUI 框架阶段 | `@flitter/tui` |
| PIT-C5 | 中等 | TUI | TUI 框架阶段 | `@flitter/tui` |
| PIT-D1 | 严重 | LLM 流式 | LLM Provider 阶段 | `@flitter/llm` |
| PIT-D2 | 高 | LLM 流式 | LLM Provider 阶段 | `@flitter/llm` |
| PIT-D3 | 高 | LLM 流式 | LLM Provider 阶段 | `@flitter/llm` |
| PIT-D4 | 中等 | LLM 流式 | TUI + LLM 阶段 | `@flitter/tui`, `@flitter/llm` |
| PIT-D5 | 中等 | LLM 流式 | LLM Provider 阶段 | `@flitter/llm` |
| PIT-E1 | 严重 | CJK/Emoji | TUI 框架阶段 | `@flitter/tui` |
| PIT-E2 | 高 | CJK/Emoji | TUI 框架阶段 | `@flitter/tui` |
| PIT-E3 | 中等 | CJK/Emoji | TUI 框架阶段 | `@flitter/tui` |
| PIT-E4 | 中等 | CJK/Emoji | TUI 框架阶段 | `@flitter/tui` |
| PIT-E5 | 中等 | CJK/Emoji | LLM Provider 阶段 | `@flitter/llm` |

### 严重度统计

| 严重度 | 数量 | 占比 |
|--------|------|------|
| 严重 (Critical) | 6 | 23% |
| 高 (High) | 10 | 38% |
| 中等 (Medium) | 10 | 38% |
| **合计** | **26** | 100% |

### 按阶段热度

| 阶段 | 涉及陷阱数 | 严重/高占比 |
|------|-----------|-----------|
| TUI 框架 (`@flitter/tui`) | 12 | 58% |
| LLM Provider (`@flitter/llm`) | 10 | 60% |
| 基础设施 (`@flitter/util`) | 3 | 67% |
| Agent 核心 (`@flitter/agent-core`) | 1 | 0% |
| CLI 入口 (`@flitter/cli`) | 1 | 0% |
| 全局/贯穿 | 5 | 60% |

> **结论**: TUI 框架和 LLM Provider 是陷阱密度最高的两个子系统，合计占 22/26 (85%)。这与项目架构文档中 "TUI 框架优先" 的决策一致——先攻克最危险的子系统。

---

*本文档应在每个里程碑开始时 review，标记已解决的陷阱并补充新发现的风险。*
