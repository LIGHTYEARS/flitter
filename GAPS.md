# Flitter vs Amp — Feature Gap Comparison

> **Last updated:** 2026-04-24
> **Method:** Parallel agent exploration of `packages/cli/src/` (flitter) and `amp-cli-reversed/` (amp reference), cataloging all widgets, input handling, terminal features, tools, display, and chrome.

## Legend

- **✅** = Implemented
- **⚠️** = Partial
- **❌** = Missing

---

## 1. TUI Widgets & UI Components

| Feature | Amp | Flitter | Gap Notes |
|---|---|---|---|
| Core layout (Row, Column, Stack, Flex, Expanded) | ✅ | ✅ | — |
| Container with borders/padding | ✅ | ✅ | — |
| Table layout widget | ✅ | ✅ | — |
| SizedBox / Spacer | ✅ | ✅ | — |
| ClipRect | ✅ | ✅ | — |
| IntrinsicHeight | ✅ | ✅ | — |
| OverlapColumn | ✅ | ❌ | Stacked children with configurable overlap |
| ListView (virtualized) | ✅ | ❌ | Builder pattern, lazy rendering, kept-alive items |
| Overlay system (hQ) | ✅ | ❌ | Z-ordered floating overlay entries |
| OverlayContainer (positioned overlays) | ✅ | ❌ | Top/bottom/left/right overlay positioning |
| CompositedTransformTarget/Follower | ✅ | ❌ | Tooltip/dropdown positioning system |
| SizeChangedNotifier | ✅ | ❌ | Callback on layout size change |
| Offstage | ✅ | ❌ | Hide child while keeping it in tree |
| ProgressBar (animated gradient) | ✅ | ❌ | Animated horizontal bar with trail effect |
| HelpTable (responsive 2-col) | ✅ | ❌ | Side-by-side when wide, stacked when narrow |
| GridLayout (2-panel with borders) | ✅ | ❌ | Used for tool approval dialogs |
| StickyHeaderLayout | ✅ | ❌ | Header pins to top on scroll |

## 2. Input Handling & Keyboard Shortcuts

| Feature | Amp | Flitter | Gap Notes |
|---|---|---|---|
| Enter / Shift+Enter submit | ✅ | ✅ | — |
| Backspace / character insert | ✅ | ✅ | — |
| Up/Down prompt history | ✅ | ✅ | — |
| Escape to cancel inference | ✅ | ✅ | — |
| Ctrl+O command palette | ✅ | ❌ | Full fuzzy command palette |
| Ctrl+R prompt history picker | ✅ | ❌ | FuzzyPicker-based with workspace filter |
| Ctrl+G edit in $EDITOR | ✅ | ❌ | Opens prompt in external editor |
| Ctrl+V paste image | ✅ | ❌ | Image paste from clipboard |
| Ctrl+S / Alt+S toggle agent mode | ✅ | ❌ | Switch between modes |
| Ctrl+L refresh screen | ✅ | ✅ | Ctrl+L global shortcut + /refresh command |
| Ctrl+C double-press exit | ✅ | ✅ | Double-press logic + visual hint in status bar |
| Ctrl+Z suspend (SIGTSTP) | ✅ | ✅ | — |
| Alt+D toggle deep reasoning | ✅ | ❌ | Toggle reasoning effort level |
| Alt+T toggle thinking blocks | ✅ | ✅ | `/toggle-thinking-blocks` slash command exists |
| `?` shortcut help panel | ✅ | ❌ | Toggle inline keybinding help overlay |
| Emacs-style editing (Ctrl+A/E/B/F/K/U/Y/W/D/H/J/N/P) | ✅ | ✅ | Full readline emulation with shift-extend |
| Alt+Left/Right word jump | ✅ | ✅ | Alt+Left/Right + Alt+B/F + Meta variants |
| Tab / Shift+Tab message navigation | ✅ | ❌ | Navigate between user messages |
| j/k scroll in message view | ✅ | ❌ | Vim-style scroll when not in input |
| e/f/r message edit/fork/restore | ✅ | ❌ | Message-level operations |
| `enterSubmitsMessage` config toggle | ✅ | ✅ | Configurable Enter vs Ctrl+Enter submit mode |
| Kitty keyboard protocol | ✅ | ❌ | Extended key sequences |

## 3. Mouse Support

| Feature | Amp | Flitter | Gap Notes |
|---|---|---|---|
| SGR mouse mode | ✅ | ✅ | Button-event + any-event + focus + SGR extended |
| Click on hyperlinks | ✅ | ❌ | Open URLs in browser |
| Double-click word select | ✅ | ❌ | Word-granularity selection |
| Triple-click line select | ✅ | ❌ | Full line selection |
| Click+drag text selection | ✅ | ❌ | Range selection with auto-scroll |
| Shift+click extend selection | ✅ | ❌ | Extend existing selection |
| Mouse wheel scroll | ✅ | ✅ | Full pipeline: SGR decode → MouseManager → Scrollable |
| Middle-click paste (X11) | ✅ | ❌ | Primary selection paste |
| Scrollbar drag | ✅ | ❌ | Draggable scrollbar thumb |
| Hover cursor change | ✅ | ❌ | Pointer cursor on clickable elements |
| Auto-scroll during drag | ✅ | ❌ | Scroll when dragging near edges |

