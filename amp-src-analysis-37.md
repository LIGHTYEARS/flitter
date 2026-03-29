# Flitter-Core Terminal Input Parsing System -- Deep Analysis

## Overview

The flitter-core input system transforms raw terminal byte streams arriving on stdin into fully
structured, typed event objects that are dispatched through a widget-aware focus tree. The
architecture is split across ten source files in `packages/flitter-core/src/input/`, with
additional wiring inside `framework/binding.ts`. The design faithfully reproduces the Amp CLI
binary's input pipeline (minified class `Pg` / `J3.setupEventHandlers`), as required by the
project's fidelity mandate.

**Key source files (all paths relative to `packages/flitter-core/src/`):**

| File | Responsibility |
|------|---------------|
| `input/input-parser.ts` | State-machine parser: raw bytes to `InputEvent` objects |
| `input/events.ts` | Discriminated union type definitions + factory helpers |
| `input/keyboard.ts` | `LogicalKey` constants, `LOW_LEVEL_TO_TUI_KEY` mapping, utility functions |
| `input/mouse.ts` | SGR mouse protocol decoding (button codes, modifier bits, action determination) |
| `input/input-bridge.ts` | Glue layer connecting `InputParser` to `EventDispatcher` |
| `input/event-dispatcher.ts` | Singleton routing hub for all event types |
| `input/focus.ts` | `FocusNode` / `FocusScopeNode` / `FocusManager` -- focus tree with key event bubbling |
| `input/shortcuts.ts` | `ShortcutBinding` matching (key + modifier comparison) |
| `input/hit-test.ts` | Render-tree hit testing for mouse events |
| `input/mouse-manager.ts` | Global hover tracking, cursor management, mouse action dispatch |
| `input/mouse-cursors.ts` | Terminal cursor shape constants and DECSCUSR escape sequences |

---

## 1. The Input Parsing Pipeline (Raw Bytes to Structured Events)

The end-to-end flow is a four-stage pipeline:

```
stdin bytes --> InputParser --> EventDispatcher --> FocusManager / MouseManager / handlers
```

### Stage 1: Raw Byte Ingestion

The `WidgetsBinding.setupEventHandlers()` method (in `framework/binding.ts`) creates an
`InputParser` instance and wires it to the platform's raw input stream. When the terminal
platform calls its `onInput` callback with a `Buffer` or string, the binding calls
`this._inputParser!.feed(data)`.

The `InputParser.feed()` method accepts both `string` and `Buffer` types. If a `Buffer` is
received, it is first decoded via `.toString('utf8')`. The string is then iterated character by
character using a `for...of` loop (which correctly handles multi-byte Unicode code points as
single iteration units). Each character is passed to the private `_processChar()` dispatch method.

### Stage 2: State Machine Parsing (InputParser)

`InputParser` is a push-based state machine with five states, implemented as a `const enum`:

```typescript
const enum ParserState {
  Idle,     // Waiting for next character
  Escape,   // Received ESC (0x1B), deciding what kind of sequence follows
  CSI,      // Inside a CSI sequence (ESC [)
  SS3,      // Inside an SS3 sequence (ESC O)
  Paste,    // Inside a bracketed paste (collecting text until ESC[201~)
}
```

The parser's `_processChar()` method dispatches to one of five state-specific handlers based on
the current state. Events are emitted by calling the constructor-provided callback function.

### Stage 3: Event Dispatch (EventDispatcher)

`EventDispatcher` is a singleton that receives `InputEvent` objects from the parser callback
(either directly, or through the `InputBridge` glue layer). Its `dispatch()` method switches on
the event's discriminant `type` field and routes to type-specific dispatch methods:

- `'key'` -> `dispatchKeyEvent()`: interceptors -> FocusManager -> registered key handlers
- `'mouse'` -> `dispatchMouseEvent()`: global release callbacks -> registered mouse handlers
- `'resize'` -> `dispatchResizeEvent()`: all resize handlers
- `'paste'` -> `dispatchPasteEvent()`: FocusManager paste -> fallback paste handlers
- `'focus'` -> `dispatchFocusEvent()`: all focus handlers

### Stage 4: Widget-Level Delivery

Key events reach widgets through the `FocusManager.dispatchKeyEvent()` method, which walks
the focus tree from the currently focused `FocusNode` upward toward the root, calling each
node's `handleKeyEvent()` in a bubbling pattern. Mouse events reach widgets through the
`MouseManager`, which performs hit-testing against the render tree and dispatches to the
appropriate `RenderMouseRegion` instances.

