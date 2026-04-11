# 架构研究: 终端 AI Agent 系统

> 研究时间: 2026-04-12
> 范围: Flitter 项目架构维度——Flutter 三棵树 TUI、Agent 状态机、LLM 流式传输、MCP 协议
> 参考: `amp-cli-reversed/` 逆向代码 + 业界终端 AI Agent 实践

---

## 1. 终端 AI Agent 系统的典型架构

### 1.1 行业参考

当代终端 AI Agent CLI（如 Claude Code、Cursor CLI、Amp CLI、Aider）普遍采用分层架构:

```
┌─────────────────────────────────────────────────────────────────┐
│  表现层 (Presentation)                                          │
│  终端 UI / TUI 渲染引擎 / 富文本输出                              │
├─────────────────────────────────────────────────────────────────┤
│  交互层 (Interaction)                                           │
│  命令解析 / REPL 循环 / 输入处理 / 快捷键                         │
├─────────────────────────────────────────────────────────────────┤
│  Agent 编排层 (Orchestration)                                   │
│  对话状态机 / 工具执行循环 / 权限管理 / Prompt 路由                 │
├─────────────────────────────────────────────────────────────────┤
│  LLM 接入层 (LLM Gateway)                                      │
│  多 Provider SDK / SSE 流式解析 / 消息格式转换 / 重试退避           │
├─────────────────────────────────────────────────────────────────┤
│  工具层 (Tool Layer)                                            │
│  内建工具 (Bash/Read/Edit/Grep) / MCP 外部工具 / 权限沙箱          │
├─────────────────────────────────────────────────────────────────┤
│  数据层 (Data)                                                  │
│  会话存储 / 配置管理 / Skill 系统 / 凭据管理                       │
├─────────────────────────────────────────────────────────────────┤
│  基础设施层 (Infrastructure)                                     │
│  Reactive 原语 / 文件系统 / Git 操作 / 遥测 / 进程管理             │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Flitter 的差异化: Flutter-for-Terminal

大多数终端 AI Agent 使用 Ink (React-for-Terminal) 或简单的行式输出。Amp CLI 独特地移植了 **Flutter 的三棵树架构** 到终端，实现了真正的声明式全屏 TUI。这是 Flitter 的核心技术挑战和价值所在。

---

## 2. 组件边界分析

### 2.1 核心子系统边界

基于逆向代码分析，Flitter 的 8 个核心子系统之间存在清晰的边界:

```
                    ┌──────────────────┐
                    │  CLI 入口 (cli)   │
                    └────┬─────┬───────┘
                         │     │
            ┌────────────┘     └────────────┐
            ▼                               ▼
  ┌─────────────────┐            ┌──────────────────┐
  │  TUI 框架 (tui) │◄───渲染────│ Agent Core       │
  │  ~26K 行逆向代码 │    更新    │ ~3.6K 行逆向代码  │
  └────────┬────────┘            └──┬────────┬──────┘
           │                        │        │
           │ 无内部依赖              │        │
           │ (可独立发布)            ▼        ▼
           │                ┌──────────┐ ┌───────┐
           │                │ LLM SDK  │ │ Data  │
           │                │ + MCP    │ │ 会话   │
           │                │ ~11.5K行 │ │ 配置   │
           │                └────┬─────┘ └───┬───┘
           │                     │           │
           │                     ▼           ▼
           │                ┌────────────────────┐
           │                │   Util 基础设施      │
           │                │   ~28K 行逆向代码    │
           │                └────────┬───────────┘
           │                         │
           │                         ▼
           │                ┌────────────────────┐
           └───────────────►│   Schemas 纯类型    │
                            │   (Zod 定义)        │
                            └────────────────────┘
