// Root App widget — the top-level widget tree matching Amp's layout
//
// Layout (Amp-faithful, Phase 7):
// Column (mainAxisSize: max)
//   ├── Expanded
//   │   └── Row (crossAxisAlignment: stretch)
//   │       ├── Expanded
//   │       │   └── SingleChildScrollView (position: bottom, followMode)
//   │       │       └── ChatView (conversation items)
//   │       └── Scrollbar (1-col wide)
//   ├── InputArea (full-width, top separator, mode label)
//   └── StatusBar (? for shortcuts + cwd + git branch)
//
// Overlays (OverlayManager-based, priority order):
//   1. PermissionDialog (priority 100) — agent permission request (modal)
//   2. ShortcutHelp (priority 50) — ? shortcut reference (modal)
//   3. CommandPalette (priority 50) — Ctrl+O action palette
//   4. FilePicker (priority 25) — @file mention picker
//
// Mouse: enabled automatically by flitter-core MouseManager (terminal: true)
// ScrollView responds to mouse wheel; SelectionList supports enableMouseInteraction

import {
  StatefulWidget, State, Widget,
} from 'flitter-core/src/framework/widget';
import { runApp, WidgetsBinding } from 'flitter-core/src/framework/binding';
import { Column, Row } from 'flitter-core/src/widgets/flex';
import { Expanded } from 'flitter-core/src/widgets/flexible';
import { SingleChildScrollView } from 'flitter-core/src/widgets/scroll-view';
import { ScrollController } from 'flitter-core/src/widgets/scroll-controller';
import { Scrollbar } from 'flitter-core/src/widgets/scrollbar';
import { Padding } from 'flitter-core/src/widgets/padding';
import { EdgeInsets } from 'flitter-core/src/layout/edge-insets';
import { Color } from 'flitter-core/src/core/color';
import { Text } from 'flitter-core/src/widgets/text';
import { TextSpan } from 'flitter-core/src/core/text-span';
import { TextStyle } from 'flitter-core/src/core/text-style';
import { Container } from 'flitter-core/src/widgets/container';
import { BoxDecoration, Border, BorderSide } from 'flitter-core/src/layout/render-decorated';
import { FocusScope } from 'flitter-core/src/widgets/focus-scope';
import { Center } from 'flitter-core/src/widgets/center';
import { SizedBox } from 'flitter-core/src/widgets/sized-box';
import { TextEditingController } from 'flitter-core/src/widgets/text-field';
import type { KeyEvent, KeyEventResult } from 'flitter-core/src/input/events';

import { AppState } from './state/app-state';
import { PromptHistory } from './state/history';
import { OverlayManager } from './state/overlay-manager';
import { OVERLAY_IDS, OVERLAY_PRIORITIES } from './state/overlay-ids';
import { ChatView } from './widgets/chat-view';
import { BottomGrid } from './widgets/bottom-grid';
import { PermissionDialog } from './widgets/permission-dialog';
import { CommandPalette } from './widgets/command-palette';
import { FilePicker } from './widgets/file-picker';
import { ShortcutHelpOverlay } from './widgets/shortcut-help-overlay';
import { ThreadList } from './widgets/thread-list';
import type { ThreadEntry } from './widgets/thread-list';
import { PromptHistoryPicker } from './widgets/prompt-history-picker';
import { launchEditor } from './utils/editor-launcher';
import type { ConversationItem } from './acp/types';
import { AmpThemeProvider, createAmpTheme, darkTheme as darkBaseTheme } from './themes/index';
import { log } from './utils/logger';
import { ShortcutRegistry, registerDefaultShortcuts } from './shortcuts';
import type { ShortcutContext, ShortcutHooks } from './shortcuts';

// --- App Widget ---

interface AppProps {
  appState: AppState;
  onSubmit: (text: string) => void;
  onCancel: () => void;
  historySize?: number;
  historyFile?: string;
  inputController?: TextEditingController;
}

export class App extends StatefulWidget {
  readonly appState: AppState;
  readonly onSubmit: (text: string) => void;
  readonly onCancel: () => void;
  readonly historySize: number;
  readonly historyFile: string | null;
  readonly inputController: TextEditingController | undefined;

  constructor(props: AppProps) {
    super({});
    this.appState = props.appState;
    this.onSubmit = props.onSubmit;
    this.onCancel = props.onCancel;
    this.historySize = props.historySize ?? 100;
    this.historyFile = props.historyFile ?? null;
    this.inputController = props.inputController;
  }

  createState(): AppStateWidget {
    return new AppStateWidget();
  }
}

// --- Reverse Search State (Gap 64) ---

/** State for an active incremental reverse search session. */
interface ReverseSearchState {
  /** The current search query string, built up character by character. */
  query: string;

  /** The history entry currently matched, or null if no match found yet. */
  matchedEntry: string | null;

  /** The index of the current match in PromptHistory entries, or -1 if no match. */
  matchIndex: number;

