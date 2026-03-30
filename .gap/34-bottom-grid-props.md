# Gap U12: Multiple BottomGrid Props Not Wired from App

## Problem Statement

`BottomGrid` in `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/bottom-grid.ts`
declares seven optional props in its `BottomGridProps` interface (lines 15-31) that are never
passed by the sole instantiation site in `App` at
`/home/gem/workspace/flitter/packages/flitter-amp/src/app.ts` (lines 254-266).

The props in question:

| Prop | Type | Default in BottomGrid | Passed from App? |
|------|------|-----------------------|------------------|
| `agentMode` | `string?` | `undefined` | No |
| `shellMode` | `boolean?` | `false` | No |
| `hintText` | `string?` | `undefined` | No |
| `submitWithMeta` | `boolean?` | `true` | No |
| `topWidget` | `Widget?` | `undefined` | No |
| `autocompleteTriggers` | `AutocompleteTrigger[]?` | `undefined` | No |
| `imageAttachments` | `number?` | `0` | No |

The `App` build method at line 254 constructs `BottomGrid` with only these props:

```typescript
// app.ts lines 254-266
new BottomGrid({
  onSubmit: (text: string) => {
    this.promptHistory.push(text);
    this.widget.onSubmit(text);
  },
  isProcessing: appState.isProcessing,
  currentMode: appState.currentMode ?? 'smart',
  agentName: appState.agentName ?? undefined,
  cwd: appState.cwd,
  gitBranch: appState.gitBranch ?? undefined,
  tokenUsage: appState.usage ?? undefined,
  skillCount: appState.skillCount,
}),
```

All seven missing props silently fall back to their constructor defaults. This makes
it unclear whether the omission is intentional (relying on defaults) or accidental
(forgot to wire them).

## Data Flow Architecture

To understand the gap, it helps to see the full prop flow:

```
AppState (state/app-state.ts)
  |
  v
App / AppStateWidget (app.ts)
  |  constructs BottomGrid with a subset of props
  v
BottomGrid (widgets/bottom-grid.ts)
  |  reads some props in build helpers
  |  forwards most to InputArea
  v
InputArea (widgets/input-area.ts)
  |  renders the text field, mode label, badges, autocomplete, overlays
```

`BottomGrid` plays two roles:
1. **Own rendering** -- builds the bottom-left hint text (`buildBottomLeft`), bottom-right
   cwd/branch display (`buildBottomRight`), and top-left token usage display (`buildTopLeft`).
2. **Forwarding** -- passes `submitWithMeta`, `topWidget`, `autocompleteTriggers`,
   `imageAttachments`, and `skillCount` directly to `InputArea` at lines 95-105.

## Detailed Analysis of Each Prop

### 1. `agentMode` -- Dead prop; never read in build

**Declaration**: `BottomGridProps` line 20, class field line 38, assignment line 56.

`agentMode` is stored on the `BottomGrid` instance at line 56 but is **never referenced** in
`BottomGridState.build()`. It is not passed to `InputArea` and is not used in any of the three
private build methods (`buildTopLeft`, `buildBottomLeft`, `buildBottomRight`).

A grep for `w.agentMode` or `this.widget.agentMode` in `bottom-grid.ts` returns zero matches.
The `InputArea` handles mode display using its own `mode` prop, which receives `w.currentMode`
from BottomGrid (line 98). The `agentModeColor()` function referenced in `input-area.ts`
line 153 operates on the `effectiveLabel` string derived from `mode`, not on a separate
`agentMode` field.

`AppState` has no `agentMode` field. It has `currentMode` (line 21 of app-state.ts) which
is updated via the `current_mode_update` session event (line 136). There is no separate
"agent mode" concept in the ACP protocol.

**Verdict: Remove.** This is dead code inside `BottomGrid`. The `currentMode` prop already
carries the mode identifier (e.g., `"smart"`, `"rush"`) which is forwarded to `InputArea`
as its `mode` prop. There is no additional "agent mode" concept that would justify a
separate field.

### 2. `shellMode` -- Dead prop; never read in build

**Declaration**: `BottomGridProps` line 24, class field line 42, assignment line 60.

`shellMode` is stored at line 60 (`this.shellMode = props.shellMode ?? false`) but is
**never referenced** in `BottomGridState.build()`. A grep for `w.shellMode` or
`this.widget.shellMode` in `bottom-grid.ts` returns zero matches.

