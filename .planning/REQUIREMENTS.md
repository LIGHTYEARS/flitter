# Requirements: Flitter — Personal Amp CLI

**Defined:** 2026-04-12
**Core Value:** 在终端中提供与原版 Amp CLI 功能对等的 AI Agent 交互体验

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Schema & Types (SCHM)

- [ ] **SCHM-01**: Zod schema 定义所有 LLM 消息类型（user/assistant/tool_use/tool_result）
- [ ] **SCHM-02**: JSON Schema 定义 MCP 协议消息格式（JSON-RPC 2.0）
- [ ] **SCHM-03**: 类型定义覆盖配置系统（全局/工作区/项目层级）
- [ ] **SCHM-04**: 类型定义覆盖 Thread 持久化格式
- [ ] **SCHM-05**: 类型定义覆盖工具权限 DSL

### Infrastructure (INFR)

- [ ] **INFR-01**: Reactive 原语（BehaviorSubject/Observable/Disposable）
- [ ] **INFR-02**: URI 解析与路径操作工具
- [ ] **INFR-03**: Git 状态检测（status/diff/current branch）
- [ ] **INFR-04**: 文件扫描器（rg/fd 驱动的代码搜索）
- [ ] **INFR-05**: Keyring 凭据存储（OS 原生密钥链）
- [ ] **INFR-06**: 模糊文件搜索（精确/前缀/后缀/子串/模糊多层评分）

### TUI Framework (TUI)

- [ ] **TUI-01**: VT/ANSI 解析器（终端输入流解析为结构化事件）
- [ ] **TUI-02**: Screen 缓冲区（Cell 矩阵 + 脏标记 + 差分输出）
- [ ] **TUI-03**: RenderObject 基类与约束传递系统（BoxConstraints）
- [ ] **TUI-04**: Element 树（mount/update/unmount 生命周期）
- [ ] **TUI-05**: Widget 基类与 StatefulWidget/StatelessWidget
- [ ] **TUI-06**: FrameScheduler（16ms 帧调度 + Build/Layout/Paint/Render 四阶段）
- [ ] **TUI-07**: 布局 Widget 库（Row/Column/Stack/Padding/Expanded/Flexible/SizedBox）
- [ ] **TUI-08**: 文本渲染（RichText/TextSpan + CJK 双宽字符 + Emoji 处理）
- [ ] **TUI-09**: 滚动系统（ScrollController + ListView + 键盘/鼠标滚动）
- [ ] **TUI-10**: TextField 组件（多行编辑 + 光标 + 选择 + Kill buffer）
- [ ] **TUI-11**: 主题系统（AppColorScheme + 40+ 语义化颜色 + 暗色/亮色）
- [ ] **TUI-12**: Markdown 渲染（micromark 解析 + 代码高亮 + 内联格式）
- [ ] **TUI-13**: Overlay 系统（Command Palette + 弹出层）
- [ ] **TUI-14**: 文本选择与复制（跨 Widget 选择区域 + 剪贴板）
- [ ] **TUI-15**: 性能监控叠加层（P95/P99 帧时间指标）

### LLM SDK (LLM)

- [ ] **LLM-01**: Anthropic Claude Provider（SSE 流式 + Thinking Blocks + 缓存）
- [ ] **LLM-02**: OpenAI Provider（SSE 流式 + GPT/Codex 模型支持）
- [ ] **LLM-03**: Google Gemini Provider（SSE 流式 + Vertex AI 支持）
- [ ] **LLM-04**: xAI Grok Provider（SSE 流式）
- [ ] **LLM-05**: 统一消息格式抽象（跨 Provider 的消息/工具标准化转换）
- [ ] **LLM-06**: SSE 流式响应解析管线（断流重连 + 指数退避重试）
- [ ] **LLM-07**: MCP Stdio 传输（子进程管理 + JSON-RPC）
- [ ] **LLM-08**: MCP StreamableHTTP/SSE 传输
- [ ] **LLM-09**: MCP OAuth 2.0 PKCE 认证流
- [ ] **LLM-10**: MCP 工具发现与调用（tools/list + tools/call）

### Agent Core (AGNT)

- [ ] **AGNT-01**: ThreadWorker 状态机（idle → streaming → tool → blocked → idle）
- [ ] **AGNT-02**: 工具执行引擎（并行工具调用 + 结果收集）
- [ ] **AGNT-03**: 工具集实现——文件操作（Read/Write/Edit）
- [ ] **AGNT-04**: 工具集实现——Shell 命令执行（Bash/Terminal）
- [ ] **AGNT-05**: 工具集实现——代码搜索（Grep/Glob/FuzzyFind）
- [ ] **AGNT-06**: Prompt 路由与系统提示词组装
- [ ] **AGNT-07**: 工具权限系统（四级决策: allow/ask/reject/delegate）
- [ ] **AGNT-08**: 权限 DSL 解析器（picomatch glob 模式匹配）
- [ ] **AGNT-09**: 子代理框架（并行 spawn 子 Agent）
- [ ] **AGNT-10**: Skill/Plugin 系统（SKILL.md + YAML 前置声明）
- [ ] **AGNT-11**: Hook 系统（pre/post-execute + end-turn 钩子）

### Data Layer (DATA)

- [ ] **DATA-01**: ThreadStore（线程 CRUD + JSON 持久化 + dirty tracking）
- [ ] **DATA-02**: ConfigService（全局/工作区/项目三级配置合并）
- [ ] **DATA-03**: SkillService（三级发现路径 + SKILL.md 解析）
- [ ] **DATA-04**: Guidance Files 加载（AGENTS.md / CLAUDE.md 项目级指导文件）
- [ ] **DATA-05**: 上下文管理（Compaction 裁剪 + Token 计数）

### CLI (CLI)

- [ ] **CLI-01**: Commander 命令树（auth/thread/config/run 等子命令）
- [ ] **CLI-02**: 交互式 TUI 模式入口（全屏 + 组件组装）
- [ ] **CLI-03**: Headless JSON 流模式（管道输入 + JSON 输出）
- [ ] **CLI-04**: 认证流程（API Key 输入 + OAuth 回调 + Keyring 存储）
- [ ] **CLI-05**: 自动更新（CDN 下载 + SHA-256 校验 + 原子替换）

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Features

- **ADV-01**: IDE Bridge（VS Code/JetBrains WebSocket 双向通信）
- **ADV-02**: DTW 远程线程实时同步
- **ADV-03**: OpenTelemetry 全链路遥测
- **ADV-04**: Checkpoint/Rewind 代码状态快照
- **ADV-05**: 多模态输入（图片/截图粘贴）
- **ADV-06**: 代码审查引擎（自动 diff 分析）
- **ADV-07**: REPL 工具（交互式子进程 Python/Node.js）

## Out of Scope

| Feature | Reason |
|---------|--------|
| Shell Mode / 快捷键面板 | 纯还原优先，个人定制功能延后 |
| 移动端 / Web 端 | 仅终端 CLI |
| 自定义 LLM Provider（Ollama 等）| 还原原版支持的 Provider 即可 |
| IDE 插件开发 | 仅 CLI 本体 |
| 语音输入 | 非原版功能 |
| Google Search 内置 | 非原版功能 |
| 沙盒执行 | Codex 特有功能，非 Amp 原版 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| (Populated by roadmapper) | | |

**Coverage:**
- v1 requirements: 53 total
- Mapped to phases: 0
- Unmapped: 53 ⚠️

---
*Requirements defined: 2026-04-12*
*Last updated: 2026-04-12 after initial definition*
