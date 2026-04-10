// SkillPreview — widget displaying a single skill's detail summary.
//
// Renders a bordered panel with:
//   - Skill name (bold)
//   - Author (dim, optional)
//   - Description
//   - Content summary (first 10 lines)
//
// Used by SkillsModal to show a preview when a skill is selected.

import {
  StatelessWidget,
  Widget,
  type BuildContext,
} from '../../../flitter-core/src/framework/widget';
import { Column } from '../../../flitter-core/src/widgets/flex';
import { Container } from '../../../flitter-core/src/widgets/container';
import { SizedBox } from '../../../flitter-core/src/widgets/sized-box';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { EdgeInsets } from '../../../flitter-core/src/layout/edge-insets';
import { BoxDecoration, Border, BorderSide } from '../../../flitter-core/src/layout/render-decorated';
import { CliThemeProvider } from '../themes';

// ---------------------------------------------------------------------------
// Skill data shape accepted by SkillPreview
// ---------------------------------------------------------------------------

/** Minimal skill info required for the preview widget. */
export interface SkillPreviewData {
  name: string;
  description: string;
  content: string;
  author?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of content lines shown in the preview summary. */
const MAX_CONTENT_LINES = 10;

// ---------------------------------------------------------------------------
// SkillPreview widget
// ---------------------------------------------------------------------------

/**
 * SkillPreview displays a single skill's details inside a bordered container.
 *
 * Layout:
 *   Container(border, padding)
 *     Column
 *       - Name (bold)
 *       - Author (dim, if present)
 *       - SizedBox(h:1)
 *       - Description
 *       - SizedBox(h:1)
 *       - Content summary (first 10 lines)
 */
export class SkillPreview extends StatelessWidget {
  readonly skill: SkillPreviewData;

  constructor(props: { skill: SkillPreviewData }) {
    super();
    this.skill = props.skill;
  }

  build(context: BuildContext): Widget {
    const theme = CliThemeProvider.maybeOf(context);
    const base = theme?.base;

    // --- Text styles ---
    const nameStyle = new TextStyle({
      foreground: base?.primary,
      bold: true,
    });

    const authorStyle = new TextStyle({
      foreground: base?.foreground,
      dim: true,
    });

    const descriptionStyle = new TextStyle({
      foreground: base?.foreground,
    });

    const contentStyle = new TextStyle({
      foreground: base?.foreground,
      dim: true,
    });

    // --- Build children ---
    const children: Widget[] = [];

    // Name (bold)
    children.push(new Text({
      text: new TextSpan({ text: this.skill.name, style: nameStyle }),
    }));

    // Author (dim, optional)
    if (this.skill.author) {
      children.push(new Text({
        text: new TextSpan({ text: `by ${this.skill.author}`, style: authorStyle }),
      }));
    }

    children.push(new SizedBox({ height: 1 }));

    // Description
    if (this.skill.description) {
      children.push(new Text({
        text: new TextSpan({ text: this.skill.description, style: descriptionStyle }),
      }));
      children.push(new SizedBox({ height: 1 }));
    }

    // Content summary (first MAX_CONTENT_LINES lines)
    if (this.skill.content) {
      const lines = this.skill.content.split('\n');
      const summary = lines.slice(0, MAX_CONTENT_LINES).join('\n');
      const truncated = lines.length > MAX_CONTENT_LINES
        ? `${summary}\n... (${lines.length - MAX_CONTENT_LINES} more lines)`
        : summary;

      children.push(new Text({
        text: new TextSpan({ text: truncated, style: contentStyle }),
      }));
    }

    // --- Outer container with border ---
    return new Container({
      decoration: new BoxDecoration({
        color: base?.background,
        border: Border.all(
          new BorderSide({ color: base?.border, width: 1 }),
        ),
      }),
      padding: EdgeInsets.all(1),
      child: new Column({
        crossAxisAlignment: 'start',
        mainAxisSize: 'min',
        children,
      }),
    });
  }
}
