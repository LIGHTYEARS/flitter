# Gap U11: `sessionId` Accepted in HeaderBar Props but Unused

## Status: Proposal
## Affected packages: `flitter-amp`

---

## 1. Problem Statement

The `HeaderBar` widget at `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/header-bar.ts` declares `sessionId: string | null` in its `HeaderBarProps` interface (line 17) and stores it in `this.props` via the constructor (lines 23-29), but **never renders, displays, or otherwise uses the value**.

In the `build()` method (lines 31-77), the destructuring on line 32 explicitly omits `sessionId`:

```typescript
const { agentName, mode, usage, isProcessing } = this.props;
```

The `sessionId` prop is dead code. It increases the interface surface area without providing any functionality, and any caller constructing a `HeaderBar` must supply a `sessionId` value that is silently discarded.

---

## 2. Current Code Analysis

### 2.1 The HeaderBar Widget in Full

The entire `HeaderBar` source file (`header-bar.ts`, 79 lines) is structured as follows:

```typescript
// HeaderBar -- top status bar showing agent info, mode, and cost
// Amp ref: ContainerWithOverlays with top overlays on the border

import { StatelessWidget, Widget } from 'flitter-core/src/framework/widget';
import { Row } from 'flitter-core/src/widgets/flex';
import { Expanded } from 'flitter-core/src/widgets/flexible';
import { Text } from 'flitter-core/src/widgets/text';
import { TextStyle } from 'flitter-core/src/core/text-style';
import { TextSpan } from 'flitter-core/src/core/text-span';
import { Color } from 'flitter-core/src/core/color';
import { Padding } from 'flitter-core/src/widgets/padding';
import { EdgeInsets } from 'flitter-core/src/layout/edge-insets';
import type { UsageInfo } from '../acp/types';

interface HeaderBarProps {
  agentName: string;
  sessionId: string | null;     // <-- UNUSED: accepted but never read
  mode: string | null;
  usage: UsageInfo | null;
  isProcessing: boolean;
}

export class HeaderBar extends StatelessWidget {
  private readonly props: HeaderBarProps;

  constructor(props: HeaderBarProps) {
    super({});
    this.props = props;
  }

  build(): Widget {
    // sessionId is NOT destructured here -- it is silently ignored
    const { agentName, mode, usage, isProcessing } = this.props;

    // Left side: agent name + mode
    const leftParts: string[] = [` ${agentName}`];
    if (mode) leftParts.push(`[${mode}]`);
    if (isProcessing) leftParts.push('\u23F3');

    const leftText = leftParts.join(' ');

    // Right side: context usage + cost
    let rightText = '';
    if (usage) {
      rightText = `${usage.used} / ${usage.size}`;
      if (usage.cost) {
        rightText += ` (${usage.cost.currency}${usage.cost.amount.toFixed(4)})`;
      }
      rightText += ' ';
    }

    return new Padding({
      padding: EdgeInsets.symmetric({ vertical: 0, horizontal: 1 }),
      child: new Row({
        children: [
          new Expanded({
            child: new Text({
              text: new TextSpan({
                text: leftText,
                style: new TextStyle({
                  foreground: Color.cyan,
                  bold: true,
                }),
              }),
            }),
          }),
          new Text({
            text: new TextSpan({
              text: rightText,
              style: new TextStyle({
                foreground: Color.brightBlack,
              }),
            }),
          }),
        ],
      }),
    });
  }
}
```

The widget renders a simple two-part row: the left side shows the agent name, mode badge, and a processing indicator; the right side shows token usage and cost. The `sessionId` appears nowhere in the `build()` output.

### 2.2 HeaderBar Is Orphaned -- Zero Consumers

A comprehensive search across the entire `flitter-amp/src` directory reveals that `new HeaderBar(...)` is **never called anywhere**. The widget exists in the source tree but is not instantiated in the application:

