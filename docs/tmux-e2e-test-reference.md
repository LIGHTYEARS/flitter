# tmux E2E Test Reference for Interactive TUI Apps

本文档描述如何使用 tmux 对 Flitter TUI 应用进行端到端验证。
适用于任何基于 Flitter 框架的 interactive TUI App，不限于特定 example。

## 为什么需要 tmux E2E 测试

单元测试验证代码结构，tmux E2E 测试验证用户可见行为。
两者不可替代：1234 个单元测试全部通过，但 demo 点击无响应——
这种 bug 只有在真实终端中执行完整管线才能暴露。

tmux 的价值在于它提供了一个可编程的终端会话：
- 程序在真实 PTY 中运行（raw mode、SGR mouse tracking 全部生效）
- 可以通过 `send-keys` 注入任意输入（包括鼠标转义序列）
- 可以通过 `capture-pane` 快照屏幕内容进行断言

## 会话生命周期

```bash
# 1. 清理残留会话（幂等）
tmux kill-session -t "$SESSION" 2>/dev/null || true

# 2. 创建会话，指定终端尺寸，运行被测应用
#    stderr 重定向到日志文件以便事后分析
tmux new-session -d -s "$SESSION" -x 80 -y 24 \
  "bun run $APP_ENTRY 2>/tmp/$SESSION-stderr.log"

# 3. 等待首帧渲染完成
sleep 2

# 4. ... 发送输入 + 捕获屏幕（见下文）...

# 5. 清理
tmux kill-session -t "$SESSION" 2>/dev/null || true
```

**关键参数：**
- `-x 80 -y 24`：固定终端尺寸，使布局可预测、断言可复现
- `2>/tmp/...`：stderr 不干扰终端渲染，但保留调试信息
- `sleep 2`：给应用足够的初始化时间（TUI init → capability detection → first frame）

## 屏幕快照

```bash
# 捕获当前 pane 的文本内容（去除尾部空行）
tmux capture-pane -t "$SESSION" -p
```

`capture-pane -p` 输出的是 **纯文本**，不含 ANSI 转义序列。
可以直接用 `grep` 断言：

```bash
SCREEN=$(tmux capture-pane -t "$SESSION" -p)

# 断言屏幕包含预期文本
echo "$SCREEN" | grep -q "Count: 1" || { echo "FAIL: Count not updated"; exit 1; }

# 断言屏幕不包含旧文本（验证清除正确）
echo "$SCREEN" | grep -q "Count: 0" && { echo "FAIL: Stale content"; exit 1; }
```

## SGR 鼠标事件注入

Flitter 启用三层鼠标协议：`?1000h`（基础）、`?1003h`（any-event motion）、`?1006h`（SGR 扩展坐标）。
因此输入也必须使用 **SGR 格式**。

### 编码格式

```
ESC [ < Cb ; Cx ; Cy M    ← 按下 (press) / 移动 (motion)
ESC [ < Cb ; Cx ; Cy m    ← 释放 (release)
```

- `Cx`, `Cy`：**1-indexed** 坐标（终端列/行，从 1 开始）
- `Cb`：button + modifier 编码（见下表）
- `M`/`m`：大写 M = press，小写 m = release

Flitter 的 InputParser 解析后会转为 **0-indexed**（`x = Cx - 1, y = Cy - 1`）。

### Cb 编码表

| Cb 值 | 含义 | InputParser 输出 |
|-------|------|-----------------|
| 0 | 左键按下 | `button: "left", action: "press"` |
| 1 | 中键按下 | `button: "middle", action: "press"` |
| 2 | 右键按下 | `button: "right", action: "press"` |
| 32 | 左键按住移动 | `button: "left", action: "move"` |
| 35 | 无按键移动 | `button: "none", action: "move"` |
| 64 | 滚轮上 | `action: "wheel_up"` |
| 65 | 滚轮下 | `action: "wheel_down"` |

修饰键通过 bit-or 叠加：Shift=4, Alt=8, Ctrl=16。

### tmux send-keys 发送方式

```bash
# 左键按下 at (col=10, row=5)，1-indexed
tmux send-keys -t "$SESSION" -- $'\x1b[<0;10;5M'

# 左键释放 at (col=10, row=5)
tmux send-keys -t "$SESSION" -- $'\x1b[<0;10;5m'

# 鼠标移动（无按键）at (col=20, row=8)
tmux send-keys -t "$SESSION" -- $'\x1b[<35;20;8M'

# 滚轮上 at (col=15, row=10)
tmux send-keys -t "$SESSION" -- $'\x1b[<64;15;10M'
```

**注意：** 使用 `$'\x1b...'`（bash ANSI-C quoting）而不是 `\e` 或 `Escape`。
`send-keys` 不加 `-l` 标志时会解释特殊键名；`$'\x1b'` 直接发送原始字节，最可靠。

