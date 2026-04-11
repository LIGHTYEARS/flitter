# Flitter Monorepo -- 编码规范

> 基于对代码库的全量分析生成。最后更新: 2026-04-12

---

## 1. 项目概貌

Flitter 是一个 Bun-first 的 TypeScript monorepo，目标是将从 Sourcegraph Amp CLI 逆向工程获得的代码重构为可维护的分层架构。目前处于 **早期骨架阶段** -- 8 个 workspace 包和 1 个 app 入口已搭建完毕，但源码实现尚为空壳 (`export {}`)。编码规范主要从已有的配置文件、架构设计文档及逆向参考代码中推导。

### 目录结构

```
flitter-monorepo/
├── packages/
│   ├── schemas/          # @flitter/schemas   -- 数据类型与协议定义 (零依赖)
│   ├── util/             # @flitter/util       -- 基础设施工具库
│   ├── tui/              # @flitter/tui        -- Flutter-for-Terminal UI 框架 (零内部依赖)
│   ├── agent-core/       # @flitter/agent-core -- Agent 核心引擎
│   ├── llm/              # @flitter/llm        -- LLM & MCP 集成
│   ├── data/             # @flitter/data       -- 数据与状态层
│   ├── cli/              # @flitter/cli        -- CLI 入口与命令系统
│   └── flitter/          # flitter             -- 主应用组装层
├── apps/
│   └── flitter-cli/      # flitter-cli-app     -- CLI 应用入口
├── amp-cli-reversed/     # 逆向工程参考代码 (只读，不参与构建)
├── tmux-capture/         # tmux 截图 golden 文件 + 渲染工具
├── package.json          # 根 monorepo 配置
├── tsconfig.json         # 根 TypeScript 配置
├── .npmrc                # pnpm 配置
└── ARCHITECTURE.md       # 架构设计文档
```

---

## 2. 语言与运行时

| 项目 | 规范 |
|------|------|
| 语言 | TypeScript (strict mode) |
| 运行时 | **Bun** (非 Node.js) |
| 模块系统 | ESM (`"type": "module"`) |
| 类型库 | `bun-types` ^1.1.0 |
| TypeScript | ^5.4.0 |
| 构建 | `bun build packages/*/src/index.ts --outdir=dist` |
| 类型检查 | `tsc --noEmit` |

- **关键约束**: 运行入口使用 `#!/usr/bin/env bun` shebang (见 `packages/cli/bin/flitter.ts`、`apps/flitter-cli/bin/flitter.ts`)。
- 配置于根 `package.json` 的 `"type": "module"` 和每个子包的 `"type": "module"` 确保全项目 ESM-only。

---

## 3. TypeScript 配置

根 `tsconfig.json` 路径: `/Users/bytedance/.oh-my-coco/studio/flitter/tsconfig.json`

### 3.1 严格性设置

```jsonc
{
  "compilerOptions": {
    "strict": true,                           // 启用所有严格检查
    "forceConsistentCasingInFileNames": true,  // 文件名大小写一致
    "allowJs": false,                          // 禁止 .js 文件
    "noEmit": true,                            // 仅类型检查，不产出
    "composite": true,                         // 项目引用支持
    "skipLibCheck": true                       // 跳过 .d.ts 检查
  }
}
```

### 3.2 模块解析

```jsonc
{
  "compilerOptions": {
    "lib": ["ES2023"],
    "module": "ESNext",
    "target": "ES2022",
    "moduleResolution": "bundler",   // 使用 bundler 模式解析
    "moduleDetection": "force",      // 强制将所有文件视为模块
    "jsx": "react-jsx",              // JSX 支持 (用于 TUI 框架)
    "allowSyntheticDefaultImports": true,
    "types": ["bun-types"]           // 仅注入 Bun 类型
  }
}
```

### 3.3 tmux-capture 子项目差异

`tmux-capture/tsconfig.json` 使用更激进的设置:
- `"noUncheckedIndexedAccess": true` -- 索引访问返回 `T | undefined`
- `"noImplicitOverride": true` -- 强制 `override` 关键字
- `"noFallthroughCasesInSwitch": true` -- 禁止 switch 穿透
- `"verbatimModuleSyntax": true` -- 强制 `import type` 语法
- `"allowImportingTsExtensions": true` -- 允许 `.ts` 扩展名导入