```

### 2.2 关键边界契约

| 边界 | 契约 | 通信方式 |
|------|------|---------|
| CLI → Agent Core | `ThreadWorker.handle(message)` | 函数调用 + Observable 订阅 |
| Agent Core → TUI | Widget 树状态更新触发重建 | 声明式 `setState()` / `markNeedsRebuild()` |
| Agent Core → LLM | `Provider.createMessage(params)` → `AsyncIterable<Delta>` | SSE 流式 |
| Agent Core → Data | `ThreadStore.persist(thread)` / `ConfigService.get(key)` | 同步/异步读写 |
| LLM → MCP Server | JSON-RPC 2.0 over Stdio / SSE | 子进程 stdin/stdout 或 HTTP |
| TUI ← 终端 | VT/ANSI 解析器状态机 | raw bytes → 结构化事件 |
| TUI → 终端 | ANSI 差分渲染 | 屏幕缓冲区 → escape 序列 |

---

## 3. Flutter 三棵树 TUI 架构 (核心研究)

### 3.1 三棵树对应关系

Flutter 原生移动端与 Flitter 终端版的映射:

| Flutter 概念 | Flitter TUI 对应 | 逆向代码位置 |
|-------------|------------------|-------------|
| `Widget` | `Mn` 抽象类 (声明式配置) | `tui-widget-framework.js:1666` |
| `Element` | `qm` 类 (生命周期管理) | `tui-widget-framework.js:1691` |
| `State` | `wR` 类 (可变状态) | `tui-widget-framework.js:1784` |
| `BuildContext` | `Ib` 类 (上下文代理) | `tui-widget-framework.js:1814` |
| `RenderObject` | `vH` 类 (布局与绘制) | `tui-widget-framework.js:1500+` |
| `BoxConstraints` | `o0` 类 (约束盒) | `tui-widget-framework.js:1595` |
| `WidgetsBinding` | `d9` 单例 (框架绑定) | `tui-layout-engine.js:1137` |
| `BuildOwner` | `YXT` 类 (脏元素调度) | `tui-layout-engine.js:630+` |
| `PipelineOwner` | `JXT` 类 (布局/绘制管线) | `tui-layout-engine.js:1040+` |
| `FrameScheduler` | `k8` 单例 (帧调度器) | `tui-layout-engine.js:460+` |
| Canvas / Screen | `Screen` 缓冲区 (Cell 矩阵) | `tui-layout-engine.js:70+` |

### 3.2 Widget 生命周期

```
Widget (不可变声明)
  │
  ├── createElement() → Element
  │     ├── mount()          // 挂载到树, 初始化 State
  │     ├── markNeedsRebuild() // 标记脏, 加入 BuildOwner 队列
  │     ├── build()          // 重建子 Widget, 差分协调
  │     ├── update(newWidget) // 同类型 Widget 更新
  │     └── unmount()        // 卸载, 清理依赖
  │
  ├── canUpdate(other)  → bool  // 判断可复用: 同类型 + 同 Key
  │
  └── StatefulWidget 特有:
        State.initState()     // 初始化
        State.setState(fn)    // 触发重建
        State.didUpdateWidget(old) // Widget 更新回调
        State.dispose()       // 销毁
```

### 3.3 渲染管线 (Frame Pipeline)

`FrameScheduler` 以 ~16ms 间隔 (60fps) 驱动四阶段管线:

```
requestFrame()
  │
  ▼
