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

interface BootstrapShellProps {
  cwd: string;
  configPath: string;
  logPath: string | null;
}

class BootstrapShell extends FocusScope {
  constructor(props: BootstrapShellProps) {
    super({
      autofocus: true,
      onKey: (event: KeyEvent): KeyEventResult => {
        if (event.ctrlKey && event.key.toLowerCase() === 'c') {
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
                  text: 'flitter-cli bootstrap shell',
                  style: new TextStyle({
                    bold: true,
                    foreground: Color.cyan,
                  }),
                }),
              }),
              new Text({
                text: new TextSpan({
                  text: 'Phase 12 scaffold is active.',
                  style: new TextStyle({
                    foreground: Color.defaultColor,
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
                  text: 'Ctrl+C / Esc / q to exit',
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

export async function startBootstrapShell(props: BootstrapShellProps): Promise<WidgetsBinding> {
  return runApp(new BootstrapShell(props), {
    output: process.stdout,
    terminal: true,
  });
}
