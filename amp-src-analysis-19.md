# Analysis 19: HeaderBar and BottomGrid Status Widgets

## Files Examined

- `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/header-bar.ts`
- `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/bottom-grid.ts`
- `/home/gem/workspace/flitter/packages/flitter-amp/src/acp/types.ts` (UsageInfo definition)
- `/home/gem/workspace/flitter/packages/flitter-amp/src/app.ts` (wiring context)

## HeaderBar

`HeaderBar` is a `StatelessWidget` that renders the top status bar of the Amp TUI. It accepts a `HeaderBarProps` interface with five fields: `agentName`, `sessionId`, `mode`, `usage` (of type `UsageInfo | null`), and `isProcessing`.

### Layout Structure

The `build()` method produces a `Padding` wrapping a `Row` with two children: an `Expanded` left-side text and a right-side text. The horizontal padding of 1 unit keeps content off the terminal edges.

### Left Side: Session Status

The left portion is assembled from an array of string parts. The agent name is always first (prefixed with a space for visual padding). If a `mode` string is present, it is appended in square brackets (e.g., `[plan]`). When `isProcessing` is true, a spinner emoji is appended. The combined string is rendered in bold cyan, making it the most visually prominent element on the bar.

### Right Side: Usage Display

When `usage` is non-null, the right side shows a `used / size` token count display. The `UsageInfo` type (defined in `acp/types.ts`) carries `size: number`, `used: number`, and an optional `cost` object with `amount` and `currency`. If cost data is available, it is appended in parentheses formatted to four decimal places, e.g., `($0.0312)`. The right text uses `Color.brightBlack` (a muted gray) to keep it visually subordinate. Note that `sessionId` is accepted in props but is currently unused in the build output.

### Connection State

The header does not display explicit connection state. Processing status is represented by the spinner emoji alone; actual connectivity information is managed at the `AppState` level rather than surfaced through this widget.

## BottomGrid

`BottomGrid` is a `StatefulWidget` that orchestrates the entire bottom panel of the application. It is the most prop-heavy widget in the status layer, receiving thirteen props from the `App` widget: `onSubmit`, `isProcessing`, `currentMode`, `agentName`, `agentMode`, `cwd`, `gitBranch`, `tokenUsage`, `shellMode`, `hintText`, `submitWithMeta`, `topWidget`, `autocompleteTriggers`, `imageAttachments`, and `skillCount`.

### Overall Layout

`BottomGridState.build()` constructs a `Column` with `mainAxisSize: 'min'` and `crossAxisAlignment: 'stretch'`. This column contains up to three children stacked vertically:

1. **Processing status** (conditional) -- only shown when `isProcessing` is true.
2. **InputArea** -- always present.
3. **Shortcut hints** -- always present, at the very bottom.

### buildTopLeft: Usage and Streaming Display

When the agent is processing and `tokenUsage` is available, `buildTopLeft` renders a formatted usage string like `12.5k / 200.0k` using `formatTokenCount`, which converts raw numbers into human-readable abbreviations: values at or above 1,000,000 become `M` suffixed (e.g., `1.2M`), values at or above 1,000 become `k` suffixed (e.g., `45.3k`), and smaller values pass through as-is. If cost data exists, it is appended with a middle-dot separator. When processing but no usage data is yet available, the widget falls back to displaying the text `Streaming...`. When not processing, it returns a zero-size `SizedBox.shrink()`.

### buildBottomLeft: Keyboard Hint Line

This method selects among three possible hint displays based on state. If a custom `hintText` is set, it is displayed verbatim in muted/dimmed style. If the agent is processing, a keybinding hint shows `Esc` (in the theme's keybind color, typically blue) followed by ` to cancel` in muted text. Otherwise, the idle-state hint displays `?` in keybind color followed by ` for shortcuts` in muted text. This mirrors the shortcut disclosure pattern used by the original Amp CLI.

### buildBottomRight: CWD, Git Branch, and Agent Name

The bottom-right corner is rendered as a `BorderOverlayText` overlay on the `InputArea`. The `shortenPath` utility replaces the user's home directory prefix with `~` for brevity. If `gitBranch` is defined, it is appended in parentheses. If `agentName` is defined, it is appended after a middle-dot separator. The entire string is wrapped in em-dash characters (`─text─`) and rendered in muted/dim style, making it look like a label embedded in the input border. If the shortened path is empty, the overlay is omitted entirely (returns `null`).

### Coordination with InputArea

BottomGrid constructs the `InputArea` widget directly in its build method, forwarding `onSubmit`, `isProcessing`, `currentMode` (as `mode`), `submitWithMeta`, `topWidget`, `autocompleteTriggers`, `imageAttachments`, `skillCount`, and the computed `overlayTexts` array. The overlay mechanism is key: BottomGrid computes the `bottom-right` overlay (cwd/branch/agent) and passes it to InputArea through the `BorderOverlayText` interface, which InputArea renders as positioned elements over its border decoration. This keeps the status metadata visually integrated with the input box while maintaining separation of concerns -- BottomGrid owns the status computation, InputArea owns the input rendering and border layout.

### Props Passthrough from App

In `app.ts`, the `App` widget instantiates `BottomGrid` by pulling values from `AppState`: `isProcessing`, `currentMode`, `agentName`, `cwd`, `gitBranch`, `tokenUsage` (from `appState.usage`), and `skillCount`. The `onSubmit` callback wraps the user's input into the prompt history before forwarding it to the `App`'s own `onSubmit` handler. The `agentMode`, `shellMode`, `hintText`, `submitWithMeta`, `topWidget`, `autocompleteTriggers`, and `imageAttachments` props are not currently passed from App, meaning they fall back to their defaults (false, undefined, true, undefined, undefined, and 0 respectively).

## Theme Integration

Both widgets leverage the `AmpThemeProvider`. HeaderBar uses hardcoded `Color.cyan` and `Color.brightBlack`, while BottomGrid resolves colors through the theme context: `mutedForeground` for dimmed status text, `foreground` for primary text, and `app.keybind` for keyboard shortcut highlights. This makes BottomGrid more theme-aware and adaptable to alternate color schemes.
