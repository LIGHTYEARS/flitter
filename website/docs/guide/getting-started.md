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

## 运行 CLI

```bash
# 设置 API Key
export ANTHROPIC_API_KEY=your-key-here
# 或使用登录命令
bun run apps/flitter-cli/src/index.ts login

# 启动交互式 TUI 模式
bun run apps/flitter-cli/src/index.ts

# 执行单次命令
bun run apps/flitter-cli/src/index.ts --print "解释这段代码"

# 使用管道模式
echo "重构这个函数" | bun run apps/flitter-cli/src/index.ts --pipe

# 指定模型和模式
bun run apps/flitter-cli/src/index.ts --model claude-sonnet-4-6 --mode fast
```

## 常用 CLI 标志

| 标志 | 说明 |
|------|------|
| `--model <name>` | 指定 LLM 模型 |
| `--mode <mode>` | Agent 模式（smart/fast/deep/auto） |
| `--print` | 单次输出模式 |
| `--pipe` | 管道输入模式 |
| `--execute` | 执行模式 |
| `--headless` | 无头 JSON 流模式 |
| `--max-turns <n>` | 最大推理轮数 |
| `--system-prompt <text>` | 自定义系统提示词 |
| `--api-key <key>` | API Key |

## 常用子命令

```bash
flitter config get model        # 查看配置
flitter threads list             # 列出会话
flitter mcp add <name> <cmd>     # 添加 MCP 服务器
flitter permissions              # 管理权限规则
flitter tools list               # 列出可用工具
flitter plugins list             # 列出插件
```

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
