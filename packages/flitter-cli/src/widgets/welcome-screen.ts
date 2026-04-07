// WelcomeScreen — StatefulWidget for the first-launch welcome screen.
//
// Replaces the inline buildWelcomeScreen() function in chat-view.ts with
// a proper StatefulWidget that registers/deregisters an AppState listener
// for state-driven rebuilds.
//
// Layout: Center > Row[DensityOrbWidget | SizedBox(w:4) | Column[hints]]
// The DensityOrbWidget handles its own Perlin gradient animation internally
// via setInterval — no external timer is needed here.
//
// Golden file references:
//   tmux-capture/screens/amp/welcome/plain-63x244.golden — layout
//   tmux-capture/screens/amp/welcome/ansi-63x244.golden  — color codes

import {
  StatefulWidget, State, Widget, type BuildContext,
} from '../../../flitter-core/src/framework/widget';
import { Column, Row } from '../../../flitter-core/src/widgets/flex';
import { Center } from '../../../flitter-core/src/widgets/center';
import { SizedBox } from '../../../flitter-core/src/widgets/sized-box';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { Color } from '../../../flitter-core/src/core/color';
import { DensityOrbWidget } from './density-orb-widget';
import type { AppState } from '../state/app-state';

// ---------------------------------------------------------------------------
// WelcomeScreen — StatefulWidget
// ---------------------------------------------------------------------------

/**
 * WelcomeScreen is the first-launch welcome screen widget.
 *
 * Displays an animated DensityOrb logo on the left side and a column of
 * three hint lines on the right side, centered in the available space.
 *
 * Satisfies:
 *   WELC-01 — DensityOrbWidget({ variant: 'welcome' }) provides Perlin gradient animation
 *   WELC-02 — Tab/Shift+Tab navigation hints rendered in Color.cyan
 */
export class WelcomeScreen extends StatefulWidget {
  readonly appState: AppState;

  constructor(opts: { appState: AppState }) {
    super();
    this.appState = opts.appState;
  }

  createState(): WelcomeScreenState {
    return new WelcomeScreenState();
  }
}

// ---------------------------------------------------------------------------
// WelcomeScreenState — State<WelcomeScreen>
// ---------------------------------------------------------------------------

/**
 * State for WelcomeScreen.
 *
 * Registers an AppState listener on mount and removes it on unmount to
 * ensure the screen rebuilds on state changes without leaking listeners.
 */
export class WelcomeScreenState extends State<WelcomeScreen> {
  /** Bound listener function retained for symmetric add/removeListener calls. */
  private _onChange: (() => void) | null = null;

  /** Register AppState listener so the screen rebuilds on state changes. */
  override initState(): void {
    super.initState();
    this._onChange = () => { this.setState(); };
    this.widget.appState.addListener(this._onChange);
  }

  /** Remove AppState listener to prevent memory leaks on unmount. */
  override dispose(): void {
    if (this._onChange) {
      this.widget.appState.removeListener(this._onChange);
      this._onChange = null;
    }
    super.dispose();
  }

  /**
   * Build the welcome screen layout:
   *
   *   Center
   *   └─ Row (mainAxisSize:'min', crossAxisAlignment:'center')
   *      ├─ DensityOrbWidget({ variant: 'welcome' })
   *      ├─ SizedBox({ width: 4 })
   *      └─ Column (mainAxisSize:'min', crossAxisAlignment:'start')
   *         ├─ Text "Welcome to Amp"         (dim:true, green)
   *         ├─ SizedBox({ height: 2 })
   *         ├─ Text "Ctrl+O for help"        (blue / dim / yellow segments)
   *         ├─ SizedBox({ height: 2 })
   *         ├─ Text "Use Tab/Shift+Tab..."   (cyan)
   *         └─ Text "messages to edit..."   (cyan)
   *
   * String literals match plain golden file exactly.
   * Color codes match ansi golden file exactly.
   */
  build(_context: BuildContext): Widget {
    return new Center({
      child: new Row({
        mainAxisSize: 'min',
        crossAxisAlignment: 'center',
        children: [
          // Animated ASCII art logo — DensityOrbWidget owns its own timer
          new DensityOrbWidget({ variant: 'welcome' }),

          // Spacer between logo and hint column
          new SizedBox({ width: 4 }),

          // Hint text column
          new Column({
            mainAxisSize: 'min',
            crossAxisAlignment: 'start',
            children: [
              // Line 1: "Welcome to Amp" — dim foreground with green color
              // ANSI golden: dim + green-ish; use dim:true + Color.green per CONTEXT D-03
              new Text({
                text: new TextSpan({
                  text: 'Welcome to Amp',
                  style: new TextStyle({ foreground: Color.green, dim: true }),
                }),
              }),

              new SizedBox({ height: 2 }),

              // Line 2: "Ctrl+O for help" — three TextSpan segments
              // ANSI: Ctrl+O → [38;5;4m (Color.blue)
              //        for   → [2m (dim)
              //        help  → [38;5;3m (Color.yellow) per RESEARCH §5
              new Text({
                text: new TextSpan({
                  children: [
                    new TextSpan({
                      text: 'Ctrl+O',
                      style: new TextStyle({ foreground: Color.blue }),
                    }),
                    new TextSpan({
                      text: ' for ',
                      style: new TextStyle({ dim: true }),
                    }),
                    new TextSpan({
                      text: 'help',
                      style: new TextStyle({ foreground: Color.yellow }),
                    }),
                  ],
                }),
              }),

              new SizedBox({ height: 2 }),

              // Line 3: Tab navigation hint, first line — Color.cyan
              new Text({
                text: new TextSpan({
                  text: 'Use Tab/Shift+Tab to navigate to previous',
                  style: new TextStyle({ foreground: Color.cyan }),
                }),
              }),

              // Line 4: Tab navigation hint, second line — Color.cyan
              new Text({
                text: new TextSpan({
                  text: 'messages to edit or restore to a previous state',
                  style: new TextStyle({ foreground: Color.cyan }),
                }),
              }),
            ],
          }),
        ],
      }),
    });
  }
}
