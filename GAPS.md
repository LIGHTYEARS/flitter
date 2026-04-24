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
| OverlapColumn | ✅ | ✅ | — |
| ListView (virtualized) | ✅ | ❌ | Builder pattern, lazy rendering, kept-alive items |
| Overlay system (hQ) | ✅ | ❌ | Z-ordered floating overlay entries |
| OverlayContainer (positioned overlays) | ✅ | ❌ | Top/bottom/left/right overlay positioning |
| CompositedTransformTarget/Follower | ✅ | ❌ | Tooltip/dropdown positioning system |
| SizeChangedNotifier | ✅ | ✅ | Post-frame callback with dedup, matching amp's NM/N1T |
| Offstage | ✅ | ✅ | — |
| ProgressBar (animated gradient) | ✅ | ✅ | AnimatedProgressBar with comet trail effect |
| HelpTable (responsive 2-col) | ✅ | ✅ | Two-column layout with fixed left width |
| GridLayout (2-panel with borders) | ✅ | ✅ | Amp uses Row+borders, not a dedicated widget |
| StickyHeaderLayout | ✅ | ✅ | Already implemented in sticky-header.ts |

## 2. Input Handling & Keyboard Shortcuts

| Feature | Amp | Flitter | Gap Notes |
|---|---|---|---|
| Enter / Shift+Enter submit | ✅ | ✅ | — |
| Backspace / character insert | ✅ | ✅ | — |
| Up/Down prompt history | ✅ | ✅ | — |
| Escape to cancel inference | ✅ | ✅ | — |
| Ctrl+O command palette | ✅ | ❌ | Full fuzzy command palette |
| Ctrl+R prompt history picker | ✅ | ❌ | FuzzyPicker-based with workspace filter |
| Ctrl+G edit in $EDITOR | ✅ | ✅ | onOpenInEditor callback in InputField |
| Ctrl+V paste image | ✅ | ❌ | Image paste from clipboard |
| Ctrl+S / Alt+S toggle agent mode | ✅ | ✅ | onToggleAgentMode callback in InputField |
| Ctrl+L refresh screen | ✅ | ✅ | Ctrl+L global shortcut + /refresh command |
| Ctrl+C double-press exit | ✅ | ✅ | Double-press logic + visual hint in status bar |
| Ctrl+Z suspend (SIGTSTP) | ✅ | ✅ | — |
| Alt+D toggle deep reasoning | ✅ | ✅ | /toggle-deep-reasoning slash command |
| Alt+T toggle thinking blocks | ✅ | ✅ | `/toggle-thinking-blocks` slash command exists |
| `?` shortcut help panel | ✅ | ✅ | HelpTable + ? key toggle in ThreadStateWidget |
| Emacs-style editing (Ctrl+A/E/B/F/K/U/Y/W/D/H/J/N/P) | ✅ | ✅ | Full readline emulation with shift-extend |
| Alt+Left/Right word jump | ✅ | ✅ | Alt+Left/Right + Alt+B/F + Meta variants |
| Tab / Shift+Tab message navigation | ✅ | ✅ | Selection mode with scroll-to-message and border highlight |
| j/k scroll in message view | ✅ | ✅ | Key interceptor on ThreadStateWidget |
| e/f/r message edit/fork/restore | ✅ | ❌ | Message-level operations |
| `enterSubmitsMessage` config toggle | ✅ | ✅ | Configurable Enter vs Ctrl+Enter submit mode |
| Kitty keyboard protocol | ✅ | ✅ | CSI u parsing + flags=7 capability probe |

## 3. Mouse Support

| Feature | Amp | Flitter | Gap Notes |
|---|---|---|---|
| SGR mouse mode | ✅ | ✅ | Button-event + any-event + focus + SGR extended |
| Click on hyperlinks | ✅ | ✅ | Cell.url lookup on click → defaultOpenBrowser |
| Double-click word select | ✅ | ❌ | Word-granularity selection |
| Triple-click line select | ✅ | ❌ | Full line selection |
| Click+drag text selection | ✅ | ❌ | Range selection with auto-scroll |
| Shift+click extend selection | ✅ | ❌ | Extend existing selection |
| Mouse wheel scroll | ✅ | ✅ | Full pipeline: SGR decode → MouseManager → Scrollable |
| Middle-click paste (X11) | ✅ | ❌ | Primary selection paste |
| Scrollbar drag | ✅ | ✅ | Already implemented in scrollbar.ts |
| Hover cursor change | ✅ | ✅ | OSC 22 cursor via MouseManager + TuiController |
| Auto-scroll during drag | ✅ | ❌ | Scroll when dragging near edges |

## 4. Clipboard Operations

| Feature | Amp | Flitter | Gap Notes |
|---|---|---|---|
| OSC 52 clipboard write | ✅ | ✅ | — |
| OSC 52 clipboard read | ✅ | ✅ | — |
| Ctrl+C copy selection | ✅ | ❌ | Copy selected text |
| Copy-on-select | ✅ | ❌ | Auto-copy after mouse selection |
| Platform fallbacks (pbcopy, xclip, wl-copy) | ✅ | ✅ | OSC 52 → pbcopy → wl-copy → xclip → WSL fallback chain |
| Image paste (macOS/Wayland/X11/WSL) | ✅ | ❌ | Multi-platform image paste |
| Copy thread URL/ID/markdown | ✅ | ✅ | /copy-url, /copy-id, /copy-markdown slash commands |

## 5. Overlays & Dialogs