- **`app.ts`** (the root widget): Does not import or reference `HeaderBar`. The main layout is a `Column` containing an `Expanded` chat area and a `BottomGrid` widget.
- **No other source file** imports from `'./header-bar'` or `'../widgets/header-bar'`.
- **No test file** references `HeaderBar`.

### 2.3 Phase 7 Already Called for HeaderBar Deletion

The Phase 7 visual alignment plan (`/home/gem/workspace/flitter/packages/flitter-amp/.planning/PHASE7-VISUAL-ALIGNMENT.md`) explicitly marks `header-bar.ts` for **deletion** in Task 7.1:

> **Task 7.1 -- Remove HeaderBar, Add StatusBar (bottom)**
>
> Files: `src/app.ts` (modify), `src/widgets/status-bar.ts` (new), `src/widgets/header-bar.ts` (**delete**)
>
> What changes: Remove `HeaderBar` from the Column layout at the top

Phase 7 was executed: `StatusBar` was created as a replacement, and was subsequently superseded by `BottomGrid` (`/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/bottom-grid.ts`), which implements the full Amp four-corner overlay system. `StatusBar` itself is now deprecated (line 7 and line 26 of `status-bar.ts`):

```typescript
// @deprecated Use BottomGrid instead, which implements Amp's 4-corner overlay system.
/** @deprecated Use {@link BottomGrid} instead, which implements Amp's 4-corner overlay system. */
export class StatusBar extends StatelessWidget {
```

### 2.4 Where sessionId Lives in the Architecture

The `sessionId` flows through the application as follows:

1. **ACP connection** (`/home/gem/workspace/flitter/packages/flitter-amp/src/acp/connection.ts`, line 75): `connectToAgent()` returns a `ConnectionHandle` with `sessionId: sessionResponse.sessionId`.

2. **AppState** (`/home/gem/workspace/flitter/packages/flitter-amp/src/state/app-state.ts`, line 19): `sessionId: string | null = null` is stored on the state object.

3. **setConnected()** (`app-state.ts`, lines 204-208): Called from `index.ts` line 48 with `handle.sessionId`, which stores it on `AppState`.

4. **Usage in `index.ts`**: The `sessionId` is used operationally for `sendPrompt()` (line 94), `onPromptComplete()` (line 95), and `cancelPrompt()` (line 111). These are ACP protocol operations, not display concerns.

5. **Debug logging**: `connection.ts` line 67 logs `Session created: ${sessionResponse.sessionId}` and `index.ts` line 90 logs `handleSubmit called: "${text}", sessionId: ${handle.sessionId}`.

The `sessionId` is an opaque ACP protocol identifier (typically a UUID) used for routing messages between the client and agent. The real Amp CLI does **not** display the session ID in any visible UI element.

### 2.5 The Replacement Widget (BottomGrid) Does Not Have sessionId

The `BottomGridProps` interface (`/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/bottom-grid.ts`, lines 15-31) does not include `sessionId`:

```typescript
interface BottomGridProps {
  onSubmit: (text: string) => void;
  isProcessing: boolean;
  currentMode: string;
  agentName?: string;
  agentMode?: string;
  cwd: string;
  gitBranch?: string;
  tokenUsage?: UsageInfo;
  shellMode?: boolean;
  hintText?: string;
  submitWithMeta?: boolean;
  topWidget?: Widget;
  autocompleteTriggers?: AutocompleteTrigger[];
  imageAttachments?: number;
  skillCount?: number;
}
```

This confirms that session ID display was never part of the intended active UI design.

---

## 3. Analysis of Options

### Option A: Display the sessionId in HeaderBar

This would mean rendering the `sessionId` somewhere in the header -- for example, as a truncated identifier next to the agent name.

**Arguments for:**
- Could be useful during development and debugging ACP connections
- Some terminal UIs display session/connection identifiers for power users
- The prop already exists; just need to wire it into the build output