**建议**: 未来主项目 tsconfig 应对齐 tmux-capture 的更严格设置。

---

## 4. 包管理与依赖

| 配置 | 值 | 来源 |
|------|----|------|
| 包管理器 | Bun (兼容 pnpm workspace 协议) | `package.json` |
| Workspace 协议 | `"workspace:*"` | 子包 `package.json` |
| `.npmrc` | `shamefully-hoist=true`, `strict-peer-dependencies=false` | `.npmrc` |

### 4.1 Monorepo Workspace 定义

```json
// 根 package.json
{
  "workspaces": ["packages/*", "apps/*"]
}
```

### 4.2 包间依赖方向 (单向，禁止循环)

```
@flitter/schemas  (零依赖，纯类型)
       ↑
@flitter/util     (依赖 schemas)
       ↑
┌──────┼──────────────┐
│      │              │
@flitter/agent-core  @flitter/llm  @flitter/data
       ↑              ↑              ↑
       └──────┬───────┘──────────────┘
              │
       @flitter/cli  (依赖 agent-core + tui + data + llm)
              ↑
         flitter     (组装层，依赖全部)

@flitter/tui  (零内部依赖，可独立发布)
```

---

## 5. 命名规范

### 5.1 包命名

- 内部包使用 `@flitter/` scope: `@flitter/schemas`, `@flitter/util`, `@flitter/tui` 等。
- 顶层聚合包使用裸名: `flitter`。
- CLI 应用包: `flitter-cli-app` (私有，不发布)。

### 5.2 文件命名

- TypeScript 源文件: **kebab-case** (推断自逆向参考代码 `amp-cli-reversed/` 的模块命名: `cli-entrypoint.js`, `tool-execution-engine.js`, `tui-widget-framework.js` 等)。
- 包入口: `src/index.ts` (统一)。
- CLI 入口: `bin/flitter.ts`。
- 每个文件开头包含单行模块注释: `// @flitter/schemas - Data schemas`。

### 5.3 导出约定

- 每个包通过 `src/index.ts` 统一导出，配合 `package.json` 的 `exports` 字段:

```json
{
  "main": "src/index.ts",
  "types": "src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

---

## 6. 代码风格

### 6.1 格式化工具

当前状态: **无 ESLint、Prettier 或 Biome 配置**。`package.json` 中 `"lint"` 脚本为占位符:

```json
"lint": "echo 'Lint script placeholder'"
```

**事实**: 项目尚未引入任何代码格式化/静态分析工具，这是骨架阶段的预期状态。

### 6.2 观察到的风格 (来自 `tmux-capture/render.ts`)

`tmux-capture/render.ts` 是目前项目中唯一有实质实现的 TypeScript 文件，观察到的风格:

- 缩进: 2 空格。
- 字符串: 双引号 (`"`)。
- 分号: 有分号。
- 函数: 优先使用具名函数声明 (`function parseSize(...)`)。
- 类型注解: 显式标注参数和返回值类型 (`function parseSize(filename: string): { rows: number; cols: number } | null`)。
- 变量: `const` 优先, `let` 用于可变。
- 箭头函数: 用于简短的工具函数 (`const sleep = (ms: number) => ...`)。
- 错误处理: `try/finally` 确保清理; 空 `catch {}` 用于忽略已知不重要的错误。

---

## 7. 架构模式

### 7.1 分层架构

项目严格遵循分层架构 (详见 `ARCHITECTURE.md`):

```
framework → core → integration → cli
```

- **横向拆分**: 基于模块的职责和耦合度。
- **纵向分层**: 基于架构层次。
- **依赖方向**: 只允许上层依赖下层，禁止循环依赖。
- **可独立演进**: 每个 subpackage 有清晰的边界。

### 7.2 模块注释头

所有源文件以单行 `//` 注释开头，标明包名和用途:

```typescript
// @flitter/agent-core - Agent core engine
export {};
```