| Feature | Amp | Flitter | Gap Notes |
|---|---|---|---|
| Command Palette (Ctrl+O) | ✅ | ❌ | Fuzzy-searchable command list with categories |
| Prompt History Picker (Ctrl+R) | ✅ | ❌ | FuzzyPicker with workspace filter (Alt+W/Ctrl+T) |
| Keybinding Help Sheet (`?`) | ✅ | ❌ | Two-column keybinding overlay |
| Label Picker | ✅ | ❌ | Thread label management with inline create |
| Confirmation Dialog (y/n) | ✅ | ✅ | Aligned with amp: inline keybind hints, color injection, Center wrapper |
| Spinner Overlay | ✅ | ✅ | BrailleSpinner + Esc cancel, color injection, amp Ko/HRR aligned |
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
| Diff view (unified, syntax highlighted) | ✅ | ✅ | Amp also uses simple line-prefix coloring, not per-language tokens |
| Mermaid diagram widget | ✅ | ✅ | — |
| Chart tool widget | ✅ | ✅ | — |
| Subagent/Task tool widget | ✅ | ✅ | — |
| Oracle tool widget | ✅ | ✅ | Shared subagent renderer with ExpandableToolHeader |
| Librarian tool widgets (5 variants) | ✅ | ✅ | LibrarianToolWidget + LibrarianSubToolWidget (7 variants) |
| REPL tool widget | ✅ | ✅ | Flat RichText with spinner/status prefix |
| Painter tool widget | ✅ | ✅ | ExpandableToolHeader with image entries |
| LookAt tool widget | ✅ | ✅ | ExpandableToolHeader with path + compare files |
| Handoff tool widget | ✅ | ✅ | Bordered box with blinking bullet and thread link |
| Toolbox tool widget | ✅ | ✅ | Flat RichText with spinner, args, exit code |
| Toolbox list widget | ✅ | ✅ | Summary + per-toolbox/tool status indicators |
| ExpandableToolHeader | ✅ | ✅ | Reusable component with chevron, status icons, spinner animation |

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
| Guidance file display | ✅ | ✅ | GuidanceFileDisplay with CWD-relative paths |
| Thread reference widget (V2) | ✅ | ❌ | Cross-thread navigation links |
| `$`/`$$` shell command prefix detection | ✅ | ✅ | — |
| `@` file mention | ✅ | ✅ | — |
| `@@` thread mention | ✅ | ✅ | @@ detection with thread mention insertion |

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
| ShowCosts inherited toggle | ✅ | ✅ | showCosts config prop gates cost display in status bar |
| DisplayPathEnvInfo toggle | ✅ | ✅ | ConfigService.displayPathEnvInfo() initialized with cwd/homeDir/platform |

## 10. Theming

| Feature | Amp | Flitter | Gap Notes |
|---|---|---|---|
| Theme InheritedWidget | ✅ | ✅ | — |
| Multiple built-in themes | ✅ | ✅ | — |
| Light/dark auto-detection | ✅ | ✅ | — |
| AppTheme with app-specific colors | ✅ | ✅ | 47-field AppTheme matching amp's yS class, InheritedWidget injection, wired into tool/diff/message widgets |
| Syntax highlighting color scheme | ✅ | ✅ | AppTheme.syntaxHighlight → syntaxColorsToTheme → MarkdownRenderer |

## 11. Developer/Debug Tools

| Feature | Amp | Flitter | Gap Notes |
|---|---|---|---|
| Debug logging | ✅ | ✅ | — |
| WidgetREPLServer (Unix socket) | ✅ | ✅ | Unix socket REPL with $ debugger API |
| WidgetTreeDebugger (HTTP) | ✅ | ✅ | HTTP server with /widget-tree, /focus-tree, /health |
| Debug: copy prompt command | ✅ | ✅ | /debug copy-prompt slash command |
| Debug: copy command | ✅ | ✅ | /debug copy-command slash command |

## 12. Autocomplete

| Feature | Amp | Flitter | Gap Notes |
|---|---|---|---|
| Slash command autocomplete (`/`) | ✅ | ✅ | — |
| File mention autocomplete (`@`) | ✅ | ✅ | — |
| Thread mention autocomplete (`@@`) | ✅ | ✅ | @@ detection + onThreadMentionTrigger + insertThreadMention |

---

## Summary

| Category | Total Features | Flitter ✅ | Flitter ⚠️ | Flitter ❌ | Coverage |
|---|---|---|---|---|---|
| TUI Widgets | 17 | 14 | 0 | 3 | 82% |
| Input/Keyboard | 22 | 18 | 0 | 4 | 82% |
| Mouse Support | 11 | 5 | 0 | 6 | 45% |
| Clipboard | 7 | 4 | 0 | 3 | 57% |
| Overlays & Dialogs | 16 | 2 | 0 | 14 | 13% |
| Text Selection | 4 | 0 | 0 | 4 | 0% |
| Tool Display | 21 | 21 | 0 | 0 | 100% |
| Message Features | 16 | 11 | 0 | 5 | 69% |
| Status Bar | 10 | 10 | 0 | 0 | 100% |
| Theming | 5 | 5 | 0 | 0 | 100% |
| Dev/Debug Tools | 5 | 5 | 0 | 0 | 100% |
| Autocomplete | 3 | 3 | 0 | 0 | 100% |
| **TOTAL** | **137** | **98** | **0** | **39** | **72%** |

## Top Priority Gaps (highest user-impact)

1. **Overlays & Dialogs** (13%) — Command palette (Ctrl+O), prompt history picker (Ctrl+R), modal stack still missing
2. **Text Selection** (0%) — No text selection system at all
3. **Mouse support** (45%) — Click+drag selection, double/triple-click, middle-click paste still missing
4. **Clipboard** (57%) — Missing copy selection, copy-on-select, image paste
5. **Message Features** (69%) — Missing message edit/fork/restore, thread reference widget
