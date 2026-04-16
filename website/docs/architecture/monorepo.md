# Monorepo 架构

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
