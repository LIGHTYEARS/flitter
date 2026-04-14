# Phase 11: CLI 入口与端到端集成 — Context

**Packages:** `@flitter/cli` + `@flitter/flitter` + `apps/flitter-cli`
**Requirements:** CLI-01..05 (5 requirements)
**Risk:** Medium
**Depends on:** Phase 2 (util — Keyring), Phase 6 (TUI 高级组件), Phase 10 (Agent 核心引擎)

---

## 概述

Phase 11 是 Flitter 的最终阶段 — 将所有子系统串联为可执行的 CLI 应用。包含 Commander.js 命令树、交互式 TUI 入口、Headless JSON 流模式、认证流程、自动更新、依赖注入组装层、全局安装入口。

完成后达成 Milestone M6 (完整对话): 端到端交互式 TUI 对话体验。

---

## 逆向源码映射

### 核心文件

| 逆向文件 | 行数 | 主要内容 |
|----------|------|----------|
| `cli-entrypoint.js` | ~1100 行 | 主入口 aF0(), Commander 命令定义, 模式判定 (execute/interactive), TUI 启动 |
| `claude-config-system.js` | ~1450 行 | DI 组装 X3(), 服务创建+连接+清理, Commander 命令注册 Yz0() |
| `html-sanitizer-repl.js` | ~1400 行 | TUI App 启动 _70(), 组件树组装, 主题管理, Inspector |
| `process-runner.js` | ~3000 行 | 自动更新服务 pm0(), 版本检测, CDN 下载, 多包管理器支持 |
| `session-management.js` | ~700 行 | OAuth 认证流程, 会话管理 |

### 关键符号映射

| 混淆名 | 清晰名 | 文件 | 行号 | 说明 |
|--------|--------|------|------|------|
| `aF0` | main/bootstrap | cli-entrypoint.js | 1013-1031 | 主入口: argv 解析 → 日志 → 命令执行 |
| `Yz0` | createProgram | claude-config-system.js | 1436-1448 | Commander.js 命令树创建 |
| `S8` | resolveCliContext | cli-entrypoint.js | 913-990 | CLI 上下文解析: 模式判定 + 设置加载 |
| `SB` | runMainAction | cli-entrypoint.js | 546-912 | 主操作: execute 或 interactive |
| `X3` | assembleDependencies | claude-config-system.js | 1097-1324 | DI 组装: 创建并连接所有服务 |
| `_70` | launchTuiApp | html-sanitizer-repl.js | 1327-1388 | TUI 应用启动: 主题 + 组件树 + runApp |
| `eF0` | handleLogin | cli-entrypoint.js | 1032-1051 | login 命令: API Key / OAuth |
| `tF0` | handleLogout | cli-entrypoint.js | ~1052 | logout 命令: 清除凭据 |
| `r3R` | performOAuth | session-management.js | ~200 | OAuth PKCE 浏览器流程 |
| `pm0` | createUpdateService | process-runner.js | ~830 | 自动更新: 版本检测 + 下载 |
| `mm0` | handleUpdateCommand | process-runner.js | 2938-2988 | update 子命令处理 |
| `QJT` | AppWidget | html-sanitizer-repl.js | ~900 | 主应用 Widget |
| `Z8R` | ThreadStateWidget | html-sanitizer-repl.js | ~1100 | 会话状态 Widget |
| `FJT` | ThemeControllerWidget | html-sanitizer-repl.js | ~1200 | 主题控制器 Widget |
| `T1T` | runApp | html-sanitizer-repl.js | ~1300 | TUI runApp 入口 |

---

## 包结构

```
packages/cli/             @flitter/cli — Commander.js 命令树 + 模式判定
  src/
    commands/             各子命令处理器
      auth.ts             login/logout
      threads.ts          thread 管理 (list/new/continue/archive)
      config.ts           config 管理 (get/set/list)
      update.ts           自动更新
    modes/
      interactive.ts      交互式 TUI 模式入口
      execute.ts          非交互式执行模式
      headless.ts         Headless JSON 流模式
    auth/
      api-key.ts          API Key 输入 + 验证
      oauth.ts            OAuth PKCE 回调监听
    update/
      checker.ts          版本检测
      installer.ts        下载 + SHA-256 校验 + 原子替换
    program.ts            Commander.js 命令树定义
    context.ts            CLI 上下文解析 (模式判定/设置/秘密)
    index.ts              barrel exports

packages/flitter/         flitter — 依赖注入组装层
  src/
    container.ts          服务容器: 创建 + 连接 + 清理
    factory.ts            服务工厂: 创建各服务实例
    index.ts              barrel exports

apps/flitter-cli/         flitter-cli-app — 全局安装入口
  bin/
    flitter.ts            #!/usr/bin/env bun shebang 入口
  package.json            bin 定义 + 全局安装配置
```

---

## 依赖关系

