# 快速开始

> 这一页将带你从零开始，完成 Flitter 的安装和第一次运行。大约需要 5 分钟。

## 你将学到什么

完成本页后，你将能够：

- 在本地运行 Flitter 的 TUI 示例程序
- 启动 Flitter CLI 的交互式 AI 助手
- 了解常用的 CLI 命令和标志

## 环境要求

在开始之前，请确保你的开发环境已安装以下工具：

- **[Bun](https://bun.sh/) v1.1+** —— Flitter 的运行时环境（类似于 Node.js，但原生支持 TypeScript）
- **Git** —— 用于克隆代码仓库
- Node.js 20+（可选，某些工具链可能需要）

:::tip 为什么用 Bun 而不是 Node.js？
Bun 可以直接运行 TypeScript 文件，无需编译步骤。这意味着你克隆项目后就能直接运行，开发体验更流畅。如果你还没有安装 Bun，可以通过以下命令一键安装：

```bash
curl -fsSL https://bun.sh/install | bash
```
:::

## 第一步：克隆项目

首先，将 Flitter 代码仓库克隆到本地：

```bash
git clone https://github.com/user/flitter.git
cd flitter
```

## 第二步：安装依赖

Flitter 是一个 monorepo（单仓多包）项目，`bun install` 会一次性安装所有子包的依赖：

```bash
bun install
```

:::info 安装完成后你会看到什么？
安装成功后，终端会显示类似以下输出：

```
bun install v1.x.x
 + @flitter/tui@workspace:packages/tui
 + @flitter/agent-core@workspace:packages/agent-core
 ...
 xxx packages installed [x.xxs]
```

如果看到依赖数量和耗时信息，说明安装成功。
:::

:::warning 安装遇到问题？
- **网络超时**：尝试设置镜像源 `bun install --registry https://registry.npmmirror.com`
- **权限错误**：确保对项目目录有写入权限，避免使用 `sudo`
- **Bun 版本过低**：运行 `bun --version` 确认版本 >= 1.1，否则运行 `bun upgrade` 升级
:::

## 第三步：运行 TUI 示例

项目提供了 9 个可运行的 TUI 示例，让你快速体验框架能力。先从综合展示开始：

```bash
# 综合展示 —— 一次看到所有核心组件
bun run examples/tui-kitchen-sink.ts
```

你会在终端中看到一个完整的 UI 界面，包含文本、布局、交互组件等。**试试用鼠标点击和滚动！**

更多示例可以逐个体验：

```bash
# 交互演示 —— 点击、悬停、状态变化
bun run examples/tui-interactive-demo.ts

# 布局系统 —— Column、Row、Flex 等布局组件
bun run examples/tui-layout-demo.ts

# 滚动列表 —— ListView 和滚动物理效果
bun run examples/tui-scroll-demo.ts
```

:::tip 关于终端兼容性
所有示例都支持鼠标交互。确保你使用的是支持 SGR 鼠标协议的现代终端 —— iTerm2、kitty、WezTerm、Windows Terminal 等都支持。macOS 自带的 Terminal.app 对鼠标支持有限。

按 `Ctrl+C` 可以退出任何示例程序。
:::

## 第四步：运行 CLI（AI 编程助手）

Flitter 的核心功能之一是作为 AI 编程助手运行。要使用这个功能，需要先配置 LLM API Key。

### 配置 API Key

```bash
# 方式一：设置环境变量（推荐试用时使用）
export ANTHROPIC_API_KEY=your-key-here

# 方式二：使用登录命令（会将凭证安全存储到本地）
bun run apps/flitter-cli/src/index.ts login
```

### 启动交互式模式

配置好 API Key 后，直接运行即可进入交互式 TUI 界面：

```bash
bun run apps/flitter-cli/src/index.ts
```

这会启动一个类似 Claude Code 的交互式终端界面，你可以直接与 AI 对话、执行代码操作。

### 其他运行模式

除了交互式模式，Flitter CLI 还支持多种使用方式：

```bash
# 单次输出模式 —— 问一个问题，得到答案后退出
bun run apps/flitter-cli/src/index.ts --print "解释这段代码"

# 管道模式 —— 将文件内容通过管道传给 AI
echo "重构这个函数" | bun run apps/flitter-cli/src/index.ts --pipe

# 指定模型和模式
bun run apps/flitter-cli/src/index.ts --model claude-sonnet-4-6 --mode fast
```

## 常用 CLI 标志

| 标志 | 说明 | 使用场景 |
|------|------|---------|
| `--model <name>` | 指定 LLM 模型 | 想用特定模型时 |
| `--mode <mode>` | Agent 模式（smart / fast / deep / auto） | 调整响应速度和质量的平衡 |
| `--print` | 单次输出模式 | 脚本集成、快速提问 |
| `--pipe` | 管道输入模式 | 将文件或命令输出传给 AI |
| `--execute` | 执行模式 | 让 AI 自主完成任务 |
| `--headless` | 无头 JSON 流模式 | 程序化集成 |
| `--max-turns <n>` | 最大推理轮数 | 控制 AI 的自主操作次数 |
| `--system-prompt <text>` | 自定义系统提示词 | 定制 AI 的行为方式 |
| `--api-key <key>` | API Key | 临时使用不同的 API Key |

## 常用子命令

在项目中你可能会频繁用到这些子命令：

```bash
flitter config get model        # 查看当前使用的模型
flitter threads list             # 列出所有历史会话
flitter mcp add <name> <cmd>     # 添加一个 MCP 服务器
flitter permissions              # 管理工具权限规则
flitter tools list               # 查看所有可用工具
flitter plugins list             # 查看已安装的插件
```

## 开发相关命令

如果你想参与 Flitter 的开发或者修改源码，以下命令会很有用：

```bash
# 运行所有测试
bun test

# TypeScript 类型检查
bun run typecheck

# 代码风格检查（使用 Biome）
bun run check
```

:::warning 类型检查不通过？
如果 `bun run typecheck` 报错，通常是因为依赖没有正确安装。尝试删除 `node_modules` 后重新安装：

```bash
rm -rf node_modules
bun install
```
:::

## 下一步

恭喜你完成了第一次运行！接下来可以：

- **[项目结构](./project-structure.md)** —— 了解代码仓库的组织方式，找到你关心的模块
- **[示例程序](./examples.md)** —— 深入浏览 11 个 TUI 示例，学习各种组件的用法
- **[TUI 框架参考](../reference/overview.md)** —— 查阅 API 文档，开始构建自己的终端应用
