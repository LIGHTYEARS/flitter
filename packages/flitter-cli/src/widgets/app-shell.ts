// AppShell — root widget tree for flitter-cli, replacing BootstrapShell.
//
// Provides the full app layout structure:
//   FocusScope (autofocus, global key handler)
//     OverlayManager.buildOverlays(
//       Column (full height)
//         Expanded
//           screenState needs scroll? (ready/processing)
//             YES → Row (crossAxisAlignment: 'stretch')
//               ├── Expanded
//               │   └── SingleChildScrollView (controller, position:'bottom', keyboard+mouse)
//               │         └── Padding (left:2, right:2, bottom:1)
//               │             └── ChatView (appState)
//               └── Scrollbar (controller, brightBlack thumb)
//             NO → Center
//               └── ChatView (appState)
//         HeaderBar (streaming status, token usage, WaveSpinner)
//         InputArea (controller shared from AppShellState)
//         StatusBar (cwd, gitBranch, isProcessing, isStreaming)
//     )
//
// Plan 02 wires SingleChildScrollView + Scrollbar for conversation screens.
// Non-conversation screens (welcome/empty/loading/error) bypass ScrollView
// and use Center for vertical centering (Amp BUG-1 fix pattern).
//
// Plan 17-01 replaces inline key handlers with ShortcutRegistry dispatch.
// All shortcuts are registered in shortcuts/defaults.ts and dispatched
// through the registry. OverlayManager.buildOverlays() wraps the layout
// column to layer overlays on top of base content.
//
// AppShellState owns TextEditingController (shared with InputArea) and
// registers AppState + OverlayManager listeners for reactivity.

import {
  StatefulWidget,
  State,
  Widget,
  type BuildContext,
} from '../../../flitter-core/src/framework/widget';
import { runApp, WidgetsBinding } from '../../../flitter-core/src/framework/binding';
import type { KeyEvent, KeyEventResult } from '../../../flitter-core/src/input/events';
import { Column, Row } from '../../../flitter-core/src/widgets/flex';
import { Expanded } from '../../../flitter-core/src/widgets/flexible';
import { Padding } from '../../../flitter-core/src/widgets/padding';
import { EdgeInsets } from '../../../flitter-core/src/layout/edge-insets';
import { FocusScope } from '../../../flitter-core/src/widgets/focus-scope';
import { Center } from '../../../flitter-core/src/widgets/center';
import { SingleChildScrollView } from '../../../flitter-core/src/widgets/scroll-view';
import { ScrollController } from '../../../flitter-core/src/widgets/scroll-controller';
import { Scrollbar } from '../../../flitter-core/src/widgets/scrollbar';
import { Color } from '../../../flitter-core/src/core/color';
import { TextEditingController } from '../../../flitter-core/src/widgets/text-field';
import { ChatView } from './chat-view';
import { InputArea } from './input-area';
import { CommandPalette, type CommandPaletteItem } from './command-palette';
import { FilePicker } from './file-picker';
import { ShortcutHelpOverlay } from './shortcut-help-overlay';
import { SkillsModal } from './skills-modal';
import type { AppState } from '../state/app-state';
import { OVERLAY_IDS, OVERLAY_PRIORITIES } from '../state/overlay-ids';
import { buildCommandList, type CommandItem } from '../commands/command-registry';
import { ShortcutRegistry, registerDefaultShortcuts } from '../shortcuts';
import type { ShortcutContext, ShortcutHooks } from '../shortcuts';
import { listProjectFiles } from '../utils/file-list';
import { launchEditor } from '../utils/editor-launcher';
import { log } from '../utils/logger';
import { CliThemeProvider, createCliTheme, cliThemes } from '../themes';

// ---------------------------------------------------------------------------
// AppShell — root widget
// ---------------------------------------------------------------------------

/** Props for creating and running the AppShell. */
export interface AppShellProps {
  appState: AppState;
  /** Theme name (key in cliThemes). Defaults to 'dark'. */
  themeName?: string;
}