**Arguments against:**
- The Amp reference CLI **never** displays session IDs in its UI; doing so would diverge from Amp fidelity
- Session IDs are opaque UUIDs with no semantic meaning to users
- The `HeaderBar` widget is not instantiated anywhere -- it is orphaned code from pre-Phase-7 layout
- Adding display logic to a dead widget provides no user-visible benefit
- Screen real estate in a TUI is precious; an opaque ID would waste horizontal space
- Debug logging in `connection.ts` and `index.ts` already emits session IDs to the log file

### Option B: Remove the unused sessionId prop (Recommended)

This would clean the `HeaderBarProps` interface by removing the `sessionId` field.

**Arguments for:**
- Eliminates dead code and reduces interface surface area
- Aligns with the Phase 7 plan which already called for `HeaderBar` deletion
- No behavioral change since the prop was never used
- Follows the principle of keeping interfaces minimal and honest

**Arguments against:**
- Minor: if someone re-enables `HeaderBar` in the future, they would need to re-add the prop (trivial to do)

---

## 4. Recommended Approach: Remove with Extended Cleanup

Given that `HeaderBar` is entirely orphaned (never instantiated, superseded by `BottomGrid`), the cleanest resolution is a two-tier approach:

- **Tier 1 (Minimal fix):** Remove `sessionId` from `HeaderBarProps` to eliminate the dead prop.
- **Tier 2 (Full cleanup):** Delete the entire `header-bar.ts` file since it is unused, completing the Phase 7 plan. If the file is retained for reference, add a `@deprecated` annotation pointing users to `BottomGrid`.

---

## 5. Proposed Changes

### 5.1 Tier 1: Remove the Unused sessionId Prop

**File:** `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/header-bar.ts`

#### Diff

```diff
 interface HeaderBarProps {
   agentName: string;
-  sessionId: string | null;
   mode: string | null;
   usage: UsageInfo | null;
   isProcessing: boolean;
 }
```

This is a one-line removal. The `build()` method requires no changes because it never referenced `sessionId` in the first place. No other files need changes because no file constructs a `HeaderBar` instance.

### 5.2 Tier 2a: Delete the Entire File (Preferred Full Cleanup)

Since `HeaderBar` has zero consumers and is planned for removal:

```bash
rm packages/flitter-amp/src/widgets/header-bar.ts
```

Verify no imports remain:

```bash
grep -rn "from.*header-bar\|import.*HeaderBar" packages/flitter-amp/src/
# Expected: zero matches
```

### 5.3 Tier 2b: Deprecation Annotation (If File Is Retained)

If the file is retained rather than deleted, apply the deprecation annotation to match the pattern established by `StatusBar`:

```diff
 // HeaderBar -- top status bar showing agent info, mode, and cost
-// Amp ref: ContainerWithOverlays with top overlays on the border
+// Amp ref: ContainerWithOverlays with top overlays on the border
+//
+// @deprecated Use BottomGrid instead, which implements Amp's 4-corner overlay
+// system. HeaderBar was the original top-of-screen status widget, replaced
+// during Phase 7 visual alignment. Retained for reference only.

 import { StatelessWidget, Widget } from 'flitter-core/src/framework/widget';
 // ... imports unchanged ...

 interface HeaderBarProps {
   agentName: string;
-  sessionId: string | null;
   mode: string | null;
   usage: UsageInfo | null;
   isProcessing: boolean;
 }

+/** @deprecated Use {@link BottomGrid} instead, which implements Amp's 4-corner overlay system. */
 export class HeaderBar extends StatelessWidget {
```

---

## 6. Alternative Design: Display sessionId (Option A Detail)

For completeness, here is how `sessionId` rendering could be implemented if the decision were to display rather than remove it. This is **not the recommended approach** but is documented for reference.

### 6.1 Simple Truncated Display in Left Section

The `sessionId` (typically a UUID like `sess_a1b2c3d4e5f6`) could be truncated and appended to the left-side text:

