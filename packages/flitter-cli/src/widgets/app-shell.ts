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
import type { SelectionItem } from '../../../flitter-core/src/widgets/selection-list';
import { ChatView } from './chat-view';
import { InputArea } from './input-area';
import { StatusBar } from './status-bar';
import { HeaderBar } from './header-bar';
import { CommandPalette } from './command-palette';
import { FilePicker } from './file-picker';
import { ShortcutHelpOverlay } from './shortcut-help-overlay';
import type { AppState } from '../state/app-state';
import { OVERLAY_IDS, OVERLAY_PRIORITIES } from '../state/overlay-ids';
import { buildCommandList, type CommandItem } from '../commands/command-registry';
import { ShortcutRegistry, registerDefaultShortcuts } from '../shortcuts';
import type { ShortcutContext, ShortcutHooks } from '../shortcuts';
import { listProjectFiles } from '../utils/file-list';
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

    // AppState listener for session state changes
    this._onStateChange = () => this.setState();
    this.widget.appState.addListener(this._onStateChange);

    // OverlayManager listener for overlay state changes
    this._onOverlayChange = () => this.setState();
    this.widget.appState.overlayManager.addListener(this._onOverlayChange);
  }

  /**
   * Dispose ScrollController, TextEditingController, and remove all listeners.
   * All resources are owned by AppShellState.
   */
  dispose(): void {
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
   * Handle global key events at the AppShell level via ShortcutRegistry.
   *
   * Key events bubble up from the primaryFocus (TextField inside InputArea).
   * TextField handles printable chars, arrows, Backspace, Enter, etc.
   * Non-text keys (Ctrl+C, Ctrl+L, etc.) that TextField returns 'ignored'
   * for are dispatched through the ShortcutRegistry.
   *
   * If the registry does not handle the event, 'ignored' is returned
   * to allow further propagation.
   */
  private _handleKey(event: KeyEvent): KeyEventResult {
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
        // INPT-06 will implement external editor integration
        log.info('AppShell: openInEditor hook — stub (INPT-06)');
      },
      historyPrevious: () => {
        // Phase 21 will implement prompt history navigation
        log.info('AppShell: historyPrevious hook — stub (Phase 21)');
      },
      historyNext: () => {
        // Phase 21 will implement prompt history navigation
        log.info('AppShell: historyNext hook — stub (Phase 21)');
      },
      showFilePicker: () => {
        this._showFilePicker();
      },
    };

    return {
      appState: this.widget.appState,
      overlayManager: this.widget.appState.overlayManager,
      setState: (fn?) => {
        if (fn) fn();
        this.setState();
      },
      hooks,
    };
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

    // Map CommandItems to SelectionItems for the palette widget
    const items: SelectionItem[] = commands.map((cmd: CommandItem) => ({
      label: cmd.label,
      value: cmd.id,
      description: cmd.shortcutHint ? `${cmd.description} (${cmd.shortcutHint})` : cmd.description,
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
   * Build the root widget tree.
   *
   * Layout:
   *   FocusScope (autofocus, onKey → ShortcutRegistry.dispatch)
   *     OverlayManager.buildOverlays(
   *       Column (max height, stretch width)
   *         Expanded
   *           [scroll stack or centered content based on screenState]
   *         InputArea (controller shared from AppShellState)
   *     )
   */
  build(_context: BuildContext): Widget {
    const content = this._needsScroll()
      ? this._buildScrollableContent()
      : this._buildCenteredContent();

    const layoutColumn = new Column({
      mainAxisSize: 'max',
      crossAxisAlignment: 'stretch',
      children: [
        new Expanded({ child: content }),
        new HeaderBar({
          isProcessing: this.widget.appState.isProcessing,
          isInterrupted: this.widget.appState.isInterrupted,
          tokenUsage: this.widget.appState.usage,
          costUsd: this.widget.appState.usage?.cost?.amount ?? 0,
          elapsedMs: 0,
        }),
        new InputArea({
          onSubmit: (text) => this.widget.appState.submitPrompt(text),
          isProcessing: this.widget.appState.isProcessing,
          mode: this.widget.appState.currentMode,
          controller: this.textController,
          getFiles: () => listProjectFiles(this.widget.appState.metadata.cwd),
        }),
        new StatusBar({
          cwd: this.widget.appState.metadata.cwd,
          gitBranch: this.widget.appState.metadata.gitBranch ?? undefined,
          isProcessing: this.widget.appState.isProcessing,
          isStreaming: this.widget.appState.lifecycle === 'streaming',
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
