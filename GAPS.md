# Flitter vs Amp — Feature Gap Comparison

> **Last updated:** 2026-04-25
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
| ListView (virtualized) | ✅ | ✅ | list-view.ts with builder pattern and lazy rendering |
| Overlay system (hQ) | ✅ | ✅ | overlay.ts — Z-ordered floating overlay entries |
| OverlayContainer (positioned overlays) | ✅ | ✅ | overlay-container.ts — Stack+Positioned edge-based overlays |
| CompositedTransformTarget/Follower | ✅ | ✅ | composited-transform-target.ts + composited-transform-follower.ts + layer-link.ts |
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
| Ctrl+O command palette | ✅ | ✅ | command-palette.ts + command-palette-provider.ts |
| Ctrl+R prompt history picker | ✅ | ✅ | prompt-history.ts with FuzzyPicker-based workspace filter |
| Ctrl+G edit in $EDITOR | ✅ | ✅ | onOpenInEditor callback in InputField |
| Ctrl+V paste image | ✅ | ✅ | clipboard-image.ts + _handlePasteEvent in input-field.ts |
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
| e/f/r message edit/fork/restore | ✅ | ✅ | e=edit, f=fork-deprecated modal, r=restore; keybindings in ThreadStateWidget |
| `enterSubmitsMessage` config toggle | ✅ | ✅ | Configurable Enter vs Ctrl+Enter submit mode |
| Kitty keyboard protocol | ✅ | ✅ | CSI u parsing + flags=7 capability probe |

## 3. Mouse Support

| Feature | Amp | Flitter | Gap Notes |
|---|---|---|---|
| SGR mouse mode | ✅ | ✅ | Button-event + any-event + focus + SGR extended |
| Click on hyperlinks | ✅ | ✅ | Cell.url lookup on click → defaultOpenBrowser |
| Double-click word select | ✅ | ✅ | selectWordAt in text-editing-controller.ts + clickCount tracking in mouse-manager.ts |
| Triple-click line select | ✅ | ✅ | selectLineAt in text-editing-controller.ts + clickCount=3 detection |
| Click+drag text selection | ✅ | ✅ | selection-area.ts with _isDraggingState + drag anchor tracking |
| Shift+click extend selection | ✅ | ✅ | text-editing-controller.ts shiftClick/extend logic |
| Mouse wheel scroll | ✅ | ✅ | Full pipeline: SGR decode → MouseManager → Scrollable |
| Middle-click paste (X11) | ✅ | ✅ | mouse-manager.ts _handleMiddleClickPaste + clipboard.readPrimarySelection |
| Scrollbar drag | ✅ | ✅ | Already implemented in scrollbar.ts |
| Hover cursor change | ✅ | ✅ | OSC 22 cursor via MouseManager + TuiController |
| Auto-scroll during drag | ✅ | ✅ | selection-area.ts autoScrollConfig with threshold/step/interval |

## 4. Clipboard Operations

| Feature | Amp | Flitter | Gap Notes |
|---|---|---|---|
| OSC 52 clipboard write | ✅ | ✅ | — |
| OSC 52 clipboard read | ✅ | ✅ | — |
| Ctrl+C copy selection | ✅ | ✅ | selection-area.ts copyToClipboard |
| Copy-on-select | ✅ | ✅ | selection-area.ts auto-copy on select |
| Platform fallbacks (pbcopy, xclip, wl-copy) | ✅ | ✅ | OSC 52 → pbcopy → wl-copy → xclip → WSL fallback chain |
| Image paste (macOS/Wayland/X11/WSL) | ✅ | ✅ | clipboard-image.ts with osascript/wl-paste/xclip/PowerShell |
| Copy thread URL/ID/markdown | ✅ | ✅ | /copy-url, /copy-id, /copy-markdown slash commands |

## 5. Overlays & Dialogs