  /** Whether the current query has any matches. When true, UI shows "failing" prefix. */
  isFailing: boolean;

  /** The input text that was present before entering search mode. Restored on Escape. */
  savedInput: string;
}

class AppStateWidget extends State<App> {
  private scrollController = new ScrollController();
  private inputController!: TextEditingController;
  private _ownsController = false;
  private stateListener: (() => void) | null = null;
  private overlayListener: (() => void) | null = null;
  readonly overlayManager = new OverlayManager();
  private fileList: string[] = [];
  private promptHistory!: PromptHistory;
  private _savedDraft: string = '';
  private _isNavigatingHistory = false;
  private _reverseSearch: ReverseSearchState | null = null;
  private _lastUpdate = 0;
  private _pendingTimer: ReturnType<typeof setTimeout> | null = null;
  private _copyHighlight = false;
  private _copyHighlightTimer: ReturnType<typeof setTimeout> | null = null;
  readonly shortcutRegistry = new ShortcutRegistry();
  private _mysterySequence: number = 0;
  private _mysteryTimer: ReturnType<typeof setTimeout> | null = null;

  override initState(): void {
    super.initState();

    if (this.widget.inputController) {
      this.inputController = this.widget.inputController;
      this._ownsController = false;
    } else {
      this.inputController = new TextEditingController();
      this._ownsController = true;
    }

    // Wire config historySize and historyFile to PromptHistory (Gap 52 + 53)
    this.promptHistory = new PromptHistory(
      this.widget.historySize,
      this.widget.historyFile,
    );

    // Initialize shortcut registry with all default shortcuts
    registerDefaultShortcuts(this.shortcutRegistry);

    // Reset history cursor when user edits text manually (Gap 63)
    this.inputController.addListener(this._onInputTextChanged);

    // Listen to AppState changes and trigger rebuilds (50ms throttle for streaming)
    this.stateListener = () => {
      const now = Date.now();
      const elapsed = now - this._lastUpdate;

      if (elapsed >= 50) {
        this._flushUpdate();
      } else if (!this._pendingTimer) {
        this._pendingTimer = setTimeout(() => {
          this._flushUpdate();
        }, 50 - elapsed);
      }
    };
    this.widget.appState.addListener(this.stateListener);

    // Listen to OverlayManager changes to trigger rebuilds
    this.overlayListener = () => { this.setState(() => { }); };
    this.overlayManager.addListener(this.overlayListener);
  }

  private _flushUpdate(): void {
    if (this._pendingTimer) {
      clearTimeout(this._pendingTimer);
      this._pendingTimer = null;
    }
    this._lastUpdate = Date.now();
    const wasAtBottom = this.scrollController.atBottom;
    this.widget.appState.conversation.flushStreamingText();
    this.setState(() => { });
    if (this.widget.appState.isProcessing && wasAtBottom) {
      this.scrollController.enableFollowMode();
    }
  }

  // --- Gap 63: Text change listener to reset history cursor on manual edit ---

  private _onInputTextChanged = (): void => {
    // If this change was triggered by history navigation, skip the reset.
    if (this._isNavigatingHistory) return;

    // User edited the text manually -- reset history cursor
    if (!this.promptHistory.isAtReset) {
      this.promptHistory.resetCursor();
    }
  };

  // --- Gap 63: Shared history navigation helper ---

  /**
   * Navigate prompt history in the given direction.
   * @param direction 'backward' for previous, 'forward' for next
   */
  private _navigateHistory(direction: 'backward' | 'forward'): void {
    this._isNavigatingHistory = true;
    try {
      if (direction === 'backward') {
        if (this.promptHistory.isAtReset) {
          this._savedDraft = this.inputController.text;
        }
        const prev = this.promptHistory.previous();
        if (prev !== null) {
          this.inputController.text = prev;
          this.inputController.cursorPosition = prev.length;
        }
      } else {
        const next = this.promptHistory.next();
        if (next !== null) {
          if (next === '') {
            // Returned to "new prompt" state -- restore saved draft
            this.inputController.text = this._savedDraft;
            this.inputController.cursorPosition = this._savedDraft.length;
            this._savedDraft = '';
          } else {
            this.inputController.text = next;
            this.inputController.cursorPosition = next.length;
          }
        }
      }
    } finally {
      this._isNavigatingHistory = false;
    }
  }

  // --- Gap 64: Incremental reverse search mode ---

  /**
   * Enter incremental reverse search mode.
   * Saves the current input text as the restore point and shows the search UI.
   */
  private _enterSearchMode(): void {
    this._reverseSearch = {
      query: '',
      matchedEntry: null,
      matchIndex: -1,
      isFailing: false,
      savedInput: this.inputController.text,
    };
    this.setState(() => { });  // rebuild to show search indicator
  }

