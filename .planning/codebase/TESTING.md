# Flitter Monorepo -- 测试规范

> 基于对代码库的全量分析生成。最后更新: 2026-04-12

---

## 1. 当前状态概述

Flitter 处于 **早期骨架阶段**。测试基础设施已在根 `package.json` 中声明，但尚无任何测试文件存在。本文档记录了当前已配置的内容、从项目上下文推导出的测试策略，以及未来需要建立的测试体系。

### 关键事实

| 项目 | 状态 |
|------|------|
| 测试框架 | **Bun 内置测试运行器** (`bun test`) |
| 测试文件数量 | **0** (全项目无 `*.test.ts` 或 `*.spec.ts`) |
| 测试脚本 | `"test": "bun test"` (根 `package.json`) |
| 覆盖率配置 | 无 |
| CI 流水线 | 无 (无 `.github/workflows/` 目录) |
| Mock 框架 | 无显式配置 (Bun 内置 `mock` 可用) |
| E2E / 集成测试 | 无 |
| 视觉回归测试 | **有** -- tmux golden 文件 (仅用于逆向参考对比) |

---

## 2. 测试框架: Bun Test

### 2.1 配置

根 `package.json` (`/Users/bytedance/.oh-my-coco/studio/flitter/package.json`):

```json
{
  "scripts": {
    "test": "bun test"
  },
  "devDependencies": {
    "bun-types": "^1.1.0"
  }
}
```

`bun test` 是 Bun 的内置测试运行器，默认行为:
- 自动发现匹配 `*.test.{ts,tsx,js,jsx}` 和 `*.spec.{ts,tsx,js,jsx}` 的文件。
- 支持 `describe`, `it`, `test`, `expect` API (兼容 Jest)。
- 支持 `beforeAll`, `afterAll`, `beforeEach`, `afterEach` 生命周期钩子。
- 内置 snapshot 测试、mock/spy 功能。
- 内置 `--coverage` 选项。

### 2.2 TypeScript 排除

根 `tsconfig.json` 显式排除测试文件:

```json
{
  "exclude": ["node_modules", "amp-cli-reversed", "**/*.test.ts"]
}
```

这确保测试文件不参与生产构建的类型检查，但 `bun test` 仍然可以直接运行 `.test.ts` 文件。

---

## 3. 推荐的测试结构

基于项目的 monorepo 架构和分层设计，推荐以下测试文件组织方式:

### 3.1 文件位置 -- Co-location 模式

```
packages/<pkg>/
├── src/
│   ├── index.ts
│   ├── foo.ts
│   └── foo.test.ts          # 单元测试与源文件并列
├── __tests__/
│   └── integration.test.ts   # 集成测试 (跨模块)
└── package.json
```

### 3.2 文件命名

| 测试类型 | 命名模式 | 示例 |
|----------|----------|------|
| 单元测试 | `<module>.test.ts` | `tool-executor.test.ts` |
| 集成测试 | `<feature>.integration.test.ts` | `mcp-flow.integration.test.ts` |
| E2E 测试 | `<scenario>.e2e.test.ts` | `cli-startup.e2e.test.ts` |

### 3.3 按包分层

```
packages/schemas/src/        # 纯类型，测试量最少 (schema 验证测试)
packages/util/src/           # 工具函数，测试量最大 (纯函数，易测)
packages/tui/src/            # Widget 测试 (渲染测试 + golden file)
packages/agent-core/src/     # Agent 逻辑 (需要 mock LLM)
packages/llm/src/            # LLM 集成 (需要 mock HTTP)
packages/data/src/           # 数据层 (需要 mock 文件系统)
packages/cli/src/            # CLI 命令 (进程级集成测试)
apps/flitter-cli/            # E2E 测试 (完整 CLI 流程)
```

---

## 4. Bun Test API 参考

### 4.1 基础测试

```typescript
import { describe, it, expect, beforeEach, afterEach } from "bun:test";

describe("ToolExecutor", () => {
  let executor: ToolExecutor;

  beforeEach(() => {
    executor = new ToolExecutor();
  });

  it("should execute a tool and return result", () => {
    const result = executor.run("echo", ["hello"]);
    expect(result.exitCode).toBe(0);
  });

  it("should throw on unknown tool", () => {
    expect(() => executor.run("nonexistent", [])).toThrow();
  });
});
```

