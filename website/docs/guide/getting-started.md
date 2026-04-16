# 快速开始

## 环境要求

- [Bun](https://bun.sh/) v1.1+
- Node.js 20+（可选，用于某些工具链）
- Git

## 克隆项目

```bash
git clone https://github.com/user/flitter.git
cd flitter
```

## 安装依赖

```bash
bun install
```

## 运行示例

项目提供了 9 个可运行的 TUI 示例，可以快速体验框架能力：

```bash
# 综合展示
bun run examples/tui-kitchen-sink.ts

# 交互演示（点击、悬停、状态）
bun run examples/tui-interactive-demo.ts

# 布局系统
bun run examples/tui-layout-demo.ts

# 滚动列表
bun run examples/tui-scroll-demo.ts
```

:::tip
所有示例都支持鼠标交互。确保终端支持 SGR 鼠标协议（iTerm2、kitty、WezTerm 等现代终端均支持）。
:::

## 运行测试

```bash
bun test
```

## 类型检查

```bash
bun run typecheck
```

## 代码检查

```bash
bun run check
```
