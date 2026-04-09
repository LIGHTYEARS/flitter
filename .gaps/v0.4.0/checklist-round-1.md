# Gap Closure Report — Round 1

## Gaps Closed: 3 of 13

### GAP-C1: DensityOrb ASCII Art Logo (Critical → Fixed)

**Problem**: The DensityOrb rendered only ~5 lines of sparse `.` characters instead of the expected 17-line gradient ellipsoid with full ` .:-=+*` density range.

**Root cause**: The `PerlinNoise.fbm()` function returns values in `[0,1]` but with a narrow effective range (~0.25–0.75 due to Gaussian distribution). After edge-fade multiplication, density characters were clamped to the lowest levels. Additionally, `PerlinNoise.shared` used non-deterministic `Math.random()` seeding, causing inconsistent visual quality across runs.

**Fix** (`density-orb-widget.ts`):
1. Switched from `PerlinNoise.shared` to `new PerlinNoise(7)` — deterministic seed producing balanced density distribution
2. Added contrast remap: `(raw - 0.2) * 2.5` stretches the narrow noise range to `[0,1]`
3. Applied gamma correction: `** 0.6` boosts midtones toward higher density characters (`=`, `+`, `*`)
4. Changed initial `timeOffset` from 0 to 0.5 for a richer first frame

**Result**: Orb now renders 17-line gradient ellipsoid reaching `+*` density levels, matching AMP's visual quality.

---

### GAP-m2: Skills Count 0 + Warning Marker (Minor → Fixed)

**Problem**: The input area top-right showed `smart───0─skills` instead of the expected `smart──!─77─skills`. No skills were loaded because `SkillService.setSkills()` was never called.

**Root cause**: The `SkillService` class was plumbed (setSkills, skillCount, warnings, listeners all implemented) but no filesystem scanner existed to read SKILL.md files from `.agents/skills/` directories.

**Fix**:
1. Created `skill-loader.ts` — filesystem scanner that:
   - Scans `{cwd}/.agents/skills/` (local) and `~/.agents/skills/` (global)
   - Reads each `SKILL.md`, parses YAML frontmatter (name, description, etc.)
   - Lists files in each skill directory
   - Handles errors/warnings gracefully, deduplicates by name
2. Wired into `index.ts`: after `AppState.create()`, calls `loadSkills(displayCwd)` → `skillService.setSkills()`

**Result**: Skills count and warning markers now display correctly in the border overlay.

---

### GAP-m3: CWD Path + Git Branch (Minor → Fixed)

**Problem**: Bottom-right showed `...o/studio/flitter/packages/flitter-cli` (truncated package path, no branch) instead of `~/.oh-my-coco/studio/flitter (master)`.

**Root cause**: `app-shell.ts` used `process.cwd()` as fallback for the CWD display. After `chdir(config.cwd)` in `index.ts`, `process.cwd()` returned the package subdirectory. The optional chain `metadata?.cwd ?? process.cwd()` could fall through to the wrong value if the optional chain was unnecessarily defensive.

**Fix** (`app-shell.ts`, `input-area.ts`):
1. Removed `?? process.cwd()` fallback in `app-shell.ts` — `metadata.cwd` is always defined (set from `displayCwd = gitContext.repoRoot ?? config.cwd`)
2. Simplified optional chain: `metadata.cwd` instead of `metadata?.cwd`
3. The `gitBranch` is correctly passed through the metadata chain via `getGitContext().branch`

**Result**: Bottom-right overlay now displays `~/.oh-my-coco/studio/flitter (master)` format.

---

## Files Changed

| File | Change |
|------|--------|
| `packages/flitter-cli/src/widgets/density-orb-widget.ts` | Deterministic seed, contrast remap, gamma correction, initial timeOffset |
| `packages/flitter-cli/src/state/skill-loader.ts` | **New** — filesystem skill scanner |
| `packages/flitter-cli/src/index.ts` | Import skill-loader, call loadSkills() + setSkills() |
| `packages/flitter-cli/src/widgets/app-shell.ts` | Remove process.cwd() fallback for metadata.cwd |
| `packages/flitter-cli/src/widgets/input-area.ts` | Use `||` instead of `??` for cwd fallback |

## Test Results

- Welcome screen tests: 13/13 pass
- Nice-to-have gaps tests: 117/117 pass
- Full test suite: 1004/1011 pass (7 pre-existing failures unrelated to these changes)

---

# Round 2 — Provider Error Fix

## Gap Closed: GAP-C3 (Critical)

### GAP-C3: 发送消息后无响应 — `No API provider registered for api: undefined`

**Problem**: After submitting a prompt, the agentic loop immediately throws `No API provider registered for api: undefined`. The UI shows no response or error feedback to the user.

**Root cause**: In `factory.ts`, the `pi-ai` library's `getModel()` function returns `undefined` (not throws) when a model ID isn't in the catalog. The code used `try/catch` to detect this, which never triggered. As a result:

1. `getModel("anthropic", "ep-20260331120931-5lxqv")` returned `undefined` (Volcano Engine Ark endpoint ID not in pi-ai catalog)
2. The `catch` block never executed (no exception thrown)
3. `model` remained `undefined`
4. The baseUrl override: `{ ...undefined, id: modelId, baseUrl: config.baseUrl }` created an object **without the `api` field**
5. `pi-ai stream()` called `resolveApiProvider(model.api)` with `api: undefined` → threw

**Fix** (`factory.ts`):
- Changed `model` type from `Model<Api>` to `Model<Api> | undefined`
- Added explicit `if (!model)` check after `getModel()` to detect undefined return
- When `!model && config.baseUrl`: construct `Model` directly with `api` resolved from `PROVIDER_API_MAP` (e.g. `anthropic` → `anthropic-messages`), setting `id`/`baseUrl`/`provider` from config. No catalog fallback needed — treats custom endpoint like OpenAI-compatible: protocol known, model ID opaque
- When `!model && !baseUrl`: throw clear error directing user to specify baseUrl or use a catalog model ID
- When `model && baseUrl`: spread catalog model with `id`/`baseUrl` override (proxied standard endpoint)
- Added `PROVIDER_API_MAP` + `resolveApi()` for provider→api protocol mapping

**Stack trace (from logs)**:
```
Error: No API provider registered for api: undefined
    at resolveApiProvider (pi-ai/dist/stream.js:7:19)
    at stream (pi-ai/dist/stream.js:12:22)
    at sendPrompt (pi-ai-provider.ts:280:25)
    at _streamResponse (prompt-controller.ts:467:24)
    at _agenticLoop (prompt-controller.ts:297:59)
```

## Files Changed (Round 2)

| File | Change |
|------|--------|
| `packages/flitter-cli/src/provider/factory.ts` | Direct `Model` construction for custom endpoints via `PROVIDER_API_MAP` + `resolveApi()`, replacing catalog fallback hack |
