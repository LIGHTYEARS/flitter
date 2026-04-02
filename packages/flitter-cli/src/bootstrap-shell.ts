import { Color } from '../../flitter-core/src/core/color';
import { TextSpan } from '../../flitter-core/src/core/text-span';
import { TextStyle } from '../../flitter-core/src/core/text-style';
import { runApp, WidgetsBinding } from '../../flitter-core/src/framework/binding';
import type { KeyEvent, KeyEventResult } from '../../flitter-core/src/input/events';
import { EdgeInsets } from '../../flitter-core/src/layout/edge-insets';
import { Center } from '../../flitter-core/src/widgets/center';
import { Column } from '../../flitter-core/src/widgets/flex';
import { FocusScope } from '../../flitter-core/src/widgets/focus-scope';
import { Padding } from '../../flitter-core/src/widgets/padding';
import { Text } from '../../flitter-core/src/widgets/text';
import type { AppState } from './state/app-state';

/** Props for the bootstrap shell, now including session-aware AppState. */
interface BootstrapShellProps {
  cwd: string;
  configPath: string;
  logPath: string | null;
  /** Top-level application state for session-aware rendering. */
  appState: AppState;
}

/**
 * BootstrapShell — the initial TUI shell for flitter-cli.
 *
 * Displays session lifecycle state, model, and cwd. Handles Ctrl+C to
 * cancel in-flight prompts or exit, and Esc/q to exit.
 */
class BootstrapShell extends FocusScope {
  constructor(props: BootstrapShellProps) {
    const { appState } = props;
    super({
      autofocus: true,
      onKey: (event: KeyEvent): KeyEventResult => {
        if (event.ctrlKey && event.key.toLowerCase() === 'c') {
          // If processing, cancel the prompt; otherwise exit
          if (appState.isProcessing) {
            appState.cancelPrompt();
            return 'handled';
          }
          WidgetsBinding.instance.stop();
          return 'handled';
        }
        if (event.key === 'Escape' || event.key.toLowerCase() === 'q') {
          WidgetsBinding.instance.stop();
          return 'handled';
        }
        return 'ignored';
      },
      child: new Center({
        child: new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 4, vertical: 2 }),
          child: new Column({
            mainAxisSize: 'min',
            crossAxisAlignment: 'start',
            children: [
              new Text({
                text: new TextSpan({
                  text: 'flitter-cli',
                  style: new TextStyle({
                    bold: true,
                    foreground: Color.cyan,
                  }),
                }),
              }),
              new Text({
                text: new TextSpan({
                  text: `lifecycle: ${appState.lifecycle}`,
                  style: new TextStyle({
                    foreground: Color.defaultColor,
                  }),
                }),
              }),
              new Text({
                text: new TextSpan({
                  text: `model: ${appState.metadata.model}`,
                  style: new TextStyle({
                    foreground: Color.blue,
                  }),
                }),
              }),
              new Text({
                text: new TextSpan({
                  text: `cwd: ${props.cwd}`,
                  style: new TextStyle({
                    foreground: Color.green,
                  }),
                }),
              }),
              new Text({
                text: new TextSpan({
                  text: `config: ${props.configPath}`,
                  style: new TextStyle({
                    foreground: Color.yellow,
                  }),
                }),
              }),
              new Text({
                text: new TextSpan({
                  text: `log: ${props.logPath ?? 'stderr fallback'}`,
                  style: new TextStyle({
                    foreground: Color.magenta,
                  }),
                }),
              }),
              new Text({
                text: new TextSpan({
                  text: 'Ctrl+C to cancel/exit | Esc/q to exit',
                  style: new TextStyle({
                    foreground: Color.brightBlack,
                    dim: true,
                  }),
                }),
              }),
            ],
          }),
        }),
      }),
    });
  }
}

/** Start the bootstrap shell TUI with session-aware AppState. */
export async function startBootstrapShell(props: BootstrapShellProps): Promise<WidgetsBinding> {
  return runApp(new BootstrapShell(props), {
    output: process.stdout,
    terminal: true,
  });
}
