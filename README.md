# Flitter

A Flutter-faithful TUI framework and AI CLI for TypeScript and Bun.

## Packages

| Package | Description |
|---------|-------------|
| [flitter-core](packages/flitter-core/) | Core TUI framework — widget tree, layout engine, input system, rendering pipeline |
| [flitter-cli](packages/flitter-cli/) | AI-powered terminal client with multi-provider LLM support and local tool execution |
| [flitter-amp](packages/flitter-amp/) | ACP (Agent Client Protocol) reference client |

## Requirements

- [Bun](https://bun.sh/) 1.3+
- TypeScript 5.7+
- A terminal with color support (iTerm2, WezTerm, Windows Terminal, etc.)

## Quick Start

```bash
git clone https://github.com/LIGHTYEARS/flitter.git
cd flitter
bun install
```

## flitter-cli

### Starting the CLI

```bash
cd packages/flitter-cli

# via npm script
bun run start

# or directly
bun run src/index.ts
```

### Provider Configuration

flitter-cli supports multiple LLM providers. The provider is auto-detected from environment variables, or can be specified explicitly.

**Auto-detection priority:** Anthropic → OpenAI → Gemini → ChatGPT/Codex → Copilot → Antigravity

#### Anthropic (default)

```bash
export ANTHROPIC_API_KEY=sk-ant-xxx
bun run start
```

With a custom base URL (for Anthropic-compatible proxies):

```bash
export ANTHROPIC_API_KEY=sk-ant-xxx
bun run start -- --provider anthropic --base-url https://your-proxy.example.com --model claude-sonnet-4-20250514
```

#### OpenAI

```bash
export OPENAI_API_KEY=sk-xxx
bun run start
```

#### OpenAI-Compatible

```bash
export OPENAI_API_KEY=your-key
bun run start -- --provider openai-compatible --base-url https://your-endpoint.example.com/v1 --model your-model
```

#### Gemini

```bash
export GEMINI_API_KEY=xxx
bun run start
```

#### OAuth Providers (ChatGPT / Copilot / Antigravity)

These use browser-based OAuth — no API key needed:

```bash
# One-time authentication
bun run start -- --connect chatgpt      # ChatGPT/Codex
bun run start -- --connect copilot      # GitHub Copilot
bun run start -- --connect antigravity  # Google Gemini via Antigravity

# After auth, just specify the provider
bun run start -- --provider chatgpt-codex
bun run start -- --provider copilot
bun run start -- --provider antigravity
```

Tokens are stored in `~/.flitter-cli/tokens/` and auto-loaded on subsequent runs.

### API Key Configuration

Three ways to provide an API key, in order of priority:

1. **CLI config file** (`~/.flitter-cli/config.json`) — `apiKey` field
2. **Environment variable** — `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`
3. **OAuth** — for ChatGPT/Codex, Copilot, Antigravity (stored automatically after `--connect`)

### Config File

Create `~/.flitter-cli/config.json` for persistent defaults:

```json
{
  "provider": "anthropic",
  "apiKey": "sk-ant-xxx",
  "baseUrl": "https://your-proxy.example.com",
  "model": "claude-sonnet-4-20250514",
  "theme": "dark",
  "logLevel": "info",
  "historySize": 100,
  "editor": "vim"
}
```

All fields are optional. CLI flags override config file values.

### CLI Flags

| Flag | Description |
|------|-------------|
| `--provider <id>` | Provider: `anthropic`, `openai`, `openai-compatible`, `chatgpt-codex`, `copilot`, `gemini`, `antigravity` |
| `--model <name>` | Model identifier (any string — passed directly to the provider API) |
| `--base-url <url>` | Base URL override for the provider API |
| `--cwd <dir>` | Working directory |
| `--editor <cmd>` | Editor command for Ctrl+G (e.g., `"code --wait"`) |
| `--theme <name>` | UI theme (`dark`, `light`, etc.) |
| `--debug` | Enable debug logging |
| `--resume <id>` | Resume a previous session |
| `--list-sessions` | List saved sessions and exit |
| `--export <id>` | Export a session (`--format json\|md\|txt`) |
| `--connect <target>` | Run OAuth authentication (`chatgpt`, `copilot`, `antigravity`) |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+C` | Cancel current operation / Exit |
| `Ctrl+G` | Open prompt in external editor |
| `Ctrl+L` | Clear conversation |
| `Ctrl+K` | Command palette |
| `Ctrl+Shift+C` | Copy last response |
| `Alt+T` | Toggle tool call expansion |
| `Alt+R` | Toggle deep reasoning |
| `Ctrl+R` | History search |
| `?` | Toggle shortcut help |

### Running Tests

```bash
cd packages/flitter-cli
bun test
```

## Development

```bash
# Run all tests across the monorepo
bun test

# Type-check
bun run typecheck
```

## License

MIT
