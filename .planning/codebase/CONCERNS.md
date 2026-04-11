# Codebase Concerns — flitter-monorepo

Generated: 2026-04-12

---

## 1. 技术债务 (Tech Debt)

### TD-1: 所有包均为空壳 — 零实现代码 [严重]

monorepo 定义了 8 个包和 1 个应用入口，但**全部只有占位注释**，无任何实现：

| 包 | 文件 | 内容 |
|---|------|------|
| `@flitter/tui` | `packages/tui/src/index.ts` | `// @flitter/tui - Flutter-for-Terminal UI framework` + `export {};` |
| `@flitter/agent-core` | `packages/agent-core/src/index.ts` | `// @flitter/agent-core - Agent core engine` + `export {};` |
| `@flitter/llm` | `packages/llm/src/index.ts` | `// @flitter/llm - LLM & MCP integration` + `export {};` |
| `@flitter/data` | `packages/data/src/index.ts` | `// @flitter/data - Data & state layer` + `export {};` |
| `@flitter/cli` | `packages/cli/src/index.ts` | `// @flitter/cli - CLI entry & command system` + `export {};` |
| `@flitter/schemas` | `packages/schemas/src/index.ts` | `// @flitter/schemas - Data schemas` + `export {};` |
| `@flitter/util` | `packages/util/src/index.ts` | `// @flitter/util - Infrastructure utilities` + `export {};` |
| `flitter` | `packages/flitter/src/index.ts` | `// flitter - Main application assembly layer` + `export {};` |
| `flitter-cli-app` | `apps/flitter-cli/src/index.ts` | `// flitter-cli-app - CLI application` + `export {};` |

CLI 入口 `apps/flitter-cli/bin/flitter.ts` 和 `packages/cli/bin/flitter.ts` 仅输出 placeholder 消息。

**影响**: 架构设计文档 (`ARCHITECTURE.md`) 描述了完整的分层架构，但实际代码完全未开始迁移。架构与实现之间存在巨大鸿沟。

---

### TD-2: 逆向工程代码作为主要知识来源 — 不可维护 [严重]

`amp-cli-reversed/` 目录包含约 **116,343 行**混淆后的 JavaScript 代码。这些代码是从 AMP CLI 逆向工程提取的，包含：
- 变量名全部被混淆（`k8`, `YXT`, `QXT`, `$_`, `It` 等）
- 无注释、无类型标注
- 单文件超大（如 `app/llm-sdk-providers.js` 约 10,000+ 行）
- 多个 vendor 捆绑包混在一起

关键文件：
- `amp-cli-reversed/app/llm-sdk-providers.js` — LLM SDK 集成
- `amp-cli-reversed/app/tool-execution-engine.js` — 工具执行引擎
- `amp-cli-reversed/app/cli-entrypoint.js` — CLI 入口逻辑
- `amp-cli-reversed/app/process-runner.js` — 进程运行器
- `amp-cli-reversed/framework/tui-widget-framework.js` — TUI 框架核心

**影响**: 任何功能实现都必须先阅读和理解混淆代码，极大增加开发成本和错误风险。

---

### TD-3: 两处重复的 CLI 入口点 [中等]

存在两个独立的 CLI 入口定义：
- `apps/flitter-cli/bin/flitter.ts` — 应用层入口
- `packages/cli/bin/flitter.ts` — 包层入口

两者的 `package.json` 都定义了 `"bin": { "flitter": "./bin/flitter.ts" }`。职责边界不清晰，容易造成混淆。

文件：
- `apps/flitter-cli/package.json`
- `packages/cli/package.json`

---

### TD-4: lint 脚本为空占位符 [中等]

`package.json` 中 lint 脚本是占位：

```json
"lint": "echo 'Lint script placeholder'"
```

无 ESLint/Biome/Prettier 配置，代码质量无自动化保障。

文件：`package.json`

---

### TD-5: `.npmrc` 配置使用 pnpm 选项但项目使用 bun [低]

`.npmrc` 文件包含 pnpm 特有选项：
```
shamefully-hoist=true
strict-peer-dependencies=false
```

但项目实际使用 `bun` 作为运行时和包管理器（`bun.lock` 存在，`tsconfig.json` 使用 `bun-types`）。这些选项对 bun 无意义，属于配置残留。

文件：`.npmrc`

---

## 2. 已知缺陷 (Known Bugs / Open Gaps)

