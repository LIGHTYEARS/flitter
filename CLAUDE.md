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