### 等待帧渲染

鼠标事件注入后，需要等待 Flitter 完成一个帧周期（build → layout → paint → render）：

```bash
tmux send-keys -t "$SESSION" -- $'\x1b[<0;10;5M'
sleep 0.5   # 帧间隔 16ms，0.5s 足够完成多轮帧
SCREEN=$(tmux capture-pane -t "$SESSION" -p)
```

`sleep 0.5` 是安全余量。Flitter 的 FrameScheduler 最小帧间隔 16ms，
但 setState → requestFrame → setTimeout → executeFrame 的完整链路
在 Node.js event loop 中可能跨多个 tick。

## 常见验证场景

### Click → setState → UI 更新

```bash
# 初始状态
BEFORE=$(tmux capture-pane -t "$SESSION" -p)
echo "$BEFORE" | grep -q "count: 0"

# 点击按钮区域
tmux send-keys -t "$SESSION" -- $'\x1b[<0;15;8M'
sleep 0.5

# 验证更新
AFTER=$(tmux capture-pane -t "$SESSION" -p)
echo "$AFTER" | grep -q "count: 1"
```

### Hover → enter/exit 状态变化

```bash
# 移入区域
tmux send-keys -t "$SESSION" -- $'\x1b[<35;15;8M'
sleep 0.5
tmux capture-pane -t "$SESSION" -p | grep -q "Entered"

# 移出区域（移到远离的位置）
tmux send-keys -t "$SESSION" -- $'\x1b[<35;1;1M'
sleep 0.5
tmux capture-pane -t "$SESSION" -p | grep -q "Exited"
```

### 多次点击递增

```bash
for i in 1 2 3; do
  tmux send-keys -t "$SESSION" -- $'\x1b[<0;15;8M'
  sleep 0.3
done
sleep 0.3
tmux capture-pane -t "$SESSION" -p | grep -q "count: 3"
```

### 键盘退出 + 终端恢复

```bash
tmux send-keys -t "$SESSION" -- 'q'
sleep 1
# 检查进程已退出（pane 不再运行）
tmux list-panes -t "$SESSION" -F '#{pane_dead}' | grep -q '1'
```

## 定位坐标

`capture-pane -p` 输出的行号从 0 开始，但 SGR 坐标是 1-indexed。
确定按钮坐标的方法：

```bash
# 打印带行号的屏幕内容
tmux capture-pane -t "$SESSION" -p | cat -n
```

输出示例：
```
     1   Flitter TUI Interactive Demo
     2
     3    Last event: None yet
     4
     5    ╭──────────╮
     6    │ Click Me │    ← 目标行：cat -n 行号 6 → SGR Cy = 6
     7    ╰──────────╯
```

按钮 "Click Me" 文字从第 5 列开始 → SGR Cx = 5。
所以 press 命令为 `$'\x1b[<0;5;6M'`。

**提示：** 如果无法确定精确坐标，先 `capture-pane` 数行数和列数，
注意 box-drawing 字符（`╭│╰` 等）每个占 1 列宽。

## 调试管线断裂

当 tmux E2E 测试失败时，按以下顺序排查：

| 阶段 | 检查方法 | 正常表现 |
|------|---------|---------|
| 1. 原始输入 | 在 ttyInput 的 stream 上挂 data listener，打印 hex | 收到 `1b5b3c...` 序列 |
| 2. 事件解析 | monkey-patch `InputParser.feed`，打印调用 | `feed()` 被调用，长度匹配 |
| 3. 鼠标分发 | monkey-patch `MouseManager.handleMouseEvent` | 收到 `action=press, x=..., y=...` |
| 4. 回调触发 | 在 onClick/onTap 中打印 | `onTap called` |
| 5. setState | 在 setState 回调中打印 | 状态值变化 |
| 6. 帧调度 | monkey-patch `FrameScheduler.requestFrame` | `requestFrame()` 被调用 |
| 7. build | monkey-patch `BuildOwner.buildScopes` | `dirty > 0`，`build()` 被调用 |
| 8. paint/render | monkey-patch `WidgetsBinding.paint`/`render` | `shouldPaint=true`，`didPaint=true` |
| 9. 屏幕输出 | `capture-pane` 对比 | 文本发生变化 |

所有调试输出写到 **stderr**（`console.error`），不干扰终端渲染。
tmux 启动时 `2>/tmp/xxx.log` 已经把 stderr 导出到文件。

**关键陷阱：** `TtyInputSource.on("data", handler)` 是赋值而非追加。
如果你在调试时调用 `ttyInput.on("data", debugHandler)`，
会 **覆盖** TuiController 注册的 handler，导致事件不再被解析。
调试时应直接在底层 `ttyInput.stdin`（原生 ReadStream）上用 `.on("data", ...)` 追加 listener。