Shell mode detection is handled entirely within `InputArea` via the local
`detectShellMode(text)` function (input-area.ts line 245), which inspects the current text
input for `$` and `$$` prefixes at runtime:

```typescript
// input-area.ts lines 245-249
function detectShellMode(text: string): ShellMode {
  if (text.startsWith('$$')) return 'background';
  if (text.startsWith('$')) return 'shell';
  return null;
}
```

This is a text-field-local concern. The `InputAreaState` calls `detectShellMode` on the
controller text (line 101) and uses the result to select the border color (lines 103-105)
and label (line 144). No external prop is needed.

**Verdict: Remove.** Shell mode is correctly detected locally in `InputArea` based on user
input. A boolean prop on `BottomGrid` would be redundant and potentially conflicting with
the live text-based detection. No state in `AppState` tracks shell mode -- it is purely
ephemeral UI state derived from the current text field content.

### 3. `hintText` -- Actively used in build; should be wired when feature exists

**Declaration**: `BottomGridProps` line 25, class field line 43, assignment line 61.

`hintText` **is** actively consumed in `BottomGridState.buildBottomLeft()` at line 161:

```typescript
// bottom-grid.ts lines 161-168
if (w.hintText) {
  return new Text({
    text: new TextSpan({
      text: w.hintText,
      style: new TextStyle({ foreground: mutedColor, dim: true }),
    }),
  });
}
```

When `hintText` is set, it overrides the default bottom-left status text entirely. The
normal behavior shows "Esc to cancel" during processing (lines 170-185) and "? for
shortcuts" when idle (lines 187-200). A non-null `hintText` short-circuits both of
these, displaying custom text instead.

This is a useful feature for showing contextual hints during special states such as:
- File picker activation ("Type to search files...")
- Agent handoff prompts ("Waiting for agent response...")
- Multi-step operations ("Step 2 of 3: select target...")

However, `AppState` currently has no `hintText` field, and the `session_info_update`
handler in `AppState.onSessionUpdate()` (line 140) is a no-op placeholder:

```typescript
// app-state.ts lines 140-143
case 'session_info_update': {
  // Session metadata update
  break;
}
```

**Verdict: Retain in BottomGrid interface; wire when a data source exists.** The prop is
actively consumed in the build method. The wiring from `App` should happen when `AppState`
gains a `hintText` field, which could be populated from the `session_info_update` event
or from local UI state (e.g., file picker or command palette activation).

### 4. `submitWithMeta` -- Forwarded to InputArea; should be wired now

**Declaration**: `BottomGridProps` line 26, class field line 44, assignment line 62.

`submitWithMeta` is forwarded to `InputArea` at line 99:

```typescript
// bottom-grid.ts lines 95-105
const inputArea = new InputArea({
  onSubmit: w.onSubmit,
  isProcessing: w.isProcessing,
  mode: w.currentMode,
  submitWithMeta: w.submitWithMeta,  // <-- forwarded here
  topWidget: w.topWidget,
  autocompleteTriggers: w.autocompleteTriggers,
  imageAttachments: w.imageAttachments,
  skillCount: w.skillCount,
  overlayTexts,
});
```

**Default value discrepancy**: `BottomGrid` defaults `submitWithMeta` to `true` (line 62),
while `InputArea` defaults it to `false` (input-area.ts line 51). Since `App` never passes
the prop, `BottomGrid` uses its own default of `true` and forwards it to `InputArea`,
overriding `InputArea`'s default of `false`. The effective behavior is `true` (Enter submits),
which is the correct default for a CLI chat interface.

However, this reliance on cascading defaults across two widget layers is fragile and
confusing. If someone changes `BottomGrid`'s default without realizing the downstream
effect, the behavior silently changes.

**Verdict: Wire explicitly now.** Pass `submitWithMeta: true` from `App` to make the
intent clear and eliminate the fragile default chain. This requires no new state -- just
an explicit literal value.

### 5. `topWidget` -- Forwarded to InputArea; latent extension point

**Declaration**: `BottomGridProps` line 27, class field line 45, assignment line 63.

`topWidget` is forwarded to `InputArea` at line 100, where it is rendered above the
text field in a Column (input-area.ts lines 233-239):