## 4. Clipboard Operations

| Feature | Amp | Flitter | Gap Notes |
|---|---|---|---|
| OSC 52 clipboard write | ✅ | ✅ | — |
| OSC 52 clipboard read | ✅ | ✅ | — |
| Ctrl+C copy selection | ✅ | ❌ | Copy selected text |
| Copy-on-select | ✅ | ❌ | Auto-copy after mouse selection |
| Platform fallbacks (pbcopy, xclip, wl-copy) | ✅ | ❌ | Fallback clipboard access |
| Image paste (macOS/Wayland/X11/WSL) | ✅ | ❌ | Multi-platform image paste |
| Copy thread URL/ID/markdown | ✅ | ❌ | Thread content clipboard ops |

## 5. Overlays & Dialogs

| Feature | Amp | Flitter | Gap Notes |
|---|---|---|---|
| Command Palette (Ctrl+O) | ✅ | ❌ | Fuzzy-searchable command list with categories |
| Prompt History Picker (Ctrl+R) | ✅ | ❌ | FuzzyPicker with workspace filter (Alt+W/Ctrl+T) |
| Keybinding Help Sheet (`?`) | ✅ | ❌ | Two-column keybinding overlay |
| Label Picker | ✅ | ❌ | Thread label management with inline create |
| Confirmation Dialog (y/n) | ✅ | ✅ | Aligned with amp: inline keybind hints, color injection, Center wrapper |
| Spinner Overlay | ✅ | ❌ | Centered spinner with escape-to-cancel |
| Image Preview modal | ✅ | ❌ | Image viewing with save option |
| Thread Visibility Selector | ✅ | ❌ | Thread visibility control |
| MCP Server Trust Dialog | ✅ | ❌ | Trust/always-trust/settings/dismiss |
| Skill List Modal | ✅ | ❌ | Scrollable skill browser with detail pane |
| Console Overlay (Alt+C) | ✅ | ❌ | Scrollable console log view |
| Context Window / Token Usage View | ✅ | ❌ | Detailed token breakdown with cost view |
| Restore Confirmation | ✅ | ❌ | Affected files listing before restore |
| Edit Confirmation | ✅ | ❌ | Affected files listing before edit |
| ModalStack (nested modals) | ✅ | ❌ | Push/pop modal system |
| FuzzyPicker (reusable) | ✅ | ❌ | Core fuzzy search picker component |

## 6. Text Selection System

| Feature | Amp | Flitter | Gap Notes |
|---|---|---|---|
| SelectionArea widget | ✅ | ❌ | Mouse selection across multiple widgets |
| Ctrl+A select all | ✅ | ❌ | Select entire conversation |
| Selection highlighting | ✅ | ❌ | Visual selection feedback |
| SelectionKeepAliveBoundary | ✅ | ❌ | Preserve selection across viewport |

## 7. Tool Display Widgets

| Feature | Amp | Flitter | Gap Notes |
|---|---|---|---|
| Bash/Shell tool widget | ✅ | ✅ | — |
| Read tool widget | ✅ | ✅ | — |
| Edit tool widget | ✅ | ✅ | — |
| Create/Write tool widget | ✅ | ✅ | — |
| Grep/Glob tool widget | ✅ | ✅ | — |
| Apply Patch tool widget | ✅ | ✅ | — |
| Web Search tool widget | ✅ | ✅ | — |
| Read Web Page tool widget | ✅ | ✅ | — |
| Diff view (unified, syntax highlighted) | ✅ | ⚠️ | Flitter has basic diff; amp has per-language syntax highlighting in diffs |
| Mermaid diagram widget | ✅ | ✅ | — |
| Chart tool widget | ✅ | ✅ | — |
| Subagent/Task tool widget | ✅ | ✅ | — |
| Oracle tool widget | ✅ | ❌ | Oracle subagent results display |
| Librarian tool widgets (5 variants) | ✅ | ❌ | Search, read, glob, list, commit-search, diff |
| REPL tool widget | ✅ | ❌ | REPL invocation display |
| Painter tool widget | ✅ | ❌ | Render/paint tool output |
| LookAt tool widget | ✅ | ❌ | Image viewing tool display |
| Handoff tool widget | ✅ | ❌ | Thread handoff with state |
| Toolbox tool widget | ✅ | ❌ | Custom toolbox invocations |
| Toolbox list widget | ✅ | ❌ | All toolboxes with status indicators |
| ExpandableToolHeader | ✅ | ❌ | Collapsible tool sections with toggle |

## 8. Message Features