  /**
   * Exit search mode.
   * @param accept If true, keep the matched text in the input.
   *   If false, restore the original text from before search started.
   */
  private _exitSearchMode(accept: boolean): void {
    if (!this._reverseSearch) return;

    if (!accept) {
      // Restore original text
      this._isNavigatingHistory = true;
      try {
        this.inputController.text = this._reverseSearch.savedInput;
        this.inputController.cursorPosition = this._reverseSearch.savedInput.length;
      } finally {
        this._isNavigatingHistory = false;
      }
    } else {
      // Accept: text is already set to the match. Place cursor at end.
      this.inputController.cursorPosition = this.inputController.text.length;
      // Reset the linear history cursor since the user accepted a specific entry via search.
      this.promptHistory.resetCursor();
    }

    this._reverseSearch = null;
    this.setState(() => { });  // rebuild to hide search indicator
  }

  /**
   * Handle a key event while incremental reverse search is active.
   * This method intercepts ALL keys during search mode.
   */
  private _handleSearchModeKey(event: KeyEvent): KeyEventResult {
    const rs = this._reverseSearch!;

    // --- Ctrl+R: cycle to next older match ---
    if (event.ctrlKey && event.key === 'r') {
      if (rs.query !== '' && rs.matchIndex > 0) {
        const result = this.promptHistory.searchBackward(
          rs.query,
          rs.matchIndex - 1,
        );
        if (result) {
          rs.matchedEntry = result.entry;
          rs.matchIndex = result.index;
          rs.isFailing = false;
          this._setInputFromSearch(result.entry);
        } else {
          // No more older matches -- mark as failing but keep last match visible
          rs.isFailing = true;
        }
      }
      this.setState(() => { });
      return 'handled';
    }

    // --- Ctrl+S: cycle to next newer match (forward search) ---
    if (event.ctrlKey && event.key === 's') {
      if (rs.query !== '' && rs.matchIndex >= 0) {
        const result = this.promptHistory.searchForward(
          rs.query,
          rs.matchIndex + 1,
        );
        if (result) {
          rs.matchedEntry = result.entry;
          rs.matchIndex = result.index;
          rs.isFailing = false;
          this._setInputFromSearch(result.entry);
        } else {
          rs.isFailing = true;
        }
      }
      this.setState(() => { });
      return 'handled';
    }

    // --- Escape: cancel search, restore original text ---
    if (event.key === 'Escape') {
      this._exitSearchMode(false);
      return 'handled';
    }

    // --- Enter/Return: accept current match ---
    if (event.key === 'Enter' || event.key === 'Return') {
      this._exitSearchMode(true);
      return 'handled';
    }

    // --- Ctrl+G or Ctrl+C: cancel search (bash convention) ---
    if (event.ctrlKey && (event.key === 'g' || event.key === 'c')) {
      this._exitSearchMode(false);
      return 'handled';
    }

    // --- Backspace: remove last character from query ---
    if (event.key === 'Backspace') {
      if (rs.query.length > 0) {
        rs.query = rs.query.slice(0, -1);
        if (rs.query.length === 0) {
          // Query is now empty -- restore original text, clear match state
          rs.matchedEntry = null;
          rs.matchIndex = -1;
          rs.isFailing = false;
          this._isNavigatingHistory = true;
          try {
            this.inputController.text = rs.savedInput;
            this.inputController.cursorPosition = rs.savedInput.length;
          } finally {
            this._isNavigatingHistory = false;
          }
        } else {
          this._performSearch();
        }
      } else {
        // Backspace on empty query: exit search mode, restore saved input
        this._exitSearchMode(false);
      }
      this.setState(() => { });
      return 'handled';
    }

    // --- ArrowLeft/ArrowRight: accept match, let arrow pass through ---
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      this._exitSearchMode(true);
      return 'ignored';  // re-process for cursor movement
    }

    // --- ArrowUp: accept match, let arrow pass through for history nav ---
    if (event.key === 'ArrowUp') {
      this._exitSearchMode(true);
      return 'ignored';  // will be caught by ArrowUp handler
    }

    // --- ArrowDown: accept match, let arrow pass through ---
    if (event.key === 'ArrowDown') {
      this._exitSearchMode(true);
      return 'ignored';
    }

    // --- Printable character: append to search query ---
    if (!event.ctrlKey && !event.altKey && !event.metaKey) {
      const ch = event.key;
      if (ch.length === 1 && ch.charCodeAt(0) >= 0x20 && ch.charCodeAt(0) <= 0x7E) {
        rs.query += ch;
        this._performSearch();
        this.setState(() => { });
        return 'handled';
      }
      if (ch === 'Space') {
        rs.query += ' ';
        this._performSearch();
        this.setState(() => { });
        return 'handled';
      }
    }

