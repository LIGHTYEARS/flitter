# Monorepo 架构

:::info 本页面适合...
本页面适合想要深入了解 Flitter 内部架构的开发者。如果你只是使用框架构建 TUI 应用，可以跳过这部分，直接前往[教程](/tutorial/walkthroughs/build-a-dashboard)开始动手。
:::

## 设计原则

Flitter 采用以下架构分层原则：

- **横向拆分**：基于模块的职责和耦合度
- **纵向分层**：framework → core → integration → cli
- **依赖方向**：只允许上层依赖下层，禁止循环依赖
- **可独立演进**：每个包有清晰边界，可独立测试

## 架构层次

```
┌─────────────────────────────┐
│     apps/flitter-cli        │  应用层
├─────────────────────────────┤
│     @flitter/cli            │  CLI 层
├─────────────────────────────┤
│     @flitter/flitter        │  组装层（DI）
├───────────┬───────┬─────────┤
│ agent-core│  llm  │  data   │  核心层
├───────────┴───────┴─────────┤
│     @flitter/schemas        │  Schema 层
├─────────────────────────────┤
│     @flitter/util           │  工具层
├─────────────────────────────┤
│     @flitter/tui            │  框架层（独立）
└─────────────────────────────┘
```

## 包管理

使用 Bun workspaces 管理 monorepo：

:::info Bun Workspaces 与其他方案的对比
Bun workspaces 的功能类似于 npm workspaces 或 pnpm workspaces，但速度更快。如果你之前使用过 Lerna 或 Turborepo，概念是相通的——通过一个根 `package.json` 管理多个子包，子包之间可以互相引用，`bun install` 会自动建立符号链接。
:::

```json
// package.json
{
  "workspaces": ["packages/*", "apps/*"]
}
```

所有包使用 ESM（`"type": "module"`），TypeScript 严格模式。

## 组装层

`@flitter/flitter` 是 DI 组装层，提供 `ServiceContainer`：

```ts
const container = createContainer({
  configDir: '~/.flitter',
  // ...
});

// 通过 container 获取任何服务
const worker = container.threadWorker;
const config = container.configService;
```

这一层负责将所有下层包的服务组装在一起，上层（CLI）只需依赖组装层。

### 已注册的核心服务

| 服务 | 来源包 | 说明 |
|------|--------|------|
| `ConfigService` | `@flitter/data` | 多级配置管理（全局/工作区/项目） |
| `ThreadStore` | `@flitter/data` | 会话存储与持久化 |
| `ThreadWorkerService` | `@flitter/agent-core` | ThreadWorker 实例池管理 |
| `ToolRegistry` | `@flitter/agent-core` | 工具注册与查找（19 内置 + 6 GitHub） |
| `PermissionEngine` | `@flitter/agent-core` | 权限决策引擎 |
| `PluginService` | `@flitter/agent-core` | 插件发现与生命周期管理 |
| `MCPServerManager` | `@flitter/llm` | MCP 服务器连接管理 |
| `TrustStore` | `@flitter/data` | MCP 服务器信任列表 |
| `ModelFallbackChain` | `@flitter/llm` | 模型过载降级链 |
| `ThreadNavigator` | `@flitter/data` | 线程前进/后退导航 |
| `ThreadUploadManager` | `@flitter/data` | 线程上传管道 |
| `SkillService` | `@flitter/data` | Skill 发现与解析 |
| `SlashCommandRegistry` | `@flitter/cli` | 34 个斜杠命令注册表 |

## 何时需要了解这些

- **添加新功能**：了解功能应该放在哪个包中，遵循依赖方向规则
- **调试跨包问题**：理解各层之间的依赖关系，快速定位问题所在
- **贡献代码**：了解 monorepo 结构，正确创建 PR

## 常见问题

### 如何添加一个新的包？

1. 在 `packages/` 目录下创建新目录，例如 `packages/my-package`
2. 添加 `package.json`，设置 `"name": "@flitter/my-package"` 和 `"type": "module"`
3. 根 `package.json` 的 `workspaces` 配置使用通配符 `"packages/*"`，所以新包会自动被发现
4. 运行 `bun install` 建立符号链接
5. 在需要引用的包中添加依赖：`"@flitter/my-package": "workspace:*"`

### 包之间的依赖是怎么工作的？

包之间通过 `workspace:*` 协议互相引用。Bun 会自动创建符号链接，所以你在开发时修改的代码会立即生效，无需重新构建或发布。依赖方向必须从上层到下层，禁止循环依赖。

### 如何只运行某个包的测试？

```bash
# 运行指定包的测试
bun test --filter packages/tui
```
