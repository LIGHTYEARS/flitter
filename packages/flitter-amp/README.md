# flitter-amp

An ACP (Agent Client Protocol) client TUI that replicates the [Amp CLI](https://ampcode.com/) visual experience, built on [flitter-core](../flitter-core/).

## Quick Start

```bash
cd packages/flitter-amp

# Run with default agent (claude --agent)
bun run src/index.ts

# Specify a different agent
bun run src/index.ts --agent "coco acp serve"

# Use Gemini CLI
bun run src/index.ts --agent "gemini --experimental-acp"

# Set working directory
bun run src/index.ts --cwd /path/to/project

# Or use the npm script
pnpm start -- --agent "coco acp serve"
```

> **Note:** Run from the `packages/flitter-amp` directory (or use `pnpm --filter flitter-amp start`), not from the monorepo root.

## CLI Options

| Option | Default | Description |
|--------|---------|-------------|
| `--agent <cmd>` | `"claude --agent"` | Agent command to spawn |
| `--cwd <dir>` | `.` | Working directory for the session |
| `--expand` | off | Expand tool call details by default |
| `--debug` | off | Enable debug logging |
| `--resume [id]` | off | Resume the most recent session (or a specific session ID) |
| `--list-sessions` | off | Print recent sessions and exit |
| `--export <fmt>` | off | Export most recent session to `session-export.<fmt>` and exit (`json`/`md`/`txt`) |
| `--help` | — | Show help message |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+Enter` | Submit prompt |
| `Ctrl+C` | Cancel current operation / exit |
| `Ctrl+L` | Clear conversation |
| `Ctrl+O` | Open command palette |
| `Ctrl+G` | Open prompt in $EDITOR |
| `Ctrl+R` | Navigate prompt history (backward) |
| `Ctrl+S` | Navigate prompt history (forward) |
| `Alt+T` | Toggle tool call expansion |
| `Escape` | Dismiss open overlay |

## Command Palette (Ctrl+O)

| Command | Description |
|---------|-------------|
| Clear conversation | Remove all messages (Ctrl+L) |
| Toggle tool calls | Expand/collapse all tool blocks (Alt+T) |
| Toggle thinking | Expand/collapse all thinking blocks |

## Configuration

Optional config file at `~/.flitter-amp/config.json`:

```json
{
  "agent": "claude --agent",
  "editor": "nvim",
  "cwd": "/default/project/path",
  "expandToolCalls": false,
  "historySize": 100,
  "historyFile": "~/.flitter/prompt_history",
  "sessionRetentionDays": 30,
  "logRetentionDays": 7,
  "logLevel": "info"
}
```

CLI flags override config file values. Config file is entirely optional — all settings have sensible defaults.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `agent` | string | `"claude --agent"` | Agent command |
| `editor` | string | `$EDITOR` / `$VISUAL` / `vi` | External editor for Ctrl+G |
| `cwd` | string | current dir | Working directory |
| `expandToolCalls` | boolean | `false` | Expand tool blocks by default |
| `historySize` | number | `100` | Max prompt history entries |
| `historyFile` | string | `~/.flitter/prompt_history` | Prompt history file path |
| `sessionRetentionDays` | number | `30` | Days to keep session files (`0` = keep forever) |
| `logRetentionDays` | number | `7` | Days to keep log files (`0` = keep forever) |
| `logLevel` | string | `"info"` | Log level: debug/info/warn/error |

## 测试（Unit → Integration → E2E）

从 monorepo 根目录运行：

```bash
# 全量测试
pnpm test

# 仅 flitter-amp
pnpm --filter flitter-amp test

# 仅 e2e（tmux 伪 TTY）
cd packages/flitter-amp
bun test src/__tests__/e2e-tmux-welcome.test.ts
```

E2E 依赖 `tmux`（本机安装即可）。

## 本地 E2E 手动运行（tmux 场景）

```bash
cd packages/flitter-amp

# 启动真实 TUI（无 agent 连接，预置场景数据）
bun run src/test-utils/tmux-harness.ts --scenario welcome
```

## Architecture

```
packages/flitter-amp/src/
├── index.ts              # Entry point — bootstrap, connect, start TUI
├── app.ts                # Root widget tree, keyboard handlers, overlays
├── acp/
│   ├── client.ts         # ACP protocol client with callbacks
│   ├── connection.ts     # Agent connection management
│   ├── graceful-shutdown.ts # SIGINT/SIGTERM cleanup sequence
│   ├── heartbeat-monitor.ts # Keepalive + health transitions
│   ├── reconnection-manager.ts # Backoff-based reconnection
│   └── types.ts          # ACP type definitions
├── state/
│   ├── app-state.ts      # Global state (connection, error, permissions)
│   ├── config.ts         # CLI args + config file parsing
│   ├── conversation.ts   # Conversation items (messages, tools, plans)
│   ├── history.ts        # Prompt history with cursor navigation
│   ├── overlay-manager.ts # Overlay stack + dismiss rules
│   └── session-store.ts  # Session persistence (save/load/list/prune)
├── utils/
│   ├── editor.ts         # $EDITOR integration (temp file workflow)
│   ├── logger.ts         # Leveled logging
│   └── process.ts        # Agent subprocess management
└── widgets/
    ├── chat-view.ts       # Scrollable conversation with error banner
    ├── command-palette.ts # Ctrl+O action selector
    ├── diff-card.ts       # Unified diff rendering
    ├── file-picker.ts     # @file mention selector
    ├── input-area.ts      # Bordered text input
    ├── bottom-grid.ts     # Bottom status + mode indicators
    ├── permission-dialog.ts # Agent permission request modal
    ├── plan-view.ts       # Plan checklist display
    ├── thinking-block.ts  # Collapsible thinking sections
    └── tool-call-block.ts # Collapsible tool call blocks
```

## 开发协作约定（进度记录）

在进行 AMP 对齐 / Gap 修复的迭代中：
- 每个 agent / workstream 都需要把进度追加到 `<project-root>/progress.md`。

## TUI Layout

```
┌─────────────────────────────────────────┐
│                                       ▲ │
│  You                                  █ │
│    What files handle routing?         █ │
│                                       █ │
│  Assistant ●                          ░ │  ← ChatView + Scrollbar
│    The routing is handled in...       ░ │
│                                       ░ │
│  ▸ Read src/router.ts ✓              ░ │  ← ToolCallBlock
│                                       ▼ │
├─────────────────────────────────────────┤
│ ╭───────────────────────────────────╮   │
│ │ > Type your prompt here...       │   │  ← InputArea
│ ╰───────────────────────────────────╯   │
└─────────────────────────────────────────┘
```

## Overlays (Priority Order)

1. **Permission Dialog** — Modal when agent requests tool permissions (allow/skip/always)
2. **Command Palette** — Ctrl+O action list
3. **File Picker** — @file mention selection

All overlays dismiss with Escape.

## Requirements

- [Bun](https://bun.sh/) runtime
- An ACP-compatible agent (Claude Code, Gemini CLI, Codex CLI, etc.)
- Terminal with alternate screen support

## License

Part of the flitter monorepo.
