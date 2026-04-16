# Flitter Project Instructions

## Mandatory Rules

### 1. All implementation MUST cross-reference amp source code

Flitter is a reverse-engineering of amp. The reference implementation lives in `amp-cli-reversed/`.

**Before writing any functional code, you MUST:**

1. Find the corresponding amp source in `amp-cli-reversed/` (use the `逆向:` comments in existing code to locate the reference)
2. Read and understand amp's implementation — especially edge cases, fallbacks, and defensive patterns
3. Match amp's behavior, not just its happy path. Amp's multi-layer fallback strategies exist because real terminals are messy.
4. If no amp reference exists for the feature, explicitly state so in the commit message

**This applies to subagents too.** When spawning executor agents, include this rule in the agent prompt. Agents that write code without consulting `amp-cli-reversed/` are producing untested guesses, not reverse-engineered implementations.

**Why:** Phase 12.1 produced 5 plans, 100+ passing unit tests, and zero working TUI — because every agent wrote naive implementations without consulting the reference. The `getSize()` method returned `Infinity` because it used `??` instead of amp's 4-layer defense (`_refreshSize` → truthy check → `getWindowSize` → cached fallback). Unit tests passed because mocks don't expose real terminal behavior.

### 2. Integration verification before declaring completion

Every phase that produces runnable functionality MUST include a real execution test — not just unit tests with mocks. If the feature is a TUI, launch it in a terminal. If it's an API, call it. Mocks verify code structure; only real execution verifies behavior.

For interactive TUI features, use **tmux E2E testing** to inject mouse/keyboard events and assert screen output. See [`docs/tmux-e2e-test-reference.md`](docs/tmux-e2e-test-reference.md) for the full protocol (SGR mouse encoding, `capture-pane` assertions, pipeline debugging). The short version:

```bash
tmux new-session -d -s test -x 80 -y 24 "bun run $APP 2>/tmp/test.log"
sleep 2
tmux send-keys -t test -- $'\x1b[<0;10;5M'   # SGR left-click at col=10, row=5
sleep 0.5
tmux capture-pane -t test -p | grep -q "expected text" || echo "FAIL"
tmux kill-session -t test
```

Do NOT declare an interactive feature complete based solely on unit tests passing. If you cannot `capture-pane` and see the expected change, the feature is broken — regardless of how many tests pass.

### 3. Every failure signal must be investigated and **SYSTEMATICALLY** resolved

When ANY verification step produces an unexpected result — test failure, type error, runtime crash, e2e mismatch, or user-reported breakage — you MUST investigate and resolve it before proceeding.

It does not matter who introduced the failure: a previous session, a subagent, a pre-existing bug, or your own change. If you see it, you own it.

The only way to proceed past an unresolved failure is explicit user approval to defer it.

### 4. Debug logging

Flitter has structured debug logging gated by `FLITTER_LOG_LEVEL=debug`. See [`docs/debug-logging.md`](docs/debug-logging.md) for channels, usage, and how to add new log points.
