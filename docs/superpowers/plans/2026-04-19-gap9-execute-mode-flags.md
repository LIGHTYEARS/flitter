# Gap 9: Execute Mode Flags

> Implementation plan for missing execute-mode CLI flags.

## Overview

Flitter's execute mode (`-e/--execute`) and headless mode (`--headless`) are functional but missing several flags that amp supports for CI/scripting use cases.

## Missing Flags

| Flag | Purpose | Amp ref |
|---|---|---|
| `--stream-json-thinking` | Include thinking blocks in JSON stream output | `modules/0297_unknown_Kl0.js` |
| `--stream-json-input` | Read JSON Lines user messages from stdin (multi-turn) | `modules/0297_unknown_Kl0.js` |
| `--stats` | Output JSON with result + token usage | `modules/0300_unknown_Yl0.js:133` |
| `--archive` | Archive thread after execute finishes | `modules/2001_unknown_SB.js:269` |
| `--label / -l <label>` | Add label(s) to thread | `modules/0289_unknown_BKT.js` |
| `--mode <mode>` | Agent mode selection | Covered in Gap 3 plan |

**Note:** `--remote / -r` depends on server-side execution, so it's deferred.

---

## Implementation Tasks

### Task 1: `--stream-json-thinking`

**Files:** `packages/cli/src/program.ts`, `packages/cli/src/modes/execute.ts`

**Program registration:**
```typescript
program.option("--stream-json-thinking", "include thinking blocks in stream JSON output")
```

**Context:** Add `streamJsonThinking?: boolean` to `CliContext`.

**Execute mode change:** When `streamJsonThinking` is true, it implies `--stream-json` and the event serializer includes thinking blocks:

```typescript
function serializeEvent(event: AgentEvent, includeThinking: boolean): string | null {
  if (event.type === "thinking" && !includeThinking) return null;
  return JSON.stringify(event);
}

// In the event subscription:
worker.events$.subscribe(event => {
  const json = serializeEvent(event, context.streamJsonThinking ?? false);
  if (json) writeJsonLine(stdout, json);
});
```

**Amp ref:** `modules/0297_unknown_Kl0.js` — `includeThinking` flag passed to `Cl0()` serializer.

### Task 2: `--stream-json-input`

**Files:** `packages/cli/src/program.ts`, `packages/cli/src/modes/execute.ts`

**Program registration:**
```typescript
program.option("--stream-json-input", "read JSON Lines user messages from stdin (requires --execute and --stream-json)")
```

**Validation:** Must be used with `--execute` and `--stream-json`. Error otherwise.

**Execute mode change:** Instead of reading all stdin at once, enter a multi-turn loop:

```typescript
if (context.streamJsonInput) {
  // This turns execute mode into something like headless mode
  // but with execute mode's --stream-json output format
  const rl = createInterface({ input: io.stdin });

  // Send initial message if provided
  if (context.userMessage) {
    const messages = [{ role: "user" as const, content: context.userMessage }];
    worker = container.createThreadWorker(threadId, { getMessages: () => messages });
    subscribeEvents(worker);
    await worker.runInference();
  }

  // Read subsequent messages from stdin as JSON Lines
  for await (const line of rl) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.role === "user" && parsed.content) {
        appendMessage({ role: "user", content: parsed.content });
        await worker.runInference();
      }
    } catch {
      io.stderr.write(`Invalid JSON line: ${line}\n`);
    }
  }
} else {
  // Existing single-message execute flow
}
```

**Amp ref:** `modules/0297_unknown_Kl0.js` — `for await (let eT of Vl0(c))` loop reading JSON Lines, calling `T.sendMessage()` for each.

### Task 3: `--stats`

**Files:** `packages/cli/src/program.ts`, `packages/cli/src/modes/execute.ts`

**Program registration:**
```typescript
program.option("--stats", "output JSON with result and token usage")
```

**Execute mode change:** After inference completes, output stats JSON:

```typescript
if (context.stats) {
  const lastAssistant = getLastAssistantMessage(thread);
  const usage = worker.getUsage?.() ?? { inputTokens: 0, outputTokens: 0 };
  const stats = {
    result: lastAssistant?.text ?? "",
    usage: {
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      cache_creation_input_tokens: usage.cacheCreationInputTokens ?? 0,
      cache_read_input_tokens: usage.cacheReadInputTokens ?? 0,
    },
  };
  io.stdout.write(JSON.stringify(stats) + "\n");
}
```

