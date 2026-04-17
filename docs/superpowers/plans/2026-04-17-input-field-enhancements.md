# Input Field Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the InputField widget with four missing features: adaptive terminal width, `@`-mention file autocomplete, prompt history navigation, and `/`-command triggers.

**Architecture:** The InputField gains a `MediaQuery` dependency for terminal width. A new `InputController` wraps `TextEditingController` with autocomplete trigger detection, history stack, and command prefix parsing. The existing `AutocompleteController` and `FuzzyPicker` from `@flitter/tui` are reused for the autocomplete overlay.

**Tech Stack:** TypeScript, `@flitter/tui` (MediaQuery, Focus, TextEditingController, AutocompleteController, FuzzyPicker, Overlay), `@flitter/util` (Glob for file listing)

**amp reference files:**
- `amp-cli-reversed/1472_tui_components/actions_intents.js` — `Gm` (TextField), `PZT` (AutocompleteField), `sP` (TextField state with triggers)
- `amp-cli-reversed/1472_tui_components/data_structures.js` — `ZgT` (keybinding help table)

---

### Task 1: Adaptive terminal width for InputField

Replace the hardcoded `DEFAULT_BORDER_INNER_WIDTH = 78` with dynamic width from `MediaQuery`.

**Files:**
- Modify: `packages/cli/src/widgets/input-field.ts`
- Test: `packages/cli/src/widgets/__tests__/input-field-width.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// packages/cli/src/widgets/__tests__/input-field-width.test.ts
import { describe, it, expect } from "bun:test";
import { InputField } from "../input-field";

describe("InputField adaptive width", () => {
  it("accepts an optional width prop that overrides the default", () => {
    const field = new InputField({ onSubmit: () => {}, width: 120 });
    expect(field.config.width).toBe(120);
  });

  it("defaults to undefined width (uses MediaQuery at render time)", () => {
    const field = new InputField({ onSubmit: () => {} });
    expect(field.config.width).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/cli && bun test src/widgets/__tests__/input-field-width.test.ts`
Expected: FAIL — `width` is not a recognized config property

- [ ] **Step 3: Add width prop to InputFieldConfig**

In `packages/cli/src/widgets/input-field.ts`:

1. Add to `InputFieldConfig`:
```ts
export interface InputFieldConfig {
  onSubmit: (text: string) => void;
  placeholder?: string;
  /** Override width. If undefined, uses MediaQuery terminal width - 4 (for border + padding). */
  width?: number;
}
```

2. In `build()`, replace the hardcoded width:
```ts
// Replace: const innerWidth = DEFAULT_BORDER_INNER_WIDTH;
// With:
let innerWidth = this.widget.config.width ?? DEFAULT_BORDER_INNER_WIDTH;

// Try MediaQuery if available (graceful fallback)
try {
  const mediaQuery = MediaQuery.of(context);
  if (mediaQuery && !this.widget.config.width) {
    // Terminal width minus 4 for border chars and padding
    innerWidth = Math.max(20, mediaQuery.size.width - 4);
  }
} catch {
  // MediaQuery not available in this context — use default
}
```

3. Add import: `import { MediaQuery } from "@flitter/tui";`

4. Update `build()` signature to accept context: `build(context: BuildContext): Widget`

- [ ] **Step 4: Run test and existing InputField tests**

Run: `cd packages/cli && bun test src/widgets/input-field.test.ts src/widgets/__tests__/input-field-width.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/widgets/input-field.ts packages/cli/src/widgets/__tests__/input-field-width.test.ts
git commit -m "feat(cli): make InputField width adaptive via MediaQuery"
```

---

### Task 2: Implement PromptHistory

A simple stack-based prompt history that supports up/down navigation.

