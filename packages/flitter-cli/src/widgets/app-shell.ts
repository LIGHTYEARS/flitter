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
//       [InputArea placeholder — Phase 16]
//       [StatusBar placeholder — Phase 20]
//
// Plan 02 wires SingleChildScrollView + Scrollbar for conversation screens.
// Non-conversation screens (welcome/empty/loading/error) bypass ScrollView
// and use Center for vertical centering (Amp BUG-1 fix pattern).

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
import { ChatView } from './chat-view';
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
 * Key handler (minimal for Plan 01):
 *   Ctrl+C: cancel prompt if processing, else exit
 *   Esc: exit
 *   Other keys: ignored (Phase 16 adds full input handling)
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
 * Conversation screens (ready/processing) use the scroll stack; non-conversation
 * screens (welcome/empty/loading/error) bypass ScrollView and use Center.
 */
class AppShellState extends State<AppShell> {
  /** ScrollController shared between SingleChildScrollView and Scrollbar. */
  private scrollController = new ScrollController();

  /** Dispose ScrollController to clean up listeners and animations. */
  dispose(): void {
    this.scrollController.dispose();
    super.dispose();
  }

  /**
   * Handle global key events.
   *
   * Ctrl+C: cancel in-flight prompt or exit the application.
   * Esc: exit the application.
   */
  private _handleKey(event: KeyEvent): KeyEventResult {
    // Ctrl+C: cancel prompt if processing, else exit
    if (event.ctrlKey && event.key.toLowerCase() === 'c') {
      if (this.widget.appState.isProcessing) {
        log.info('AppShell: Ctrl+C cancelling prompt');
        this.widget.appState.cancelPrompt();
        return 'handled';
      }
      log.info('AppShell: Ctrl+C exiting');
      WidgetsBinding.instance.stop();
      return 'handled';
    }

    // Esc: exit
    if (event.key === 'Escape') {
      log.info('AppShell: Esc exiting');
      WidgetsBinding.instance.stop();
      return 'handled';
    }

    return 'ignored';
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
          // InputArea placeholder — Phase 16
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