---

## 2. ANSI Escape Sequence Recognition

The parser recognizes four categories of escape sequences, plus a bare-escape fallback:

### 2.1 CSI Sequences (ESC `[` ...)

When the parser is in `Idle` state and encounters ESC (`0x1B`), it transitions to `Escape`
state. If the next character is `[`, it transitions to `CSI` state and begins collecting
parameter bytes.

**Parameter collection rule:** Any character in the range `0x30-0x3F` (digits 0-9, `:`, `;`,
`<`, `=`, `>`, `?`) or the literal `[` character (for Linux console double-bracket sequences)
is appended to the internal buffer.

**Final byte detection:** A character in the range `0x40-0x7E` (uppercase/lowercase letters,
`~`, `^`, etc.) or the `$` character (rxvt-style shift terminator) terminates the sequence.

Once a complete CSI sequence is captured, `_resolveCSI()` runs a priority-ordered set of
checks:

1. **SGR Mouse**: If params start with `<` and final is `M` or `m`, parse as mouse event
2. **Focus tracking**: If params are empty and final is `I` (focus-in) or `O` (focus-out)
3. **Bracketed paste**: If the combined params+final equals `200~` (start) or `201~` (end)
4. **Linux console double-bracket**: If params start with `[` (e.g., `[[A` for F1)
5. **Numeric code regex**: `CSI_NUMERIC_RE` matches patterns like `11~`, `2;5~`, `200~`
6. **Letter code regex**: `CSI_LETTER_RE` matches patterns like `A`, `1;5A`, `5A`
7. **Fallback**: Unknown sequences emit as `key='Undefined'` with the raw sequence preserved

The two regex patterns are:

```typescript
const CSI_NUMERIC_RE = /^(?:(\d\d?)(?:;(\d+))?([~^$])|(\d{3}~))$/;
const CSI_LETTER_RE  = /^((\d+;)?(\d+))?([A-Za-z])$/;
```

### 2.2 SS3 Sequences (ESC `O` ...)

When the character following ESC is `O`, the parser enters SS3 state. SS3 sequences are
shorter: they consist of an optional modifier digit followed by a single final letter (range
`0x40-0x7E`). The parser collects digits into a buffer and, upon receiving the final letter,
looks up the SS3 code in `SS3_CODE_MAP` or `RXVT_CTRL_SS3_MAP`.

### 2.3 Bare Escape (Timeout Mechanism)

When ESC is received but no follow-up character arrives, the parser uses a 500ms timeout
(`ESCAPE_TIMEOUT_MS`) to decide that the user pressed the bare Escape key. This timeout is
started via `setTimeout` and cleared whenever a subsequent character arrives. If the timeout
fires while still in `Escape` state, it emits an `Escape` key event and resets to `Idle`.

The parser also handles **double-ESC**: if another ESC arrives while in `Escape` state, it
immediately emits the first ESC as an Escape key event, then restarts the escape-sequence
detection process for the second ESC.

### 2.4 Alt/Meta via Bare Escape Prefix

If ESC is followed by a regular printable character (not `[`, `O`, or another ESC), the
parser interprets this as Alt+key. It transitions back to `Idle` and calls `_emitSingleChar()`
with `meta=true`, which sets `altKey: true` on the resulting `KeyEvent`.

---

## 3. KeyEvent Data Structure and Types

### 3.1 The InputEvent Discriminated Union

All terminal input events share a common discriminated union pattern. The five variants are:

```typescript
export type InputEvent = KeyEvent | MouseEvent | ResizeEvent | FocusEvent | PasteEvent;
```

Each variant has a `readonly type` field that serves as the discriminant:

| Variant | `type` value | Additional fields |
|---------|-------------|-------------------|
| `KeyEvent` | `'key'` | `key`, `ctrlKey`, `altKey`, `shiftKey`, `metaKey`, `sequence?` |
| `MouseEvent` | `'mouse'` | `action`, `button`, `x`, `y`, `ctrlKey`, `altKey`, `shiftKey` |
| `ResizeEvent` | `'resize'` | `width`, `height` |
| `FocusEvent` | `'focus'` | `focused` (boolean) |
| `PasteEvent` | `'paste'` | `text` (string) |

