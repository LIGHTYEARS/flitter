# Analysis 34: Tool-Call Rendering Pipeline & CreateFileTool Deep Dive

## 1. ToolCallItem Data Shape and Population from ACP Events

### 1.1 The ToolCallItem Interface

The canonical data shape for every tool call rendered in the TUI is defined in `/home/gem/workspace/flitter/packages/flitter-amp/src/acp/types.ts`:

```typescript
export interface ToolCallItem {
  type: 'tool_call';
  toolCallId: string;
  title: string;
  kind: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  locations?: Array<{ path: string }>;
  rawInput?: Record<string, unknown>;
  result?: ToolCallResult;
  collapsed: boolean;
}

export interface ToolCallResult {
  status: 'completed' | 'failed';
  content?: Array<{ type: string; content?: { type: string; text: string } }>;
  rawOutput?: Record<string, unknown>;
}
```

Key observations on the shape:

- **`kind`** is the tool name string as provided by the ACP agent (e.g., `"create_file"`, `"Bash"`, `"Read"`, `"write_file"`). This is the primary dispatch key.
- **`title`** is a human-readable summary provided by the agent, separate from `kind`.
- **`rawInput`** is the opaque bag of tool-specific parameters. For `create_file`, this typically contains `file_path` and `content`. Renderers pull domain-specific data directly from this dictionary.
- **`result`** is `undefined` until the agent sends a `tool_call_update` event. It carries both structured `content` (an array of typed blocks) and a `rawOutput` dictionary for unstructured data.
- **`collapsed`** is a client-side UI state flag, not an ACP protocol field. It defaults to `true` unless the global `toolCallsExpanded` toggle is active.
- **`locations`** is an optional array of file paths associated with the tool call, provided by the agent for navigation purposes.

### 1.2 The ACP Event Ingestion Path

The full data flow from ACP wire event to ToolCallItem is a four-layer chain:

```
ACP Agent Subprocess
  |  (ndjson over stdin/stdout)
  v
ClientSideConnection (ACP SDK)
  |  (JSON-RPC dispatch)
  v
FlitterClient.sessionUpdate()       [/src/acp/client.ts]
  |  (callbacks.onSessionUpdate)
  v
AppState.onSessionUpdate()           [/src/state/app-state.ts]
  |  (switch on update.sessionUpdate)
  v
ConversationState.addToolCall()      [/src/state/conversation.ts]
  |  (pushes ToolCallItem into items[])
  v
notifyListeners() -> widget rebuild
```

**Step 1 -- Agent spawning and transport.** In `/src/acp/connection.ts`, `connectToAgent()` spawns the agent process, wraps its stdin/stdout in an `ndJsonStream`, and creates a `ClientSideConnection`. The `FlitterClient` is provided as the client implementation, with `AppState` registered as its `ClientCallbacks`.

**Step 2 -- Session update dispatch.** When the agent emits a `session/update` JSON-RPC notification, the ACP SDK routes it to `FlitterClient.sessionUpdate()`, which in turn calls `callbacks.onSessionUpdate(sessionId, update)`.

**Step 3 -- Event type switching.** `AppState.onSessionUpdate()` switches on `update.sessionUpdate` (a discriminator string). Two event types are relevant to tool calls:

- **`"tool_call"`**: Creates a new ToolCallItem. The method destructures `toolCallId`, `title`, `kind`, `status`, `locations`, and `rawInput` directly from the update payload and forwards them to `ConversationState.addToolCall()`.
- **`"tool_call_update"`**: Updates an existing ToolCallItem with a result. Destructures `toolCallId`, `status`, `content`, and `rawOutput`, forwarding to `ConversationState.updateToolCall()`.

**Step 4 -- ConversationState mutation.** `addToolCall()` first finalizes any in-flight streaming assistant message (so tool calls always appear as distinct items after the text that preceded them), then pushes a new `ToolCallItem` with `collapsed` set to `!this.toolCallsExpanded`. `updateToolCall()` performs a linear scan to find the matching item by `toolCallId` and sets its `result` and `status`.

**Step 5 -- Listener notification.** After every state mutation, `AppState.notifyListeners()` fires, triggering a widget tree rebuild. The new `items` array is passed to `ChatView` for rendering.

### 1.3 Two-Phase Lifecycle

Every tool call goes through two ACP events:

1. **Birth**: `tool_call` event creates the ToolCallItem with `status: 'in_progress'` (or `'pending'`), `rawInput` populated, `result` undefined.
2. **Completion**: `tool_call_update` event sets `status` to `'completed'` or `'failed'` and attaches the `result` payload.

This two-phase model means renderers must handle the "no result yet" state gracefully. The ToolHeader's animated BrailleSpinner provides visual feedback during phase 1.


## 2. The Dispatch Pipeline: ChatView to ToolCallWidget to Specific Renderer

### 2.1 ChatView's Role as the Conversation Renderer

`ChatView` (`/src/widgets/chat-view.ts`) receives the flat `ConversationItem[]` array and must transform it into a grouped, visually structured widget tree.

The grouping algorithm at lines 78-116 works as follows:

```
for each item in items[]:
  if user_message -> wrap in StickyHeader("You")
  if plan -> render as PlanView
  otherwise -> collect consecutive {thinking, assistant_message, tool_call} into an "assistant turn"
```

This means tool calls are **always grouped with their surrounding assistant messages and thinking blocks** into a single assistant turn, wrapped in a `StickyHeader` with an empty header (the assistant label is implied).

The critical line for tool call rendering is:

```typescript
} else if (cur.type === 'tool_call') {
  turnWidgets.push(new ToolCallWidget({
    toolCall: cur,
    isExpanded: !cur.collapsed,
  }));
```

ChatView passes the `ToolCallItem` directly to `ToolCallWidget`, translating the `collapsed` field into the `isExpanded` prop by simple negation. Note that `onToggle` is **not** wired here -- this means the ChatView does not currently support click-to-toggle from individual tool cards; toggling is handled at a higher level via `ConversationState.toggleToolCalls()` (the Alt+T keybinding).

### 2.2 ToolCallWidget's Dispatch Logic

`ToolCallWidget` (`/src/widgets/tool-call/tool-call-widget.ts`) is a pure dispatcher. It is a `StatelessWidget` whose `build()` method does two things:

**Name normalization.** A `TOOL_NAME_MAP` dictionary normalizes variant tool names to canonical identifiers. For example:

| Agent-provided `kind` | Canonical name |
|---|---|
| `write_file`, `write_to_file`, `WriteFile` | `create_file` |
| `read_file`, `ReadFile` | `Read` |
| `execute_command`, `shell`, `run_command`, `terminal` | `Bash` |
| `search`, `grep`, `ripgrep`, `find_files`, `list_files` | `Grep` |
| `edit`, `str_replace_editor`, `EditTool` | `edit_file` |
| `web_search`, `browser`, `fetch_url` | `WebSearch` |

This normalization handles the fact that different ACP agents may use different tool name strings for equivalent operations.

**Prefix-based routing.** Before the switch statement, a prefix check routes `sa__*` and `tb__*` names to `TaskTool`, supporting sub-agent and toolbox namespaced tools.

**Switch dispatch.** The normalized name is matched against known categories:

| Canonical name(s) | Renderer |
|---|---|
| `Read` | `ReadTool` |
| `edit_file`, `apply_patch`, `undo_edit` | `EditFileTool` |
| `create_file` | `CreateFileTool` |
| `Bash`, `shell_command`, `REPL` | `BashTool` |
| `Grep`, `glob`, `Glob`, `Search` | `GrepTool` |
| `WebSearch`, `read_web_page` | `WebSearchTool` |
| `Task`, `oracle`, `code_review`, `librarian` | `TaskTool` |
| `handoff` | `HandoffTool` |
| `todo_list`, `todo_write`, `todo_read` | `TodoListTool` |
| Everything else | `GenericToolCard` (fallback) |

A subtle detail: the `onToggle` callback is only forwarded to `GenericToolCard`. The specialized renderers (including `CreateFileTool`) do not receive `onToggle`, suggesting that expand/collapse toggling for specialized tools is managed externally, not per-card.

### 2.3 The Prop Forwarding Pattern

Every specialized renderer receives exactly two props:
- `toolCall: ToolCallItem` -- the full data object
- `isExpanded: boolean` -- the current expand/collapse state

This is a **uniform interface** that enables the dispatcher to remain completely unaware of renderer internals. Each renderer is responsible for extracting the domain-specific fields it needs from `toolCall.rawInput` and `toolCall.result`.


## 3. CreateFileTool's Rendering Approach in Detail

