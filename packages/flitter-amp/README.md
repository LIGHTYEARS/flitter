# flitter-amp

An ACP (Agent Client Protocol) client TUI that replicates the [Amp CLI](https://ampcode.com/) visual experience, built on [flitter-core](../flitter-core/).

## Quick Start

```bash
# Run with default agent (claude --agent)
bun run packages/flitter-amp/src/index.ts

# Specify a different agent
bun run packages/flitter-amp/src/index.ts --agent "gemini --experimental-acp"

# Use Codex CLI
bun run packages/flitter-amp/src/index.ts --agent "codex --agent"

# Set working directory
bun run packages/flitter-amp/src/index.ts --cwd /path/to/project
```

## CLI Options

| Option | Default | Description |
|--------|---------|-------------|
| `--agent <cmd>` | `"claude --agent"` | Agent command to spawn |
| `--cwd <dir>` | `.` | Working directory for the session |
| `--expand` | off | Expand tool call details by default |
| `--debug` | off | Enable debug logging |
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
| `logLevel` | string | `"info"` | Log level: debug/info/warn/error |

## Architecture

```
packages/flitter-amp/src/
├── index.ts              # Entry point — bootstrap, connect, start TUI
├── app.ts                # Root widget tree, keyboard handlers, overlays
├── acp/
│   ├── client.ts         # ACP protocol client with callbacks
│   ├── connection.ts     # Agent connection management
│   ├── session.ts        # Session lifecycle
│   └── types.ts          # ACP type definitions
├── state/
│   ├── app-state.ts      # Global state (connection, error, permissions)
│   ├── config.ts         # CLI args + config file parsing
│   ├── conversation.ts   # Conversation items (messages, tools, plans)
│   └── history.ts        # Prompt history with cursor navigation
├── utils/
│   ├── editor.ts         # $EDITOR integration (temp file workflow)
│   ├── logger.ts         # Leveled logging
│   └── process.ts        # Agent subprocess management
└── widgets/
    ├── chat-view.ts       # Scrollable conversation with error banner
    ├── command-palette.ts # Ctrl+O action selector
    ├── diff-card.ts       # Unified diff rendering
    ├── file-picker.ts     # @file mention selector
    ├── header-bar.ts      # Agent name, mode, token usage
    ├── input-area.ts      # Bordered text input
    ├── permission-dialog.ts # Agent permission request modal
    ├── plan-view.ts       # Plan checklist display
    ├── thinking-block.ts  # Collapsible thinking sections
    └── tool-call-block.ts # Collapsible tool call blocks
```

## TUI Layout

```
┌─────────────────────────────────────────┐
│ Agent Name    │ plan │ $0.02 │ 1.2k tok │  ← HeaderBar
├─────────────────────────────────────────┤
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