```diff
   build(): Widget {
-    const { agentName, mode, usage, isProcessing } = this.props;
+    const { agentName, sessionId, mode, usage, isProcessing } = this.props;

     // Left side: agent name + mode
     const leftParts: string[] = [` ${agentName}`];
+    if (sessionId) {
+      const shortId = sessionId.length > 8 ? sessionId.slice(0, 8) : sessionId;
+      leftParts.push(`(${shortId})`);
+    }
     if (mode) leftParts.push(`[${mode}]`);
     if (isProcessing) leftParts.push('\u23F3');
```

This would render as: ` Claude (a3f8c2e1) [smart]` in the left section.

### 6.2 Rich TextSpan Approach with Differentiated Styling

For a more polished version, the session ID could use a distinct dim/muted style separate from the bold cyan agent name by converting the left section from a simple string concatenation to a `TextSpan` children array:

```typescript
build(): Widget {
  const { agentName, sessionId, mode, usage, isProcessing } = this.props;

  const leftSpans: TextSpan[] = [];

  // Agent name: bold cyan
  leftSpans.push(new TextSpan({
    text: ` ${agentName}`,
    style: new TextStyle({ foreground: Color.cyan, bold: true }),
  }));

  // Session ID: dim brightBlack (if present)
  if (sessionId) {
    const shortId = sessionId.length > 8 ? sessionId.slice(0, 8) : sessionId;
    leftSpans.push(new TextSpan({
      text: ` (${shortId})`,
      style: new TextStyle({ foreground: Color.brightBlack, dim: true }),
    }));
  }

  // Mode badge: bold cyan
  if (mode) {
    leftSpans.push(new TextSpan({
      text: ` [${mode}]`,
      style: new TextStyle({ foreground: Color.cyan, bold: true }),
    }));
  }

  // Processing indicator
  if (isProcessing) {
    leftSpans.push(new TextSpan({
      text: ' \u23F3',
      style: new TextStyle({ foreground: Color.yellow }),
    }));
  }

  // ... right side unchanged, but use TextSpan children for left:
  return new Padding({
    padding: EdgeInsets.symmetric({ vertical: 0, horizontal: 1 }),
    child: new Row({
      children: [
        new Expanded({
          child: new Text({
            text: new TextSpan({ children: leftSpans }),
          }),
        }),
        // ... right side text unchanged
      ],
    }),
  });
}
```

### 6.3 Why Option A Is Not Recommended

1. **Amp fidelity**: The Amp CLI does not show session identifiers. Adding them would diverge from the reference.
2. **Dead widget**: `HeaderBar` is not mounted in the widget tree. Adding rendering logic to a never-instantiated widget provides zero user-visible benefit.
3. **Better alternatives exist**: The `log.info` calls in `connection.ts` (line 67) and `index.ts` (line 90) already emit session IDs to the debug log, which is the appropriate channel for protocol-level identifiers.
4. **Widget is marked for deletion**: The Phase 7 plan calls for removing the entire file, making any rendering work immediately obsolete.

---

## 7. Testing Strategy

### 7.1 Static Verification: No Call Sites Exist

The primary testing concern is ensuring that removing `sessionId` from the interface does not break any code. This is verified statically:

```bash
# Verify no file instantiates HeaderBar
grep -rn "new HeaderBar" packages/flitter-amp/src/
# Expected: no results

# Verify no file imports from header-bar
grep -rn "from.*header-bar" packages/flitter-amp/src/
# Expected: only header-bar.ts itself (its own import declarations, not from itself)

# Verify no file references HeaderBar class name outside the file
grep -rn "HeaderBar" packages/flitter-amp/src/ --include="*.ts" | grep -v header-bar.ts | grep -v __tests__ | grep -v .planning | grep -v .ref
# Expected: no results in source files
```

All three checks were performed during analysis and confirmed that the widget is entirely orphaned.

### 7.2 TypeScript Compilation Check

After making any change (Tier 1 or Tier 2), run the TypeScript compiler to ensure no type errors:

```bash
cd /home/gem/workspace/flitter/packages/flitter-amp
npx tsc --noEmit
```

Since `HeaderBar` is never instantiated, removing a field from its props interface (or deleting the file) cannot produce a type error anywhere in the project.

