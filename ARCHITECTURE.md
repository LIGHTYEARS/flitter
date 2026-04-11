# Flitter Monorepo 架构设计文档

## 一、拆分依据与原则

### 1.1 架构分层原则
- **横向拆分**: 基于模块的职责和耦合度 —— 将高度耦合的模块放在同一个 subpackage 中
- **纵向分层**: 基于架构层次 —— framework → core → integration → cli
- **依赖方向**: 只允许上层依赖下层，禁止循环依赖
- **可独立演进**: 每个 subpackage 有清晰的边界，可独立发布和测试

### 1.2 模块分组依据
从逆向分析中，识别出以下核心分组：

| 分组 | 主要模块 | 功能领域 |
|------|---------|---------|
| 1 | tui-widget-framework, tui-render-pipeline, tui-layout-engine, micromark-parser | 终端 UI 框架 |
| 2 | tool-execution-engine, prompt-routing, prompt-classification, tool-permissions | Agent 核心引擎 |
| 3 | llm-sdk-providers, mcp-transport, oauth-auth-provider, rpc-protocol-layer | LLM & MCP 集成 |
| 4 | session-management, claude-config-system, skills-agents-system | 状态与配置 |
| 5 | cli-commander-system, cli-entrypoint, cli-command-router | CLI 入口与命令系统 |

---

## 二、推荐的 Subpackages 结构

```
flitter-monorepo/
├── packages/
│   ├── @flitter/tui/               # 终端 UI 框架
│   ├── @flitter/agent-core/          # Agent 核心引擎
│   ├── @flitter/llm/                 # LLM & MCP 集成
│   ├── @flitter/data/                # 数据与状态层
│   ├── @flitter/cli/                 # CLI 入口
│   ├── @flitter/util/                 # 基础设施工具库
│   ├── @flitter/schemas/              # 数据 schema
│   └── flitter/                        # 主应用（组装层）
├── apps/
│   └── flitter-cli/                    # CLI 应用入口
```

---

## 三、各 Subpackage 详细说明

### 3.1 `@flitter/tui` — 终端 UI 框架

**包含模块**:
- `framework/tui-widget-framework.js`
- `framework/tui-render-pipeline.js`
- `framework/tui-layout-engine.js`
- `framework/tui-widget-library.js`
- `framework/tui-thread-widgets.js`
- `framework/activity-feed-ui.js`
- `framework/clipboard-and-input.js`
- `framework/app-state-management.js`
- `framework/widget-property-system.js`
- `framework/micromark-parser.js`

**职责边界**:
- 独立的 Flutter-for-Terminal 三棵树架构
- 不依赖任何其他 flitter subpackage
- 可独立发布为通用终端 UI 框架

**依赖**: 无（仅依赖标准库和少量第三方库）

---

### 3.2 `@flitter/agent-core` — Agent 核心引擎

**包含模块**:
- `app/tool-execution-engine.js`
- `app/prompt-routing.js`
- `app/prompt-classification.js`
- `app/cli-command-router.js`
- `app/tool-permissions.js`
- `app/html-sanitizer-repl.js`
- `app/realtime-sync.js`
- `app/process-runner.js`

**职责边界**:
- ThreadWorker 生命周期管理
- 工具执行引擎
- Prompt 路由与分类
- 工具权限系统

**依赖**:
- `@flitter/schemas`
- `@flitter/util`

---

### 3.3 `@flitter/llm` — LLM & MCP 集成

**包含模块**:
- `app/llm-sdk-providers.js`
- `app/mcp-tools-integration.js`
- `app/mcp-transport.js`
- `app/oauth-auth-provider.js`
- `app/rpc-protocol-layer.js`
- `app/conversation-ui-logic.js`

**职责边界**:
- 多 Provider LLM SDK
- MCP 协议传输
- OAuth 2.0 认证
- DTW WebSocket 传输

**依赖**:
- `@flitter/schemas`
- `@flitter/util`

---