```typescript
// input-area.ts lines 233-239
if (this.widget.topWidget) {
  return new Column({
    mainAxisSize: 'min',
    crossAxisAlignment: 'stretch',
    children: [this.widget.topWidget, inputWidget],
  });
}
```

This is a slot for placing arbitrary content above the input area. Possible uses:
- Token cost warning banner when approaching context window limit
- Attached file preview strip (showing thumbnails of attached images)
- "Thinking..." progress indicator during extended agent processing
- Context window usage meter

**Verdict: Retain but do not wire yet.** This is an extension point for future features.
No current state in `AppState` produces a top widget. The prop should remain in the
interface for forward compatibility, and `App` should only pass it once a concrete use
case is implemented. The `undefined` default results in the `Column` wrapper being skipped,
which is the correct no-op behavior.

### 6. `autocompleteTriggers` -- Forwarded to InputArea; wire when feature exists

**Declaration**: `BottomGridProps` line 28, class field line 46, assignment line 64.

`autocompleteTriggers` is forwarded to `InputArea` at line 101 and merged with the
default `@` file trigger at input-area.ts lines 120-133:

```typescript
// input-area.ts lines 120-133
const defaultFileTrigger: AutocompleteTrigger = {
  triggerCharacter: '@',
  optionsBuilder: () => [],  // currently returns no options
};
const triggers: AutocompleteTrigger[] = [
  defaultFileTrigger,
  ...(this.widget.autocompleteTriggers ?? []),
];
const autocompleteWrapped = new Autocomplete({
  child: textField,
  controller: this.controller,
  triggers,
});
```

Currently the `@` trigger's `optionsBuilder` returns an empty array, so autocomplete
is a non-functional skeleton. Additional triggers (e.g., `/` for slash commands, `#` for
issue references) would need to be injected from the `App` level.

The `AutocompleteTrigger` type is imported from `flitter-core/src/widgets/autocomplete`
(bottom-grid.ts line 13), confirming this is backed by real autocomplete infrastructure
in the core framework.

**Verdict: Retain; wire when autocomplete is implemented.** The plumbing exists end-to-end
but the feature has no data source. When file system scanning, slash command lists, or
ACP-provided completions are available, triggers should be constructed in
`AppStateWidget.build()` and passed through. Until then, the prop remains `undefined`,
which correctly results in only the empty `@` trigger being active.

### 7. `imageAttachments` -- Forwarded to InputArea; wire when feature exists

**Declaration**: `BottomGridProps` line 29, class field line 47, assignment line 65.

`imageAttachments` is forwarded to `InputArea` at line 102 and rendered as a badge
overlay at input-area.ts lines 192-206:

```typescript
// input-area.ts lines 192-206
if (this.widget.imageAttachments > 0) {
  const badgeColor = theme?.base.info ?? Color.blue;
  overlays.push(
    new Positioned({
      bottom: 0,
      left: 1,
      child: new Text({
        text: new TextSpan({
          text: ` [${this.widget.imageAttachments} image${this.widget.imageAttachments > 1 ? 's' : ''}] `,
          style: new TextStyle({ foreground: badgeColor }),
        }),
      }),
    }),
  );
}
```

The badge shows "[1 image]" or "[N images]" in the bottom-left border of the input area.
The ACP protocol's `PromptRequest` supports multi-modal content (the `prompt` field
accepts `type: 'image'` content), so image attachment is a real planned feature.

Image attachment tracking requires state management: the user would attach images
(e.g., via a file picker, paste, or drag-and-drop), and the count would be maintained
in `AppState`. The `sendPrompt()` function in `connection.ts` (line 91) currently only
sends `type: 'text'` content, but the ACP SDK supports image content as well.

**Verdict: Retain; wire when image attachment feature is built.** Add an
`imageAttachments` count (or a full `attachments` array for metadata) to `AppState`,
and pass the count through. Until then, the prop defaults to `0` and the badge is
hidden -- this is correct no-op behavior.

## Root Cause

The gap exists because `BottomGrid` was designed with a forward-looking interface
anticipating future capabilities, but `App` was implemented incrementally, wiring only
the props that had immediate data sources in `AppState`. The `AppState` class currently
tracks only these fields (from `app-state.ts` lines 18-26):