### 7.3 Existing Test Suite

Run the existing test suite to verify no regressions:

```bash
cd /home/gem/workspace/flitter/packages/flitter-amp
bun test
```

The existing test files in `src/__tests__/` are:

| Test File | Subject | References HeaderBar? |
|-----------|---------|----------------------|
| `app-layout.test.ts` | Root layout constraint chain | No |
| `chat-view.test.ts` | Chat message rendering | No |
| `layout-guardrails.test.ts` | Layout constraint validation | No |
| `markdown-rendering.test.ts` | Markdown content rendering | No |
| `tool-card-layout.test.ts` | Tool call card layout | No |
| `visual-snapshot.test.ts` | Visual output snapshots | No |
| `visual-cell-assertions.test.ts` | Cell-level visual assertions | No |
| `logger-process.test.ts` | Logger utility | No |

None of these test files import or reference `HeaderBar`. The change is zero-risk to existing tests.

### 7.4 New Unit Tests (If File Is Retained)

If `HeaderBar` is retained with the deprecation annotation rather than deleted, a minimal unit test documents its behavioral contract and prevents future regressions:

```typescript
// File: packages/flitter-amp/src/__tests__/header-bar.test.ts
import { describe, test, expect } from 'bun:test';
import { HeaderBar } from '../widgets/header-bar';

describe('HeaderBar (deprecated)', () => {
  test('constructs without sessionId in props', () => {
    const bar = new HeaderBar({
      agentName: 'TestAgent',
      mode: 'smart',
      usage: null,
      isProcessing: false,
    });
    expect(bar).toBeDefined();
  });

  test('build returns a widget tree with no errors', () => {
    const bar = new HeaderBar({
      agentName: 'TestAgent',
      mode: null,
      usage: null,
      isProcessing: false,
    });
    const widget = bar.build();
    expect(widget).toBeDefined();
  });

  test('handles all props being populated', () => {
    const bar = new HeaderBar({
      agentName: 'Claude',
      mode: 'smart',
      usage: {
        size: 200000,
        used: 50000,
        cost: { amount: 0.0234, currency: '$' },
      },
      isProcessing: true,
    });
    const widget = bar.build();
    expect(widget).toBeDefined();
  });

  test('handles null mode gracefully', () => {
    const bar = new HeaderBar({
      agentName: 'Claude',
      mode: null,
      usage: null,
      isProcessing: false,
    });
    // Should not throw when mode is null
    const widget = bar.build();
    expect(widget).toBeDefined();
  });

  test('handles usage without cost', () => {
    const bar = new HeaderBar({
      agentName: 'Claude',
      mode: null,
      usage: { size: 128000, used: 5000 },
      isProcessing: false,
    });
    const widget = bar.build();
    expect(widget).toBeDefined();
  });
});
```

These tests verify that the widget constructs and builds without errors across various prop combinations, confirming that the `sessionId` removal introduces no regressions. If the file is deleted (Tier 2a), these tests are unnecessary.

### 7.5 Integration Test (If Option A Were Chosen)

If the decision were to display `sessionId` (not recommended), the following visual assertion test would verify the rendering:

```typescript
test('renders truncated session ID when provided', () => {
  const bar = new HeaderBar({
    agentName: 'Claude',
    sessionId: 'sess_a1b2c3d4e5f67890',
    mode: 'smart',
    usage: null,
    isProcessing: false,
  });
  const widget = bar.build();
  // Would need to traverse the widget tree to inspect the TextSpan content
  // and verify it contains '(sess_a1b' or similar truncated form.
  expect(widget).toBeDefined();
});

test('renders cleanly when sessionId is null', () => {
  const bar = new HeaderBar({
    agentName: 'Claude',
    sessionId: null,
    mode: 'smart',
    usage: null,
    isProcessing: false,
  });
  const widget = bar.build();
  // Verify no "(null)" or empty parens appear in the output
  expect(widget).toBeDefined();
});
```

### 7.6 Manual Visual Verification (Not Applicable for Current State)