### 4.2 Mock / Spy

Bun 内置 `mock` 和 `spyOn`:

```typescript
import { mock, spyOn } from "bun:test";

// 创建 mock 函数
const mockFetch = mock(() => Promise.resolve(new Response("ok")));

// Spy on 对象方法
const spy = spyOn(console, "log");
console.log("test");
expect(spy).toHaveBeenCalledWith("test");
```

### 4.3 Snapshot 测试

```typescript
import { expect, it } from "bun:test";

it("should match snapshot", () => {
  const output = renderWidget(new TextWidget("hello"));
  expect(output).toMatchSnapshot();
});
```

### 4.4 异步测试

```typescript
import { it, expect } from "bun:test";

it("should fetch data", async () => {
  const response = await fetch("https://api.example.com/data");
  expect(response.ok).toBe(true);
});
```

---

## 5. 视觉回归测试 -- tmux Golden Files

### 5.1 概述

`tmux-capture/` 目录包含一套 tmux 屏幕截图的 golden file 测试系统，用于将 Flitter 的 TUI 输出与 Amp CLI 的参考输出进行视觉对比。

### 5.2 Golden 文件结构

```
tmux-capture/
├── screens/
│   └── amp/
│       ├── welcome/
│       │   ├── ansi-63x244.golden      # ANSI 转义序列原始输出
│       │   ├── plain-63x244.golden     # 纯文本输出
│       │   └── screenshot-63x244.png    # 渲染后的 PNG 截图
│       ├── conversation-reply/
│       ├── input-with-message/
│       ├── streaming-with-subagent/
│       ├── subagent-in-progress/
│       ├── hitl-confirmation/
│       ├── skills-popup/
│       ├── shortcuts-popup/
│       └── slash-command-popup/
├── render.ts                # 渲染脚本 (Bun + Vite + agent-browser)
├── viewer.html              # xterm.js 查看器
├── package.json             # 独立依赖 (xterm, vite)
└── tsconfig.json
```

### 5.3 Golden 文件命名规范

- ANSI 输出: `ansi-{rows}x{cols}.golden` (如 `ansi-63x244.golden`)
- 纯文本: `plain-{rows}x{cols}.golden`
- 截图: `screenshot-{rows}x{cols}.png`

文件名中的尺寸格式为 `{rows}x{cols}`，由 `render.ts` 中的 `parseSize()` 函数解析。

### 5.4 渲染流程

`tmux-capture/render.ts` (`/Users/bytedance/.oh-my-coco/studio/flitter/tmux-capture/render.ts`) 实现了自动化渲染:

1. 扫描 `screens/` 目录下所有 `ansi-*.golden` 文件。
2. 启动 Vite 开发服务器 (端口 18765)。
3. 对每个 golden 文件:
   - 通过 `agent-browser` 打开 xterm.js viewer，加载 ANSI 数据。
   - 等待 `window.__XTERM_READY === true` 信号。
   - 截取全屏截图保存为 PNG。

### 5.5 涵盖的测试场景 (9 个)

| 场景 | 目录 | 描述 |
|------|------|------|
| welcome | `screens/amp/welcome/` | 欢迎屏幕 |
| conversation-reply | `screens/amp/conversation-reply/` | 对话回复 |
| input-with-message | `screens/amp/input-with-message/` | 带消息的输入 |
| streaming-with-subagent | `screens/amp/streaming-with-subagent/` | 子代理流式输出 |
| subagent-in-progress | `screens/amp/subagent-in-progress/` | 子代理进行中 |
| hitl-confirmation | `screens/amp/hitl-confirmation/` | HITL 确认弹窗 |
| skills-popup | `screens/amp/skills-popup/` | 技能选择弹窗 |
| shortcuts-popup | `screens/amp/shortcuts-popup/` | 快捷键弹窗 |
| slash-command-popup | `screens/amp/slash-command-popup/` | 斜杠命令弹窗 |

---

## 6. 覆盖率

### 6.1 当前状态

无覆盖率配置。`.gitignore` 中包含 `coverage/` 目录排除，暗示未来计划使用覆盖率:

```
coverage/
```

### 6.2 推荐配置

Bun 内置覆盖率支持:

```bash
# 运行测试并生成覆盖率
bun test --coverage

# 指定覆盖率阈值 (建议)
bun test --coverage --coverage-threshold 80
```

未来可在根 `package.json` 中添加:

