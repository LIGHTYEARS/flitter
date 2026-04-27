# 工具系统 API

本页详细介绍 Flitter CLI 内置的工具系统。工具（Tool）是 AI 代理与外部世界交互的桥梁——每个工具封装一种能力（读写文件、搜索代码、执行命令等），通过统一接口调用。

:::tip 最常用工具
日常开发中最频繁使用的工具：
- **BashTool** -- 执行 Shell 命令
- **ReadTool / WriteTool / EditTool** -- 读取、写入、编辑文件
- **GrepTool / GlobTool** -- 搜索文件内容和文件名
- **TaskTool** -- 启动子代理执行复杂任务
:::

## Tool 接口

所有工具实现统一接口：

```ts
interface Tool {
  name: string;
  description: string;
  inputSchema: ZodSchema;
  execute(input: unknown): Promise<ToolResult>;
}

interface ToolResult {
  content: string;
  isError?: boolean;
}
```

## 内置工具（19 个）

### BashTool

执行 Shell 命令。

```ts
// 输入
{
  command: string;     // 要执行的命令
  timeout?: number;    // 超时时间（毫秒），默认 120000，最大 600000
}

// 输出：命令输出（stdout + stderr），超过 30000 字符自动截断
```

---

### ReadTool

读取文件内容。

```ts
// 输入
{
  file_path: string;   // 文件绝对路径
  offset?: number;     // 起始行号
  limit?: number;      // 读取行数
}
```

返回带行号的文件内容（cat -n 格式）。自动检测并拒绝二进制文件。

---

### WriteTool

写入文件。

```ts
// 输入
{
  file_path: string;   // 文件绝对路径
  content: string;     // 文件内容
}
```

自动创建中间目录。

---

### EditTool

精确字符串替换编辑。

```ts
// 输入
{
  file_path: string;   // 文件路径
  old_string: string;  // 要替换的原文本（必须唯一匹配）
  new_string: string;  // 替换后的新文本
  replace_all?: boolean; // 替换所有匹配项
}
```

---

### GlobTool

按模式搜索文件名。

```ts
// 输入
{
  pattern: string;     // glob 模式，如 "**/*.ts"
  path?: string;       // 搜索根目录
}
```

---

### GrepTool

搜索文件内容。

```ts
// 输入
{
  pattern: string;     // 正则表达式
  path?: string;       // 搜索目录
  glob?: string;       // 文件过滤 glob
}
```

---

### FuzzyFindTool

模糊搜索文件。多层评分策略：精确 > 前缀 > 后缀 > 子串 > 模糊。

```ts
// 输入
{
  query: string;       // 搜索关键词
  path?: string;       // 搜索目录
}
```

---

### DeleteFileTool

删除文件。删除操作被记录，可通过 `undo_edit` 撤销。

```ts
// 输入
{
  file_path: string;   // 要删除的文件路径
}
```

---

### UndoEditTool

撤销最近的文件编辑或删除操作。

```ts
// 输入
{
  file_path: string;   // 要撤销编辑的文件路径
}
```

---

### WebSearchTool

Web 搜索。

```ts
// 输入
{
  query: string;       // 搜索查询
}
```

---

### ReadWebPageTool

读取网页内容。

```ts
// 输入
{
  url: string;         // 网页 URL
}
```

---

### ReadMcpResourceTool

从指定 MCP 服务器读取资源。

```ts
// 输入
{
  server_name: string; // MCP 服务器名称
  uri: string;         // 资源 URI
}
```

---

### SkillTool

调用已注册的 Skill。

```ts
// 输入
{
  name: string;        // Skill 名称
  args?: string;       // 可选参数
}
```

---

### TaskTool

启动子代理执行复杂任务。子代理拥有独立的 ThreadWorker 和文件/搜索/Shell 工具。

```ts
// 输入
{
  description: string; // 任务描述
  prompt: string;      // 任务详细提示
}
```

