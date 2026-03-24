# flutter-tui

Flutter-faithful terminal UI framework for TypeScript and Bun.

It brings Flutter’s declarative widget model and three-tree architecture to terminal applications:

- Widget tree for immutable UI descriptions
- Element tree for lifecycle and reconciliation
- RenderObject tree for layout and painting

## Features

- Declarative widget composition inspired by Flutter
- Box-constraint layout model
- Flex layout widgets (`Row` / `Column`)
- Frame pipeline with build, layout, paint, and render phases
- Keyboard and mouse input system with focus management
- Rich widget set for layout, input, scrolling, and display
- Large automated test coverage with `bun test`

## Requirements

- Bun 1.3+
- TypeScript 5.7+
- A terminal with color support (iTerm2, WezTerm, Windows Terminal, etc.)

## Quick Start

```bash
git clone <repo-url> flutter-tui
cd flutter-tui
bun install
```

Run a demo:

```bash
bun run example:hello
```

Exit most demos with `q` or `Ctrl+C`.

## Common Scripts

```bash
# tests
bun test
bun test --coverage

# build and type-check
bun run build
bun run typecheck

# docs site
bun run docs:dev
bun run docs:build
bun run docs:preview
```

## Example Apps

This repository includes many runnable examples under `examples/`, including:

- `hello-world.ts`
- `counter.ts`
- `dashboard.ts`
- `todo-app.ts`
- `kanban-board.ts`
- `text-editor.ts`
- `snake-game.ts`
- `spreadsheet.ts`

You can run examples directly with Bun:

```bash
bun run examples/dashboard.ts
```

Or use predefined script aliases from `package.json`, such as:

```bash
bun run example:counter
bun run example:flex
bun run example:scroll
bun run example:todo
```

## Documentation

Full project docs are available in the `docs/` directory (VitePress):

- Guide: `docs/guide`
- API Reference: `docs/api`
- Widget docs: `docs/widgets`
- Example walkthroughs: `docs/examples`

## Project Layout

```text
src/
  core/        # primitives: color, text style/span, constraints, key
  framework/   # widget, element, render-object infrastructure
  layout/      # layout helpers and render layout objects
  scheduler/   # frame scheduler, paint context, rendering pipeline
  input/       # keyboard, mouse, focus, dispatching
  terminal/    # terminal rendering, parser, screen buffer
  widgets/     # high-level widget implementations

examples/      # runnable demo apps
docs/          # VitePress documentation site
test/          # test setup
```

## License

MIT