All interfaces use `readonly` fields, making events effectively immutable once created.

### 3.2 KeyEvent Details

The `KeyEvent` interface carries the following fields:

- **`key: string`**: The logical key name. For printable characters, this is the character
  itself (lowercased for A-Z, with `shiftKey` set instead). For special keys, this is a
  standard name like `'ArrowUp'`, `'Enter'`, `'f1'`, `'Home'`, `'Escape'`, etc.
- **`ctrlKey`, `altKey`, `shiftKey`, `metaKey: boolean`**: Four modifier flags.
- **`sequence?: string`**: The raw escape sequence string that produced this event, preserved
  for debugging or passthrough use.

### 3.3 LogicalKey Constants

The `keyboard.ts` module exports a `LogicalKey` object with string constants for all named keys:

- Arrow keys: `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`
- Function keys: `f1` through `f12`
- Navigation: `Home`, `End`, `PageUp`, `PageDown`, `Insert`, `Delete`, `Clear`
- Action: `Enter`, `Return`, `Tab`, `Escape`, `Backspace`, `Space`

### 3.4 Key Name Normalization (LOW_LEVEL_TO_TUI_KEY)

The parser internally uses lowercase key names (e.g., `'up'`, `'home'`, `'pageup'`) matching
the Amp binary's `emitKeys` convention. These are mapped to TUI-level names via the
`LOW_LEVEL_TO_TUI_KEY` record before event emission:

```typescript
'up'       -> 'ArrowUp'
'home'     -> 'Home'
'pageup'   -> 'PageUp'
'delete'   -> 'Delete'
'tab'      -> 'Tab'
// ... etc.
```

### 3.5 KeyEventResult

Key handlers return `'handled'` or `'ignored'`. The dispatch system uses this to implement
stop-propagation semantics: if any handler in the chain returns `'handled'`, dispatch stops.

---

## 4. Mouse Event Parsing

### 4.1 SGR Mouse Protocol (Mode 1006)

The parser recognizes SGR-encoded mouse events, which have the format:

```
ESC [ < button ; col ; row M    (press/motion)
ESC [ < button ; col ; row m    (release)
```

Detection occurs in `_resolveCSI()`: if the CSI params start with `<` and the final character
is `M` or `m`, the params are parsed via the `SGR_MOUSE_RE` regex:

```typescript
const SGR_MOUSE_RE = /^<(\d+);(\d+);(\d+)$/;
```

### 4.2 Button Code Decoding

The SGR button code is a packed integer encoding both the button identity and modifier/motion
bits. The `mouse.ts` module provides three extraction functions:

**`extractMouseModifiers(buttonCode)`**: Extracts modifier flags using bitmask operations:
- Bit 2 (value 4) = Shift
- Bit 3 (value 8) = Alt/Meta
- Bit 4 (value 16) = Ctrl
- Bit 5 (value 32) = Motion (drag)

**`extractBaseButton(buttonCode)`**: Strips modifier/motion bits to get the raw button:
- 0 = Left, 1 = Middle, 2 = Right
- 64 = ScrollUp, 65 = ScrollDown, 66 = ScrollLeft, 67 = ScrollRight

**`determineMouseAction(buttonCode, final)`**: Determines the high-level action:
- `'m'` final character -> `'release'`
- Base button 64-67 -> `'scroll'`
- Motion bit set -> `'move'`
- Otherwise -> `'press'`

### 4.3 Coordinate Conversion

SGR coordinates are 1-based. The parser converts to 0-based by subtracting 1:

```typescript
x: col - 1,  // Convert 1-based to 0-based
y: row - 1,  // Convert 1-based to 0-based
```

### 4.4 MouseManager Dispatch

After parsing, mouse events flow through `EventDispatcher` to the `MouseManager` singleton.
The `MouseManager` tracks the last known mouse position, maintains a set of currently hovered
`RenderMouseRegion` instances, and manages cursor shape.

For hover tracking, `MouseManager.reestablishHoverState()` performs a DFS hit-test against
the render tree, comparing the set of regions under the cursor against the previously known
set, firing `enter`/`exit` events for changes.

For action dispatch (press, release, scroll), `MouseManager.dispatchMouseAction()` hit-tests
at the event coordinates and delivers to the deepest `RenderMouseRegion` that has the
appropriate handler.

---

