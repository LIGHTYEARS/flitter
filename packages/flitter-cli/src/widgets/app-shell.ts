// AppShell — root widget tree for flitter-cli, replacing BootstrapShell.
//
// Provides the full app layout structure:
//   FocusScope (autofocus, global key handler)
//     Column (full height)
//       Expanded
//         screenState needs scroll? (ready/processing)
//           YES → Row (crossAxisAlignment: 'stretch')
//             ├── Expanded
//             │   └── SingleChildScrollView (controller, position:'bottom', keyboard+mouse)
//             │         └── Padding (left:2, right:2, bottom:1)
//             │             └── ChatView (appState)
//             └── Scrollbar (controller, brightBlack thumb)
//           NO → Center
//             └── ChatView (appState)
//       InputArea (controller shared from AppShellState)
//       [StatusBar placeholder — Phase 20]
//
// Plan 02 wires SingleChildScrollView + Scrollbar for conversation screens.
// Non-conversation screens (welcome/empty/loading/error) bypass ScrollView
// and use Center for vertical centering (Amp BUG-1 fix pattern).
//
// Plan 16-02 expands key handling to the full shortcut matrix:
//   Ctrl+C: cancel prompt or exit
//   Ctrl+L: clear conversation (newThread)
//   Ctrl+O: command palette stub (Phase 17)
//   Ctrl+G: external editor stub (INPT-06)
//   Ctrl+R: history search stub (Phase 21)
//   Alt+T:  toggle dense view
//   Esc:    exit application (Phase 17 adds overlay-close)
//   ?:      shortcut help stub (fires only in non-TextField focus states)
//
// AppShellState owns TextEditingController (shared with InputArea) and
// registers an AppState listener for reactivity.

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
import type { AppState } from '../state/app-state';
import { log } from '../utils/logger';

// ---------------------------------------------------------------------------
// AppShell — root widget
// ---------------------------------------------------------------------------

/** Props for creating and running the AppShell. */
export interface AppShellProps {
  appState: AppState;
}

/**
 * AppShell is the root StatefulWidget for the flitter-cli TUI.
 *
 * Provides global key handling and the top-level layout structure.
 * ChatView handles its own AppState listener, so AppShell only needs
 * to manage the global key handler and layout.
 *
 * Key handler (Plan 16-02 full shortcut matrix):
 *   Ctrl+C: cancel prompt if processing, else exit
 *   Ctrl+L: clear conversation (newThread)
 *   Ctrl+O: command palette stub (Phase 17)
 *   Ctrl+G: external editor stub (INPT-06)
 *   Ctrl+R: history search stub (Phase 21)
 *   Alt+T:  toggle dense view
 *   Esc:    exit
 *   ?:      shortcut help stub
 */
export class AppShell extends StatefulWidget {
  readonly appState: AppState;