```
@flitter/schemas  ─── types: Config, Settings, ThreadEntry, PermissionEntry
@flitter/util     ─── reactive: BehaviorSubject/Subject/Observable
                  ─── keyring: KeyringService (凭据存储)
                  ─── process: ProcessUtil (子进程管理)
@flitter/tui      ─── runApp, Widget 树, Theme 系统, 所有 UI 组件
@flitter/llm      ─── providers: LLMProvider (流式推理)
                  ─── mcp: MCPServerManager (MCP 服务)
                  ─── oauth: OAuthProvider (OAuth 基础设施)
@flitter/data     ─── thread: ThreadStore + ThreadPersistence
                  ─── config: ConfigService + FileSettingsStorage
                  ─── skill: SkillService
                  ─── guidance: GuidanceLoader
                  ─── context: ContextManager
@flitter/agent-core ─── tools: ToolRegistry + ToolOrchestrator
                    ─── permissions: PermissionEngine
                    ─── worker: ThreadWorker
                    ─── subagent: SubAgentManager
                    ─── prompt: collectContextBlocks
```

---

## 执行策略

### 波次规划

```
Wave 1 (基础设施, serial):
  11-06: @flitter/flitter DI 组装层 (~20 tests)
  11-01: Commander.js 命令树 (~20 tests)

Wave 2 (核心模式, serial):
  11-02: 交互式 TUI 模式入口 (~15 tests)
  11-03: Headless JSON 流模式 (~15 tests)

Wave 3 (辅助功能, parallel):
  11-04: 认证流程 (~15 tests)
  11-05: 自动更新 (~15 tests)

Wave 4 (入口, serial):
  11-07: apps/flitter-cli 入口 + 全局安装 (~10 tests)
```

### 理由

- **Wave 1 先 DI 再命令树**: 命令树需要 DI 容器来创建依赖，组装层是所有功能的基础
- **Wave 2 核心模式**: 交互式和 Headless 是两个主要使用模式，依赖命令树
- **Wave 3 辅助可并行**: 认证和更新相互独立，可同时开发
- **Wave 4 最终入口**: 在所有功能就绪后组装为可执行文件

---

## 关键设计决策

| ID | 决策 | 理由 |
|----|------|------|
| KD-39 | Commander.js 命令树: flitter [run] / login / logout / threads / config / update | 对标 Amp CLI 命令结构 |
| KD-40 | 模式判定: TTY → interactive, !TTY/--execute → execute, --headless → JSON 流 | 与 Amp CLI 行为一致 |
| KD-41 | DI 容器: 函数式 createContainer() 返回服务对象 + asyncDispose()，非 class-based | 简单直接，逆向代码 X3() 就是函数 |
| KD-42 | TUI 组件树: ThemeController → KeyBindings → ConfigProvider → App → ThreadState | 复刻逆向组件层级 |
| KD-43 | OAuth 认证: 复用 @flitter/llm oauth/pkce + 本地 HTTP 回调服务器 | 不重复实现 PKCE |
| KD-44 | 自动更新: CDN 二进制 + SHA-256 校验 + 原子文件替换 + npm/pnpm fallback | 逆向原版支持多种安装方式 |
| KD-45 | Headless JSON 流: stdin JSON Lines 输入 + stdout JSON 事件流输出 | 与 Claude Code --stream-json 协议兼容 |

---

## 陷阱 & 注意事项

| # | 风险 | 影响 | 缓解策略 |
|---|------|------|----------|
| PIT-B5 | process.exit 资源泄露 | Dispose 链未执行 | 用 try/finally + asyncDispose() 包裹所有入口路径 |
| PIT-C1 | Commander.js 异步命令异常丢失 | 命令 handler 中的 unhandled rejection | 统一 try/catch + process.exitCode |
| PIT-C2 | TUI 模式 stdin 竞争 | Commander 和 TUI 同时读 stdin | Commander 解析完成后再移交 stdin 控制权 |
| PIT-C3 | OAuth 端口冲突 | 回调服务器启动失败 | 端口重试 + 用户提示 |
| PIT-C4 | 自动更新二进制权限 | 替换文件失败 (macOS SIP, Linux noexec) | 权限检查 + 清晰错误提示 |
| PIT-C5 | Headless 模式 stderr 污染 | 日志输出混入 JSON 流 | Headless 模式下日志全部走 stderr，JSON 走 stdout |

---

## 测试策略

- 目标: ~110 tests (7 plans)
- Commander 命令树: 单元测试命令注册 + 参数解析
- TUI 入口: Mock runApp + 验证组件树组装
- Headless: Mock stdin/stdout + 验证 JSON 事件流协议
- 认证: Mock Keyring + OAuth 回调 + 验证凭据存储
- 更新: Mock HTTP + SHA-256 校验 + 原子替换验证
- DI 容器: 验证服务创建 + 连接 + 清理顺序
- 全局入口: 验证 shebang + 参数传递

---

*Context created: 2026-04-14*