### 3.4 `@flitter/data` — 数据与状态层

**包含模块**:
- `app/session-management.js`
- `app/claude-config-system.js`
- `app/skills-agents-system.js`
- `app/permission-rule-defs.js`

**职责边界**:
- ThreadStore 线程持久化
- 配置管理服务
- Skill 服务
- 权限规则定义

**依赖**:
- `@flitter/schemas`
- `@flitter/util`

---

### 3.5 `@flitter/cli` — CLI 入口与命令系统

**包含模块**:
- `app/cli-commander-system.js`
- `app/cli-entrypoint.js`

**职责边界**:
- CLI 命令树定义
- 交互式 REPL
- Headless 执行模式

**依赖**:
- `@flitter/agent-core`
- `@flitter/tui`
- `@flitter/data`
- `@flitter/llm`

---

### 3.6 `@flitter/util` — 基础设施工具库

**包含模块**:
- `util/http-sdk-core.js`
- `util/json-schema-validator.js`
- `util/keyring-native-loader.js`
- `util/connection-transport.js`
- `util/otel-instrumentation.js`
- `util/web-streams-polyfill.js`
- `util/protobuf-mime-types.js`
- `util/file-scanner.js`
- `util/http-request-executor.js`

**职责边界**:
- Reactive 原语
- Zod 验证
- Keyring 加载
- IDE Bridge
- OTel 遥测
- Web Streams
- 文件扫描
- Git 集成

**依赖**:
- `@flitter/schemas`

---

### 3.7 `@flitter/schemas` — 数据 Schema

**包含模块**:
- `vendor/esm/app-schemas.js`
- `vendor/esm/app-schemas-2.js`
- `vendor/esm/message-schemas.js`
- `vendor/esm/thread-visibility-schemas.js`
- `vendor/esm/ide-protocol-schemas.js`
- `vendor/esm/mcp-oauth-schemas.js`
- `vendor/esm/mcp-protocol-schemas.js`
- `vendor/esm/mcp-protocol-schemas-2.js`
- 等等...

**职责边界**:
- 所有数据类型定义
- JSON Schema
- 协议定义

**依赖**: 无（纯类型定义）

---

### 3.8 `flitter` — 主应用组装层

**职责**:
- 组装所有 subpackages
- 提供统一的应用入口
- 配置依赖注入

**依赖**: 所有其他 `@flitter/*` subpackages

---

## 四、依赖关系图

```
flitter (主应用)
├── @flitter/cli
│   ├── @flitter/agent-core
│   │   ├── @flitter/schemas
│   │   └── @flitter/util
│   ├── @flitter/tui (无依赖)
│   ├── @flitter/data
│   │   ├── @flitter/schemas
│   │   └── @flitter/util
│   └── @flitter/llm
│       ├── @flitter/schemas
│       └── @flitter/util
└── (其他)
```

---

## 五、拆分的好处

1. **清晰的职责分离**: 每个 subpackage 有单一职责
2. **可独立测试**: 每个 subpackage 可独立测试
3. **可独立演进**: TUI 框架可独立发布为通用库
4. **避免循环依赖**: 严格的单向依赖
5. **便于维护**: 修改某个部分不会影响其他部分
6. **团队协作**: 不同团队可负责不同 subpackage

---

## 六、架构决策记录 (ADRs)

### ADR-001: 使用 monorepo 结构

**上下文**:
需要将逆向的 amp 代码重构为可维护的代码库。

**决策**:
使用 monorepo 结构，将代码拆分为多个 subpackages。

**后果**:
- 正: 清晰的职责分离，便于团队协作
- 负: 增加构建复杂度

---

### ADR-002: @flitter/tui 独立发布

**上下文**:
@flitter/tui 实现了完整的 Flutter-for-Terminal 框架，具有通用价值。

**决策**:
将 @flitter/tui 设计为无内部依赖，可独立发布。

**后果**:
- 正: 可作为独立开源项目
- 负: 需要维护独立的发布流程
