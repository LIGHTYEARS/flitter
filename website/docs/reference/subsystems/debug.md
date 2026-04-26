# Debug 子系统

> 结构化日志、Widget 树快照与 Unix socket REPL 调试工具。

---

## Logger

> 结构化分级日志单例，所有输出写入 stderr，不干扰终端渲染。

逆向自 amp `Sb`（ScopedLogger）。

**获取单例**

```ts
import { logger } from "@flitter/tui";
```

**方法**

| 方法 | 说明 |
|------|------|
| `debug(msg, ...args)` | DEBUG 级别日志 |
| `info(msg, ...args)` | INFO 级别日志（默认最低级别） |
| `warn(msg, ...args)` | WARN 级别日志 |
| `error(msg, ...args)` | ERROR 级别日志 |
| `scoped(name)` | 返回带前缀的子 Logger |

**创建作用域子 Logger**

```ts
const log = logger.scoped("frame");
log.debug("executeFrame START");
// 输出: [frame] executeFrame START

// 嵌套作用域
const subLog = log.scoped("paint");
subLog.info("painting");
// 输出: [frame.paint] painting
```

---

## LogLevel

> 通过环境变量 `FLITTER_LOG_LEVEL` 控制日志级别。

```ts
type LogLevel = "debug" | "info" | "warn" | "error"
```

| 级别 | 数值 | 说明 |
|------|------|------|
| `error` | 0 | 仅错误 |
| `warn` | 1 | 警告及以上 |
| `info` | 2 | 信息及以上（**默认**） |
| `debug` | 3 | 全量日志 |

**启用 debug 日志**

```bash
FLITTER_LOG_LEVEL=debug bun run app.ts
```

---

## LogBackend

> 自定义日志后端接口。

```ts
interface LogBackend {
  error(msg: string, ...args: unknown[]): void;
  warn(msg: string, ...args: unknown[]): void;
  info(msg: string, ...args: unknown[]): void;
  debug(msg: string, ...args: unknown[]): void;
}
```

默认后端将所有级别写入 `console.error`（stderr）。可在初始化前替换为自定义实现（例如写入文件）：

```ts
import { Logger } from "@flitter/tui";

const fileLogger = new Logger({
  backend: myFileBackend,
  level: "debug",
});
```

---

## 内置日志频道

各子系统使用以下作用域前缀：

| 前缀 | 来源 |
|------|------|
| `[input]` | InputParser — 键盘/鼠标事件解析 |
| `[mouse]` | MouseManager — 命中测试与事件分发 |
| `[build]` | BuildOwner — 脏元素调度与重建 |
| `[frame]` | FrameScheduler — 帧执行时序 |
| `[paint]` | WidgetsBinding — 绘制阶段 |
| `[tui]` | TuiController — 终端尺寸与初始化 |
| `[widget-repl]` | WidgetREPLServer — REPL 连接 |

---

## WidgetTreeDebugger

> HTTP 服务器，提供 Widget 树的 JSON 快照接口。

逆向自 amp `aA`。

**端点**

| 路径 | 说明 |
|------|------|
| `GET /widget-tree` | 返回 `WidgetTreeSnapshot` JSON |
| `GET /focus-tree` | 返回焦点树 JSON |
| `GET /health` | 健康检查 |

**WidgetTreeSnapshot**

```ts
interface WidgetTreeSnapshot {
  timestamp: number;
  rootWidget: WidgetDebugInfo | null;
  rootElement: ElementDebugInfo | null;
  rootRenderObject: RenderTreeDebugInfo | null;
  recentKeystrokes: KeystrokeRecord[];
}
```

**WidgetDebugInfo**

```ts
interface WidgetDebugInfo {
  id: string;
  type: string;
  key: string | undefined;
  depth: number;
  renderObject: RenderObjectDebugInfo | undefined;
  children: WidgetDebugInfo[];
}
```

**RenderObjectDebugInfo**

```ts
interface RenderObjectDebugInfo {
  type: string;
  properties: Record<string, unknown>;
}
```

---

## WidgetREPLServer

> Unix socket REPL，运行时检查 Widget 树。

逆向自 amp `2649_unknown_WidgetREPLServer`。

**连接方式**

```bash
nc -U /tmp/flitter-widget-repl-<pid>.sock
```

连接后 `$` 变量暴露 `WidgetDebugAPI` 实例。

**WidgetDebugAPI (`$`) 方法**

| 方法 | 说明 |
|------|------|
| `$.tree(maxDepth?)` | 输出 Widget 树的缩进文本表示 |
| `$.findByType(name)` | 按 Widget 类型名（大小写不敏感）查找 Element 列表 |
| `$.getFirstByType(name)` | 返回第一个匹配的 Element |
| `$.getState(element)` | 获取 StatefulElement 的 State 实例 |
| `$.getStateOf(typeName)` | 组合查找并获取 State |
| `$.props(element)` | 获取 Widget 的非函数、非私有属性 |

**示例 REPL 会话**

```
> $.tree()
MyApp
  Column
    Text [dirty]
    Button [S]

> $.getStateOf("Button")
ButtonState { pressed: false, label: "Click me" }

> $.findByType("text").length
3
```
