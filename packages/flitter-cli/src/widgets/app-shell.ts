// AppShell — root widget tree for flitter-cli, replacing BootstrapShell.
//
// Provides the full app layout structure:
//   FocusScope (autofocus, global key handler)
//     Column (full height)
//       Expanded
//         Padding (horizontal: 2, bottom: 1)
//           ChatView (appState)
//       [InputArea placeholder — Phase 16]
//       [StatusBar placeholder — Phase 20]
//
// For Plan 01, scroll infrastructure is not yet wired (Plan 02 wraps
// ChatView in SingleChildScrollView + Scrollbar). The Expanded area
// directly contains Padding > ChatView so the widget tree is renderable
// and testable.

import {
  StatefulWidget,
  State,
  Widget,
  type BuildContext,
} from '../../../flitter-core/src/framework/widget';
import { runApp, WidgetsBinding } from '../../../flitter-core/src/framework/binding';
import type { KeyEvent, KeyEventResult } from '../../../flitter-core/src/input/events';
import { Column } from '../../../flitter-core/src/widgets/flex';
import { Expanded } from '../../../flitter-core/src/widgets/flexible';
import { Padding } from '../../../flitter-core/src/widgets/padding';
import { EdgeInsets } from '../../../flitter-core/src/layout/edge-insets';
import { FocusScope } from '../../../flitter-core/src/widgets/focus-scope';
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
 * global key handling, Column layout, and ChatView.
 */
class AppShellState extends State<AppShell> {
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
   * Build the root widget tree.
   *
   * Layout:
   *   FocusScope (autofocus, onKey)
   *     Column (max height, stretch width)
   *       Expanded
   *         Padding (left: 2, right: 2, bottom: 1)
   *           ChatView (appState)
   */
  build(_context: BuildContext): Widget {
    return new FocusScope({
      autofocus: true,
      onKey: (event: KeyEvent): KeyEventResult => this._handleKey(event),
      child: new Column({
        mainAxisSize: 'max',
        crossAxisAlignment: 'stretch',
        children: [
          new Expanded({
            child: new Padding({
              padding: EdgeInsets.only({ left: 2, right: 2, bottom: 1 }),
              child: new ChatView({ appState: this.widget.appState }),
            }),
          }),
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
