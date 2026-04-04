// PlanView — StatelessWidget that renders a plan checklist with status icons
// and priority tags, matching Amp's plan rendering style.
//
// Ported from flitter-amp/src/widgets/plan-view.ts with these adaptations:
//   - AmpThemeProvider color lookups replaced with direct Color.* constants
//   - icon('plan.status.*') calls replaced with inline Unicode characters
//     (consistent with tool-icons.ts in flitter-cli)
//   - Import paths use relative ../../../flitter-core/...
//
// Layout:
//   Padding (vertical: 1)
//     Column
//       Text "  Plan" (cyan, bold)
//       For each entry:
//         Text
//           "    " + statusIcon + " " (colored by status)
//           + priorityTag + " " (colored by priority, bold)
//           + content (colored by status)

import { StatelessWidget, Widget, type BuildContext } from '../../../flitter-core/src/framework/widget';
import { Column } from '../../../flitter-core/src/widgets/flex';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { Color } from '../../../flitter-core/src/core/color';
import { Padding } from '../../../flitter-core/src/widgets/padding';
import { EdgeInsets } from '../../../flitter-core/src/layout/edge-insets';
import type { PlanEntry } from '../state/types';
import { CliThemeProvider, type CliTheme } from '../themes';

// ---------------------------------------------------------------------------
// Unicode status icons (mirrors tool-icons.ts todoStatusIcon mapping)
// ---------------------------------------------------------------------------

/** Checkmark for completed entries. */
const ICON_COMPLETED = '\u2713';

/** Half circle for in-progress entries. */
const ICON_IN_PROGRESS = '\u25D4';

/** Empty circle for pending entries. */
const ICON_PENDING = '\u25CB';

// ---------------------------------------------------------------------------
// PlanView — StatelessWidget
// ---------------------------------------------------------------------------

interface PlanViewProps {
  entries: PlanEntry[];
}

/**
 * Renders a plan block as a titled checklist.
 *
 * Each entry displays a status icon (completed/in_progress/pending), a
 * priority tag ([H]/[M]/[L] with color coding), and the entry content.
 * Colors are determined by status for the icon and content, and by
 * priority for the tag.
 *
 * Empty entry lists render just the "Plan" title header without crashing.
 */
export class PlanView extends StatelessWidget {
  private readonly entries: PlanEntry[];

  constructor(props: PlanViewProps) {
    super({});
    this.entries = props.entries;
  }

  build(context: BuildContext): Widget {
    const theme = CliThemeProvider.maybeOf(context);

    const children: Widget[] = [
      new Text({
        text: new TextSpan({
          text: '  Plan',
          style: new TextStyle({
            foreground: theme?.base.info ?? Color.cyan,
            bold: true,
          }),
        }),
      }),
    ];

    for (const entry of this.entries) {
      const iconChar = PlanView.getStatusIcon(entry.status);
      const statusColor = PlanView.getStatusColor(entry.status, theme);
      const { tag, tagColor } = PlanView.getPriorityDisplay(entry.priority, theme);

      children.push(
        new Text({
          text: new TextSpan({
            children: [
              new TextSpan({
                text: `    ${iconChar} `,
                style: new TextStyle({ foreground: statusColor }),
              }),
              new TextSpan({
                text: `${tag} `,
                style: new TextStyle({ foreground: tagColor, bold: true }),
              }),
              new TextSpan({
                text: entry.content,
                style: new TextStyle({ foreground: statusColor }),
              }),
            ],
          }),
        }),
      );
    }

    return new Padding({
      padding: EdgeInsets.symmetric({ vertical: 1 }),
      child: new Column({
        mainAxisSize: 'min',
        crossAxisAlignment: 'stretch',
        children,
      }),
    });
  }

  /**
   * Returns the Unicode status icon for a plan entry status.
   *
   * Mapping:
   *   'completed'   -> checkmark (\u2713)
   *   'in_progress' -> half circle (\u25D4)
   *   'pending'     -> empty circle (\u25CB)
   */
  private static getStatusIcon(status: PlanEntry['status']): string {
    switch (status) {
      case 'completed':
        return ICON_COMPLETED;
      case 'in_progress':
        return ICON_IN_PROGRESS;
      case 'pending':
        return ICON_PENDING;
      default:
        return ICON_PENDING;
    }
  }

  /**
   * Returns the Color for a plan entry based on its status.
   *
   * Mapping:
   *   'completed'   -> green   (success)
   *   'in_progress' -> yellow  (warning / active)
   *   'pending'     -> brightBlack (muted / dim)
   */
  private static getStatusColor(status: PlanEntry['status'], theme: CliTheme | undefined): Color {
    switch (status) {
      case 'completed':
        return theme?.base.success ?? Color.green;
      case 'in_progress':
        return theme?.base.warning ?? Color.yellow;
      case 'pending':
        return theme?.base.mutedForeground ?? Color.brightBlack;
      default:
        return theme?.base.mutedForeground ?? Color.brightBlack;
    }
  }

  /**
   * Returns the display tag string and color for a plan entry's priority level.
   *
   * Mapping:
   *   'high'   -> [H] in red          (destructive / urgent)
   *   'medium' -> [M] in yellow       (warning / normal)
   *   'low'    -> [L] in brightBlack  (muted / background)
   */
  private static getPriorityDisplay(
    priority: PlanEntry['priority'],
    theme: CliTheme | undefined,
  ): { tag: string; tagColor: Color } {
    switch (priority) {
      case 'high':
        return { tag: '[H]', tagColor: theme?.base.destructive ?? Color.red };
      case 'medium':
        return { tag: '[M]', tagColor: theme?.base.warning ?? Color.yellow };
      case 'low':
        return { tag: '[L]', tagColor: theme?.base.mutedForeground ?? Color.brightBlack };
      default:
        return { tag: '[M]', tagColor: theme?.base.warning ?? Color.yellow };
    }
  }
}