executeFrame() {
  ┌──────────────────────────────────────────────────────────────┐
  │ Phase 1: BUILD (构建阶段)                                    │
  │   WidgetsBinding.beginFrame()     // 初始化帧状态             │
  │   → processResizeIfPending()      // 处理终端尺寸变化          │
  │   → BuildOwner.buildScopes()      // 重建所有脏 Element       │
  │     → 按 depth 排序 + 逐个 rebuild                           │
  │     → Widget.build() → diff → Element 协调                   │
  ├──────────────────────────────────────────────────────────────┤
  │ Phase 2: LAYOUT (布局阶段)                                   │
  │   PipelineOwner.flushLayout()     // 刷新布局                 │
  │   → 从根向下传递 BoxConstraints                               │
  │   → 每个 RenderObject.performLayout()                        │
  │   → 确定 size 和 offset                                      │
  ├──────────────────────────────────────────────────────────────┤
  │ Phase 3: PAINT (绘制阶段)                                    │
  │   WidgetsBinding.paint()          // 绘制到 Screen 缓冲区     │
  │   → PipelineOwner.flushPaint()    // 刷新需要重绘的节点        │
  │   → RenderObject.paint(screen, x, y) // 递归绘制              │
  │   → 写入 Cell 矩阵 (字符 + 样式)                              │
  ├──────────────────────────────────────────────────────────────┤
  │ Phase 4: RENDER (渲染阶段)                                   │
  │   WidgetsBinding.render()         // 输出到终端               │
  │   → Screen.getDiff()             // 差分计算变更 Cell          │
  │   → Renderer.render(diff)        // 生成 ANSI escape 序列     │
  │   → process.stdout.write(buf)    // 批量写入终端               │
  └──────────────────────────────────────────────────────────────┘
  │
  ▼
executePostFrameCallbacks()
}
```

### 3.4 脏标记与增量更新

三棵树的核心优化在于只更新变化部分:

- **Widget 树**: 通过 `canUpdate()` 判断是否复用 Element，避免重建整棵子树
- **Element 树**: `BuildOwner` 维护脏 Element 集合 (`_dirtyElements`)，按 `depth` 排序重建
- **RenderObject 树**: `markNeedsLayout()` 和 `markNeedsPaint()` 分别追踪布局/绘制需求
- **屏幕输出**: `Screen.getDiff()` 只输出变更的 Cell，而非全屏重绘

### 3.5 终端特有的适配

与 Flutter 移动端不同，终端 TUI 需要:

| 方面 | 适配策略 |
|------|---------|
| VT/ANSI 输入解析 | 完整的 VT 解析器状态机 (ground/escape/csi_entry/osc_string/...) |
| 字符宽度 | Unicode 全角字符 (CJK) 占 2 列, grapheme 聚类处理 |
| 颜色系统 | 256 色 + RGB 真彩色 + 终端能力检测 |
| 布局单位 | 字符 Cell (非像素), 整数坐标 |
| 鼠标支持 | SGR 鼠标协议, 命中测试 (`hitTest`) |
| 替代屏幕 | `enterAltScreen()` / `leaveAltScreen()` |
| 同步渲染 | `startSync()` / `endSync()` 防止撕裂 |

---

## 4. Agent 状态机 (核心研究)

### 4.1 ThreadWorker 状态机

`ThreadWorker` 是 Agent 的核心引擎，管理单个对话线程的完整生命周期。

```
                    ┌─────────┐
                    │  idle   │ ◄─────────────────────────────┐
                    └────┬────┘                               │
                         │ handle(message)                    │
                         ▼                                    │
                    ┌──────────┐                              │
          ┌────────│ streaming │ (LLM 推理中)                  │
          │        └──┬───┬───┘                               │
          │           │   │                                   │
          │   text_delta  tool_use                            │
          │           │   │                                   │
          │           │   ▼                                   │
          │           │ ┌───────────┐                         │
          │           │ │ tool:data │ (工具参数接收)            │
          │           │ └─────┬─────┘                         │
          │           │       │                               │
          │           │   ┌───┴────┐                          │
          │           │   │        │                          │
          │           │   ▼        ▼                          │
          │           │ 自动执行  需要审批                      │
          │           │   │        │                          │
          │           │   │        ▼                          │
          │           │   │  ┌─────────────────┐             │
          │           │   │  │ blocked-on-user │ (等待用户审批) │
          │           │   │  └───────┬─────────┘             │
          │           │   │          │ approve/reject         │
          │           │   │          │                        │
          │           │   ▼          ▼                        │
          │           │ ┌────────────────┐                    │
          │           │ │ tool:processed │ (工具执行完毕)       │
          │           │ └───────┬────────┘                    │
          │           │         │                             │
          │           │         │ tool_result 回传             │
          │           │         ▼                             │
          │           │    继续推理 ──────────────────────────►│
          │           │    (回到 streaming)                    │
          │           │                                       │
          │           │  end_turn (推理结束)                    │
          │           └───────────────────────────────────────┘
          │
          │ 取消/错误
          ▼
     ┌──────────┐
     │ cancelled│ ──────────────────────────────────────────► idle
     └──────────┘