## 5. How Events Are Dispatched to Widgets

### 5.1 Key Event Dispatch Pipeline

The `EventDispatcher.dispatchKeyEvent()` method implements a three-phase pipeline:

1. **Key Interceptors**: Global handlers registered via `addKeyInterceptor()`. These run
   before anything else and are used for system-level shortcuts (e.g., Ctrl+C to exit).
   If any interceptor returns `'handled'`, dispatch stops immediately.

2. **FocusManager Dispatch**: If a `FocusManager` singleton is available, the event is
   dispatched through the focus tree. `FocusManager.dispatchKeyEvent()` starts at the
   `primaryFocus` node and bubbles upward through parents until a handler returns `'handled'`
   or the root is reached. At each node, `FocusNode.handleKeyEvent()` first calls the
   node's `onKey` callback, then iterates through any additional `_keyHandlers` registered
   via `addKeyHandler()`.

3. **Registered Key Handlers**: If the focus system did not handle the event, fallback
   handlers registered via `EventDispatcher.addKeyHandler()` are tried in order.

### 5.2 Mouse Event Dispatch

Mouse dispatch is simpler:

1. For `release` events, all global release callbacks are fired (used for drag operations).
2. All registered mouse handlers are called sequentially.

Additionally, the `WidgetsBinding.setupEventHandlers()` method registers a mouse handler on
the `EventDispatcher` that routes events to `MouseManager`:
- `move` events update position and trigger `reestablishHoverState()`
- `press`, `release`, `scroll` events are forwarded to `MouseManager.dispatchMouseAction()`

### 5.3 Focus Tree Structure

The focus system uses a tree of `FocusNode` objects rooted under a `FocusScopeNode`:

- **`FocusNode`**: A leaf-level focus target. Has `canRequestFocus`, `skipTraversal`,
  `onKey` callback, `onPaste` callback, and multiple `_keyHandlers`. Supports
  `requestFocus()`, `unfocus()`, `nextFocus()`, `previousFocus()` for Tab navigation.

- **`FocusScopeNode`**: Extends `FocusNode` to track which child within its scope is
  focused. Supports `autofocus()`.

- **`FocusManager`**: Singleton that owns the `rootScope`, provides `primaryFocus` lookup
  (via DFS), manages `registerNode`/`unregisterNode`, and handles key/paste dispatch
  with bubbling.

Tab/Shift+Tab navigation uses `FocusManager.getTraversableNodes()`, which performs a DFS
traversal collecting nodes where `canRequestFocus && !skipTraversal`, then wraps around
circularly.

### 5.4 Hit-Test System

The `hit-test.ts` module provides a `hitTest(root, x, y)` function that walks the render tree
from root, converting screen coordinates to each node's local coordinate space by accumulating
offsets. The result is a `HitTestResult` with a `path` array ordered from deepest to shallowest.

The `MouseManager` has its own parallel `_hitTest()` implementation that specifically looks for
`RenderMouseRegion` instances and respects the `opaque` flag to block hit-testing of regions
behind opaque ones. Children are traversed in reverse order (back-to-front) so that the
topmost (last-painted) child is hit first.

---

## 6. Special Key Handling

### 6.1 Control Characters (Ctrl+A through Ctrl+Z)

Character codes `0x01` through `0x1A` are recognized as Ctrl+letter combinations. The parser
computes the letter by adding `0x60` to the code (`0x01` -> `'a'`, `0x03` -> `'c'`, etc.)
and sets `ctrlKey: true`.

Special cases that overlap with the control character range:
- `0x0D` (\r) and `0x0A` (\n) -> `'Enter'` (not Ctrl+M / Ctrl+J)
- `0x09` (\t) -> `'Tab'` (not Ctrl+I)
- `0x08` (\b) -> `'Backspace'` (not Ctrl+H)

### 6.2 Alt/Meta Key

Alt is detected in two ways:
1. **Bare escape prefix**: ESC followed by a non-sequence character sets `altKey: true`
2. **CSI modifier parameter**: The modifier parameter `(n-1)` has bit 1 for Alt

### 6.3 Function Keys (F1-F12)

Function keys are recognized through multiple encoding formats:
- **Numeric CSI**: `ESC[11~` through `ESC[24~` (note the gaps: 16 and 22 are skipped)
- **SS3 form**: `ESC O P` through `ESC O S` (F1-F4 only)
- **CSI letter form**: `ESC [ P` through `ESC [ S` (F1-F4 only)
- **Linux console**: `ESC [ [ A` through `ESC [ [ E` (F1-F5 only)