```json
{
  "scripts": {
    "test": "bun test",
    "test:coverage": "bun test --coverage"
  }
}
```

---

## 7. CI 流水线

### 7.1 当前状态

**无 CI 配置**。无 `.github/workflows/` 目录、无 `.gitlab-ci.yml`、无其他 CI 配置文件。

### 7.2 推荐的 CI 流水线 (Bun + GitHub Actions)

```yaml
# .github/workflows/ci.yml (建议)
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install
      - run: bun run typecheck
      - run: bun run lint
      - run: bun test --coverage
```

---

## 8. 按包的测试策略

### 8.1 `@flitter/schemas`

- **测试类型**: Schema 验证测试
- **测试内容**: Zod schema 解析正确性、边界值、错误消息
- **Mock 需求**: 无 (纯数据验证)

### 8.2 `@flitter/util`

- **测试类型**: 单元测试 (最高覆盖率目标)
- **测试内容**: HTTP 工具函数、文件扫描、JSON 验证、流处理
- **Mock 需求**: 文件系统 (`mock()`), 网络请求 (`mock()`)

### 8.3 `@flitter/tui`

- **测试类型**: Widget 单元测试 + 渲染快照测试
- **测试内容**: Widget 树构建、布局计算、渲染输出
- **Mock 需求**: 终端尺寸、输入事件
- **特殊**: 可与 tmux golden file 测试结合

### 8.4 `@flitter/agent-core`

- **测试类型**: 单元测试 + 集成测试
- **测试内容**: 工具执行引擎、Prompt 路由、权限检查
- **Mock 需求**: LLM 响应、工具执行结果

### 8.5 `@flitter/llm`

- **测试类型**: 集成测试 (mock HTTP)
- **测试内容**: Provider SDK 调用、MCP 协议通信、OAuth 流程
- **Mock 需求**: HTTP 请求/响应、WebSocket 连接

### 8.6 `@flitter/data`

- **测试类型**: 单元测试
- **测试内容**: 线程持久化、配置读写、Skill 加载
- **Mock 需求**: 文件系统、SQLite 连接

### 8.7 `@flitter/cli`

- **测试类型**: 集成测试 + E2E 测试
- **测试内容**: 命令解析、REPL 交互、进程管理
- **Mock 需求**: stdin/stdout、子进程

### 8.8 `apps/flitter-cli`

- **测试类型**: E2E 冒烟测试
- **测试内容**: CLI 启动、基本命令执行、退出码
- **Mock 需求**: 最少 (真实环境测试)

---

## 9. GAP 分析检查清单

`.gaps/v0.4.0/` (`/Users/bytedance/.oh-my-coco/studio/flitter/.gaps/v0.4.0/`) 目录包含基于 tmux 截图对比的功能 GAP 检查清单，记录了 Flitter 与 Amp 之间的视觉和功能差异。这不是自动化测试，而是手动 UAT 验证跟踪。

### 9.1 检查方法

- **对比基准**: tmux capture-pane (244x63) 截图
- **对比场景**: 9 个 AMP golden scene
- **验证方法**: 逐场景目视 + 运行时行为验证

### 9.2 已记录的 GAP 类别

| 严重级别 | 前缀 | 示例 |
|----------|------|------|
| Critical | GAP-C* | DensityOrb 渲染、Footer 状态栏、API provider |
| Major | GAP-M* | (未从已读取的内容中提取) |
| Minor | GAP-m* | 密度层级、页脚隐藏逻辑 |

---

## 10. 待建立的测试体系 (Gap)

| Gap | 说明 | 优先级 |
|-----|------|--------|
| 单元测试 | 全项目无任何 `*.test.ts` 文件 | 紧急 |
| 覆盖率门限 | 无覆盖率阈值配置 | 高 |
| CI 流水线 | 无自动化测试运行 | 高 |
| Snapshot 基线 | TUI 包无渲染快照基线 | 高 |
| Mock 策略 | 无统一的 mock 工厂或 fixture 模式 | 中 |
| 测试辅助库 | 无共享的测试工具 (如 `@flitter/test-utils`) | 中 |
| E2E 框架 | 无 CLI E2E 测试框架选型 | 中 |
| 性能基准 | 无基准测试 (benchmark) | 低 |
| Golden 自动化 | tmux golden 对比尚未集成到 CI | 低 |