| Feature | Amp | Flitter | Gap Notes |
|---|---|---|---|
| User message with colored border | ✅ | ✅ | — |
| Interrupted message (amber border) | ✅ | ✅ | — |
| Assistant markdown rendering | ✅ | ✅ | — |
| Streaming cursor `█` | ✅ | ✅ | — |
| Token usage per message | ✅ | ✅ | — |
| Activity group collapsing | ✅ | ✅ | — |
| Message edit (e key) | ✅ | ❌ | Edit previous user message |
| Message fork (f key) | ✅ | ❌ | Fork conversation from message |
| Message restore (r key) | ✅ | ❌ | Restore to previous state |
| Edit confirmation with affected files | ✅ | ❌ | Shows what files will be affected |
| ForceDim for old messages during restore | ✅ | ❌ | Dims messages after restore point |
| Guidance file display | ✅ | ❌ | Shows related guidance files |
| Thread reference widget (V2) | ✅ | ❌ | Cross-thread navigation links |
| `$`/`$$` shell command prefix detection | ✅ | ✅ | — |
| `@` file mention | ✅ | ✅ | — |
| `@@` thread mention | ✅ | ❌ | Cross-thread references |

## 9. Status Bar & Chrome

| Feature | Amp | Flitter | Gap Notes |
|---|---|---|---|
| Context % display | ✅ | ✅ | — |
| Cost display | ✅ | ✅ | — |
| Model name display | ✅ | ✅ | — |
| Mode / skills count | ✅ | ✅ | — |
| CWD + branch display | ✅ | ✅ | — |
| Status message state machine | ✅ | ✅ | — |
| Bottom status line with wave animation | ✅ | ✅ | — |
| Toast notifications | ✅ | ✅ | — |
| ShowCosts inherited toggle | ✅ | ❌ | Toggle cost display visibility |
| DisplayPathEnvInfo toggle | ✅ | ❌ | Toggle env path info |

## 10. Theming

| Feature | Amp | Flitter | Gap Notes |
|---|---|---|---|
| Theme InheritedWidget | ✅ | ✅ | — |
| Multiple built-in themes | ✅ | ✅ | — |
| Light/dark auto-detection | ✅ | ✅ | — |
| AppTheme with app-specific colors | ✅ | ✅ | 47-field AppTheme matching amp's yS class, InheritedWidget injection, wired into tool/diff/message widgets |
| Syntax highlighting color scheme | ✅ | ❌ | Per-language token colors in diffs/code |

## 11. Developer/Debug Tools

| Feature | Amp | Flitter | Gap Notes |
|---|---|---|---|
| Debug logging | ✅ | ✅ | — |
| WidgetREPLServer (Unix socket) | ✅ | ❌ | Runtime widget tree inspection via REPL |
| WidgetTreeDebugger (HTTP) | ✅ | ❌ | `/widget-tree` JSON endpoint |
| Debug: copy prompt command | ✅ | ❌ | Copy current prompt to clipboard |
| Debug: copy command | ✅ | ❌ | Copy debug command |

## 12. Autocomplete

| Feature | Amp | Flitter | Gap Notes |
|---|---|---|---|
| Slash command autocomplete (`/`) | ✅ | ✅ | — |
| File mention autocomplete (`@`) | ✅ | ✅ | — |
| Thread mention autocomplete (`@@`) | ✅ | ❌ | Cross-thread reference autocomplete |

---

## Summary

| Category | Total Features | Flitter ✅ | Flitter ⚠️ | Flitter ❌ | Coverage |
|---|---|---|---|---|---|
| TUI Widgets | 17 | 7 | 0 | 10 | 41% |
| Input/Keyboard | 22 | 11 | 0 | 11 | 50% |
| Mouse Support | 11 | 2 | 0 | 9 | 18% |
| Clipboard | 7 | 2 | 0 | 5 | 29% |
| Overlays & Dialogs | 16 | 1 | 0 | 15 | 6% |
| Text Selection | 4 | 0 | 0 | 4 | 0% |
| Tool Display | 21 | 11 | 1 | 9 | 52% |
| Message Features | 16 | 9 | 0 | 7 | 56% |
| Status Bar | 10 | 8 | 0 | 2 | 80% |
| Theming | 5 | 4 | 0 | 1 | 80% |
| Dev/Debug Tools | 5 | 1 | 0 | 4 | 20% |
| Autocomplete | 3 | 2 | 0 | 1 | 67% |
| **TOTAL** | **137** | **58** | **1** | **78** | **42%** |

## Top Priority Gaps (highest user-impact)

1. **Mouse support** (18%) — Click, selection, drag mostly wired; SGR mode + scroll now working
2. **Overlays & Dialogs** (6%) — Command palette (Ctrl+O), prompt history picker (Ctrl+R), most modals still missing
3. **Text Selection** (0%) — No text selection system at all
4. **Input/Keyboard** (50%) — Emacs editing + word jump done; still missing Ctrl+O/R/G/V/S, message nav, vim scroll
5. **Clipboard** (29%) — Missing copy/paste beyond basic OSC 52, image paste, platform fallbacks