/**
 * AppShell is the root StatefulWidget for the flitter-cli TUI.
 *
 * Provides global key handling via ShortcutRegistry dispatch and the
 * top-level layout structure. ChatView handles its own AppState listener,
 * so AppShell only needs to manage the global key handler, layout, and
 * overlay integration.
 *
 * All keyboard shortcuts are defined in shortcuts/defaults.ts and dispatched
 * through the ShortcutRegistry. The OverlayManager wraps the layout to
 * layer overlays on top of base content.
 */
export class AppShell extends StatefulWidget {
  readonly appState: AppState;
  readonly themeName: string;

  constructor(opts: AppShellProps) {
    super();
    this.appState = opts.appState;
    this.themeName = opts.themeName ?? 'dark';
  }

  createState(): AppShellState {
    return new AppShellState();
  }
}

// ---------------------------------------------------------------------------
// AppShellState
// ---------------------------------------------------------------------------

/**
 * State for AppShell. Builds the root widget tree with FocusScope for
 * global key handling, Column layout, and conditional scroll/center wrapping.
 *
 * Owns a ScrollController shared between SingleChildScrollView and Scrollbar.
 * Owns a TextEditingController shared with InputArea (Step 4, Plan 16-02).
 * Owns a ShortcutRegistry for centralized shortcut dispatch (Plan 17-01).
 * Registers AppState and OverlayManager listeners so the UI rebuilds when
 * session state or overlay state changes.
 *
 * Conversation screens (ready/processing) use the scroll stack; non-conversation
 * screens (welcome/empty/loading/error) bypass ScrollView and use Center.
 */
class AppShellState extends State<AppShell> {
  /** ScrollController shared between SingleChildScrollView and Scrollbar. */
  private scrollController = new ScrollController();

  /** TextEditingController shared with InputArea for shortcut access (Ctrl+G, etc.). */
  private textController = new TextEditingController();

  /** Centralized shortcut registry for all keyboard shortcut dispatch. */
  private shortcutRegistry = new ShortcutRegistry();

  /** AppState listener reference for cleanup in dispose(). */
  private _onStateChange: (() => void) | null = null;

  /** OverlayManager listener reference for cleanup in dispose(). */
  private _onOverlayChange: (() => void) | null = null;

  /** Saved draft text before entering history navigation (restored on forward-past-end). */
  private _savedDraft: string = '';

  /** Guard flag to suppress input listener resets during programmatic history navigation. */
  private _isNavigatingHistory = false;

  /** Timestamp of the last UI update (for streaming throttle). */
  private _lastUpdate: number = 0;

  /** Pending throttle timer for streaming updates. */
  private _pendingTimer: ReturnType<typeof setTimeout> | null = null;

  // --- E1: Reverse search state ---
  private _reverseSearchActive = false;
  private _reverseSearchQuery = '';
  private _reverseSearchResult: string | null = null;
  private _reverseSearchFailed = false;
  /** Index from which to continue searching backward on repeated Ctrl+R. */
  private _reverseSearchIndex: number | undefined = undefined;

  // --- E4: Copy highlight visual feedback ---
  private _copyHighlight = false;

  // --- AgentMode pulse sequence (D-14/D-15 shimmer trigger) ---
  /** Monotonically-incrementing counter that bumps every time the agent mode changes.
   * Passed to InputArea.agentModePulseSeq to trigger the shimmer animation. */
  private _agentModePulseSeq: number = 0;

  /** Last known agent mode — used to detect mode transitions in build(). */
  private _lastMode: string | null = null;

  /** BORDER-08: persisted drag height for InputArea (bottomGridUserHeight global state).
   * Null means auto-expand is active. Persists across widget rebuilds. */
  private _bottomGridUserHeight: number | null = null;

  // --- Lifecycle ---