根据 `.gaps/v0.4.0/checklist-round-0.md` 和 `checklist-round-1.md`，存在 **10 个未关闭的 Gap**：

### 关键 (Critical) — 3 个未修复

| GAP ID | 描述 | 位置 |
|--------|------|------|
| **GAP-C4** | `?` 无法 toggle shortcuts help 面板 — `?` 被 TextField 消费为可打印字符，ShortcutRegistry 中的绑定永不触发 | `input-area.ts` (未创建) |
| **GAP-C5** | `/` 无法唤起 Command Palette — 同 C4，`/` 被 TextField 消费为文本 | `input-area.ts` (未创建) |
| **GAP-C6** | Command Palette overlay 渲染崩溃 — `Ctrl+O` 触发后出现 `RenderFlex overflowed by Infinitypx`，输入区域文本消失，后续按键事件不再传播 | `command-palette.ts` / overlay-manager (未创建) |

### 次要 (Minor) — 6 个未修复

| GAP ID | 描述 |
|--------|------|
| **GAP-m1** | "Welcome to Amp" 文字缺少逐字符绿色渐变（14 个 24-bit RGB 插值） |
| **GAP-m5** | 命令列表比 AMP 多 2 条命令 (`context detail`, `context file changes`) |
| **GAP-m6** | Scrollbar 在不需要滚动时仍然渲染 |
| **GAP-m7** | StatusBar 四个字段硬编码 `false`：`isExecutingCommand`/`isRunningShell`/`isAutoCompacting`/`isHandingOff` |
| **GAP-m8** | DensityOrb 密度字符集缺少 `#`（AMP 使用 8 级 ` .:-=+*#`，flitter 仅 7 级） |
| **GAP-m9** | 缺少 `? for shortcuts` footer hint（首次启动条件提示） |

### 装饰性 (Cosmetic) — 1 个未修复

| GAP ID | 描述 |
|--------|------|
| **GAP-c1** | 光标渲染差异 — AMP 使用 `[7m ` (reverse video)，flitter 使用 `█` 全块字符 |

文件：
- `.gaps/v0.4.0/checklist-round-0.md`
- `.gaps/v0.4.0/checklist-round-1.md`

---

## 3. 安全关注点 (Security)

### SEC-1: 逆向代码中 API Key 明文流转 [高]

`amp-cli-reversed/app/llm-sdk-providers.js` 中 API Key 通过变量直接传递，无加密或安全存储抽象：

```javascript
// llm-sdk-providers.js L832-839
let t = await e.secrets.getToken("apiKey", e.settings.url);
// ...
apiKey: t, baseURL: new URL("/api/provider/anthropic", e).toString()
```

若 `secrets.getToken()` 的实现不安全，API Key 可能泄露到日志或内存转储中。

文件：`amp-cli-reversed/app/llm-sdk-providers.js`

---

### SEC-2: secret-file 保护仅靠 prompt 指令 [中等]

敏感文件保护通过在 system prompt 中注入指令实现，而非代码层面的硬性阻断：

```javascript
// llm-sdk-providers.js L1158-1161
case "reading-secret-file":
  R.push(`<secret-file-instruction>
    You MUST never read or modify secret files...
  </secret-file-instruction>`)
```

Prompt injection 攻击可能绕过此保护。

文件：`amp-cli-reversed/app/llm-sdk-providers.js`

---

### SEC-3: 大量空 catch 块吞噬异常 [中等]

逆向代码中存在大量空 `catch {}` 块（仅 `app/` 目录就有 30+ 处），这些可能隐藏安全相关异常：

示例位置：
- `amp-cli-reversed/app/llm-sdk-providers.js` — L736, L945, L989, L1402, L1416
- `amp-cli-reversed/app/tool-execution-engine.js` — L412, L733, L1586, L1610, L1618, L1634, L1650
- `amp-cli-reversed/app/skills-agents-system.js` — L312, L361, L556, L564
- `amp-cli-reversed/app/tool-permissions.js` — L396, L435, L485

在权限检查代码 (`tool-permissions.js`) 中吞噬异常尤其危险。

---

### SEC-4: 逆向工程代码的供应链安全 [中等]

`amp-cli-reversed/` 包含从 AMP CLI 二进制提取的代码。由于代码高度混淆：
- 无法审计是否包含恶意逻辑
- 无法验证 vendor 依赖的完整性
- 含有未记录的 `eval()`/`new Function()` 等动态执行模式的风险

文件：`amp-cli-reversed/` 整个目录

---

