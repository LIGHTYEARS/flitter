# Debug Logging

Flitter has a structured debug logging system aligned with amp's `ScopedLogger` (`Sb`). All debug output goes to **stderr** via `console.error`, so it never interferes with TUI rendering on stdout.

## Enabling debug logs

```bash
# Launch any TUI app with debug output captured to a file
FLITTER_LOG_LEVEL=debug bun run examples/your-app.ts 2>/tmp/debug.log

# In a separate terminal, tail the log
tail -f /tmp/debug.log
```

At the default level (`info`), all debug logs are completely silent — zero performance overhead beyond a single numeric comparison per call site.

## Existing channels

| Channel | Scoped logger | File | What it logs |
|---------|--------------|------|-------------|
| `[input]` | `logger.scoped("input")` | `src/vt/input-parser.ts` | Parsed mouse events |
| `[mouse]` | `logger.scoped("mouse")` | `src/gestures/mouse-manager.ts` | Mouse events + hit test counts |
| `[build]` | `logger.scoped("build")` | `src/tree/build-owner.ts` | Dirty element counts |
| `[frame]` | `logger.scoped("frame")` | `src/tree/frame-scheduler.ts` | requestFrame / frameStart / frameEnd |
| `[paint]` | `logger.scoped("paint")` | `src/binding/widgets-binding.ts` | beginFrame flags + render |
| `[tui]` | `logger.scoped("tui")` | `src/tui/tui-controller.ts` | updateTerminalSize fallback/detected size |

## Adding new debug logs

```typescript
import { logger } from "../debug/logger.js";

const log = logger.scoped("yourChannel");

// In the function you want to instrument:
log.debug("eventName", { key: value });
```

Rules:
- Use `log.debug()` for pipeline tracing — these are gated behind `FLITTER_LOG_LEVEL=debug`
- Use `log.error()` only for genuine errors (always visible)
- Keep debug logs minimal: one line per event, not per byte. Amp's rendering pipeline is silent by design — follow that pattern.
- Nested scopes use dot notation: `logger.scoped("mouse").scoped("hit")` produces `[mouse.hit]`

## Amp reference

- `amp-cli-reversed/modules/1542_unknown_Sb.js` — ScopedLogger class
- `modules/2026_tail_anonymous.js:59921-59944` — bootstrap backend
- `modules/2004_unknown_RF0.js` — log level resolution