---

### TaskListTool

任务规划与进度追踪。

```ts
// 输入
{
  action: 'create' | 'update' | 'list' | 'get';
  // create: { subject, description }
  // update: { taskId, status?, subject?, description? }
  // list: {}
  // get: { taskId }
}
```

---

### FindThreadTool

搜索会话线程。

```ts
// 输入
{
  query: string;       // 搜索查询
}
```

---

### ReadThreadTool

读取指定线程的内容。

```ts
// 输入
{
  thread_id: string;   // 线程 ID
}
```

---

### CodeReviewTool

结构化代码审查。

```ts
// 输入
{
  target?: string;     // 审查目标（文件路径、diff 等）
}
```

---

### FinderTool

智能多步代码搜索。组合使用 grep、glob 和文件读取，自动迭代搜索。

```ts
// 输入
{
  query: string;       // 搜索意图描述
}
```

## GitHub 工具（6 个）

### CommitSearchTool

搜索 GitHub 仓库的 Commit 历史。

```ts
// 输入
{
  repo: string;        // owner/repo 格式
  query?: string;      // 搜索关键词
  author?: string;     // 作者过滤
  path?: string;       // 文件路径过滤
}
```

---

### GlobGithubTool

按 glob 模式搜索 GitHub 仓库文件。

```ts
// 输入
{
  repo: string;        // owner/repo
  pattern: string;     // glob 模式
}
```

---

### ListDirectoryGithubTool

列出 GitHub 仓库目录内容。

```ts
// 输入
{
  repo: string;        // owner/repo
  path?: string;       // 目录路径
}
```

---

### ListRepositoriesTool

列出或搜索 GitHub 仓库。

```ts
// 输入
{
  query?: string;      // 搜索关键词
  org?: string;        // 组织过滤
  language?: string;   // 编程语言过滤
}
```

---

### ReadGithubTool

读取 GitHub 仓库中的文件内容。

```ts
// 输入
{
  repo: string;        // owner/repo
  path: string;        // 文件路径
  read_range?: string; // 行范围（如 "10-50"）
}
```

---

### SearchGithubTool

搜索 GitHub 仓库中的代码。

```ts
// 输入
{
  repo: string;        // owner/repo
  pattern: string;     // 搜索查询
  path?: string;       // 路径范围限定
}
```

## ToolRegistry

```ts
class ToolRegistry {
  register(tool: Tool): void;
  get(name: string): Tool | undefined;
  list(): Tool[];
  setCliFilters(opts: CliToolFilters): void;   // 设置工具过滤器
  getCliFilters(): CliToolFilters | undefined; // 获取当前过滤器
}

interface CliToolFilters {
  includeTools?: string[];   // 白名单——只允许这些工具
}
```

## ToolOrchestrator

编排工具的并行执行：

```ts
class ToolOrchestrator {
  // 批量执行工具调用（自动检测资源冲突）
  executeBatch(calls: ToolCall[]): Promise<ToolResult[]>;
}
```

- 检查所有批次的资源冲突（非仅最后一批）
- 支持 `preprocessArgs` 在执行前预处理工具参数
- 工具级超时守卫

## PermissionEngine

```ts
class PermissionEngine {
  check(toolName: string, input: unknown): PermissionCheckResult;
  reevaluateBlockedTools(): void;  // 配置变更后重新评估已阻塞的工具
}

// 三态决策结果
type PermissionCheckResult = 'allowed' | 'denied' | 'ask';
```

### 4 层决策层级

```
1. 守护文件检测 — 关键系统文件始终拒绝
2. 用户规则     — 配置文件中定义的 glob 模式规则
3. 默认规则     — 内置的默认权限规则
4. 回退 ask    — 以上均无匹配时，请求用户授权
```

:::warning
以上 API 签名基于源码整理。具体参数类型和默认值请参考 `packages/agent-core/src/` 中的 TypeScript 类型定义。
:::