| Feature | Amp | Flitter | Gap Notes |
|---|---|---|---|
| Command Palette (Ctrl+O) | ✅ | ✅ | command-palette.ts + command-palette-provider.ts |
| Prompt History Picker (Ctrl+R) | ✅ | ✅ | prompt-history.ts with FuzzyPicker |
| Keybinding Help Sheet (`?`) | ✅ | ✅ | ? key toggle in ThreadStateWidget + ShortcutsPopup (same as amp's U8R) |
| Label Picker | ✅ | ❌ | Thread label management with inline create |
| Confirmation Dialog (y/n) | ✅ | ✅ | Aligned with amp: inline keybind hints, color injection, Center wrapper |
| Spinner Overlay | ✅ | ✅ | BrailleSpinner + Esc cancel, color injection, amp Ko/HRR aligned |
| Image Preview modal | ✅ | ❌ | Image viewing with save option |
| Thread Visibility Selector | ✅ | ❌ | Thread visibility control |
| MCP Server Trust Dialog | ✅ | ✅ | mcp-trust-dialog.ts — t/a/s/Esc key handlers, bordered dialog |
| Skill List Modal | ✅ | ❌ | Scrollable skill browser with detail pane |
| Console Overlay (Alt+C) | ✅ | ✅ | console-overlay.ts — scrollable log viewer with level-specific colors |
| Context Window / Token Usage View | ✅ | ✅ | context-window-overlay.ts — token/cost/usage display with e/b key toggles |
| Restore Confirmation | ✅ | ✅ | edit-restore-confirmation.ts — affected files listing + Delete/Cancel |
| Edit Confirmation | ✅ | ✅ | edit-restore-confirmation.ts — affected files listing + Confirm/Cancel |
| ModalStack (nested modals) | ✅ | ✅ | modal-stack.ts — ModalStackController push/pop + ModalStackWidget with Stack |
| FuzzyPicker (reusable) | ✅ | ✅ | fuzzy-picker.ts (775 lines) with fuzzy-match.ts scoring |

## 6. Text Selection System

| Feature | Amp | Flitter | Gap Notes |
|---|---|---|---|
| SelectionArea widget | ✅ | ✅ | selection-area.ts (1078 lines) — cross-widget mouse selection |
| Ctrl+A select all | ✅ | ✅ | selectAll in selection-area.ts |
| Selection highlighting | ✅ | ✅ | selectionColor in render-text-field.ts + text-field.ts |
| SelectionKeepAliveBoundary | ✅ | ✅ | selection-keep-alive.ts — preserve selection across viewport |

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
| Message edit (e key) | ✅ | ✅ | e key in ThreadStateWidget → onMessageEdit callback |
| Message fork (f key) | ✅ | ✅ | f key → onShowForkDeprecation (deprecated in amp) |
| Message restore (r key) | ✅ | ✅ | r key → onMessageRestore callback (guards ordinal > 0) |
| Edit confirmation with affected files | ✅ | ✅ | EditConfirmationWidget with file list + Enter/Esc |
| ForceDim for old messages during restore | ✅ | ✅ | force-dim.ts widget |
| Guidance file display | ✅ | ✅ | GuidanceFileDisplay with CWD-relative paths |
| Thread reference widget (V2) | ✅ | ✅ | thread-reference-widget.ts — ↳ prefix with fork/handoff/mention labels |
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
| TUI Widgets | 17 | 17 | 0 | 0 | 100% |
| Input/Keyboard | 22 | 22 | 0 | 0 | 100% |
| Mouse Support | 11 | 11 | 0 | 0 | 100% |
| Clipboard | 7 | 7 | 0 | 0 | 100% |
| Overlays & Dialogs | 16 | 12 | 0 | 4 | 75% |
| Text Selection | 4 | 4 | 0 | 0 | 100% |
| Tool Display | 21 | 21 | 0 | 0 | 100% |
| Message Features | 16 | 16 | 0 | 0 | 100% |
| Status Bar | 10 | 10 | 0 | 0 | 100% |
| Theming | 5 | 5 | 0 | 0 | 100% |
| Dev/Debug Tools | 5 | 5 | 0 | 0 | 100% |
| Autocomplete | 3 | 3 | 0 | 0 | 100% |
| **TOTAL** | **137** | **133** | **0** | **4** | **97%** |

## Remaining Gaps (4 items)

1. **Label Picker** — Thread label management with inline create
2. **Image Preview modal** — Image viewing with save option
3. **Thread Visibility Selector** — Thread visibility control
4. **Skill List Modal** — Scrollable skill browser with detail pane