This requires `ThreadWorker` to expose token usage stats. Add:

```typescript
// packages/agent-core/src/worker/thread-worker.ts
getUsage(): { inputTokens: number; outputTokens: number; cacheCreationInputTokens?: number; cacheReadInputTokens?: number }
```

Track accumulated usage across all inference calls in the thread worker.

**Amp ref:** `modules/0300_unknown_Yl0.js:133-145` — outputs `{ result, usage }` JSON.

### Task 4: `--archive`

**Files:** `packages/cli/src/program.ts`, `packages/cli/src/modes/execute.ts`

**Program registration:**
```typescript
program.option("--archive", "archive thread after execute finishes")
```

**Execute mode change:** After inference completes (in `finally` block):

```typescript
if (context.archive) {
  const thread = container.threadStore.observeThread(threadId).getValue();
  if (thread) {
    container.threadStore.setCachedThread({ ...thread, archived: true }, { scheduleUpload: true });
    if (container.threadPersistence) {
      await container.threadPersistence.save(threadId, { ...thread, archived: true });
    }
  }
}
```

**Amp ref:** `modules/2001_unknown_SB.js:269` — `o.threadService.archive(oT, true)`.

### Task 5: `--label / -l <label>`

**Files:** `packages/cli/src/program.ts`, `packages/cli/src/modes/execute.ts`

**Program registration:**
```typescript
program.option("-l, --label <label>", "add label to thread (repeatable)", (val, prev) => [...prev, val], [])
```

**Note:** Labels require thread metadata support. Currently `ThreadSnapshot` may not have a `labels` field.

**Schema change** (`packages/schemas/src/thread.ts`):
```typescript
interface ThreadSnapshot {
  // ... existing
  labels?: string[];
}
```

**Execute mode change:** After inference completes:
```typescript
if (context.labels?.length) {
  const thread = container.threadStore.observeThread(threadId).getValue();
  if (thread) {
    const updated = { ...thread, labels: [...(thread.labels ?? []), ...context.labels] };
    container.threadStore.setCachedThread(updated, { scheduleUpload: true });
  }
}
```

**Amp ref:** `modules/0289_unknown_BKT.js` — `BKT()` calls server API. We store locally.

### Task 6: Headless mode alignment

Ensure headless mode (`--headless`) also supports `--stats` and `--archive`.

**File:** `packages/cli/src/modes/headless.ts`

Add the same post-inference hooks as execute mode.

### Task 7: Update CliContext

**File:** `packages/cli/src/context.ts` (or wherever CliContext is defined)

```typescript
export interface CliContext {
  // existing
  execute?: boolean;
  headless?: boolean;
  streamJson?: boolean;
  print?: boolean;
  pipe?: boolean;
  maxTurns?: number;
  model?: string;
  apiKey?: string;
  systemPrompt?: string;
  userMessage?: string;

  // new
  streamJsonThinking?: boolean;
  streamJsonInput?: boolean;
  stats?: boolean;
  archive?: boolean;
  labels?: string[];
  mode?: string;
}
```

---

## Test Strategy

- **`--stats`:** Execute mode with stats flag, verify JSON output has `{ result, usage }` structure
- **`--stream-json-thinking`:** Verify thinking events appear in stream output
- **`--stream-json-input`:** Send multiple JSON Lines on stdin, verify multi-turn inference
- **`--archive`:** Execute, verify thread is archived in store
- **`--label`:** Execute with `-l test`, verify thread has label
- **Combination:** `--execute --stream-json --stats --archive -l ci` — all flags together

---

## Estimated Scope

| Task | Files | Complexity |
|---|---|---|
| `--stream-json-thinking` | 2 modified | Low |
| `--stream-json-input` | 2 modified | Medium |
| `--stats` | 2 modified + 1 for usage tracking | Medium |
| `--archive` | 2 modified | Low |
| `--label` | 2 modified + 1 schema | Low |
| Headless alignment | 1 modified | Low |
| CliContext update | 1 modified | Low |
| Tests | 3-4 new | Medium |