```typescript
readonly conversation = new ConversationState();
sessionId: string | null = null;
agentName: string | null = null;
currentMode: string | null = null;
isConnected = false;
error: string | null = null;
cwd: string = process.cwd();
gitBranch: string | null = null;
skillCount: number = 0;
```

It does not track `hintText`, `imageAttachments`, `autocompleteTriggers`, `topWidget`,
or `submitWithMeta`.

Additionally, two props (`agentMode` and `shellMode`) were defined in `BottomGrid` but
are genuinely dead -- they are stored in the constructor but never read by any method in
`BottomGridState`. These appear to have been added during initial interface design and
never pruned after the actual build logic was implemented.

## Recommendation Summary

| Prop | Action | Priority | Rationale |
|------|--------|----------|-----------|
| `agentMode` | **Remove from BottomGrid** | Now | Dead code -- stored but never read in build. `currentMode` already serves this purpose. |
| `shellMode` | **Remove from BottomGrid** | Now | Dead code -- stored but never read. Shell mode is detected locally in InputArea from text content. |
| `submitWithMeta` | **Wire explicitly from App** | Now | Forwarded to InputArea and affects submit behavior. Defaults work correctly today, but explicit wiring removes a fragile default chain across two widget layers. |
| `hintText` | **Retain interface; wire later** | Deferred | Actively consumed in `buildBottomLeft`. Add `hintText` to `AppState` when contextual hints are needed. |
| `topWidget` | **Retain interface; do not wire yet** | Deferred | Extension point forwarded to InputArea. No current data source. |
| `autocompleteTriggers` | **Retain interface; wire later** | Deferred | Forwarded to InputArea. Autocomplete infrastructure exists but has no data source yet. |
| `imageAttachments` | **Retain interface; wire later** | Deferred | Forwarded to InputArea. Renders badge overlay. No data source in AppState yet. |

## Implementation

### Step 1: Remove Dead Props from BottomGrid

Remove `agentMode` and `shellMode` from the interface, class fields, and constructor
in `bottom-grid.ts`:

```diff
diff --git a/packages/flitter-amp/src/widgets/bottom-grid.ts b/packages/flitter-amp/src/widgets/bottom-grid.ts
--- a/packages/flitter-amp/src/widgets/bottom-grid.ts
+++ b/packages/flitter-amp/src/widgets/bottom-grid.ts
@@ -15,12 +15,10 @@
 interface BottomGridProps {
   onSubmit: (text: string) => void;
   isProcessing: boolean;
   currentMode: string;
   agentName?: string;
-  agentMode?: string;
   cwd: string;
   gitBranch?: string;
   tokenUsage?: UsageInfo;
-  shellMode?: boolean;
   hintText?: string;
   submitWithMeta?: boolean;
   topWidget?: Widget;
@@ -33,14 +31,12 @@
 export class BottomGrid extends StatefulWidget {
   readonly onSubmit: (text: string) => void;
   readonly isProcessing: boolean;
   readonly currentMode: string;
   readonly agentName: string | undefined;
-  readonly agentMode: string | undefined;
   readonly cwd: string;
   readonly gitBranch: string | undefined;
   readonly tokenUsage: UsageInfo | undefined;
-  readonly shellMode: boolean;
   readonly hintText: string | undefined;
   readonly submitWithMeta: boolean;
   readonly topWidget: Widget | undefined;
@@ -53,10 +49,8 @@
     this.isProcessing = props.isProcessing;
     this.currentMode = props.currentMode;
     this.agentName = props.agentName;
-    this.agentMode = props.agentMode;
     this.cwd = props.cwd;
     this.gitBranch = props.gitBranch;
     this.tokenUsage = props.tokenUsage;
-    this.shellMode = props.shellMode ?? false;
     this.hintText = props.hintText;
     this.submitWithMeta = props.submitWithMeta ?? true;
```

**Lines removed**: 6 lines total (2 from interface, 2 from class, 2 from constructor).
The `AutocompleteTrigger` import on line 13 remains because it is still used by the
retained `autocompleteTriggers` prop.

### Step 2: Wire `submitWithMeta` from App

Pass it explicitly in `app.ts` to make the intent clear:

```diff
diff --git a/packages/flitter-amp/src/app.ts b/packages/flitter-amp/src/app.ts
--- a/packages/flitter-amp/src/app.ts
+++ b/packages/flitter-amp/src/app.ts
@@ -254,6 +254,7 @@
           new BottomGrid({
             onSubmit: (text: string) => {
               this.promptHistory.push(text);
               this.widget.onSubmit(text);
             },
             isProcessing: appState.isProcessing,
             currentMode: appState.currentMode ?? 'smart',
             agentName: appState.agentName ?? undefined,
             cwd: appState.cwd,
             gitBranch: appState.gitBranch ?? undefined,
             tokenUsage: appState.usage ?? undefined,
             skillCount: appState.skillCount,
+            submitWithMeta: true,
           }),
```

This explicitly documents the design decision: Enter submits the prompt. The value
`true` flows through `BottomGrid` to `InputArea.submitWithMeta`, eliminating the
ambiguity of cascading defaults across two widget constructors.

### Step 3 (Future): Add State Fields for Remaining Props

When implementing the features that require these props, add the corresponding fields
to `AppState` in `state/app-state.ts`:

```typescript
// In AppState (future additions)
import type { AutocompleteTrigger } from 'flitter-core/src/widgets/autocomplete';

export class AppState implements ClientCallbacks {
  // ...existing fields...

  /** Contextual hint shown below the input area, overriding the default "? for shortcuts" text */
  hintText: string | null = null;

  /** Number of images attached to the next prompt */
  imageAttachments: number = 0;

  /** Custom autocomplete triggers from agent configuration or ACP extensions */
  autocompleteTriggers: AutocompleteTrigger[] = [];

  // Methods to update these fields:

  setHintText(text: string | null): void {
    this.hintText = text;
    this.notifyListeners();
  }

  addImageAttachment(): void {
    this.imageAttachments++;
    this.notifyListeners();
  }

  removeImageAttachment(): void {
    if (this.imageAttachments > 0) {
      this.imageAttachments--;
      this.notifyListeners();
    }
  }

  clearImageAttachments(): void {
    this.imageAttachments = 0;
    this.notifyListeners();
  }
}
```

Then wire them in `App.build()` inside `AppStateWidget`:

```typescript
// In app.ts AppStateWidget.build(), at the BottomGrid construction:
new BottomGrid({
  // ...existing props...
  hintText: appState.hintText ?? undefined,
  imageAttachments: appState.imageAttachments,
  autocompleteTriggers: appState.autocompleteTriggers.length > 0
    ? appState.autocompleteTriggers
    : undefined,
  submitWithMeta: true,
}),
```

### Step 4 (Future): Populate State from ACP Events

The `session_info_update` case in `AppState.onSessionUpdate()` (line 140 of
`app-state.ts`) currently does nothing:

```typescript
case 'session_info_update': {
  // Session metadata update
  break;
}
```

This is the natural place to extract agent-provided metadata such as:
- Available autocomplete triggers (slash commands, file references)
- Mode-specific hint text
- Feature capability flags (e.g., "agent supports image input")

When the ACP protocol or agent extensions carry such data, the handler would be:

```typescript
case 'session_info_update': {
  if (update.hintText !== undefined) {
    this.hintText = update.hintText as string | null;
  }
  if (update.autocompleteTriggers !== undefined) {
    this.autocompleteTriggers = update.autocompleteTriggers as AutocompleteTrigger[];
  }
  break;
}
```

### Step 5 (Future): Image Attachments in the Prompt Pipeline

Image attachment wiring extends beyond just the UI badge. The full feature requires:

1. **State tracking** (Step 3 above): `AppState.imageAttachments` count.
2. **UI display** (already implemented in InputArea): the `[N images]` badge.
3. **Prompt submission**: Modify `sendPrompt()` in `connection.ts` to include image
   content in the prompt array:

```typescript
// connection.ts sendPrompt() -- future multi-modal support
export async function sendPrompt(
  connection: acp.ClientSideConnection,
  sessionId: string,
  text: string,
  images?: Array<{ data: string; mimeType: string }>,
): Promise<{ stopReason: string }> {
  const prompt: Array<{ type: string; text?: string; data?: string; mimeType?: string }> = [
    { type: 'text', text },
  ];
  if (images) {
    for (const img of images) {
      prompt.push({ type: 'image', data: img.data, mimeType: img.mimeType });
    }
  }
  const response = await connection.prompt({ sessionId, prompt });
  return { stopReason: (response as any).stopReason ?? 'end_turn' };
}
```