```

### 4.2 推理状态 (InferenceState)

`_inferenceState` 使用 `BehaviorSubject<"idle" | "running" | "cancelled">` 管理:

```typescript
// 从逆向代码还原的状态转换
_inferenceState = new BehaviorSubject("idle");

// 开始推理
_inferenceState.next("running");

// 推理完成或取消
_inferenceState.next("idle");

// 用户取消
_inferenceState.next("cancelled");
// 后续自动恢复为 idle
```

### 4.3 工具执行循环

```
LLM 响应 Delta
  │
  ├─ type: "text_delta"  → 直接渲染到 TUI
  │
  ├─ type: "tool_use"    → 进入工具执行:
  │    │
  │    ├─ 1. 解析工具调用参数
  │    ├─ 2. 权限检查 (permission-rule-defs)
  │    │     ├─ allow  → 直接执行
  │    │     ├─ ask    → blocked-on-user (等待审批)
  │    │     ├─ reject → 生成拒绝 tool_result
  │    │     └─ delegate → 委托子 Agent
  │    ├─ 3. 并行执行工具 (支持多工具并发)
  │    ├─ 4. 生成 tool_result
  │    └─ 5. 回传给 LLM, 继续推理
  │
  └─ type: "end_turn"    → 推理结束, 回到 idle
```

### 4.4 Delta 更新协议

ThreadWorker 通过结构化 Delta 更新 Thread 状态:

```typescript
type ThreadDelta =
  | { type: "tool:data";       // 工具数据更新
      toolUseId: string;
      run: { status: "running" | "blocked-on-user" | "completed" | "error" };
      content?: string;
    }
  | { type: "tool:processed";  // 工具执行完毕
      toolUseId: string;
      result: ToolResult;
    }
  | { type: "streaming";       // LLM 流式输出
      delta: TextDelta | ThinkingDelta;
    }
```

---

## 5. LLM 流式传输架构 (核心研究)

### 5.1 多 Provider 统一抽象

```
┌──────────────────────────────────────────────────┐
│              统一消息格式 (Internal)               │
│  Message { role, content: ContentBlock[] }        │
│  ContentBlock: TextBlock | ToolUseBlock |         │
│               ToolResultBlock | ThinkingBlock     │
└──────────┬─────────┬──────────┬─────────┬────────┘
           │         │          │         │
           ▼         ▼          ▼         ▼
    ┌──────────┐┌─────────┐┌────────┐┌────────┐
    │Anthropic ││ OpenAI  ││Gemini  ││  xAI   │
    │ Claude   ││ GPT     ││Vertex  ││ Grok   │
    └──────────┘└─────────┘└────────┘└────────┘
```

### 5.2 流式处理管线

```
HTTP 请求
  → SSE 连接建立 (Server-Sent Events)
  → 字节流 TextDecoderStream
  → SSE 事件解析 (event: / data: / id:)
  → JSON.parse(data)
  → Provider 特定格式 → 统一 Delta 格式
  → ThreadWorker.handleDelta(delta)
  → TUI Widget 更新 / 工具调用分发
```

### 5.3 错误处理与重试

```
请求失败
  ├─ 网络错误 / 超时
  │    → 指数退避重试 (maxRetries 次)
  │    → 重试间隔: min(baseDelay * 2^attempt, maxDelay)
  │
  ├─ 401 Unauthorized
  │    → 触发 OAuth 重新认证流程
  │
  ├─ 429 Rate Limited
  │    → 读取 Retry-After 头
  │    → 尊重服务端退避时间
  │
  └─ 500+ Server Error
       → 重试 (可重试状态码)
       → 抛出 StatusError (不可重试)
