# 工具系统 API

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

## 内置工具

### BashTool

执行 Shell 命令。

```ts
// 输入
{
  command: string;     // 要执行的命令
  timeout?: number;    // 超时时间（毫秒）
}

// 输出
{
  content: string;     // 命令输出（stdout + stderr）
}
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

---

### EditTool

精确字符串替换编辑。

```ts
// 输入
{
  file_path: string;   // 文件路径
  old_string: string;  // 要替换的原文本
  new_string: string;  // 替换后的新文本
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

模糊搜索文件。

```ts
// 输入
{
  query: string;       // 搜索关键词
  path?: string;       // 搜索目录
}
```

## ToolRegistry

```ts
class ToolRegistry {
  register(tool: Tool): void;
  get(name: string): Tool | undefined;
  list(): Tool[];
}
```

## PermissionEngine

```ts
class PermissionEngine {
  check(toolName: string, input: unknown): PermissionResult;
}

type PermissionResult =
  | { allowed: true }
  | { allowed: false; reason: string };
```