### 3.1 Class Structure

`CreateFileTool` (`/src/widgets/tool-call/create-file-tool.ts`) is a `StatelessWidget` -- it holds no mutable state and rebuilds entirely from its props. This is appropriate because the tool call data is mutated in `ConversationState` and flows down through the widget tree.

### 3.2 Input Extraction Strategy

The renderer extracts the file path from `rawInput` using a defensive fallback chain:

```typescript
const filePath = (input['file_path'] ?? input['path'] ?? input['filename'] ??
                  input['file'] ?? input['destination'] ?? '') as string;
```

This handles five different parameter naming conventions that various ACP agents might use for file creation tools. This is a pragmatic approach to agent heterogeneity -- rather than requiring a strict schema, the renderer tries multiple plausible key names.

### 3.3 Two-State Rendering

The `build()` method has two distinct output paths:

**Collapsed state (`isExpanded === false`):** Returns only the `ToolHeader` widget. This is a single-line display showing the status icon, tool name, and file path. For a completed create_file call, this looks like:

```
  checkmark CreateFile /src/utils/helper.ts
```

**Expanded state (`isExpanded === true`):** Returns a `Column` containing the `ToolHeader` plus a content preview. The preview is extracted from `rawInput['content']` (the file content being created) and truncated to 500 characters:

```typescript
const preview = content.length > 500 ? content.slice(0, 500) + '\n...(truncated)' : content;
```

The preview text is rendered with `dim: true` and `mutedForeground` color, visually subordinating it to the header.

### 3.4 Content Preview vs. Result Display

A notable architectural decision: `CreateFileTool` renders the **input content** (what is being written), not the **result** (what the agent reports after writing). The `toolCall.result` field is entirely ignored. This makes sense for file creation -- the user cares about what was written, and the result typically just confirms success/failure, which is already communicated by the status icon in the ToolHeader.

This contrasts with `GenericToolCard`, which renders both input and output sections.

### 3.5 Edge Case Handling

If `rawInput` is undefined or the content field is empty, the expanded view degrades gracefully to just the header -- the same as the collapsed view. This prevents empty content blocks from appearing in the UI.

### 3.6 Theme Integration

`CreateFileTool` accesses the `AmpThemeProvider` to resolve the `mutedForeground` color for the content preview. The fallback is `Color.brightBlack` (ANSI bright black / dark gray). This ensures the widget renders acceptably even without a theme context.


## 4. How Tool Results Flow Back and Get Displayed

### 4.1 The Result Ingestion Path

When the agent completes a tool call, it sends a `tool_call_update` session update. The flow is:

```
Agent -> "tool_call_update" event -> AppState.onSessionUpdate()
  -> ConversationState.updateToolCall(toolCallId, status, content, rawOutput)
    -> finds ToolCallItem by toolCallId
    -> sets item.result = { status, content, rawOutput }
    -> sets item.status = status
  -> notifyListeners() -> rebuild
```

The `ToolCallResult` is constructed from two optional fields:
- **`content`**: A structured array of typed content blocks (e.g., `{ type: 'text', content: { type: 'text', text: '...' } }`).
- **`rawOutput`**: An unstructured key-value dictionary for any additional data.

### 4.2 Result Display by Renderer Type

Different renderers handle results differently:

**CreateFileTool**: Ignores `result` entirely. Status is communicated via the ToolHeader icon.

**GenericToolCard**: Has the most comprehensive result handling:
1. First checks for unified diff patterns in `rawOutput` (looking for `@@` and `---`/`+++` markers). If found, renders a `DiffView`.
2. Otherwise, extracts text from `result.content` or serializes `result.rawOutput` to JSON and renders it as `Markdown`.
3. Output is truncated to 2000 characters.

**Other specialized renderers** (ReadTool, BashTool, EditFileTool, etc.) each implement their own domain-specific result rendering logic, but all follow the same pattern of accessing `toolCall.result`.

### 4.3 The Two-Phase Visual Transition

When a tool call transitions from `in_progress` to `completed`:
1. The `ToolHeader`'s `BrailleSpinner` stops animating (the `didUpdateWidget` lifecycle method detects the status change and calls `stopSpinner()`).
2. The status icon changes from `"..."` to `"checkmark"` (or `"X"` for failure).
3. The status color changes from `toolRunning` (blue) to `toolSuccess` (green) or `destructive` (red).
4. If the tool card is expanded and the renderer uses result data, the output section appears.