```

### 5.4 Provider 特定适配

| Provider | 适配要点 |
|----------|---------|
| Anthropic | `thinking` blocks, `tool_use` 原生支持, Cache Control |
| OpenAI | Responses API 适配器, `function_call` → `tool_use` 转换 |
| Gemini/Vertex | `generateContent` API, `functionCall` 格式 |
| xAI | 兼容 OpenAI 格式, Grok 特定参数 |

---

## 6. MCP 协议集成 (核心研究)

### 6.1 MCP 协议栈

```
┌────────────────────────────────────────────────┐
│  应用层: MCP Client                             │
│    tools/list → prompts/list → tools/call       │
├────────────────────────────────────────────────┤
│  协议层: JSON-RPC 2.0                           │
│    request/response/notification                │
├─────────────────┬──────────────────────────────┤
│  传输层 (二选一)  │                              │
│  ┌─────────────┐│ ┌──────────────────────────┐ │
│  │   Stdio     ││ │  StreamableHTTP (SSE)    │ │
│  │ stdin/stdout││ │  HTTP POST → SSE 响应    │ │
│  │ 子进程管理   ││ │  OAuth 2.0 PKCE 认证     │ │
│  └─────────────┘│ └──────────────────────────┘ │
└─────────────────┴──────────────────────────────┘
```

### 6.2 MCP 生命周期

```
1. initialize
   Client → Server: { method: "initialize", params: { capabilities } }
   Server → Client: { result: { capabilities, serverInfo } }

2. initialized (通知)
   Client → Server: { method: "notifications/initialized" }

3. 能力发现
   Client → Server: tools/list → 获取工具列表
   Client → Server: prompts/list → 获取提示模板

4. 工具调用 (运行时)
   Client → Server: { method: "tools/call", params: { name, arguments } }
   Server → Client: { result: { content: [...] } }

5. 关闭
   Client: abort() → 清理连接
```

### 6.3 Stdio 传输实现

```
spawn(serverCommand, args)
  │
  ├── stdin  → 写入 JSON-RPC 请求 (换行分隔)
  ├── stdout → 读取 JSON-RPC 响应 (换行分隔)
  └── stderr → 日志转发 / 错误处理
```

### 6.4 StreamableHTTP 传输实现

```
HTTP POST (Content-Type: application/json)
  │
  ├── 请求体: JSON-RPC request
  ├── 响应: Content-Type: text/event-stream
  │     ├── event: message
  │     │   data: { jsonrpc response }
  │     └── id: <resumption-token>
  │
  └── 断线重连:
       ├── 保存 resumption token
       ├── 指数退避重连
       └── replay 丢失消息
```

### 6.5 OAuth 2.0 认证流程

```
1. 发送请求 → 收到 401
2. 发现资源元数据 URL
3. 获取 Authorization Server 元数据
4. PKCE: 生成 code_verifier + code_challenge
5. 打开浏览器 → 用户授权
6. 回调获取 authorization_code
7. 交换 access_token + refresh_token
8. 附加 Bearer token 重试请求
```

---

## 7. 数据流全景

### 7.1 用户输入到终端输出的完整链路

```
[终端原始字节]
  │
  ▼ VT 解析器状态机
[结构化输入事件 (键盘/鼠标/粘贴)]
  │
  ▼ TUI InputHandler
[文本输入 / 命令触发]
  │
  ▼ CLI 命令路由 (Commander.js)
[用户消息]
  │
  ▼ ThreadWorker.handle(message)
  │
  ├──► SkillService.loadSkills()        // Skill 注入
  ├──► PromptRouter.buildSystemPrompt() // System Prompt 生成
  │
  ▼ LLM Provider.createMessage()
[SSE 流式连接]
  │
  ├── Delta: text_delta
  │     ▼
  │   Widget.setState() → markNeedsRebuild()
  │     ▼
  │   FrameScheduler.requestFrame()
  │     ▼
  │   Build → Layout → Paint → Render
  │     ▼
  │   [终端 ANSI 差分输出]
  │
  ├── Delta: tool_use
  │     ▼
  │   PermissionCheck → Execute/Block/Reject
  │     ▼
  │   ToolResult → 回传 LLM → 继续推理
  │
  └── Delta: end_turn
        ▼
      ThreadStore.persist() // 持久化会话
        ▼
      idle 状态 → 等待下一次输入