逆向参考代码使用更详细的模块头:

```javascript
// Module: tool-permissions
// Original: segment1[187883:202906]
// Type: Scope-hoisted
// Exports: vmR, Vf, Xf, yy, rG, ...
// Category: cli
```

### 7.3 CLI 入口模式

CLI bin 文件使用 Bun shebang + 简洁入口:

```typescript
#!/usr/bin/env bun
// @flitter/cli - CLI entry point
console.log('Flitter CLI placeholder');
```

---

## 8. 错误处理

从逆向参考代码观察到的模式:

### 8.1 自定义错误类

逆向代码使用自定义错误类 `GR` (对应某个 AppError 类)，携带退出码:

```javascript
throw new GR("Thread ID is required for durable-object-id", 1);
throw new GR(`Dump request failed (${D.status}): ${aT}`, 1);
```

### 8.2 Promise-based 错误传播

```javascript
const V = new Promise((aT, oT) => {
  B.once("error", oT);
  B.once("close", (TT) => {
    if (TT === 0) { aT(); return; }
    oT(Error(tT.trim().length > 0 ? tT.trim() : `sqlite3 exited with code ${TT}`));
  });
});
```

### 8.3 权限检查模式

权限系统使用结构化结果对象:

```javascript
const { permitted, reason, action, error, matchedEntry, source } = x;
if (!permitted) {
  if (action === "ask") { /* 请求用户批准 */ }
  if (action === "reject" && error) { /* 返回错误 */ }
}
```

---

## 9. 逆向参考代码约定

`amp-cli-reversed/` 目录包含从 Amp CLI 二进制文件逆向工程获得的 JavaScript 代码，作为开发参考。

### 9.1 模块分类

| 目录 | 类型 | 用途 |
|------|------|------|
| `app/` | scope-hoisted | 应用逻辑 (CLI, Agent, LLM, 权限) |
| `framework/` | scope-hoisted | TUI 框架 (Widget, Layout, Render) |
| `util/` | scope-hoisted | 工具模块 (HTTP, 文件扫描, Keyring) |
| `vendor/cjs/` | CJS | npm 第三方包 |
| `vendor/esm/` | ESM | ESM 第三方模块 + Schema |
| `bun-internal/` | Bun runtime | Bun 内部模块 |
| `esbuild-bundles/` | CJS bundle | esbuild 预打包模块 |

### 9.2 使用约定

- **只读参考**: 逆向代码不参与构建和测试。
- **命名映射**: 逆向模块名 (如 `tool-execution-engine`) 直接对应目标包的功能模块。
- **模块索引**: `_module-index.json` 提供所有模块的元数据索引。

---

## 10. 配置文件索引

| 文件 | 路径 | 用途 |
|------|------|------|
| 根 package.json | `package.json` | Monorepo 配置, scripts, workspace 定义 |
| 根 tsconfig.json | `tsconfig.json` | TypeScript 编译选项 |
| .npmrc | `.npmrc` | pnpm/bun 包管理配置 |
| .gitignore | `.gitignore` | Git 忽略规则 |
| ARCHITECTURE.md | `ARCHITECTURE.md` | 架构设计文档 |
| tmux tsconfig | `tmux-capture/tsconfig.json` | tmux 工具的 TS 配置 |
| GSD config | `.codex/config.toml` | GSD Agent 子代理配置 |

---

## 11. 待建立的规范 (Gap)

以下是骨架阶段尚未建立但未来必须建立的规范:

| Gap | 说明 | 优先级 |
|-----|------|--------|
| Linter | 无 ESLint/Biome 配置 | 高 |
| Formatter | 无 Prettier/Biome 配置 | 高 |
| CI/CD | 无 GitHub Actions workflow | 高 |
| Commit Convention | 无 commitlint/conventional commits 配置 | 中 |
| Import Ordering | 无自动 import 排序规则 | 中 |
| API Documentation | 无 TSDoc/JSDoc 规范文档 | 中 |
| Error Handling | 无统一的自定义 Error 类体系 | 高 |
| Logging | 无统一日志框架配置 | 中 |