This transition is entirely driven by the immutable data flow -- the `ToolCallItem` object is mutated in place in the `items` array, and the `notifyListeners()` call triggers a full rebuild of the affected widget subtree.


## 5. The Expand/Collapse Interaction Model

### 5.1 State Management

The expand/collapse state is tracked at two levels:

**Per-item level**: Each `ToolCallItem` has a `collapsed` boolean field. This is set at creation time based on the global toggle state.

**Global level**: `ConversationState.toolCallsExpanded` is a boolean flag toggled by `toggleToolCalls()`, which iterates all items and flips their `collapsed` field:

```typescript
toggleToolCalls(): void {
  this.toolCallsExpanded = !this.toolCallsExpanded;
  for (const item of this.items) {
    if (item.type === 'tool_call') {
      item.collapsed = !this.toolCallsExpanded;
    }
  }
}
```

This is an O(n) operation over all conversation items, which is acceptable for typical conversation lengths.

### 5.2 Data Flow to Widgets

In `ChatView`, the `collapsed` field is translated to `isExpanded`:

```typescript
new ToolCallWidget({
  toolCall: cur,
  isExpanded: !cur.collapsed,
})
```

In `ToolCallWidget`'s constructor, the prop is consumed with a fallback:

```typescript
this.isExpanded = props.isExpanded ?? !props.toolCall.collapsed;
```

This double-negation pattern (field is `collapsed`, prop is `isExpanded`) is a minor source of cognitive friction but ensures that the widget interface uses positive semantics (`isExpanded`) while the data model uses the default-true semantics (`collapsed: true` means the tool card starts closed).

### 5.3 Missing Per-Card Toggle

An important observation: while the `ToolCallWidgetProps` interface declares an `onToggle?: () => void` callback, and `GenericToolCard` accepts it, the `ChatView` does not wire it when constructing `ToolCallWidget`. The `onToggle` prop flows through `ToolCallWidget` but is only forwarded to `GenericToolCard` (not to specialized renderers like `CreateFileTool`).

This means:
- Individual tool cards **cannot** be toggled independently by clicking.
- The only way to expand/collapse is via the global Alt+T toggle.
- The `onToggle` infrastructure exists but is not fully connected, suggesting it may be a planned feature.


## 6. Architecture Observations and Patterns

### 6.1 Strategy Pattern for Tool Rendering

The `ToolCallWidget` dispatcher implements a classic **Strategy pattern**: a uniform interface (`ToolCallItem + isExpanded`) is dispatched to one of many concrete rendering strategies based on the tool `kind`. The normalization map adds an **Adapter** layer on top, translating agent-specific names to canonical strategy selectors.

### 6.2 Immutable-ish Data Flow

The architecture uses a somewhat unusual pattern: data objects (`ToolCallItem`, `AssistantMessage`, etc.) are pushed into the `items` array and then **mutated in place** (e.g., `updateToolCall` modifies `item.status` and `item.result` directly). However, because the listener system triggers full rebuilds from the root, this works correctly -- the widgets always see the latest state.

This is a pragmatic compromise between true immutable state (which would require replacing items in the array) and fully mutable state. It avoids allocation overhead but means that reference equality checks cannot be used for render optimization.

### 6.3 Defensive Input Extraction

Multiple renderers (CreateFileTool being a clear example) use fallback chains to extract data from `rawInput`:

```typescript
const filePath = (input['file_path'] ?? input['path'] ?? input['filename'] ??
                  input['file'] ?? input['destination'] ?? '') as string;
```

This pattern reflects the reality that ACP agents have no enforced schema for tool parameters. Each renderer acts as its own deserializer, tolerating variation in key names. The cost is duplicated extraction logic; the benefit is resilience to agent diversity.

### 6.4 Two Tiers of Rendering Complexity

The codebase has a clear bifurcation:

- **Specialized renderers** (CreateFileTool, ReadTool, BashTool, etc.): Focused, domain-aware widgets that extract specific fields and present them in optimized layouts. They tend to be 50-80 lines of code.
- **GenericToolCard**: A 200-line catch-all that handles input display, output display (with markdown and diff rendering), and StickyHeader wrapping. It serves as both the default renderer and a compositional building block (it accepts `children` and `hideHeader` props).

