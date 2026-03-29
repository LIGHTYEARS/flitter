# Analysis 10: ThinkingBlock and PlanView Widgets

## ThinkingBlock (`/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/thinking-block.ts`)

### Purpose and Architecture

ThinkingBlock is a `StatelessWidget` that renders the agent's internal thinking or reasoning process as a collapsible block within the chat view. It accepts a single prop of type `ThinkingItem` (defined in `/home/gem/workspace/flitter/packages/flitter-amp/src/acp/types.ts`), which carries the fields `type`, `text`, `timestamp`, `isStreaming`, and `collapsed`.

### State-Dependent Visual Indicators

The widget implements a three-state visual system based on the current state of the thinking process:

1. **Streaming** (`item.isStreaming === true`): Displays a filled circle icon (`●`) in the theme's accent color (defaulting to magenta). This signals to the user that reasoning is actively ongoing.
2. **Completed** (`item.text.length > 0` and not streaming): Shows a checkmark (`✓`) in the theme's success color (defaulting to green). This indicates the thinking block terminated normally with content.
3. **Interrupted/Cancelled** (not streaming, empty text): Shows no icon but appends the italic text ` (interrupted)` in the theme's warning color (defaulting to yellow). This covers cases where the reasoning was cancelled before producing output.

### Collapsed vs. Expanded State

The `collapsed` boolean on the `ThinkingItem` drives a chevron toggle: a right-pointing triangle (`▶`) when collapsed, and a downward-pointing triangle (`▼`) when expanded. The label line always renders -- it contains the chevron, the status icon, and the word "Thinking" (rendered dim in the status color).

When expanded (`!item.collapsed`) and there is content (`item.text.length > 0`), the full thinking text is rendered below the label inside a `Padding` widget with 2 units of left and right inset. The text is styled with `dim: true` and `italic: true`, drawing from the theme's foreground color. This italicized, dimmed style clearly differentiates the agent's internal reasoning from its final output to the user.

### 10,000-Character Truncation Limit

A hard cap of 10,000 characters is enforced on the displayed thinking text. If `item.text.length > 10000`, only the first 10,000 characters are shown, followed by an ellipsis (`...`). This is a practical guard against extremely long reasoning traces that could degrade terminal rendering performance or overwhelm the user interface. The truncation is applied at render time -- the underlying `ThinkingItem.text` retains the full content.

### Theme Integration

ThinkingBlock retrieves the ambient theme via `AmpThemeProvider.maybeOf(context)`. Every color reference has a fallback: `theme?.base.accent ?? Color.magenta`, `theme?.base.success ?? Color.green`, `theme?.base.warning ?? Color.yellow`, `theme?.base.mutedForeground ?? Color.brightBlack`, and `theme?.base.foreground ?? Color.defaultColor`. This means the widget gracefully degrades if no theme is provided in the widget tree.

### Layout

The root widget is a `Column` with `mainAxisSize: 'min'` and `crossAxisAlignment: 'stretch'`. The test in `tool-card-layout.test.ts` explicitly validates that the body Column uses `stretch` cross-axis alignment, ensuring the thinking block fills the available horizontal space. This is consistent with the layout strategy used by other chat-view widgets like ToolCallWidget.

---

## PlanView (`/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/plan-view.ts`)

### Purpose and Architecture

PlanView is a `StatelessWidget` that renders a checklist-style display of plan entries (todos) within the chat view. It accepts an array of `PlanEntry` objects, each having `content` (string), `priority` (`'high' | 'medium' | 'low'`), and `status` (`'pending' | 'in_progress' | 'completed'`).

### Header

The widget starts with a bold header reading `"  Plan"` (indented two spaces), styled in the theme's info color (defaulting to cyan with bold weight). This creates a visually distinct section header that separates the plan from surrounding chat content.

### Status Icons and Color Coding

Each `PlanEntry` is rendered as a single `Text` widget with a status icon and the entry's `content` string, indented by four spaces. The status-to-icon mapping is:

| Status        | Icon | Color                                  |
|---------------|------|----------------------------------------|
| `completed`   | `✓`  | `theme.base.success` (default: green)  |
| `in_progress` | `●`  | `theme.base.warning` (default: yellow) |
| `pending`     | `○`  | `theme.base.mutedForeground` (default: brightBlack) |

This produces a clear visual hierarchy: completed items are bright green with a checkmark, active items pulse yellow with a filled circle, and pending items are subdued gray with a hollow circle. The icon choices mirror common terminal checklist conventions.

### Priority Field -- Not Currently Rendered

Notably, while the `PlanEntry` type includes a `priority` field with three levels (`'high'`, `'medium'`, `'low'`), the current PlanView implementation does not use this field in its rendering logic. The priority is present in the data model, which suggests it may be reserved for future visual differentiation (e.g., color-coding or sorting), but for now the display is purely status-driven.

### Layout and Padding

The entire plan is wrapped in a `Padding` widget with `EdgeInsets.symmetric({ vertical: 1 })`, adding one unit of spacing above and below the plan block. This gives the plan visual breathing room within the chat scroll. Inside the padding, a `Column` with `mainAxisSize: 'min'` and `crossAxisAlignment: 'stretch'` arranges the header and entries vertically, each entry being a single line.

### Chat View Integration

In the chat view (`/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/chat-view.ts`), PlanView is instantiated when the conversation item type is `'plan'`:

```typescript
if (item.type === 'plan') {
  children.push(new PlanView({ entries: item.entries }));
}
```

Plan items are treated as top-level conversation items, on the same level as user messages, distinct from the assistant-turn grouping used for `ThinkingBlock`, `AssistantMessage`, and `ToolCallWidget`. This means plan updates appear as standalone blocks in the conversation flow rather than being nested inside an assistant turn.

ThinkingBlock, by contrast, is grouped inside the assistant turn loop alongside assistant messages and tool calls, reflecting that thinking is part of the agent's response rather than a standalone structural element.

### Shared Design Patterns

Both widgets share several design patterns: both are `StatelessWidget` subclasses, both use `AmpThemeProvider.maybeOf(context)` with null-safe fallbacks to `Color.*` constants, both rely on `TextSpan` composition for rich inline styling, and both use `Column` with `mainAxisSize: 'min'` as their root layout. These patterns contribute to a consistent, theme-aware widget architecture throughout the flitter-amp chat view system.