```

### 7.2 Headless 模式数据流

```
stdin (JSON 行)
  │
  ▼ 事件解析
{ type: "user/message", content: "..." }
  │
  ▼ ThreadWorker (无 TUI)
  │
  ▼ 结构化事件输出到 stdout
{ type: "assistant/message", content: "..." }
{ type: "tool/call", name: "Bash", args: {...} }
{ type: "result", ... }
```

---

## 8. 建议构建顺序

### 8.1 原则

1. **自底向上**: 先构建无依赖的底层，再逐层向上
2. **TUI 框架优先**: 三棵树是最核心的渲染基础，Agent 和 LLM 的输出都通过它呈现
3. **可测试**: 每层可独立测试，不依赖上层
4. **渐进可用**: 每个阶段完成后都能运行一个可验证的最小功能

### 8.2 分阶段构建路线

```
Phase 1: 地基层 (无依赖)
──────────────────────────────────────
  @flitter/schemas
    └── Zod schema 定义
    └── JSON Schema 工具定义
    └── 协议常量 (角色/状态/事件类型)
  
  @flitter/util (部分)
    └── Reactive 原语 (Observable, BehaviorSubject)
    └── URI 工具类
    └── 断言工具

Phase 2: TUI 渲染引擎 (核心)
──────────────────────────────────────
  @flitter/tui — 分 6 个子阶段:
  
  2a. VT/ANSI 解析器
      → 终端输入字节 → 结构化事件
      → 状态机: ground/escape/csi/osc/dcs/apc
  
  2b. Screen 缓冲区 + Renderer
      → Cell 矩阵 (字符 + 前景/背景 + 样式)
      → ANSI 差分渲染器 (仅输出变更)
      → 同步渲染协议 (startSync/endSync)
  
  2c. RenderObject + BoxConstraints + Layout
      → vH 基类, o0 约束盒
      → markNeedsLayout / markNeedsPaint
      → performLayout / paint
      → PipelineOwner (flushLayout, flushPaint)
  
  2d. Widget + Element + State
      → Mn (Widget), qm (Element), wR (State)
      → createElement / mount / build / update / unmount
      → canUpdate 差分协调
      → BuildOwner (脏追踪, 按 depth 排序重建)
      → InheritedWidget 依赖注入
  
  2e. FrameScheduler + WidgetsBinding
      → k8 帧调度器 (~16ms)
      → d9 WidgetsBinding 单例
      → 四阶段管线编排: build → layout → paint → render
      → runApp() 入口
  
  2f. Widget 库 + 主题系统
      → 基础 Widget: Text, Container, Column, Row, ...
      → TextEditingController, 滚动, 焦点管理
      → 主题/MediaQuery
      → 输入处理, 剪贴板

Phase 3: LLM 接入层
──────────────────────────────────────
  @flitter/llm — 分 3 个子阶段:
  
  3a. 统一消息格式 + Provider 抽象
      → Message / ContentBlock / Delta 类型
      → BaseProvider 抽象类
      → 格式转换 (内部 ↔ Provider 特定)
  
  3b. Anthropic Provider (首要)
      → SSE 流式解析
      → tool_use / thinking block 支持
      → 重试/退避/超时
  
  3c. MCP 协议传输
      → Stdio 传输 (子进程 JSON-RPC)
      → StreamableHTTP 传输 (SSE + OAuth)
      → 工具发现 + 调用

Phase 4: 数据与状态层
──────────────────────────────────────
  @flitter/data
    └── ThreadStore (会话持久化)
    └── ConfigService (settings.json/jsonc)
    └── SkillService (SKILL.md 发现加载)

Phase 5: Agent 核心引擎
──────────────────────────────────────
  @flitter/agent-core
    └── ThreadWorker 状态机
    └── 工具执行循环
    └── 权限管理 (allow/ask/reject/delegate)
    └── Prompt 路由
    └── Delta 更新协议