  /**
   * Register AppState and OverlayManager listeners to trigger rebuilds.
   * Initialize the ShortcutRegistry with default shortcuts.
   *
   * InputArea reads isProcessing and currentMode from props, which are sourced
   * from AppState in build(). Without this listener, InputArea would render
   * stale values after state transitions.
   *
   * OverlayManager listener triggers rebuilds when overlays are shown/dismissed
   * so buildOverlays() produces the correct widget tree.
   */
  initState(): void {
    super.initState();

    // Register default shortcuts
    registerDefaultShortcuts(this.shortcutRegistry);

    // AppState listener with 50ms streaming throttle (ported from AMP).
    // During streaming, avoids re-rendering on every token by coalescing
    // updates within 50ms windows. Immediate flush when >= 50ms have elapsed.
    this._onStateChange = () => {
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
    this.widget.appState.addListener(this._onStateChange);

    // OverlayManager listener for overlay state changes
    this._onOverlayChange = () => this.setState();
    this.widget.appState.overlayManager.addListener(this._onOverlayChange);
  }

  /**
   * Flush a throttled UI update. Clears any pending timer, records
   * the update timestamp, and triggers a widget rebuild.
   * Ported from AMP's _flushUpdate pattern for streaming throttle.
   *
   * E7: Auto-scroll follow mode — if the scroll position was near the
   * bottom before the update, jump to the new bottom after layout.
   */
  private _flushUpdate(): void {
    if (this._pendingTimer) {
      clearTimeout(this._pendingTimer);
      this._pendingTimer = null;
    }
    this._lastUpdate = Date.now();

    // E7: Auto-scroll — check if we were at/near bottom before update
    const scrollCtrl = this.scrollController;
    const wasAtBottom = scrollCtrl
      ? (scrollCtrl.offset >= scrollCtrl.maxScrollExtent - 2)
      : true;

    this.setState();

    // E7: Re-scroll to bottom after layout if user was following
    if (wasAtBottom && scrollCtrl) {
      queueMicrotask(() => {
        if (scrollCtrl.maxScrollExtent > 0) {
          scrollCtrl.jumpTo(scrollCtrl.maxScrollExtent);
        }
      });
    }
  }

  /**
   * Dispose ScrollController, TextEditingController, and remove all listeners.
   * All resources are owned by AppShellState.
   * Saves prompt history to disk on teardown (ported from AMP dispose pattern).
   */
  dispose(): void {
    // Flush prompt history to disk on graceful teardown
    const history = this.widget.appState.promptHistory;
    if (history) {
      history.save();
    }

    // Clear any pending streaming throttle timer
    if (this._pendingTimer) {
      clearTimeout(this._pendingTimer);
      this._pendingTimer = null;
    }

    if (this._onOverlayChange) {
      this.widget.appState.overlayManager.removeListener(this._onOverlayChange);
    }
    if (this._onStateChange) {
      this.widget.appState.removeListener(this._onStateChange);
    }
    this.scrollController.dispose();
    this.textController.dispose();
    super.dispose();
  }

  // --- Global Key Handler (Plan 17-01: ShortcutRegistry dispatch) ---

  /**
   * Handle global key events at the AppShell level.
   *
   * Key events bubble up from the primaryFocus (TextField inside InputArea).
   * TextField handles printable chars, arrows, Backspace, Enter, etc.
   * Non-text keys (Ctrl+C, Ctrl+L, etc.) that TextField returns 'ignored'
   * for are dispatched through the ShortcutRegistry.
   *
   * Handler priority order:
   *   1. Reverse search handlers (if reverse search is active)
   *   2. Message selection handlers (if a message is selected)
   *   3. Arrow key history navigation (if no overlay active)
   *   4. Tab/Shift+Tab message selection
   *   5. ShortcutRegistry dispatch
   */
  private _handleKey(event: KeyEvent): KeyEventResult {
    const key = event.key;
    const ctrl = event.ctrlKey;
    const alt = event.altKey;
    const shift = event.shiftKey;

    // --- 1. Reverse search handlers (E1) ---
    if (this._reverseSearchActive) {
      if (key === 'Escape') {
        this._reverseSearchActive = false;
        this._reverseSearchQuery = '';
        this._reverseSearchIndex = undefined;
        this.setState();
        return 'handled';
      }
      if (key === 'Enter' || key === 'Return') {
        // Accept the search result
        if (this._reverseSearchResult) {
          this.textController.text = this._reverseSearchResult;
          this.textController.cursorPosition = this._reverseSearchResult.length;
        }
        this._reverseSearchActive = false;
        this._reverseSearchQuery = '';
        this._reverseSearchIndex = undefined;
        this.setState();
        return 'handled';
      }
      if (key === 'Backspace' && !ctrl && !alt) {
        this._reverseSearchQuery = this._reverseSearchQuery.slice(0, -1);
        const history = this.widget.appState.promptHistory;
        if (history && this._reverseSearchQuery.length > 0) {
          this._reverseSearchIndex = undefined;
          const result = history.searchBackward(this._reverseSearchQuery);
          if (result !== null) {
            this._reverseSearchResult = result.entry;
            this._reverseSearchIndex = result.index;
            this._reverseSearchFailed = false;
          } else {
            this._reverseSearchResult = null;
            this._reverseSearchFailed = true;
          }
        } else {
          this._reverseSearchResult = null;
          this._reverseSearchFailed = false;
          this._reverseSearchIndex = undefined;
        }
        this.setState();
        return 'handled';
      }
      // Printable character: append to search query
      if (key.length === 1 && !ctrl && !alt) {
        this._reverseSearchQuery += key;
        const history = this.widget.appState.promptHistory;
        if (history) {
          const result = history.searchBackward(this._reverseSearchQuery);
          if (result !== null) {
            this._reverseSearchResult = result.entry;
            this._reverseSearchIndex = result.index;
            this._reverseSearchFailed = false;
          } else {
            this._reverseSearchResult = null;
            this._reverseSearchFailed = true;
          }
        }
        this.setState();
        return 'handled';
      }
    }

    // --- 2. Message selection handlers (E3 — 'e', 'r', Escape when selected) ---
    if (this.widget.appState.selectedMessageIndex !== null && this.widget.appState.selectedMessageIndex >= 0) {
      if (key === 'e' && !ctrl && !alt && !shift) {
        const msg = this.widget.appState.getMessageAt(this.widget.appState.selectedMessageIndex);
        if (msg) {
          this.textController.text = msg;
          this.textController.cursorPosition = msg.length;
          this.widget.appState.selectedMessageIndex = null;
          this.setState();
        }
        return 'handled';
      }
      if (key === 'r' && !ctrl && !alt && !shift) {
        this.widget.appState.truncateAfter(this.widget.appState.selectedMessageIndex);
        this.widget.appState.selectedMessageIndex = null;
        this.setState();
        return 'handled';
      }
      if (key === 'Escape') {
        this.widget.appState.selectedMessageIndex = null;
        this.setState();
        return 'handled';
      }
    }

    // --- 3. Arrow key history navigation (E6) ---
    if (!this.widget.appState.overlayManager.hasOverlays) {
      if (key === 'ArrowUp' && !shift && !ctrl && !alt) {
        this._navigateHistory('backward');
        return 'handled';
      }
      if (key === 'ArrowDown' && !shift && !ctrl && !alt) {
        this._navigateHistory('forward');
        return 'handled';
      }
    }

    // --- 4. Tab/Shift+Tab message selection (E3) ---
    if (key === 'Tab' && !ctrl && !alt) {
      const appState = this.widget.appState;
      if (shift) {
        appState.selectNextMessage();
      } else {
        appState.selectPrevMessage();
      }
      this.setState();
      return 'handled';
    }

    // --- 5. ShortcutRegistry dispatch ---
    const ctx = this._buildShortcutContext();
    return this.shortcutRegistry.dispatch(event, ctx);
  }

  /**
   * Build the ShortcutContext for registry dispatch.
   * Provides actions access to AppState, OverlayManager, setState, and hooks.
   */
  private _buildShortcutContext(): ShortcutContext {
    const hooks: ShortcutHooks = {
      showCommandPalette: () => {
        this._showCommandPalette();
      },
      showShortcutHelp: () => {
        this._showShortcutHelp();
      },
      openInEditor: () => {
        this._openInEditor();
      },
      historyPrevious: () => {
        if (this._reverseSearchActive) {
          // Already in search mode — search backward for next match
          const history = this.widget.appState.promptHistory;
          if (history && this._reverseSearchQuery.length > 0) {
            const fromIndex = this._reverseSearchIndex !== undefined
              ? this._reverseSearchIndex - 1
              : undefined;
            const result = history.searchBackward(this._reverseSearchQuery, fromIndex);
            if (result !== null) {
              this._reverseSearchResult = result.entry;
              this._reverseSearchIndex = result.index;
              this._reverseSearchFailed = false;
            } else {
              this._reverseSearchFailed = true;
            }
            this.setState();
          }
        } else {
          // Enter reverse search mode
          this._reverseSearchActive = true;
          this._reverseSearchQuery = '';
          this._reverseSearchResult = null;
          this._reverseSearchFailed = false;
          this._reverseSearchIndex = undefined;
          this.setState();
        }
      },
      historyNext: () => {
        this._navigateHistory('forward');
      },
      showFilePicker: () => {
        this._showFilePicker();
      },
      toggleThinking: () => {
        // Toggle all thinking blocks collapsed/expanded
        log.info('AppShell: toggleThinking');
      },
      copyLastResponse: () => {
        this.widget.appState.copyLastResponse();
      },
    };

    return {
      appState: this.widget.appState,
      overlayManager: this.widget.appState.overlayManager,
      onCancel: () => {
        if (this.widget.appState.isProcessing) {
          this.widget.appState.cancelPrompt();
        } else {
          WidgetsBinding.instance.stop();
        }
      },
      promptHistory: this.widget.appState.promptHistory ?? null,
      setState: (fn?) => {
        if (fn) fn();
        this.setState();
      },
      hooks,
    };
  }

  // --- Prompt History Navigation (ported from AMP Gap 63) ---

  /**
   * Navigate prompt history in the given direction.
   *
   * 'backward' moves to older entries; 'forward' moves to newer entries.
   * On the first backward step the current input text is saved as a draft
   * so it can be restored when the user navigates forward past the newest entry.
   *
   * Sets _isNavigatingHistory to prevent any input-change listeners from
   * resetting the history cursor during programmatic text updates.
   */
  private _navigateHistory(direction: 'backward' | 'forward'): void {
    const history = this.widget.appState.promptHistory;
    if (!history) return;

    this._isNavigatingHistory = true;
    try {
      if (direction === 'backward') {
        // Save draft on first backward step
        if (history.isAtReset) {
          this._savedDraft = this.textController.text;
        }
        const prev = history.previous();
        if (prev !== null) {
          this.textController.text = prev;
          this.textController.cursorPosition = prev.length;
        }
      } else {
        const next = history.next();
        if (next !== null) {
          this.textController.text = next;
          this.textController.cursorPosition = next.length;
        } else if (!history.isAtReset) {
          // next() returned null but cursor was not at reset —
          // this means we've moved past the end; cursor is now reset.
          // (In CLI's PromptHistory, next() returns null when cursor >= length,
          //  and cursor has already been incremented past end.)
        }
        // If cursor is back at reset, restore the saved draft
        if (history.isAtReset) {
          this.textController.text = this._savedDraft;
          this.textController.cursorPosition = this._savedDraft.length;
          this._savedDraft = '';
        }
      }
    } finally {
      this._isNavigatingHistory = false;
    }
  }

  // --- External Editor (I9: Ctrl+G wiring) ---

  /**
   * Open the current input text in $EDITOR.
   * Suspends the TUI, spawns the editor, resumes, and injects the edited text.
   * Amp ref: J3 suspend pattern -- suspends tui, pauses scheduler
   */
  private async _openInEditor(): Promise<void> {
    const binding = WidgetsBinding.instance;
    const currentText = this.textController.text;

    // 1. Suspend the TUI so the editor gets direct terminal access
    binding.suspend();

    try {
      // 2. Launch editor with current input text
      const result = await launchEditor(currentText);

      // 3. If successful, replace the input text
      if (result.success && result.text !== null) {
        // Trim trailing newlines that most editors add
        const editedText = result.text.replace(/\n+$/, '');
        this.textController.text = editedText;
        this.textController.cursorPosition = editedText.length;
      }
    } finally {
      // 4. Always resume the TUI, even if editor fails
      binding.resume();

      // 5. Trigger a rebuild to reflect any text changes
      this.setState();
    }
  }

  // --- Command Palette (Plan 17-03) ---

  /**
   * Show the command palette overlay via OverlayManager.
   *
   * Builds the command list from ShortcutRegistry + extra commands,
   * maps them to SelectionItems, and shows a CommandPalette widget
   * as a fullscreen, non-modal overlay at COMMAND_PALETTE priority.
   *
   * If the palette is already open, dismisses it (toggle behavior
   * is handled by the shortcut in defaults.ts which checks has() first).
   */
  private _showCommandPalette(): void {
    const overlayManager = this.widget.appState.overlayManager;

    // Toggle: if already open, dismiss
    if (overlayManager.has(OVERLAY_IDS.COMMAND_PALETTE)) {
      overlayManager.dismiss(OVERLAY_IDS.COMMAND_PALETTE);
      return;
    }

    // Build command list with current context
    const ctx = this._buildShortcutContext();
    const commands = buildCommandList(this.shortcutRegistry, this.widget.appState, ctx);

    // Map CommandItems to CommandPaletteItems for the palette widget
    const items: CommandPaletteItem[] = commands.map((cmd: CommandItem) => ({
      id: cmd.id,
      category: cmd.category,
      label: cmd.label,
      description: cmd.description,
      shortcutHint: cmd.shortcutHint,
    }));

    overlayManager.show({
      id: OVERLAY_IDS.COMMAND_PALETTE,
      priority: OVERLAY_PRIORITIES.COMMAND_PALETTE,
      modal: false,
      placement: { type: 'fullscreen' },
      builder: (onDismiss) => new CommandPalette({
        commands: items,
        onExecute: (cmdId: string) => {
          // Dismiss palette first, then execute the command
          onDismiss();
          const cmd = commands.find((c: CommandItem) => c.id === cmdId);
          if (cmd) cmd.execute(onDismiss);
        },
        onDismiss,
      }),
    });

    log.info('AppShell: command palette shown');
  }

  // --- Shortcut Help Overlay (Plan 17-05) ---

  /**
   * Show or dismiss the shortcut help overlay via OverlayManager.
   *
   * Toggle behavior: if the overlay is already open, dismiss it.
   * Otherwise, show a modal fullscreen overlay at SHORTCUT_HELP priority
   * with the ShortcutHelpOverlay widget reading from the ShortcutRegistry.
   */
  private _showShortcutHelp(): void {
    const overlayManager = this.widget.appState.overlayManager;

    // Toggle: if already open, dismiss
    if (overlayManager.has(OVERLAY_IDS.SHORTCUT_HELP)) {
      overlayManager.dismiss(OVERLAY_IDS.SHORTCUT_HELP);
      return;
    }

    overlayManager.show({
      id: OVERLAY_IDS.SHORTCUT_HELP,
      priority: OVERLAY_PRIORITIES.SHORTCUT_HELP,
      modal: true,
      placement: { type: 'fullscreen' },
      builder: (onDismiss) => new ShortcutHelpOverlay({
        onDismiss,
        registry: this.shortcutRegistry,
      }),
    });

    log.info('AppShell: shortcut help overlay shown');
  }

  // --- File Picker (Plan 17-04) ---

  /**
   * Show the standalone file picker overlay via OverlayManager.
   *
   * Reads the project file list, then shows a FilePicker widget
   * as an anchored, non-modal overlay at FILE_PICKER priority.
   * On file selection, inserts @filePath into the text controller.
   */
  private _showFilePicker(): void {
    const overlayManager = this.widget.appState.overlayManager;

    // Toggle: if already open, dismiss
    if (overlayManager.has(OVERLAY_IDS.FILE_PICKER)) {
      overlayManager.dismiss(OVERLAY_IDS.FILE_PICKER);
      return;
    }

    const cwd = this.widget.appState.metadata.cwd;
    listProjectFiles(cwd).then((files) => {
      overlayManager.show({
        id: OVERLAY_IDS.FILE_PICKER,
        priority: OVERLAY_PRIORITIES.FILE_PICKER,
        modal: false,
        placement: { type: 'anchored', left: 2, bottom: 3 },
        builder: (onDismiss) => new FilePicker({
          files,
          onSelect: (filePath: string) => {
            onDismiss();
            // Inject @filePath at the current cursor position in the input controller
            const insertion = '@' + filePath + ' ';
            const pos = this.textController.cursorPosition;
            const before = this.textController.text.slice(0, pos);
            const after = this.textController.text.slice(pos);
            this.textController.text = before + insertion + after;
            this.textController.cursorPosition = pos + insertion.length;
          },
          onDismiss,
        }),
      });
      log.info('AppShell: file picker shown');
    });
  }

  // --- Skills Modal (Phase 30-03) ---

  /**
   * Open the skills modal overlay via OverlayManager.
   * Toggle behavior: if already open, dismiss it.
   * Matches AMP's skill modal trigger from InputArea border badge click.
   */
  private _openSkillsModal(): void {
    const overlayManager = this.widget.appState.overlayManager;

    // Toggle: if already open, dismiss
    if (overlayManager.has(OVERLAY_IDS.SKILLS_MODAL)) {
      overlayManager.dismiss(OVERLAY_IDS.SKILLS_MODAL);
      return;
    }

    const appState = this.widget.appState;
    const skillService = appState.skillService;

    overlayManager.show({
      id: OVERLAY_IDS.SKILLS_MODAL,
      priority: OVERLAY_PRIORITIES.SKILLS_MODAL,
      modal: true,
      placement: { type: 'fullscreen' },
      builder: (onDismiss) => new SkillsModal({
        skills: skillService.skills,
        errors: skillService.errors,
        warnings: skillService.warnings,
        cwd: appState.metadata.cwd,
        onDismiss,
        onAddSkill: () => {
          // Insert "/skill create" prompt into input
          onDismiss();
          log.info('AppShell: skills modal add skill');
        },
        onDocs: () => {
          // Open owner's manual (skill docs URL)
          onDismiss();
          log.info('AppShell: skills modal docs');
        },
        onInsertPrompt: (prompt: string) => {
          onDismiss();
          this.textController.text = prompt;
          this.textController.cursorPosition = prompt.length;
        },
        onInvokeSkill: (name: string) => {
          // Add skill as pending for next prompt submission
          const skill = skillService.getSkillByName(name);
          if (skill) {
            appState.addPendingSkill(skill);
          }
          log.info('AppShell: skill invoked', { name });
        },
      }),
    });

    log.info('AppShell: skills modal shown');
  }

  // --- Content Builders ---

  /**
   * Determine whether the current screen state needs scroll infrastructure.
   *
   * Only 'ready' and 'processing' screens have conversation content that
   * can overflow. All other screens (welcome/empty/loading/error) are
   * placeholders that should be vertically centered — wrapping them in
   * ScrollView would break Center alignment (Amp BUG-1 pattern).
   */
  private _needsScroll(): boolean {
    const kind = this.widget.appState.screenState.kind;
    return kind === 'ready' || kind === 'processing';
  }

  /**
   * Build the scrollable content area for conversation screens.
   *
   * Layout:
   *   Row (crossAxisAlignment: 'stretch')
   *     ├── Expanded
   *     │   └── SingleChildScrollView
   *     │         controller, position:'bottom', keyboard+mouse scroll
   *     │         └── Padding (left:2, right:2, bottom:1)
   *     │             └── ChatView (appState)
   *     └── Scrollbar
   *           controller, brightBlack thumb, default track
   */
  private _buildScrollableContent(): Widget {
    return new Row({
      crossAxisAlignment: 'stretch',
      children: [
        new Expanded({
          child: new SingleChildScrollView({
            controller: this.scrollController,
            position: 'bottom',
            enableKeyboardScroll: true,
            enableMouseScroll: true,
            child: new Padding({
              padding: EdgeInsets.only({ left: 2, right: 2, bottom: 1 }),
              child: new ChatView({ appState: this.widget.appState }),
            }),
          }),
        }),
        new Scrollbar({
          controller: this.scrollController,
          thumbColor: Color.brightBlack,
          trackColor: Color.defaultColor,
        }),
      ],
    });
  }

  /**
   * Build the centered content area for non-conversation screens.
   *
   * Welcome/empty/loading/error screens use Center wrapping so their
   * mainAxisAlignment:'center' works properly. ScrollView would give
   * unbounded height, which breaks vertical centering.
   */
  private _buildCenteredContent(): Widget {
    return new Center({
      child: new ChatView({ appState: this.widget.appState }),
    });
  }

  /**
   * Current terminal screen height in rows. Falls back to 50 when
   * process.stdout.rows is not yet available (headless tests, pipes).
   */
  private get _screenHeight(): number {
    return process.stdout.rows || 50;
  }

  /**
   * Build the root widget tree.
   *
   * Layout:
   *   FocusScope (autofocus, onKey → ShortcutRegistry.dispatch)
   *     OverlayManager.buildOverlays(
   *       Column (max height, stretch width)
   *         Expanded
   *           [scroll stack or centered content based on screenState]
   *         InputArea (controller shared from AppShellState, with all border props)
   *     )
   */
  build(_context: BuildContext): Widget {
    // D-14/D-15: detect mode transitions and bump pulse sequence.
    const currentMode = this.widget.appState.currentMode;
    if (currentMode !== this._lastMode) {
      if (this._lastMode !== null) {
        // Mode changed (not first render) — bump shimmer trigger counter.
        this._agentModePulseSeq++;
      }
      this._lastMode = currentMode;
    }

    const content = this._needsScroll()
      ? this._buildScrollableContent()
      : this._buildCenteredContent();

    const layoutColumn = new Column({
      mainAxisSize: 'max',
      crossAxisAlignment: 'stretch',
      children: [
        new Expanded({ child: content }),
        new InputArea({
          // Core input props
          onSubmit: (text) => this.widget.appState.submitPrompt(text),
          isProcessing: this.widget.appState.isProcessing,
          mode: this.widget.appState.currentMode,
          controller: this.textController,
          getFiles: () => listProjectFiles(this.widget.appState.metadata.cwd),
          // Props migrated from HeaderBar
          tokenUsage: this.widget.appState.usage,
          costUsd: this.widget.appState.usage?.cost?.amount ?? 0,
          elapsedMs: this.widget.appState.elapsedMs ?? 0,
          contextWindowPercent: this.widget.appState.contextWindowUsagePercent ?? 0,
          isInterrupted: this.widget.appState.isInterrupted ?? false,
          hasConversation: this.widget.appState.items.length > 0,
          // Props migrated from StatusBar
          cwd: this.widget.appState.metadata?.cwd ?? process.cwd(),
          gitBranch: this.widget.appState.metadata?.gitBranch ?? undefined,
          isStreaming: this.widget.appState.lifecycle === 'streaming',
          // TODO: wire these to real AppState fields when available in future phases
          isExecutingCommand: false,
          isRunningShell: false,
          isAutoCompacting: false,
          isHandingOff: false,
          statusMessage: undefined,
          // New border feature props
          agentModePulseSeq: this._agentModePulseSeq,
          skillCount: this.widget.appState.skillCount ?? 0,
          skillWarningCount: this.widget.appState.skillWarningCount ?? 0,
          onSkillCountClick: () => this._openSkillsModal(),
          screenHeight: this._screenHeight,
          // BORDER-08: bottomGridUserHeight global state — persists drag height across rebuilds
          userHeight: this._bottomGridUserHeight,
          onHeightChange: (h) => {
            this._bottomGridUserHeight = h;
          },
        }),
      ],
    });

    // Wrap content with overlay stack — renders overlays on top of base content
    const withOverlays = this.widget.appState.overlayManager.buildOverlays(layoutColumn);

    const baseTheme = cliThemes[this.widget.themeName] ?? cliThemes['dark']!;
    const theme = createCliTheme(baseTheme);

    return new CliThemeProvider({
      theme,
      child: new FocusScope({
        autofocus: true,
        onKey: (event: KeyEvent): KeyEventResult => this._handleKey(event),
        child: withOverlays,
      }),
    });
  }
}

// ---------------------------------------------------------------------------
// startAppShell — entry point replacing startBootstrapShell
// ---------------------------------------------------------------------------

/**
 * Create and run the AppShell widget tree as the TUI root.
 *
 * Returns the WidgetsBinding for lifecycle management (waitForExit, stop).
 */
export async function startAppShell(props: AppShellProps): Promise<WidgetsBinding> {
  log.info('startAppShell: launching AppShell');
  return runApp(new AppShell(props), {
    output: process.stdout,
    terminal: true,
  });
}
