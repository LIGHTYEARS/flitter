// DiffCard — bordered file diff display using flitter-core's DiffView
//
// Wraps DiffView in a rounded-border Container with a file path header.
// Provides unified diff rendering with line numbers, hunk headers,
// word-level diff highlighting, and proper color semantics.
//
// Ported from flitter-amp/src/widgets/diff-card.ts:
// — AmpThemeProvider color lookups replaced with direct Color.* constants
// — Import paths use relative ../../../../flitter-core/... pattern
//
// Phase 19 Plan 02.

import {
  StatelessWidget,
  Widget,
  type BuildContext,
} from '../../../flitter-core/src/framework/widget';
import { Column } from '../../../flitter-core/src/widgets/flex';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { Color } from '../../../flitter-core/src/core/color';
import { Padding } from '../../../flitter-core/src/widgets/padding';
import { EdgeInsets } from '../../../flitter-core/src/layout/edge-insets';
import { DiffView } from '../../../flitter-core/src/widgets/diff-view';
import { Container } from '../../../flitter-core/src/widgets/container';
import { BoxDecoration, Border, BorderSide } from '../../../flitter-core/src/layout/render-decorated';
import { Theme } from '../../../flitter-core/src/widgets/theme';

interface DiffCardProps {
  filePath: string;
  diff: string;
}

/**
 * A bordered card that renders a unified diff with a file path header.
 *
 * Layout:
 *   Padding(left:4, right:2, bottom:1)
 *     Container(border: rounded, horizontalPadding:1)
 *       Theme(diffAdded: green, diffRemoved: red)
 *         Column
 *           Text(" filePath", bold brightBlack)
 *           DiffView(showLineNumbers: true)
 *
 * Uses direct Color.* constants instead of AmpThemeProvider
 * (consistent with flitter-cli Phase 20 deferral).
 */
export class DiffCard extends StatelessWidget {
  private readonly filePath: string;
  private readonly diff: string;

  constructor(props: DiffCardProps) {
    super({});
    this.filePath = props.filePath;
    this.diff = props.diff;
  }

  build(_context: BuildContext): Widget {
    const borderSide = new BorderSide({ color: Color.brightBlack, width: 1, style: 'rounded' });

    const diffContent = new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'stretch',
      children: [
        new Text({
          text: new TextSpan({
            text: ` ${this.filePath}`,
            style: new TextStyle({
              foreground: Color.brightBlack,
              bold: true,
            }),
          }),
        }),
        new DiffView({
          diff: this.diff,
          showLineNumbers: true,
        }),
      ],
    });

    const coreThemeData = {
      ...Theme.defaultTheme(),
      diffAdded: Color.green,
      diffRemoved: Color.red,
    };

    return new Padding({
      padding: EdgeInsets.only({ left: 4, right: 2, top: 0, bottom: 1 }),
      child: new Container({
        decoration: new BoxDecoration({
          border: Border.all(borderSide),
        }),
        padding: EdgeInsets.symmetric({ horizontal: 1 }),
        child: new Theme({
          data: coreThemeData,
          child: diffContent,
        }),
      }),
    });
  }
}