## 4. 性能关注点 (Performance)

### PERF-1: 逆向代码中单文件超大 [中等]

关键模块行数估算：
- `app/llm-sdk-providers.js` — ~10,000+ 行（合并了 Anthropic、OpenAI、Gemini 三个 SDK）
- `_preamble.js` — ~16,000+ 行（Bun 运行时 + 插件系统 + 配置）
- `framework/micromark-parser.js` — ~12,000+ 行

这些巨型文件在重构时需拆分，否则将严重影响可维护性和构建性能。

---

### PERF-2: tmux-capture 渲染器使用固定 5 秒等待 [低]

`tmux-capture/render.ts` 启动 Vite 开发服务器后硬编码 `await sleep(5000)` 等待就绪：

```typescript
// render.ts L73
await sleep(5000);
```

在快速机器上浪费时间，在慢速机器上可能不够。应使用 readiness 探测替代。

文件：`tmux-capture/render.ts`

---

## 5. 脆弱区域 (Fragile Patterns)

### FRAG-1: (bug) 断言散布于逆向代码 — 运行时崩溃风险 [高]

逆向代码中有 10 处 `throw Error("(bug) ...")` 模式，表明原始代码中存在"不应该到达"的断言。在重构过程中，这些路径的触发条件可能改变：

| 文件 | 行号 | 消息 |
|------|------|------|
| `app/llm-sdk-providers.js` | L603 | `(bug) cannot change agentMode after first message` |
| `app/llm-sdk-providers.js` | L900 | `(bug) corresponding tool_result not found for tool_use` |
| `app/llm-sdk-providers.js` | L1082 | `(bug) unexpected image block` |
| `app/llm-sdk-providers.js` | L1119 | `(bug) unreachable` |
| `app/llm-sdk-providers.js` | L8330 | `(bug) corresponding tool_result not found for tool_use` |
| `app/tool-execution-engine.js` | L1118 | `(bug) tool invocation already in progress` |
| `app/tool-execution-engine.js` | L1119 | `(bug) tool use is incomplete` |
| `app/tool-execution-engine.js` | L1992 | `(bug) invalid thread` |
| `app/process-runner.js` | L2058 | `(bug) missing byte size unit` |
| `app/cli-commander-system.js` | L3110 | `(bug) tool use not found` |

---

### FRAG-2: process.exit() 散布 — 资源泄露风险 [中等]

逆向代码中有 **50+ 处** `process.exit()` 调用，遍布多个模块。在重构为干净架构时，这些硬退出需要替换为异常传播或优雅关闭：

高频模块：
- `amp-cli-reversed/app/cli-entrypoint.js` — 20+ 处
- `amp-cli-reversed/framework/micromark-parser.js` — 8 处
- `amp-cli-reversed/app/session-management.js` — L782, L786
- `amp-cli-reversed/app/process-runner.js` — 5 处
- `amp-cli-reversed/util/otel-instrumentation.js` — L561, L564

---

### FRAG-3: Bun 运行时未实现的 TODO [中等]

Bun 内部实现中存在未完成的 TODO，在特定代码路径下会直接抛出异常：

| 文件 | 行号 | 消息 |
|------|------|------|
| `bun-internal/node/fs.promises.ts.js` | L176 | `BUN TODO FileHandle.getAsyncId` |
| `bun-internal/node/fs.promises.ts.js` | L410 | `BUN TODO FileHandle.kTransfer` |
| `bun-internal/node/fs.promises.ts.js` | L413 | `BUN TODO FileHandle.kTransferList` |
| `bun-internal/node/fs.promises.ts.js` | L416 | `BUN TODO FileHandle.kDeserialize` |
| `bun-internal/node/child_process.ts.js` | L850 | `TODO: stream.Readable stdio @ ${index}` |
| `bun-internal/node/child_process.ts.js` | L857 | `TODO: stream.Writable stdio @ ${index}` |

这些在使用 `FileHandle` 高级方法或非标准 stdio 配置时会触发。

---

### FRAG-4: deprecated API 使用 — 未来兼容性风险 [中等]

逆向代码中依赖了多个已弃用的 API：