Phase 6: CLI 集成
──────────────────────────────────────
  @flitter/cli
    └── Commander.js 命令树
    └── 交互式 TUI 模式 (runApp)
    └── Headless JSON 流模式
  
  @flitter/flitter (组装层)
    └── 依赖注入配置
    └── 统一 API 门面
  
  apps/flitter-cli
    └── #!/usr/bin/env bun 入口

Phase 7: 基础设施补全
──────────────────────────────────────
  @flitter/util (剩余部分)
    └── Git 操作 (status/diff/patch)
    └── FileScanner (rg/fd 驱动)
    └── 模糊搜索
    └── Keyring (OS 密钥链)
    └── OTel 遥测
    └── IDE Bridge (WebSocket)
```

### 8.3 关键里程碑验收点

| 里程碑 | 验收标准 | 依赖阶段 |
|--------|---------|---------|
| M1: Hello TUI | `runApp(Text("Hello"))` 在终端渲染一行文本 | Phase 2a-2e |
| M2: 静态 Widget 树 | 多层嵌套 Widget 正确布局渲染 | Phase 2f |
| M3: 流式对话 | 连接 Anthropic, 流式输出文本到 TUI | Phase 3a-3b |
| M4: 工具调用 | Agent 能执行 Bash/Read/Edit 工具并回传结果 | Phase 5 |
| M5: MCP 集成 | 通过 Stdio 连接外部 MCP Server | Phase 3c |
| M6: 完整对话 | 交互式 TUI 模式完整对话体验 | Phase 6 |
| M7: 功能对等 | 通过 tmux-capture 视觉回归测试对比原版 | Phase 7 |

---

## 9. 架构风险与缓解

| 风险 | 影响 | 缓解策略 |
|------|------|---------|
| 三棵树复杂度 | TUI 框架是最大技术挑战 (~26K 行逆向代码) | 严格分子阶段, 每阶段独立可测 |
| 逆向代码理解困难 | 混淆后变量名无意义 (Mn, qm, vH, k8) | 对照 Flutter 源码理解语义, 添加详细注释 |
| 布局引擎边界情况 | 字符宽度 (CJK/emoji) 与像素布局差异大 | 提前建立 Unicode 宽度测试集 |
| LLM Provider API 变化 | 各 Provider API 持续演进 | 统一抽象层隔离变化 |
| MCP 协议兼容性 | 不同 MCP Server 实现差异 | 严格遵循 JSON-RPC 2.0 规范, 完善错误处理 |
| 性能: 60fps 终端渲染 | 大量文本/代码时帧率下降 | 差分渲染 + 脏标记 + 虚拟化长列表 |

---

## 10. 总结

Flitter 的核心架构挑战集中在四个维度:

1. **Flutter 三棵树 TUI**: 将移动端 UI 框架适配到字符终端，是项目最独特也最复杂的部分。Widget/Element/RenderObject 三棵树 + FrameScheduler 帧调度构成了整个系统的渲染基础。建议从 VT 解析器开始，逐层向上构建。

2. **Agent 状态机**: ThreadWorker 的 `idle → streaming → tool:data → tool:processed → idle` 循环是 Agent 交互的核心。权限管理 (`blocked-on-user`) 和并行工具执行增加了状态管理复杂度。

3. **LLM 流式传输**: SSE 流式解析 + 多 Provider 格式转换 + 错误重试构成了 LLM 接入的核心链路。Anthropic 作为首要 Provider，其 `thinking` block 和 `tool_use` 原生支持是重点。

4. **MCP 协议**: JSON-RPC 2.0 over Stdio/SSE 双传输 + OAuth 2.0 认证，是工具生态扩展的基础。协议相对标准化，实现难度低于前三者。

**构建顺序建议**: Schemas → Util 基础 → TUI 框架 (最优先) → LLM SDK → Data → Agent Core → CLI 集成。TUI 框架占逆向代码的 ~23%，是最大的单一子系统，必须投入最多的迁移精力。

---

*本研究基于 `amp-cli-reversed/` 中 1073 个逆向模块 (~116K 行) 的分析，以及 Flutter 框架源码的对照理解。*
