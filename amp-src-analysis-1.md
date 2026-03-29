# ChatView Widget Architecture Analysis

**File**: `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/chat-view.ts`

---

## 1. Class Hierarchy and Inheritance

`ChatView` extends `StatelessWidget`, which is the base class for widgets that have no mutable internal state. `StatelessWidget` itself extends the core `Widget` abstract class from flitter-core (Amp minified reference: `H3 extends Sf`). As a `StatelessWidget`, `ChatView` must implement a single abstract method -- `build(context: BuildContext): Widget` -- and produces a new widget subtree every time the framework calls it. It does not maintain a `State` object; all the data it needs is injected immutably through the constructor.

The constructor takes a `ChatViewProps` object and stores the two fields as private readonly members:
- `items: ConversationItem[]`
- `error: string | null`

The parent `StatelessWidget` constructor is called with an empty options object (`super({})`), meaning no explicit `Key` is ever provided for the ChatView itself. Re-renders are therefore identity-based rather than key-based in the element tree.

---

## 2. ChatViewProps Interface

```ts
interface ChatViewProps {
  items: ConversationItem[];
  error?: string | null;
}
```

This is a minimal, focused props contract. `items` is the required, ordered list of conversation items to render. `error` is an optional error string that, when present, is displayed at the top of the view in destructive (red) bold text. The `ConversationItem` discriminated union type (from `../acp/types`) supports five variants:

| Type                 | Discriminant         | Key Fields                                             |
|----------------------|----------------------|--------------------------------------------------------|
| `UserMessage`        | `'user_message'`     | `text`, `timestamp`                                    |
| `AssistantMessage`   | `'assistant_message'` | `text`, `timestamp`, `isStreaming`                      |
| `ToolCallItem`       | `'tool_call'`        | `toolCallId`, `title`, `kind`, `status`, `collapsed`, `result` |
| `PlanItem`           | `'plan'`             | `entries: PlanEntry[]`                                 |
| `ThinkingItem`       | `'thinking'`         | `text`, `timestamp`, `isStreaming`, `collapsed`        |

---

## 3. The `build()` Method -- Grouping Logic

The `build()` method is the heart of ChatView. It follows a clear branching strategy:

### Empty state: Welcome Screen
If `this.items.length === 0`, the method immediately delegates to `buildWelcomeScreen(context)` and returns. No error banner, no conversation rendering.

### Error banner
If `this.error` is truthy, a `Padding` > `Text` widget is pushed as the first child, styled with the theme's `destructive` color (defaulting to red) and bold text.

### Conversation item grouping algorithm
The core algorithm is a single forward pass (`while (i < this.items.length)`) that partitions the items list into visual groups:

1. **Spacer insertion**: Between every group, a `SizedBox({ height: 1 })` is inserted for vertical separation (equivalent to one blank terminal row).

2. **User messages** (`type === 'user_message'`): Each user message stands alone. It is wrapped in its own `StickyHeader` via `buildUserStickyHeader()`. The index advances by one.

3. **Plan items** (`type === 'plan'`): Each plan stands alone. It is rendered as a standalone `PlanView` widget, not wrapped in a StickyHeader. The index advances by one.

4. **Assistant turns** (everything else: `'thinking'`, `'assistant_message'`, `'tool_call'`): These are greedily consumed in an inner `while` loop. All consecutive items of these three types are collected into a `turnWidgets[]` array. The inner loop breaks as soon as it encounters a `user_message` or `plan` item (or reaches the end of the list). The collected widgets are then wrapped together in a single `StickyHeader` via `buildAssistantStickyHeader()`.

This grouping means that a typical assistant turn consisting of a thinking block, a text response, and several tool calls all appear under one sticky header section. The inner loop creates specific widget instances for each sub-type:
- `ThinkingBlock` for `'thinking'` items
- `buildAssistantMessage()` for `'assistant_message'` items
- `ToolCallWidget` for `'tool_call'` items

The final output is a `Column` with `mainAxisSize: 'min'` and `crossAxisAlignment: 'stretch'`, causing all children to fill the available horizontal width while the column itself takes only the vertical space it needs.

---

## 4. Welcome Screen Rendering

The `buildWelcomeScreen(context)` method produces a centered layout containing two elements in a horizontal `Row`:

1. **DensityOrbWidget**: A `StatefulWidget` that renders an animated noise-based ASCII art orb using Perlin noise across a 40x20 character grid. It serves as the decorative visual anchor of the welcome screen.

2. **Text content column** containing:
   - A `GlowText` widget reading "Welcome to Amp" styled with the theme's success color (green) and a subtle green glow effect.
   - A help hint: "Ctrl+O" (in the keybind color, typically blue) followed by " for help" (in warning/yellow).
   - A configuration hint: "Use the settings: open in editor command to configure Amp" with mixed muted/foreground coloring.
   - A daily rotating quote selected from a hardcoded `QUOTES` array using `Math.floor(Date.now() / 86400000) % QUOTES.length` as the index. This gives a deterministic quote-of-the-day that rotates through five famous programming/technology quotes.