**Files:**
- Create: `packages/cli/src/widgets/prompt-history.ts`
- Test: `packages/cli/src/widgets/__tests__/prompt-history.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// packages/cli/src/widgets/__tests__/prompt-history.test.ts
import { describe, it, expect, beforeEach } from "bun:test";
import { PromptHistory } from "../prompt-history";

describe("PromptHistory", () => {
  let history: PromptHistory;

  beforeEach(() => {
    history = new PromptHistory({ maxEntries: 100 });
  });

  it("starts empty with no navigation available", () => {
    expect(history.canGoBack()).toBe(false);
    expect(history.canGoForward()).toBe(false);
  });

  it("records submitted prompts", () => {
    history.push("first prompt");
    history.push("second prompt");
    expect(history.entries).toEqual(["first prompt", "second prompt"]);
  });

  it("navigates back through history", () => {
    history.push("first");
    history.push("second");
    history.push("third");

    history.startNavigation("current draft");
    expect(history.goBack()).toBe("third");
    expect(history.goBack()).toBe("second");
    expect(history.goBack()).toBe("first");
    expect(history.goBack()).toBe("first"); // stays at oldest
  });

  it("navigates forward after going back", () => {
    history.push("first");
    history.push("second");

    history.startNavigation("draft");
    history.goBack(); // "second"
    history.goBack(); // "first"
    expect(history.goForward()).toBe("second");
    expect(history.goForward()).toBe("draft"); // back to draft
    expect(history.goForward()).toBe("draft"); // stays at draft
  });

  it("preserves the original draft when navigating", () => {
    history.push("old");
    history.startNavigation("my current text");
    history.goBack(); // "old"
    expect(history.goForward()).toBe("my current text");
  });

  it("deduplicates consecutive identical entries", () => {
    history.push("same");
    history.push("same");
    expect(history.entries).toEqual(["same"]);
  });

  it("respects maxEntries", () => {
    const small = new PromptHistory({ maxEntries: 3 });
    small.push("a");
    small.push("b");
    small.push("c");
    small.push("d"); // "a" should be evicted
    expect(small.entries).toEqual(["b", "c", "d"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/cli && bun test src/widgets/__tests__/prompt-history.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement PromptHistory**

```ts
// packages/cli/src/widgets/prompt-history.ts
/**
 * PromptHistory — stack-based prompt history with up/down navigation.
 *
 * 逆向: NavigateToPromptHistoryIntent (DM) in actions_intents.js
 * and Ctrl+R / arrow-up/down in the help keybinding table (ZgT).
 */

export interface PromptHistoryOptions {
  maxEntries?: number;
}

export class PromptHistory {
  private readonly _maxEntries: number;
  private _entries: string[] = [];
  private _cursor = -1;
  private _draft: string = "";
  private _navigating = false;

  constructor(opts: PromptHistoryOptions = {}) {
    this._maxEntries = opts.maxEntries ?? 500;
  }

  get entries(): readonly string[] {
    return this._entries;
  }

  push(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Deduplicate consecutive
    if (this._entries.length > 0 && this._entries[this._entries.length - 1] === trimmed) {
      return;
    }

    this._entries.push(trimmed);

    // Evict oldest if over limit
    if (this._entries.length > this._maxEntries) {
      this._entries.shift();
    }

    // Reset navigation state
    this._navigating = false;
    this._cursor = -1;
  }

  startNavigation(currentDraft: string): void {
    this._draft = currentDraft;
    this._cursor = this._entries.length; // Points past the end (= draft position)
    this._navigating = true;
  }

  canGoBack(): boolean {
    return this._entries.length > 0 && this._cursor > 0;
  }

  canGoForward(): boolean {
    return this._navigating && this._cursor < this._entries.length;
  }

  goBack(): string {
    if (!this._navigating) return this._draft;
    if (this._cursor > 0) {
      this._cursor--;
    }
    return this._entries[this._cursor] ?? this._draft;
  }