### 6.4 Modified Arrow/Navigation Keys

Modified keys use the xterm-style CSI modifier parameter format: `ESC [ 1;N X` where N
encodes modifiers and X is the direction letter. The modifier value is decoded as:

```
modifier = (N || 1) - 1
bit 0 = Shift
bit 1 = Alt
bit 2 = Ctrl
bit 3 = Meta
```

So N=2 means Shift, N=3 means Alt, N=5 means Ctrl, N=6 means Ctrl+Shift, N=9 means Meta.

### 6.5 rxvt Terminal Compatibility

The parser includes dedicated support for rxvt-style escape sequences:

- **Shift arrow keys**: Lowercase letter finals: `ESC[a` (Shift+Up), `ESC[b` (Shift+Down),
  `ESC[c` (Shift+Right), `ESC[d` (Shift+Left)
- **Ctrl arrow keys via SS3**: `ESC Oa` (Ctrl+Up), `ESC Ob` (Ctrl+Down), `ESC Oc` (Ctrl+Right),
  `ESC Od` (Ctrl+Left)
- **Shift navigation via `$`**: `ESC[2$` (Shift+Insert), `ESC[3$` (Shift+Delete),
  `ESC[5$` (Shift+PageUp), `ESC[7$` (Shift+Home)
- **Ctrl navigation via `^`**: `ESC[2^` (Ctrl+Insert), `ESC[3^` (Ctrl+Delete),
  `ESC[6^` (Ctrl+PageDown), `ESC[8^` (Ctrl+End)
- **Alternate Home/End codes**: `ESC[7~` (Home) and `ESC[8~` (End)

### 6.6 Shift+Tab

`Shift+Tab` is detected as `ESC[Z` (CSI with final `Z`). The parser maps this to `key='Tab'`
with `shiftKey: true`.

### 6.7 Uppercase Letters

When a printable uppercase letter (ASCII `0x41`-`0x5A`) is received, the parser normalizes
the key to lowercase and sets `shiftKey: true`. So pressing `A` produces `{key: 'a', shiftKey: true}`.

### 6.8 Bracketed Paste

Paste mode is activated by the sequence `ESC[200~` and terminated by `ESC[201~`. Between these
markers, the parser enters `Paste` state and accumulates all characters into a paste buffer.
It detects the end marker by checking if the buffer ends with `\x1b[201~`, then strips it and
emits a `PasteEvent` with the collected text.

### 6.9 Focus Tracking

Terminal focus events (enabled via `\x1b[?1004h`) are recognized as:
- `ESC[I` -> `FocusEvent { focused: true }`
- `ESC[O` -> `FocusEvent { focused: false }`

---

## 7. Code Quality and Edge Case Handling

### 7.1 Strengths

**Immutable event objects**: All event interfaces use `readonly` fields. Factory functions
create fresh objects, preventing mutation-related bugs in the dispatch chain.

**Discriminated union with exhaustive switching**: The `InputEvent` union uses the `type`
field as discriminant, enabling TypeScript narrowing in both `switch` and `if` statements.
The test suite explicitly verifies this narrowing behavior.

**Robust partial input handling**: The character-by-character state machine correctly handles
escape sequences that arrive across multiple `feed()` calls. The test suite includes dedicated
`partial input` tests that feed CSI, SGR mouse, function key, modified arrow, and paste
sequences one character at a time.

**Escape timeout mechanism**: The 500ms timeout for bare-ESC detection is a standard solution
to the fundamental ambiguity of escape-prefixed sequences. The parser provides a
`flushEscapeTimeout()` method for deterministic testing without waiting for real timeouts.

**Comprehensive terminal compatibility**: The mapping tables cover xterm, rxvt, Linux console,
and SS3 variants. The numeric code map correctly accounts for the historical gaps in function
key numbering (no codes 16, 22 between F5/F6 and F10/F11).

**Clean disposal**: Both `InputParser` and `InputBridge` have `dispose()` methods that set a
`_disposed` flag and clear pending timers. After disposal, `feed()` calls are silently ignored,
preventing zombie events.

**Singleton reset for testing**: `EventDispatcher`, `FocusManager`, and `MouseManager` all
provide `static reset()` methods that clear internal state and null out the singleton instance,
enabling clean test isolation.