Specialized renderers do **not** extend or compose GenericToolCard. They are independent widgets that share only the `ToolHeader` component. This means there is some duplication (e.g., the "collapsed = just header" pattern), but each renderer remains fully self-contained.

### 6.5 ToolHeader as the Unifying Visual Element

The `ToolHeader` widget (`/src/widgets/tool-call/tool-header.ts`) is the one component shared by all renderers. It provides:

- **Status icon**: Unicode symbols (checkmark, X, ellipsis) colored by status.
- **Tool name**: Bold, cyan-tinted text.
- **Details array**: Dim, muted strings (typically file paths or commands).
- **Animated spinner**: A `BrailleSpinner` that ticks at 100ms intervals when `status === 'in_progress'`.

ToolHeader is a **StatefulWidget** -- the only stateful widget in the tool rendering chain. Its state manages the spinner timer lifecycle (`initState`, `didUpdateWidget`, `dispose`). This is a good separation of concerns: the spinner animation is the only piece of truly local mutable state in the entire rendering pipeline.

### 6.6 Theme Propagation via InheritedWidget

All renderers access theme colors via `AmpThemeProvider.maybeOf(context)`, which is an InheritedWidget lookup. The `maybeOf` variant (as opposed to a throwing `of`) allows graceful fallback to hardcoded ANSI colors when no theme is provided. This makes the tool rendering components usable in test contexts or headless environments without a theme provider.

### 6.7 The StickyHeader Pattern

`GenericToolCard` wraps its content in a `StickyHeader` (header = ToolHeader, body = Column of content). This means the tool name/status row remains visible even when scrolling through a long expanded output. `CreateFileTool` does **not** use StickyHeader -- it uses a plain `Column`. This means if a CreateFileTool card has a long content preview, the header will scroll off screen. This may be intentional (the preview is capped at 500 chars and unlikely to overflow) or an oversight.

### 6.8 Missing Features and Growth Points

Several aspects of the architecture suggest planned but unimplemented features:

1. **Per-card toggle**: The `onToggle` prop exists in the interface but is not wired from ChatView.
2. **ToolCallItem.locations**: The `locations` field is carried through the pipeline but not rendered by any current widget. This could be used for "jump to file" navigation.
3. **Result rendering in specialized tools**: CreateFileTool ignores `result` entirely. If agents begin sending richer result data (e.g., syntax validation results), the renderer would need updating.
4. **Streaming tool output**: The current two-phase model (create then update) does not support streaming tool output. A tool that produces incremental output (like a long-running bash command) would require a new event type or repeated `tool_call_update` events.

### 6.9 Summary Data Flow Diagram

```
ACP Agent Process
    |
    | ndjson "tool_call" event
    v
FlitterClient.sessionUpdate()
    |
    | callbacks.onSessionUpdate()
    v
AppState.onSessionUpdate() -- switch on "tool_call"
    |
    | conversation.addToolCall(id, title, kind, status, locations, rawInput)
    v
ConversationState.items.push(ToolCallItem{collapsed: true})
    |
    | notifyListeners()
    v
ChatView.build() -- groups into assistant turn
    |
    | new ToolCallWidget({toolCall, isExpanded: !collapsed})
    v
ToolCallWidget.build() -- normalizes kind, switches
    |
    | name == "create_file"
    v
CreateFileTool.build()
    |
    +-- ToolHeader({name, status, details: [filePath]})
    |     |
    |     +-- status icon (colored)
    |     +-- tool name (bold cyan)
    |     +-- file path (dim muted)
    |     +-- BrailleSpinner (if in_progress)
    |
    +-- [if expanded] Padding > Text (content preview, 500 char max, dim)
```

Later, when the tool completes:

```
ACP Agent Process
    |
    | ndjson "tool_call_update" event
    v
AppState.onSessionUpdate() -- switch on "tool_call_update"
    |
    | conversation.updateToolCall(id, "completed", content, rawOutput)
    v
ToolCallItem.status = "completed", .result = {status, content, rawOutput}
    |
    | notifyListeners() -> rebuild
    v
ToolHeader status icon changes: "..." -> "checkmark", color: blue -> green
BrailleSpinner stops
```

This end-to-end pipeline transforms raw ACP protocol events into themed, animated, expandable TUI widgets through a clean layered architecture: transport, state management, conversation grouping, tool dispatch, and specialized rendering.
