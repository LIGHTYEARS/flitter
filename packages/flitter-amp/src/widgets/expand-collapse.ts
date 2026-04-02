import { StatelessWidget, Widget, type BuildContext } from 'flitter-core/src/framework/widget';
import { Text } from 'flitter-core/src/widgets/text';
import { TextStyle } from 'flitter-core/src/core/text-style';
import { TextSpan } from 'flitter-core/src/core/text-span';
import { Color } from 'flitter-core/src/core/color';
import { MouseRegion } from 'flitter-core/src/widgets/mouse-region';
import { AmpThemeProvider } from '../themes/index';
import { icon } from '../ui/icons/icon-registry';

interface ExpandCollapseProps {
  expanded: boolean;
  onToggle: () => void;
}

export class ExpandCollapse extends StatelessWidget {
  readonly expanded: boolean;
  readonly onToggle: () => void;

  constructor(props: ExpandCollapseProps) {
    super({});
    this.expanded = props.expanded;
    this.onToggle = props.onToggle;
  }

  build(context: BuildContext): Widget {
    const theme = AmpThemeProvider.maybeOf(context);
    const chevron = this.expanded
      ? icon('disclosure.expanded')
      : icon('disclosure.collapsed');

    const child = new Text({
      text: new TextSpan({
        text: chevron,
        style: new TextStyle({
          foreground: theme?.base.mutedForeground ?? Color.brightBlack,
        }),
      }),
    });

    return new MouseRegion({
      onClick: () => this.onToggle(),
      child,
    });
  }
}