Since `HeaderBar` is not currently mounted in the widget tree, manual visual verification is not possible without temporarily re-adding it to `app.ts`. If someone were to re-enable the widget for testing:

1. Launch flitter-amp with an ACP agent: `bun run src/index.ts --agent "claude --agent"`
2. Verify the header bar renders correctly without any empty space or `null` text where `sessionId` was
3. Verify the layout: ` [AgentName] [mode]` on the left, `[tokens] / [total] ($cost)` on the right
4. Verify no runtime errors appear in the debug log

---

## 8. Impact Assessment

### Files Modified

| File | Change | Risk |
|------|--------|------|
| `packages/flitter-amp/src/widgets/header-bar.ts` | Remove `sessionId` from `HeaderBarProps` (Tier 1) or delete file (Tier 2a) | None -- widget is orphaned |

### Files Not Modified

| File | Reason |
|------|--------|
| `src/app.ts` | Does not import or use `HeaderBar` |
| `src/state/app-state.ts` | `sessionId` field remains for ACP protocol use (unrelated) |
| `src/index.ts` | Uses `handle.sessionId` for ACP calls, not UI display |
| `src/acp/connection.ts` | `sessionId` in `ConnectionHandle` is protocol-level |
| `src/widgets/bottom-grid.ts` | Active replacement widget; unaffected |
| `src/widgets/status-bar.ts` | Deprecated replacement; unaffected |

### Breaking Change Risk

**None.** The `HeaderBarProps` interface is file-local (not exported separately). The `HeaderBar` class is exported but never imported or instantiated by any other module. Removing `sessionId` from the props -- or deleting the file entirely -- has zero downstream impact.

### Amp Fidelity Impact

**Positive.** The Amp reference UI does not display session IDs. Removing the unused prop (or deleting the file) brings the codebase closer to the Amp design intent and completes the Phase 7 cleanup.

---

## 9. Relationship to Other Gaps and Plans

### Phase 7 Visual Alignment

Task 7.1 explicitly calls for deleting `header-bar.ts`. This gap (U11) addresses the narrower concern of the unused prop, but the broader resolution is fully aligned with Phase 7. Completing this gap can be an incremental step toward finishing Phase 7.

### sessionId in AppState

The `sessionId` field on `AppState` (line 19 of `app-state.ts`) is **not** affected by this change. It continues to serve as the ACP protocol session identifier used by `sendPrompt()`, `onPromptComplete()`, and `cancelPrompt()` in `index.ts`. The gap is solely about the unused prop in the display widget.

### StatusBar Deprecation Precedent

The `StatusBar` widget at `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/status-bar.ts` already demonstrates the deprecation pattern with both a file-level comment and a JSDoc `@deprecated` tag. If `HeaderBar` is retained rather than deleted, it should follow the same pattern for consistency.

---

## 10. Recommendation Summary

| Tier | Action | Scope | Recommendation |
|------|--------|-------|----------------|
| **Tier 1** | Remove `sessionId` from `HeaderBarProps` | 1 line removal in 1 file | Implement immediately |
| **Tier 2a** | Delete `header-bar.ts` entirely | File deletion | Implement as Phase 7 cleanup |
| **Tier 2b** | Add `@deprecated` annotation | 4 lines added | Implement only if file is retained for reference |

The recommended path is **Tier 1 now, Tier 2a in the next cleanup pass**. The `sessionId` prop should be removed because it is dead code that increases interface complexity without providing any value. The broader question of whether `HeaderBar` itself should be deleted is a separate concern best addressed as part of completing the Phase 7 visual alignment plan.

The `sessionId` prop in `HeaderBar` is a textbook case of a dead interface field: declared, accepted, stored, but never read. The cleanest fix is to delete the entire file (Tier 2a). If deletion is premature, stripping the unused prop (Tier 1) restores interface honesty with a single-line change. Rendering the session ID (Option A) is the wrong direction -- it would add meaningless noise to a widget that is not even mounted in the widget tree.