### 7.2 Edge Cases Handled

- **Double ESC**: First ESC is immediately emitted as Escape key, second begins new sequence
- **ESC followed by data**: Timeout is cleared, no spurious Escape event
- **Buffer vs string input**: Both accepted by `feed()`, with automatic UTF-8 decoding
- **Unknown CSI sequences**: Emitted as `key='Undefined'` with raw sequence preserved
- **Paste-end without paste-start**: Silently transitions back to Idle
- **0-based coordinate conversion**: SGR 1-based coordinates are consistently decremented
- **Opaque mouse regions**: Hit-testing respects `RenderMouseRegion.opaque` to prevent
  click-through to regions behind opaque overlays
- **Focus tree disposal**: Disposing a focused node clears primary focus and notifies
  ancestor listeners
- **Modifier bit combinations**: The bitmask approach correctly handles arbitrary
  combinations of Shift+Alt+Ctrl+Meta on both keyboard and mouse events

### 7.3 Potential Concerns

**Lazy `require()` for FocusManager**: The `EventDispatcher.dispatchKeyEvent()` method uses
`require('./focus')` wrapped in a try/catch to avoid circular dependency issues. While
functional, this is a runtime cost on every key event and couples the dispatcher to Node/Bun's
module system. A dependency-injection approach would be cleaner.

**Paste buffer scanning**: The paste-end detection checks `endsWith(PASTE_END)` on every
character added to the paste buffer. For large pastes, this is O(n*m) where m is the length
of the end marker (6 characters). In practice this is unlikely to matter since terminal paste
operations are bounded by terminal buffer sizes, but a ring-buffer approach would be more
efficient.

**MouseManager lazy class loading**: `getRenderMouseRegionClass()` uses `require()` with a
module-level cache. This avoids circular imports but means the first mouse event after startup
pays a synchronous `require()` cost.

**Singleton pattern pervasiveness**: Three core objects (`EventDispatcher`, `FocusManager`,
`MouseManager`) are singletons. While this matches the Amp binary's architecture, it makes
unit testing require explicit `reset()` calls and prevents running multiple independent
input pipelines in a single process.

### 7.4 Test Coverage

The test suite in `input/__tests__/` covers:
- All printable ASCII characters and edge cases (space, digits, punctuation)
- All control characters (Ctrl+A through Ctrl+Z, Ctrl+C, Ctrl+D)
- All special single-byte characters (Enter via \r and \n, Tab, Backspace via 0x7F and 0x08)
- All arrow keys in both CSI and SS3 forms
- All 12 function keys in numeric, SS3, CSI letter, and Linux console forms
- All navigation keys (Home, End, Insert, Delete, PageUp, PageDown) with multiple encodings
- Modified keys with Ctrl, Shift, Alt, Meta, and combinations
- All rxvt shift (lowercase letter), ctrl (SS3 lowercase), $ (shift), ^ (ctrl) variants
- SGR mouse press, release, motion, scroll with all three buttons and modifiers
- Coordinate conversion (1-based to 0-based)
- Bracketed paste (simple, empty, multiline, special characters)
- Focus tracking events
- Bare escape (timeout, flush, real timeout)
- Alt via escape prefix
- Double ESC handling
- Partial byte-at-a-time input for all major sequence types
- Mixed sequences in a single feed
- Dispose behavior (no events after dispose, timeout cleanup)
- Buffer input acceptance
- Shortcut matching with all modifier combinations
- KeyEvent factory defaults and discriminated union narrowing
- MouseEvent factory and action types
- Mouse modifier extraction, base button extraction, and action determination

---

## Summary

The flitter-core input system is a well-architected, production-quality terminal input pipeline.
Its five-state parser correctly handles the full spectrum of ANSI/xterm/rxvt escape sequences,
including the notoriously tricky bare-ESC timeout ambiguity. The discriminated union event model
provides type-safe dispatch, and the three-phase key dispatch pipeline (interceptors, focus
tree with bubbling, fallback handlers) enables both global shortcuts and widget-specific key
handling. Mouse support includes full SGR protocol decoding, render-tree hit testing with
z-order and opacity, hover tracking with enter/exit events, and cursor shape management. The
code is extensively tested with over 80 individual test cases covering normal paths, edge
cases, and partial-input resilience.
