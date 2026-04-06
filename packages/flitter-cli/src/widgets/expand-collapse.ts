// ExpandCollapse widget — interactive chevron toggle with MouseRegion (W-5).
//
// A StatelessWidget that renders a disclosure chevron (expanded/collapsed)
// and wraps it in a MouseRegion for click-to-toggle interactivity.
// Falls back to a dim non-interactive glyph when no onToggle callback is provided.
//
// Also exports ExpandCollapseState for backward compatibility (state model).

import {
  StatelessWidget,
  Widget,
  type BuildContext,
} from '../../../flitter-core/src/framework/widget';
import { MouseRegion } from '../../../flitter-core/src/widgets/mouse-region';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { Color } from '../../../flitter-core/src/core/color';
import { icon } from '../utils/icon-registry';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ExpandCollapseProps {
  expanded: boolean;
  onToggle?: () => void;
}

// ---------------------------------------------------------------------------
// ExpandCollapse — StatelessWidget
// ---------------------------------------------------------------------------

/**
 * Interactive disclosure chevron widget.
 *
 * Renders a disclosure triangle (expanded = down, collapsed = right).
 * When `onToggle` is provided, wraps the glyph in a MouseRegion for
 * click-to-toggle behavior with cyan highlight. Otherwise renders a
 * dim non-interactive glyph.
 */
export class ExpandCollapse extends StatelessWidget {
  readonly expanded: boolean;
  readonly onToggle?: () => void;

  constructor(props: ExpandCollapseProps) {
    super();
    this.expanded = props.expanded;
    this.onToggle = props.onToggle;
  }

  build(_context: BuildContext): Widget {
    const chevron = this.expanded
      ? icon('disclosure.expanded')
      : icon('disclosure.collapsed');

    if (!this.onToggle) {
      return new Text({
        text: new TextSpan({
          text: chevron,
          style: new TextStyle({ foreground: Color.brightBlack }),
        }),
      });
    }

    const toggle = this.onToggle;
    return new MouseRegion({
      onClick: () => toggle(),
      child: new Text({
        text: new TextSpan({
          text: chevron,
          style: new TextStyle({ foreground: Color.cyan }),
        }),
      }),
    });
  }
}

// ---------------------------------------------------------------------------
// ExpandCollapseState — backward-compat state model
// ---------------------------------------------------------------------------

/**
 * State model for an expand/collapse container widget.
 *
 * Tracks whether the container is expanded and provides a toggle method.
 * The label describes the collapsible section.
 */
export class ExpandCollapseState {
  expanded: boolean;
  label: string;

  constructor(label: string, expanded: boolean = false) {
    this.label = label;
    this.expanded = expanded;
  }

  /** Toggle between expanded and collapsed states. */
  toggle(): void {
    this.expanded = !this.expanded;
  }
}