The overall layout is a `Column` with `mainAxisAlignment: 'center'` and `crossAxisAlignment: 'center'`, which positions the welcome content in the center of the available viewport.

---

## 5. StickyHeader Usage for User/Assistant Grouping

`StickyHeader` is a `MultiChildRenderObjectWidget` (from flitter-core) that accepts a `header` and a `body`. It implements scroll-pinning behavior: when the body content scrolls out of view, the header sticks to the top of the viewport until the next StickyHeader pushes it away. This mirrors the behavior found in the original Amp binary's thread view (referenced as `$uH`).

### User message sticky headers (`buildUserStickyHeader`)

Each user message gets its own StickyHeader with:
- **Header**: A bold `Text` widget displaying "You" in the theme's success color (green).
- **Body**: A `Container` with a left border (2-wide, success color, solid style) and 1-unit left padding, containing the user's message text rendered in italics with the foreground color. This creates the characteristic green left-bar styling seen in the Amp CLI.

### Assistant turn sticky headers (`buildAssistantStickyHeader`)

Each assistant turn group gets a StickyHeader with:
- **Header**: `SizedBox.shrink()` -- an explicitly empty/zero-size header. This means assistant turns do not display a role label; they rely on the visual distinction of their content widgets (Markdown, tool calls, thinking blocks) to differentiate themselves from user messages.
- **Body**: If there is only one widget in the turn, it is used directly. If there are multiple widgets, they are wrapped in a `Column` with `mainAxisSize: 'min'` and `crossAxisAlignment: 'stretch'`.

The asymmetry is deliberate: user messages are visually labeled with "You", while assistant messages rely on their distinctive formatting (Markdown rendering, tool call cards, etc.) to signal their origin.

---

## 6. ConversationItem Type Dispatch

The dispatch logic handles the five `ConversationItem` types across two layers:

| Item Type            | Dispatch Target                  | Wrapper               |
|----------------------|----------------------------------|-----------------------|
| `user_message`       | `buildUserStickyHeader()`        | Own StickyHeader      |
| `plan`               | `new PlanView({ entries })`      | Standalone (no StickyHeader) |
| `thinking`           | `new ThinkingBlock({ item })`    | Grouped into assistant StickyHeader |
| `assistant_message`  | `buildAssistantMessage()`        | Grouped into assistant StickyHeader |
| `tool_call`          | `new ToolCallWidget({ ... })`    | Grouped into assistant StickyHeader |

The `buildAssistantMessage()` private method handles streaming awareness:
- If `text.length > 0` and streaming, it appends a block cursor character (`' ▌'`) to the Markdown content.
- If `text.length > 0` and not streaming, the Markdown is rendered as-is.
- If `text` is empty and streaming, a single `'▌'` placeholder is shown in muted color.
- If `text` is empty and not streaming, an ellipsis `'...'` placeholder is shown in muted color.

The `ToolCallWidget` receives the raw `ToolCallItem` and an `isExpanded` boolean derived from the inverse of the item's `collapsed` flag (`!cur.collapsed`).

---

## 7. Theme Integration

ChatView uses the `AmpThemeProvider.maybeOf(context)` InheritedWidget lookup to obtain the current `AmpTheme`. This lookup can return `undefined` if no theme provider is above the ChatView in the widget tree. All color references include fallback defaults:

- `theme?.base.success ?? Color.green` for user message accents
- `theme?.base.destructive ?? Color.red` for error text
- `theme?.base.foreground ?? Color.defaultColor` for body text
- `theme?.base.mutedForeground ?? Color.brightBlack` for placeholders and secondary text
- `theme?.base.warning ?? Color.yellow` for help text hints
- `theme?.app.keybind ?? Color.blue` for keyboard shortcut highlights

This defensive pattern ensures the ChatView remains functional even without a theme provider ancestor, though the visual presentation will fall back to basic terminal colors.

---

## 8. Summary of Architectural Characteristics

- **Pure rendering**: ChatView is stateless and purely declarative. All state (items, error) flows in from outside. It performs no side effects.
- **Grouping as a core concept**: The most sophisticated piece of logic is the forward-scanning grouping algorithm that collects consecutive assistant-related items into cohesive turn blocks. This is essential for the sticky header scroll behavior to feel natural.
- **Delegation pattern**: ChatView itself renders no complex content; it delegates to specialized widgets (`ThinkingBlock`, `ToolCallWidget`, `PlanView`, `Markdown`, `DensityOrbWidget`, `GlowText`) and focuses solely on layout orchestration and grouping.
- **Asymmetric labeling**: User messages are explicitly labeled with "You" headers; assistant turns use an empty header, relying on content formatting for visual differentiation. Plan items have no StickyHeader at all.
- **Streaming-aware**: The assistant message rendering accounts for active streaming state, providing visual feedback through cursor characters.