  constructor(opts: AppShellProps) {
    super();
    this.appState = opts.appState;
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
 * Registers an AppState listener so InputArea receives fresh props when
 * isProcessing, currentMode, or screenState change (Step 5, Plan 16-02).
 *
 * Conversation screens (ready/processing) use the scroll stack; non-conversation
 * screens (welcome/empty/loading/error) bypass ScrollView and use Center.
 */
class AppShellState extends State<AppShell> {
  /** ScrollController shared between SingleChildScrollView and Scrollbar. */
  private scrollController = new ScrollController();

  /** TextEditingController shared with InputArea for shortcut access (Ctrl+G, etc.). */
  private textController = new TextEditingController();

  /** AppState listener reference for cleanup in dispose(). */
  private _onStateChange: (() => void) | null = null;

  // --- Lifecycle ---

  /**
   * Register AppState listener to trigger rebuilds when session state changes.
   * InputArea reads isProcessing and currentMode from props, which are sourced
   * from AppState in build(). Without this listener, InputArea would render
   * stale values after state transitions.
   */
  initState(): void {
    super.initState();
    this._onStateChange = () => this.setState();
    this.widget.appState.addListener(this._onStateChange);
  }

  /**
   * Dispose ScrollController, TextEditingController, and remove AppState listener.
   * All three resources are owned by AppShellState.
   */
  dispose(): void {
    if (this._onStateChange) {
      this.widget.appState.removeListener(this._onStateChange);
    }
    this.scrollController.dispose();
    this.textController.dispose();
    super.dispose();
  }

  // --- Global Key Handler (Plan 16-02 full shortcut matrix) ---

  /**
   * Handle global key events at the AppShell level.
   *
   * Key events bubble up from the primaryFocus (TextField inside InputArea).
   * TextField handles printable chars, arrows, Backspace, Enter, etc.
   * Non-text keys (Ctrl+C, Ctrl+L, etc.) that TextField returns 'ignored'
   * for are caught here.
   *
   * Modifier combinations are checked explicitly to avoid false matches
   * (e.g., Ctrl+Shift+C should not fire the Ctrl+C handler).
   */
  private _handleKey(event: KeyEvent): KeyEventResult {
    // --- Ctrl+key shortcuts (no Shift, no Alt) ---
    if (event.ctrlKey && !event.shiftKey && !event.altKey) {
      switch (event.key.toLowerCase()) {
        case 'c':
          return this._handleCtrlC();
        case 'l':
          return this._handleCtrlL();
        case 'o':
          return this._handleCtrlO();
        case 'g':
          return this._handleCtrlG();
        case 'r':
          return this._handleCtrlR();
      }
    }

    // --- Alt+key shortcuts (no Ctrl, no Shift) ---
    if (event.altKey && !event.ctrlKey && !event.shiftKey) {
      switch (event.key.toLowerCase()) {
        case 't':
          return this._handleAltT();
      }
    }

    // --- Escape ---
    if (event.key === 'Escape') {
      return this._handleEscape();
    }

    // --- '?' when input is empty (shortcut help) ---
    // Note: TextField consumes all printable characters when focused, so
    // '?' only reaches here in non-TextField focus states (e.g., overlay mode).
    // The full implementation is deferred to Phase 17 (command palette).
    if (event.key === '?' && !event.ctrlKey && !event.altKey && !event.shiftKey) {
      return this._handleQuestionMark();
    }

    return 'ignored';
  }

  // --- Individual Shortcut Handlers ---

  /** Ctrl+C: Cancel in-flight prompt or exit the application. */
  private _handleCtrlC(): KeyEventResult {
    if (this.widget.appState.isProcessing) {
      log.info('AppShell: Ctrl+C cancelling prompt');
      this.widget.appState.cancelPrompt();
      return 'handled';
    }
    log.info('AppShell: Ctrl+C exiting');
    WidgetsBinding.instance.stop();
    return 'handled';
  }

  /** Ctrl+L: Clear conversation display by starting a new thread. */
  private _handleCtrlL(): KeyEventResult {
    log.info('AppShell: Ctrl+L clearing conversation');
    this.widget.appState.newThread();
    return 'handled';
  }

  /** Ctrl+O: Command palette stub — Phase 17 wires the actual overlay. */
  private _handleCtrlO(): KeyEventResult {
    log.info('AppShell: Ctrl+O — command palette stub (Phase 17)');
    // Phase 17 will open the command palette overlay here
    return 'handled';
  }

  /**
   * Ctrl+G: External editor stub (INPT-06).
   *
   * Full implementation requires:
   *   1. Read current input text from textController
   *   2. Write to temp file
   *   3. Spawn editor (EDITOR env var)
   *   4. On editor exit, read file back into controller
   *   5. Clean up temp file
   *
   * Wired as stub because external editor requires terminal
   * suspend/restore lifecycle coordination not yet available.
   */
  private _handleCtrlG(): KeyEventResult {
    log.info('AppShell: Ctrl+G — external editor stub (INPT-06)');
    return 'handled';
  }

  /** Ctrl+R: History search stub — Phase 21 implements prompt history with search UI. */
  private _handleCtrlR(): KeyEventResult {
    log.info('AppShell: Ctrl+R — history search stub (Phase 21)');
    return 'handled';
  }

  /** Alt+T: Toggle dense (compact) view mode. */
  private _handleAltT(): KeyEventResult {
    log.info('AppShell: Alt+T toggling dense view');
    this.widget.appState.toggleDenseView();
    return 'handled';
  }

  /**
   * Escape: Exit the application.
   * Phase 17 will add overlay-close logic before the exit fallback.
   */
  private _handleEscape(): KeyEventResult {
    // Phase 17: if overlay is active, close it and return focus to input
    // For now: exit application
    log.info('AppShell: Esc exiting');
    WidgetsBinding.instance.stop();
    return 'handled';
  }

  /**
   * '?' shortcut help stub.
   *
   * TextField consumes all printable characters when focused, so this
   * handler only fires in non-TextField focus states (e.g., when an
   * overlay has focus). Phase 17 (command palette) or Phase 20
   * (shortcut help overlay) will implement the actual discovery surface.
   */
  private _handleQuestionMark(): KeyEventResult {
    log.info('AppShell: ? shortcut help stub');
    return 'handled';
  }

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
   * Build the root widget tree.
   *
   * Layout:
   *   FocusScope (autofocus, onKey)
   *     Column (max height, stretch width)
   *       Expanded
   *         [scroll stack or centered content based on screenState]
   *       InputArea (controller shared from AppShellState)
   */
  build(_context: BuildContext): Widget {
    const content = this._needsScroll()
      ? this._buildScrollableContent()
      : this._buildCenteredContent();

    return new FocusScope({
      autofocus: true,
      onKey: (event: KeyEvent): KeyEventResult => this._handleKey(event),
      child: new Column({
        mainAxisSize: 'max',
        crossAxisAlignment: 'stretch',
        children: [
          new Expanded({ child: content }),
          new InputArea({
            onSubmit: (text) => this.widget.appState.submitPrompt(text),
            isProcessing: this.widget.appState.isProcessing,
            mode: this.widget.appState.currentMode,
            controller: this.textController,
          }),
          // StatusBar placeholder — Phase 20
        ],
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