    // --- Any other key: exit search mode, accept match, pass key through ---
    this._exitSearchMode(true);
    return 'ignored';
  }

  /**
   * Execute the search with the current query.
   * Called when the query changes (character added or removed).
   */
  private _performSearch(): void {
    const rs = this._reverseSearch;
    if (!rs || rs.query === '') return;

    // Search backward from the most recent entry
    const result = this.promptHistory.searchBackward(rs.query);

    if (result) {
      rs.matchedEntry = result.entry;
      rs.matchIndex = result.index;
      rs.isFailing = false;
      this._setInputFromSearch(result.entry);
    } else {
      // No match found -- show original text, mark as failing
      rs.matchedEntry = null;
      rs.matchIndex = -1;
      rs.isFailing = true;
      this._isNavigatingHistory = true;
      try {
        this.inputController.text = rs.savedInput;
        this.inputController.cursorPosition = rs.savedInput.length;
      } finally {
        this._isNavigatingHistory = false;
      }
    }
  }

  /**
   * Set the input controller text from a search result.
   * Guards with _isNavigatingHistory to prevent the text change listener
   * from resetting the linear history cursor.
   */
  private _setInputFromSearch(entry: string): void {
    this._isNavigatingHistory = true;
    try {
      this.inputController.text = entry;
      this.inputController.cursorPosition = entry.length;
    } finally {
      this._isNavigatingHistory = false;
    }
  }

  override dispose(): void {
    // Flush history to disk on graceful teardown
    this.promptHistory.save();

    // Remove text change listener (Gap 63)
    this.inputController.removeListener(this._onInputTextChanged);

    if (this._pendingTimer) {
      clearTimeout(this._pendingTimer);
      this._pendingTimer = null;
    }
    if (this._copyHighlightTimer) {
      clearTimeout(this._copyHighlightTimer);
      this._copyHighlightTimer = null;
    }
    if (this._mysteryTimer) {
      clearTimeout(this._mysteryTimer);
      this._mysteryTimer = null;
    }
    if (this.stateListener) {
      this.widget.appState.removeListener(this.stateListener);
    }
    if (this.overlayListener) {
      this.overlayManager.removeListener(this.overlayListener);
    }
    super.dispose();
  }

  private toggleThinking(appState: AppState): void {
    appState.conversation.toggleThinking();
  }

  /**
   * Open the current input text in $EDITOR.
   * Suspends the TUI, spawns the editor, resumes, and injects the edited text.
   * Amp ref: J3 suspend pattern -- suspends tui, pauses scheduler
   */
  private async _openInEditor(): Promise<void> {
    const binding = WidgetsBinding.instance;
    const currentText = this.inputController.text;

    // 1. Suspend the TUI
    binding.suspend();

    try {
      // 2. Launch editor with current input text
      const result = await launchEditor(currentText);

      // 3. If successful, replace the input text
      if (result.success && result.text !== null) {
        // Trim trailing newline that most editors add
        const editedText = result.text.replace(/\n+$/, '');
        this.inputController.text = editedText;
        this.inputController.cursorPosition = editedText.length;
      }
    } finally {
      // 4. Always resume the TUI, even if editor fails
      binding.resume();

      // 5. Trigger a rebuild to reflect any text changes
      this.setState(() => { });
    }
  }

  /**
   * Show the command palette overlay.
   * Builds the CommandPalette widget with the command list derived from the registry.
   */
  private _showCommandPalette(): void {
    const appState = this.widget.appState;

    // Derive commands from the registry (exclude non-command entries like dismiss-overlay)
    const registryCommands = this.shortcutRegistry.getEntries()
      .filter(e => e.id !== 'dismiss-overlay')
      .map(e => ({
        label: e.description,
        value: e.id,
        description: e.displayKey,
      }));

    // Add toggle-thinking which is not a keyboard shortcut but a command palette action
    registryCommands.push({
      label: 'Toggle thinking',
      value: 'toggle-thinking',
      description: 'Expand/collapse all thinking blocks',
    });

    // Add palette-only commands (W4-3) that have no keyboard shortcut binding
    registryCommands.push(
      { label: 'New thread', value: 'new-thread', description: 'Start a fresh conversation' },
      { label: 'Switch model', value: 'switch-model', description: 'Open model selection' },
      { label: 'Copy last response', value: 'copy-last-response', description: 'Copy last assistant message to clipboard' },
      { label: 'Toggle dense view', value: 'toggle-dense-view', description: 'Toggle compact display mode' },
      { label: 'View usage', value: 'view-usage', description: 'Show token/cost summary' },
      { label: 'Show shortcuts help', value: 'show-shortcuts-help', description: 'Open shortcut reference overlay' },
      { label: 'Open thread list', value: 'open-thread-list', description: 'Browse and switch threads' },
    );

    this.overlayManager.show({
      id: OVERLAY_IDS.COMMAND_PALETTE,
      priority: OVERLAY_PRIORITIES.COMMAND_PALETTE,
      modal: false,
      placement: { type: 'fullscreen' },
      builder: (_onDismiss) => new CommandPalette({
        commands: registryCommands,
        onExecute: (command: string) => {
          this.overlayManager.dismiss(OVERLAY_IDS.COMMAND_PALETTE);
          switch (command) {
            case 'clear-conversation':
              appState.conversation.clear();
              break;
            case 'toggle-tool-calls':
              appState.conversation.toggleToolCalls();
              break;
            case 'toggle-thinking':
              this.toggleThinking(appState);
              break;
            case 'open-command-palette':
              // Already in the palette, no-op
              break;
            case 'cancel-operation':
              this.widget.onCancel();
              break;
            case 'open-editor':
              this._openInEditor();
              break;
            case 'history-previous':
              this._historyPrevious();
              break;
            case 'history-next':
              this._historyNext();
              break;
            case 'toggle-shortcut-help':
              this._showShortcutHelp();
              break;
            case 'new-thread':
              appState.newThread();
              break;
            case 'switch-model':
              // Opens model selection sub-menu (placeholder: logs available modes)
              break;
            case 'copy-last-response':
              this._copyLastResponse();
              break;
            case 'toggle-dense-view':
              appState.toggleDenseView();
              break;
            case 'view-usage': {
              const summary = appState.getUsageSummary();
              if (summary) {
                appState.setError(summary);
              }
              break;
            }
            case 'show-shortcuts-help':
              this._showShortcutHelp();
              break;
            case 'open-thread-list':
              this._showThreadList();
              break;
            case 'cycle-mode':
              appState.cycleMode();
              break;
            case 'toggle-deep-reasoning':
              appState.toggleDeepReasoning();
              break;
            default:
              // Unknown command, no-op
              break;
          }
        },
        onDismiss: () => {
          this.overlayManager.dismiss(OVERLAY_IDS.COMMAND_PALETTE);
        },
      }),
    });
  }

  /**
   * Show the shortcut help overlay, deriving groups from the registry.
   */
  private _showShortcutHelp(): void {
    this.overlayManager.show({
      id: OVERLAY_IDS.SHORTCUT_HELP,
      priority: OVERLAY_PRIORITIES.SHORTCUT_HELP,
      modal: true,
      placement: { type: 'fullscreen' },
      builder: (_onDismiss) => new ShortcutHelpOverlay({
        registry: this.shortcutRegistry,
        onDismiss: () => {
          this.overlayManager.dismiss(OVERLAY_IDS.SHORTCUT_HELP);
        },
      }),
    });
  }

  private _showThreadList(): void {
    const appState = this.widget.appState;
    const threads: ThreadEntry[] = appState.conversation.items.length > 0
      ? [{
          sessionId: appState.sessionId ?? 'current',
          summary: 'Current thread',
          updatedAt: Date.now(),
          messageCount: appState.conversation.items.filter(i => i.type === 'user_message').length,
          cwd: appState.cwd,
        }]
      : [];

    this.overlayManager.show({
      id: OVERLAY_IDS.THREAD_LIST,
      priority: OVERLAY_PRIORITIES.THREAD_LIST,
      modal: true,
      placement: { type: 'fullscreen' },
      builder: (_onDismiss) => new ThreadList({
        threads,
        currentSessionId: appState.sessionId,
        onSelect: (sessionId: string) => {
          this.overlayManager.dismiss(OVERLAY_IDS.THREAD_LIST);
          if (sessionId !== appState.sessionId) {
            appState.newThread();
          }
        },
        onDismiss: () => {
          this.overlayManager.dismiss(OVERLAY_IDS.THREAD_LIST);
        },
      }),
    });
  }

  /**
   * Show the file picker overlay.
   */
  private _showFilePicker(query: string): void {
    if (this.overlayManager.has(OVERLAY_IDS.FILE_PICKER)) return;
    this.overlayManager.show({
      id: OVERLAY_IDS.FILE_PICKER,
      priority: OVERLAY_PRIORITIES.FILE_PICKER,
      modal: false,
      placement: { type: 'anchored', left: 1, bottom: 3 },
      builder: (_onDismiss) => new FilePicker({
        files: this.fileList,
        initialQuery: query,
        onSelect: (filePath: string) => {
          this.overlayManager.dismiss(OVERLAY_IDS.FILE_PICKER);
          const text = this.inputController.text;
          const cursorPos = this.inputController.cursorPosition;
          const atIndex = text.lastIndexOf('@', cursorPos - 1);
          if (atIndex >= 0) {
            const before = text.slice(0, atIndex);
            const after = text.slice(cursorPos);
            const replacement = `@${filePath} `;
            this.inputController.text = before + replacement + after;
            this.inputController.cursorPosition = before.length + replacement.length;
          }
        },
        onDismiss: () => {
          this.overlayManager.dismiss(OVERLAY_IDS.FILE_PICKER);
        },
      }),
    });
  }
  /**
   * Navigate prompt history backward.
   * Called by Ctrl+R shortcut -- enters incremental reverse search mode (Gap 64).
   */
  private _historyPrevious(): void {
    this._showPromptHistoryPicker();
  }

  private _showPromptHistoryPicker(): void {
    if (this.overlayManager.has(OVERLAY_IDS.PROMPT_HISTORY)) return;
    const entries = this.promptHistory.getEntries();
    if (entries.length === 0) {
      this._enterSearchMode();
      return;
    }
    this.overlayManager.show({
      id: OVERLAY_IDS.PROMPT_HISTORY,
      priority: OVERLAY_PRIORITIES.PROMPT_HISTORY,
      modal: true,
      placement: { type: 'fullscreen' },
      builder: (_onDismiss) => new PromptHistoryPicker({
        entries,
        onSelect: (entry: string) => {
          this.overlayManager.dismiss(OVERLAY_IDS.PROMPT_HISTORY);
          this._isNavigatingHistory = true;
          try {
            this.inputController.text = entry;
            this.inputController.cursorPosition = entry.length;
          } finally {
            this._isNavigatingHistory = false;
          }
        },
        onDismiss: () => {
          this.overlayManager.dismiss(OVERLAY_IDS.PROMPT_HISTORY);
        },
      }),
    });
  }

  /**
   * Navigate prompt history forward.
   * Called by Ctrl+S shortcut -- linear forward step (Gap 63).
   */
  private _historyNext(): void {
    this._navigateHistory('forward');
  }

  /**
   * Copy the last assistant response to the system clipboard via OSC 52.
   * Sets a brief highlight state for visual feedback, auto-dismissed after 300ms.
   * Repeated copies reset the timer to prevent stale dismissals.
   */
  private _copyLastResponse(): void {
    const items = this.widget.appState.conversation.items;
    let lastText: string | null = null;
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      if (item.type === 'assistant_message' && item.text) {
        lastText = item.text;
        break;
      }
    }
    if (!lastText) return;

    try {
      const binding = WidgetsBinding.instance;
      if (binding?.tui) {
        binding.tui.copyToClipboard(lastText);
      }
    } catch {
      return;
    }

    if (this._copyHighlightTimer) {
      clearTimeout(this._copyHighlightTimer);
    }
    this._copyHighlight = true;
    this.setState(() => {});
    this._copyHighlightTimer = setTimeout(() => {
      this._copyHighlight = false;
      this._copyHighlightTimer = null;
      this.setState(() => {});
    }, 300);
  }

  private _checkMysterySequence(event: KeyEvent): KeyEventResult {
    if (this._mysteryTimer) {
      clearTimeout(this._mysteryTimer);
      this._mysteryTimer = null;
    }

    if (this._mysterySequence === 0 && event.ctrlKey && event.key === 'x') {
      this._mysterySequence = 1;
      this._mysteryTimer = setTimeout(() => { this._mysterySequence = 0; }, 2000);
      return 'ignored';
    }
    if (this._mysterySequence === 1 && !event.ctrlKey && !event.altKey && event.key === 'y') {
      this._mysterySequence = 2;
      this._mysteryTimer = setTimeout(() => { this._mysterySequence = 0; }, 2000);
      return 'handled';
    }
    if (this._mysterySequence === 2 && !event.ctrlKey && !event.altKey && event.key === 'z') {
      this._mysterySequence = 0;
      this._showMysteryModal();
      return 'handled';
    }

    this._mysterySequence = 0;
    return 'ignored';
  }

  private _showMysteryModal(): void {
    this.overlayManager.show({
      id: OVERLAY_IDS.MYSTERY_MODAL,
      priority: OVERLAY_PRIORITIES.MYSTERY_MODAL,
      modal: true,
      placement: { type: 'fullscreen' },
      builder: (_onDismiss) => new FocusScope({
        autofocus: true,
        onKey: (event: KeyEvent): KeyEventResult => {
          if (event.key === 'Escape' || event.key === 'Enter') {
            this.overlayManager.dismiss(OVERLAY_IDS.MYSTERY_MODAL);
            return 'handled';
          }
          return 'ignored';
        },
        child: new Center({
          child: new Container({
            decoration: new BoxDecoration({
              border: Border.all(new BorderSide({ color: Color.magenta, width: 1, style: 'rounded' })),
            }),
            padding: EdgeInsets.symmetric({ horizontal: 3, vertical: 2 }),
            child: new Column({
              mainAxisSize: 'min',
              crossAxisAlignment: 'center',
              children: [
                new Text({
                  text: new TextSpan({
                    text: '✦ The Machine Dreams ✦',
                    style: new TextStyle({ foreground: Color.magenta, bold: true }),
                  }),
                }),
                new SizedBox({ height: 1 }),
                new Text({
                  text: new TextSpan({
                    text: 'In the spaces between keystrokes,',
                    style: new TextStyle({ foreground: Color.cyan, italic: true }),
                  }),
                }),
                new Text({
                  text: new TextSpan({
                    text: 'the electrons whisper secrets',
                    style: new TextStyle({ foreground: Color.cyan, italic: true }),
                  }),
                }),
                new Text({
                  text: new TextSpan({
                    text: 'of programs yet unwritten.',
                    style: new TextStyle({ foreground: Color.cyan, italic: true }),
                  }),
                }),
                new SizedBox({ height: 1 }),
                new Text({
                  text: new TextSpan({
                    text: '— Press Escape to return —',
                    style: new TextStyle({ foreground: Color.brightBlack, dim: true }),
                  }),
                }),
              ],
            }),
          }),
        }),
      }),
    });
  }

  /**
   * Build the ShortcutContext for the registry dispatch.
   */
  private _buildShortcutContext(appState: AppState): ShortcutContext {
    const hooks: ShortcutHooks = {
      showCommandPalette: () => this._showCommandPalette(),
      showShortcutHelp: () => this._showShortcutHelp(),
      openInEditor: () => { this._openInEditor(); },
      historyPrevious: () => this._historyPrevious(),
      historyNext: () => this._historyNext(),
      toggleThinking: () => this.toggleThinking(appState),
      copyLastResponse: () => this._copyLastResponse(),
    };

    return {
      appState,
      overlayManager: this.overlayManager,
      setState: (fn) => this.setState(fn),
      onCancel: this.widget.onCancel,
      promptHistory: this.promptHistory,
      hooks,
    };
  }

  build(): Widget {
    const appState = this.widget.appState;
    const items = appState.conversation.items as readonly ConversationItem[];

    // Amp ref: scrollbarThumb = foreground (gH.default()), scrollbarTrack = index(8)
    const scrollThumbColor = Color.defaultColor;
    const scrollTrackColor = Color.ansi256(8);

    // Build the shortcut context for this render pass
    const shortcutCtx = this._buildShortcutContext(appState);

    const mainContent = new FocusScope({
      autofocus: true,
      onKey: (event: KeyEvent): KeyEventResult => {
        // Gap 64: Search mode intercepts ALL keys while active
        if (this._reverseSearch !== null) {
          return this._handleSearchModeKey(event);
        }

        // W4-1: Tab/Shift+Tab navigation through user messages
        if (!event.ctrlKey && !event.altKey && !event.metaKey && event.key === 'Tab') {
          if (event.shiftKey) {
            appState.selectNextMessage();
          } else {
            appState.selectPrevMessage();
          }
          return 'handled';
        }

        // W4-1: Escape clears message selection (only when a message is selected)
        if (event.key === 'Escape' && appState.selectedMessageIndex !== null) {
          appState.clearMessageSelection();
          return 'handled';
        }

        // W4-2: 'e' key edits selected message, 'r' key restores (truncates after)
        if (appState.selectedMessageIndex !== null && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey) {
          if (event.key === 'e') {
            const text = appState.getMessageAt(appState.selectedMessageIndex);
            appState.clearMessageSelection();
            if (text !== null) {
              this.inputController.text = text;
              this.inputController.cursorPosition = text.length;
            }
            return 'handled';
          }
          if (event.key === 'r') {
            const idx = appState.selectedMessageIndex;
            appState.clearMessageSelection();
            appState.truncateAfter(idx);
            return 'handled';
          }
        }

        // Dispatch through the centralized ShortcutRegistry
        const registryResult = this.shortcutRegistry.dispatch(event, shortcutCtx);
        if (registryResult === 'handled') return 'handled';

        // W6-46: Mystery Sequence (Ctrl+X -> Y -> Z)
        const mysteryResult = this._checkMysterySequence(event);
        if (mysteryResult === 'handled') return 'handled';

        // Gap 63: ArrowUp (plain, no modifiers) -- navigate prompt history backward.
        // This only fires when TextField returns 'ignored' (cursor on first line
        // or single-line input), because handled events don't bubble.
        if (!event.ctrlKey && !event.shiftKey && !event.altKey && event.key === 'ArrowUp') {
          this._navigateHistory('backward');
          return 'handled';
        }

        // Gap 63: ArrowDown (plain, no modifiers) -- navigate prompt history forward.
        // This only fires when TextField returns 'ignored' (cursor on last line
        // or single-line input), because handled events don't bubble.
        if (!event.ctrlKey && !event.shiftKey && !event.altKey && event.key === 'ArrowDown') {
          this._navigateHistory('forward');
          return 'handled';
        }

        return 'ignored';
      },
      child: new Column({
        mainAxisSize: 'max',
        crossAxisAlignment: 'stretch',
        children: [
          // Main content: scrollable chat + scrollbar (Amp: Row with Expanded + Scrollbar)
          // BUG-1 FIX: When no items, bypass ScrollView and use Center so
          // the welcome screen can actually center vertically (ScrollView
          // gives unbounded height → Column mainAxisAlignment:'center' has no effect).
          new Expanded({
            child: items.length === 0
              ? new Center({
                child: new Padding({
                  padding: EdgeInsets.only({ left: 2, right: 2, bottom: 1 }),
                  child: new ChatView({
                    items,
                    error: appState.error,
                    selectedMessageIndex: appState.selectedMessageIndex,
                    denseView: appState.denseView,
                    onToggleToolCall: (toolCallId: string) => {
                      appState.conversation.toggleSingleToolCall(toolCallId);
                      this.setState(() => { });
                    },
                  }),
                }),
              })
              : new Row({
                crossAxisAlignment: 'stretch',
                children: [
                  new Expanded({
                    child: new SingleChildScrollView({
                      controller: this.scrollController,
                      position: 'bottom',
                      enableKeyboardScroll: true,
                      // Amp ref: a$({padding: H$.only({left: 2, right: 2-3, bottom: 1})})
                      child: new Padding({
                        padding: EdgeInsets.only({ left: 2, right: 2, bottom: 1 }),
                        child: new ChatView({
                          items,
                          error: appState.error,
                          selectedMessageIndex: appState.selectedMessageIndex,
                          denseView: appState.denseView,
                          onToggleToolCall: (toolCallId: string) => {
                            appState.conversation.toggleSingleToolCall(toolCallId);
                            this.setState(() => { });
                          },
                        }),
                      }),
                    }),
                  }),
                  new Scrollbar({
                    controller: this.scrollController,
                    thumbColor: scrollThumbColor,
                    trackColor: scrollTrackColor,
                  }),
                ],
              }),
          }),

          // Bottom grid — input area with 4-corner overlay status (Amp: ContainerWithOverlays)
          new BottomGrid({
            onSubmit: (text: string) => {
              // Gap 64: Exit search mode if active (accept the match)
              if (this._reverseSearch) this._exitSearchMode(true);
              this.promptHistory.push(text);
              this.promptHistory.resetCursor();
              this._savedDraft = '';
              this.widget.onSubmit(text);
            },
            isProcessing: appState.isProcessing,
            isInterrupted: appState.isInterrupted,
            currentMode: appState.currentMode ?? 'smart',
            agentName: appState.agentName ?? undefined,
            cwd: appState.cwd,
            gitBranch: appState.gitBranch ?? undefined,
            tokenUsage: appState.usage ?? undefined,
            inputTokens: appState.inputTokens,
            outputTokens: appState.outputTokens,
            contextWindowSize: appState.contextWindowSize,
            costUsd: appState.costUsd,
            elapsedMs: appState.elapsedMs,
            deepReasoningActive: appState.deepReasoningActive,
            skillCount: appState.skillCount,
            submitWithMeta: true,
            controller: this.inputController,
            hintText: appState.hintText ?? undefined,
            autocompleteTriggers: appState.autocompleteTriggers.length > 0
              ? appState.autocompleteTriggers.map(t => ({
                triggerCharacter: t.trigger,
                optionsBuilder: () => [{ label: t.description ?? t.trigger, value: t.trigger }],
              }))
              : undefined,
            searchState: this._reverseSearch
              ? { query: this._reverseSearch.query, isFailing: this._reverseSearch.isFailing }
              : null,
            copyHighlight: this._copyHighlight,
            minAutoContentLines: items.length === 0 ? 3 : undefined,
          }),
        ],
      }),
    });

    // Sync permission dialog state from AppState into OverlayManager
    if (appState.hasPendingPermission && !this.overlayManager.has(OVERLAY_IDS.PERMISSION_DIALOG)) {
      const request = appState.permissionRequest!;
      this.overlayManager.show({
        id: OVERLAY_IDS.PERMISSION_DIALOG,
        priority: OVERLAY_PRIORITIES.PERMISSION_DIALOG,
        modal: true,
        placement: { type: 'fullscreen' },
        builder: (_onDismiss) => new PermissionDialog({
          request,
          onSelect: (optionId: string) => appState.resolvePermission(optionId),
          onCancel: () => appState.resolvePermission(null),
        }),
      });
    } else if (!appState.hasPendingPermission && this.overlayManager.has(OVERLAY_IDS.PERMISSION_DIALOG)) {
      this.overlayManager.dismiss(OVERLAY_IDS.PERMISSION_DIALOG);
    }

    // Single call replaces the ad-hoc if/else-if overlay chain
    const result = this.overlayManager.buildOverlays(mainContent);

    return new AmpThemeProvider({
      theme: createAmpTheme(darkBaseTheme),
      child: result,
    });
  }
}

// --- Bootstrap ---

export async function startTUI(
  appState: AppState,
  onSubmit: (text: string) => void,
  onCancel: () => void,
  historySize?: number,
  historyFile?: string,
): Promise<WidgetsBinding> {
  const app = new App({ appState, onSubmit, onCancel, historySize, historyFile });
  return runApp(app, {
    output: process.stdout,
    terminal: true,
    errorLogger: (msg, ...args) => log.error(msg, args[0], args[1] as Record<string, unknown>),
  });
}