| 特性 | 描述 | 来源 |
|------|------|------|
| `generationConfig` | Gemini LiveConnectConfig 弃用字段（Q3 2025 后变为错误） | `llm-sdk-providers.js` L6767 |
| `function_call` stop reason | OpenAI 弃用的停止原因 | `llm-sdk-providers.js` L9775 |
| `--pick` 标志 | CLI `continue` 命令弃用选项 | `cli-entrypoint.js` L189 |
| `fork` 命令 | 整个命令已弃用 | `cli-entrypoint.js` L206, `tui-thread-widgets.js` L3007 |
| `--interactive` 标志 | 弃用，interactive 已为默认行为 | `cli-entrypoint.js` L920 |
| `jsonl` 格式 | 输出格式已弃用 | `cli-entrypoint.js` L715 |
| `parsed` 属性 | MCP text blocks 弃用字段 | `mcp-tools-integration.js` L2968, L2994 |
| `thinking.type=enabled` | Anthropic 弃用，应用 `adaptive` | `vendor/esm/tool-error.js` L48 |

---

## 6. 测试覆盖 (Testing)

### TEST-1: 零测试文件 [严重]

整个项目不存在任何 `*.test.ts` 或 `*.spec.ts` 文件。`tsconfig.json` 排除了 `**/*.test.ts`，但因不存在任何测试，此配置无实际意义。

`.gaps/v0.4.0/checklist-round-1.md` 提到 "Full test suite: 1004/1011 pass (7 pre-existing failures)"，表明之前可能存在测试但已被删除或位于其他分支。

文件：项目根目录及所有子目录

---

## 7. 构建与工具链 (Build & Tooling)

### BUILD-1: 构建脚本过于简单 [中等]

```json
"build": "bun build packages/*/src/index.ts --outdir=dist"
```

仅编译各包入口文件，无：
- 声明文件生成（无 `.d.ts`）
- 类型检查集成到构建流程
- 增量构建支持
- 各包独立构建配置

文件：`package.json`

---

### BUILD-2: TypeScript 配置排除了逆向代码和测试 [信息]

```json
"exclude": ["node_modules", "amp-cli-reversed", "**/*.test.ts"]
```

`amp-cli-reversed/` 被 TypeScript 排除，意味着其中的类型信息对重构没有直接帮助。如需从中提取接口，需要手动分析。

文件：`tsconfig.json`

---

## 8. 架构风险 (Architectural Risks)

### ARCH-1: 架构文档与实现的断裂 [严重]

`ARCHITECTURE.md` 描述了完整的 7 层架构（tui → agent-core → llm → data → cli → util → schemas），包含依赖关系图和 ADR。但所有包都是空壳。

风险：开发者可能基于架构文档做出假设，但实际行为完全不同。

文件：`ARCHITECTURE.md` vs `packages/*/src/index.ts`

---

### ARCH-2: 逆向代码到 TypeScript 的迁移路径不明确 [严重]

当前状态：
1. 逆向代码在 `amp-cli-reversed/` — 116K 行混淆 JS
2. 包结构在 `packages/` — 8 个空壳
3. 无迁移脚本、无中间状态、无渐进式集成

缺少：
- 模块到包的映射文档（哪个 `.js` 文件对应哪个 `@flitter/*` 包）
- 类型提取策略
- 渐进式迁移计划

---

### ARCH-3: 三套 agent 配置冗余 [低]

项目同时维护三套 GSD agent 配置：
- `.claude/agents/` — Claude Code 配置
- `.codex/agents/` — Codex 配置
- `.trae/agents/` — Trae 配置

每套包含 20+ 个 agent 定义文件，内容大量重复。同步维护成本高。

---

## 总结

| 类别 | 严重 | 高 | 中等 | 低 | 合计 |
|------|------|---|------|-----|------|
| 技术债务 | 2 | 0 | 2 | 1 | 5 |
| 已知缺陷 | 3 Critical | 0 | 6 Minor | 1 Cosmetic | 10 |
| 安全 | 0 | 1 | 3 | 0 | 4 |
| 性能 | 0 | 0 | 1 | 1 | 2 |
| 脆弱区域 | 0 | 1 | 3 | 0 | 4 |
| 测试 | 1 | 0 | 0 | 0 | 1 |
| 构建工具 | 0 | 0 | 1 | 0 | 1 |
| 架构 | 2 | 0 | 0 | 1 | 3 |
| **合计** | **8** | **2** | **16** | **4** | **30** |

**最紧迫的行动项**:
1. 开始从逆向代码向 TypeScript 包迁移实际代码（TD-1, ARCH-2）
2. 建立测试基础设施（TEST-1）
3. 关闭 3 个 Critical GAP（C4, C5, C6）
4. 将 lint/format 工具链落地（TD-4）