  goForward(): string {
    if (!this._navigating) return this._draft;
    if (this._cursor < this._entries.length) {
      this._cursor++;
    }
    if (this._cursor >= this._entries.length) {
      return this._draft;
    }
    return this._entries[this._cursor];
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/cli && bun test src/widgets/__tests__/prompt-history.test.ts`
Expected: All 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/widgets/prompt-history.ts packages/cli/src/widgets/__tests__/prompt-history.test.ts
git commit -m "feat(cli): add PromptHistory with stack-based up/down navigation"
```

---

### Task 3: Wire PromptHistory into InputField

Add Up/Down arrow key handling in InputField to navigate prompt history.

**Files:**
- Modify: `packages/cli/src/widgets/input-field.ts`
- Modify: `packages/cli/src/widgets/thread-state-widget.ts`

- [ ] **Step 1: Add promptHistory prop to InputFieldConfig**

```ts
export interface InputFieldConfig {
  onSubmit: (text: string) => void;
  placeholder?: string;
  width?: number;
  /** Prompt history for up/down navigation (optional) */
  promptHistory?: PromptHistory;
}
```

- [ ] **Step 2: Handle Up/Down arrow keys in _handleKeyEvent**

In `InputFieldState._handleKeyEvent`:

```ts
// Add to imports:
import type { PromptHistory } from "./prompt-history.js";

// In _handleKeyEvent, before the existing key handling:
if (event.key === "ArrowUp" && !event.modifiers.shift) {
  const history = this.widget.config.promptHistory;
  if (history) {
    if (!history.canGoBack() && this._controller.text === "") return "ignored";
    if (history.canGoBack()) {
      // Save current text as draft on first navigation
      history.startNavigation(this._controller.text);
    }
    const prev = history.goBack();
    this._controller.text = prev;
    this._controller.moveCursorToEnd();
    this._markDirty();
    return "handled";
  }
}

if (event.key === "ArrowDown" && !event.modifiers.shift) {
  const history = this.widget.config.promptHistory;
  if (history && history.canGoForward()) {
    const next = history.goForward();
    this._controller.text = next;
    this._controller.moveCursorToEnd();
    this._markDirty();
    return "handled";
  }
}
```

- [ ] **Step 3: Push to history on submit**

In `_handleKeyEvent`, update the Enter handler:

```ts
if (event.key === "Enter" && !event.modifiers.shift) {
  const text = this._controller.text;
  if (text.trim()) {
    this.widget.config.promptHistory?.push(text);
    this._controller.text = "";
    this.widget.config.onSubmit(text);
    this._markDirty();
    return "handled";
  }
}
```

- [ ] **Step 4: Create and pass PromptHistory from ThreadStateWidget**

In `packages/cli/src/widgets/thread-state-widget.ts`:

```ts
import { PromptHistory } from "./prompt-history.js";

// In ThreadStateWidgetState:
private _promptHistory = new PromptHistory();

// In build(), pass to InputField:
new InputField({
  onSubmit,
  promptHistory: this._promptHistory,
}),
```

- [ ] **Step 5: Run all tests**

Run: `cd packages/cli && bun test`
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/widgets/input-field.ts packages/cli/src/widgets/thread-state-widget.ts
git commit -m "feat(cli): wire PromptHistory into InputField for up/down prompt navigation"
```

---

### Task 4: Implement `/`-command prefix detection

Detect when the user types a `/` at the start of input and intercept it as a command before it reaches the agent.

**Files:**
- Modify: `packages/cli/src/widgets/thread-state-widget.ts`
- Test: `packages/cli/src/widgets/__tests__/command-detection.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// packages/cli/src/widgets/__tests__/command-detection.test.ts
import { describe, it, expect } from "bun:test";
import { parseCommandInput, type CommandInput } from "../command-detection";

describe("parseCommandInput", () => {
  it("returns null for non-command input", () => {
    expect(parseCommandInput("hello world")).toBeNull();
    expect(parseCommandInput("")).toBeNull();
  });

  it("parses /command with no args", () => {
    const result = parseCommandInput("/help");
    expect(result).toEqual({ command: "help", args: "" });
  });

  it("parses /command with args", () => {
    const result = parseCommandInput("/model claude-opus");
    expect(result).toEqual({ command: "model", args: "claude-opus" });
  });

  it("parses /command with multi-word args", () => {
    const result = parseCommandInput("/config set model claude-opus");
    expect(result).toEqual({ command: "config", args: "set model claude-opus" });
  });

  it("ignores / in the middle of text", () => {
    expect(parseCommandInput("hello /world")).toBeNull();
  });

  it("trims whitespace", () => {
    const result = parseCommandInput("  /help  ");
    expect(result).toEqual({ command: "help", args: "" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/cli && bun test src/widgets/__tests__/command-detection.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement command-detection.ts**

```ts
// packages/cli/src/widgets/command-detection.ts
/**
 * Command prefix detection for /slash commands.
 *
 * 逆向: ef class trigger in PZT (1472_tui_components/actions_intents.js)
 * and ZgT help table showing "/" triggers.
 */

export interface CommandInput {
  command: string;
  args: string;
}

/**
 * Parse a slash command from user input.
 * Returns null if the input is not a command.
 */
export function parseCommandInput(text: string): CommandInput | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return null;

  const withoutSlash = trimmed.slice(1);
  const spaceIndex = withoutSlash.indexOf(" ");

  if (spaceIndex === -1) {
    return { command: withoutSlash, args: "" };
  }

  return {
    command: withoutSlash.slice(0, spaceIndex),
    args: withoutSlash.slice(spaceIndex + 1).trim(),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/cli && bun test src/widgets/__tests__/command-detection.test.ts`
Expected: All 6 tests PASS

- [ ] **Step 5: Integrate into ThreadStateWidget's onSubmit**

In `packages/cli/src/widgets/thread-state-widget.ts` (or in `interactive.ts`), intercept the submit callback:

```ts
import { parseCommandInput } from "./command-detection.js";

// In the onSubmit callback:
const commandInput = parseCommandInput(text);
if (commandInput) {
  // Handle known commands
  switch (commandInput.command) {
    case "help":
      // Show help overlay or print help text
      this._toastManager?.show("Available commands: /help, /clear, /model, /compact", "info");
      return;
    case "clear":
      this.setState(() => { this._items = []; });
      return;
    case "compact":
      // Trigger compaction
      this._toastManager?.show("Compaction requested", "info");
      return;
    default:
      this._toastManager?.show(`Unknown command: /${commandInput.command}`, "error", 3000);
      return;
  }
}
// If not a command, proceed with normal message submission
```

- [ ] **Step 6: Run all tests**

Run: `cd packages/cli && bun test`
Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/widgets/command-detection.ts packages/cli/src/widgets/__tests__/command-detection.test.ts packages/cli/src/widgets/thread-state-widget.ts
git commit -m "feat(cli): add /slash command detection and basic command handling"
```

---

### Task 5: Implement `@`-mention file autocomplete trigger

Detect `@` in the input field and trigger a file autocomplete overlay using the existing `FuzzyPicker`.

**Files:**
- Create: `packages/cli/src/widgets/file-autocomplete.ts`
- Test: `packages/cli/src/widgets/__tests__/file-autocomplete.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// packages/cli/src/widgets/__tests__/file-autocomplete.test.ts
import { describe, it, expect } from "bun:test";
import { detectAtMention, type AtMention } from "../file-autocomplete";

describe("detectAtMention", () => {
  it("returns null when there is no @ in text", () => {
    expect(detectAtMention("hello world", 5)).toBeNull();
  });

  it("detects @ at cursor position", () => {
    const result = detectAtMention("hello @", 7);
    expect(result).toEqual({ triggerIndex: 6, query: "" });
  });

  it("detects @ with partial query", () => {
    const result = detectAtMention("hello @src/ma", 13);
    expect(result).toEqual({ triggerIndex: 6, query: "src/ma" });
  });

  it("detects @ at the start of text", () => {
    const result = detectAtMention("@file.ts", 8);
    expect(result).toEqual({ triggerIndex: 0, query: "file.ts" });
  });

  it("ignores @ in the middle of a word", () => {
    expect(detectAtMention("user@example.com", 16)).toBeNull();
  });

  it("detects only the last @ trigger", () => {
    const result = detectAtMention("@first then @second", 19);
    expect(result).toEqual({ triggerIndex: 12, query: "second" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/cli && bun test src/widgets/__tests__/file-autocomplete.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement file-autocomplete.ts**

```ts
// packages/cli/src/widgets/file-autocomplete.ts
/**
 * @-mention file autocomplete detection and file listing.
 *
 * 逆向: ef class trigger in PZT (1472_tui_components/actions_intents.js)
 * The @ trigger opens a file autocomplete overlay that fuzzy-searches
 * file paths in the workspace.
 */

export interface AtMention {
  /** Index of the @ character in the text */
  triggerIndex: number;
  /** Text typed after @ (the fuzzy search query) */
  query: string;
}

/**
 * Detect an active @-mention at the cursor position.
 * Returns null if the cursor is not inside an @-mention.
 *
 * An @-mention is triggered when:
 * 1. There's an @ preceded by a space or at position 0
 * 2. The cursor is between the @ and the next space (or end of text)
 */
export function detectAtMention(text: string, cursorPosition: number): AtMention | null {
  // Scan backward from cursor to find the @ trigger
  const beforeCursor = text.slice(0, cursorPosition);

  // Find the last @ that could be a trigger
  let atIndex = -1;
  for (let i = beforeCursor.length - 1; i >= 0; i--) {
    if (beforeCursor[i] === "@") {
      // @ must be preceded by a space or be at position 0
      if (i === 0 || beforeCursor[i - 1] === " " || beforeCursor[i - 1] === "\n") {
        atIndex = i;
        break;
      }
      // Otherwise it's an email-like @ — skip
      return null;
    }
    // If we hit a space before finding @, no active trigger
    if (beforeCursor[i] === " " || beforeCursor[i] === "\n") {
      break;
    }
  }

  if (atIndex === -1) return null;

  const query = beforeCursor.slice(atIndex + 1);

  // Query should not contain spaces (that would end the mention)
  if (query.includes(" ")) return null;

  return { triggerIndex: atIndex, query };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/cli && bun test src/widgets/__tests__/file-autocomplete.test.ts`
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/widgets/file-autocomplete.ts packages/cli/src/widgets/__tests__/file-autocomplete.test.ts
git commit -m "feat(cli): add @-mention detection for file autocomplete triggers"
```