4. **Submission handler**: The `handleSubmit` callback in `app.ts` would need to
   gather attached images, pass them to `sendPrompt()`, and call
   `appState.clearImageAttachments()` after submission.

## Verification Steps

1. **After Step 1 (dead prop removal):**
   ```bash
   # Confirm agentMode and shellMode have no remaining references in bottom-grid.ts
   grep -n 'agentMode\|shellMode' packages/flitter-amp/src/widgets/bottom-grid.ts
   # Expected: zero matches
   ```

2. **After Step 2 (submitWithMeta wiring):**
   ```bash
   # Confirm submitWithMeta appears in the BottomGrid construction in app.ts
   grep -n 'submitWithMeta' packages/flitter-amp/src/app.ts
   # Expected: one match at the new line
   ```

3. **Build check:**
   ```bash
   cd packages/flitter-amp && bun run build
   ```
   Should compile without errors. Removing unused fields from the internal interface
   is a non-breaking change since `BottomGrid` is only constructed within this package.

4. **Behavioral verification:**
   - Input area should still show the mode label (from `currentMode`, e.g., "smart").
   - Shell mode detection should still work (typing `$` changes the border color to
     the `shellMode` theme color; this is handled entirely within `InputArea`).
   - Bottom-left text should show "? for shortcuts" when idle, "Esc to cancel" when
     processing. (This confirms `hintText` is `undefined` and the defaults are active.)
   - Enter should still submit text (from `submitWithMeta: true`).
   - The `[N images]` badge should remain hidden when `imageAttachments` defaults to 0.
   - The mode label badge (top-right of input border) should still display correctly
     and respond to `currentMode` changes.

5. **No-regression check for autocomplete:**
   ```bash
   # Confirm autocompleteTriggers is still referenced in bottom-grid.ts
   grep -n 'autocompleteTriggers' packages/flitter-amp/src/widgets/bottom-grid.ts
   # Expected: matches in interface, class, constructor, and InputArea forwarding
   ```

## Affected Files

| File | Action | Lines Affected |
|------|--------|----------------|
| `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/bottom-grid.ts` | Remove `agentMode` and `shellMode` from interface, class, and constructor | ~6 lines removed |
| `/home/gem/workspace/flitter/packages/flitter-amp/src/app.ts` | Add `submitWithMeta: true` to BottomGrid construction | ~1 line added |
| `/home/gem/workspace/flitter/packages/flitter-amp/src/state/app-state.ts` | Future: add `hintText`, `imageAttachments`, `autocompleteTriggers` fields and mutator methods | Deferred |
| `/home/gem/workspace/flitter/packages/flitter-amp/src/acp/connection.ts` | Future: extend `sendPrompt()` for multi-modal content | Deferred |

## Risk Assessment

- **Step 1 (remove dead props)**: Zero risk. The fields are stored but never read.
  No code path references `agentMode` or `shellMode` on the `BottomGrid` widget instance.
  The only consumer of `BottomGrid` is `App`, which never passes these props.

- **Step 2 (wire submitWithMeta)**: Zero behavioral change. The effective value is already
  `true` via `BottomGrid`'s constructor default. Explicitly passing `true` makes the code
  self-documenting without changing any runtime behavior.

- **Steps 3-5 (future work)**: These add new state and functionality. Standard feature
  development risk applies; no existing behavior is affected until the new state fields
  are actively populated.

## Summary

Of the seven unwired props, two (`agentMode`, `shellMode`) are genuinely dead code that
should be removed from `BottomGrid` immediately. One (`submitWithMeta`) should be
explicitly wired from `App` for clarity, even though the current default chain produces
the correct behavior. Four (`hintText`, `topWidget`, `autocompleteTriggers`,
`imageAttachments`) are legitimate extension points that are actively forwarded to
`InputArea` and consumed in its build method; they should be retained in the `BottomGrid`
interface and wired from `App` when their corresponding features are implemented and
`AppState` gains the necessary state fields.

The immediate fix is minimal (remove 6 lines, add 1 line) and carries zero behavioral
risk. The deferred work provides a clear roadmap for wiring the remaining props when
their data sources become available.
