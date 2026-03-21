// Table Demo — Demonstrates the Table widget with responsive layout.
//
// Shows a list of programming languages in a two-column format.
// The Table widget renders each item using a renderRow function that
// returns a [left, right] widget pair. In wide mode these appear
// side-by-side; in narrow mode they stack vertically.
//
// Usage (conceptual — requires full binding to render):
//   bun run examples/table-demo.ts

import { StatelessWidget, Widget, type BuildContext } from '../src/framework/widget';
import { Text } from '../src/widgets/text';
import { Column } from '../src/widgets/flex';
import { Container } from '../src/widgets/container';
import { Table } from '../src/widgets/table';
import { Divider } from '../src/widgets/divider';
import { TextSpan } from '../src/core/text-span';
import { TextStyle } from '../src/core/text-style';
import { Color } from '../src/core/color';
import { BoxDecoration, Border, BorderSide } from '../src/layout/render-decorated';

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

interface Language {
  name: string;
  year: number;
  creator: string;
  paradigm: string;
}

const LANGUAGES: Language[] = [
  { name: 'TypeScript', year: 2012, creator: 'Anders Hejlsberg', paradigm: 'Multi-paradigm' },
  { name: 'Rust',       year: 2010, creator: 'Graydon Hoare',    paradigm: 'Systems' },
  { name: 'Go',         year: 2009, creator: 'Rob Pike et al.',   paradigm: 'Concurrent' },
  { name: 'Dart',       year: 2011, creator: 'Lars Bak',          paradigm: 'Object-oriented' },
  { name: 'Kotlin',     year: 2011, creator: 'JetBrains',         paradigm: 'Multi-paradigm' },
  { name: 'Swift',      year: 2014, creator: 'Chris Lattner',     paradigm: 'Protocol-oriented' },
  { name: 'Zig',        year: 2016, creator: 'Andrew Kelley',     paradigm: 'Systems' },
  { name: 'Elixir',     year: 2011, creator: 'Jose Valim',        paradigm: 'Functional' },
];

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const boldStyle = new TextStyle({ bold: true });
const dimStyle = new TextStyle({ dim: true });
const titleStyle = new TextStyle({ bold: true, foreground: Color.cyan });

// ---------------------------------------------------------------------------
// Helper: create a styled Text widget from a string
// ---------------------------------------------------------------------------

function styledText(content: string, style?: TextStyle): Text {
  return new Text({
    text: new TextSpan({ text: content, style: style ?? new TextStyle() }),
  });
}

// ---------------------------------------------------------------------------
// TableDemo widget
// ---------------------------------------------------------------------------

/**
 * A StatelessWidget that demonstrates the Table widget by listing
 * programming languages with name, year, creator, and paradigm.
 */
export class TableDemo extends StatelessWidget {
  constructor() {
    super();
  }

  build(_context: BuildContext): Widget {
    const titleBorder = Border.all(
      new BorderSide({ color: Color.cyan, style: 'rounded' }),
    );

    return new Column({
      children: [
        // Title bar
        new Container({
          decoration: new BoxDecoration({ border: titleBorder }),
          child: styledText(' Programming Languages ', titleStyle),
        }),
        new Divider(),
        // Language table
        new Table<Language>({
          items: LANGUAGES,
          breakpoint: 60,
          renderRow: (lang: Language): [Widget, Widget] => [
            // Left column: name + year
            new Column({
              mainAxisSize: 'min',
              children: [
                styledText(lang.name, boldStyle),
                styledText(`(${lang.year})`, dimStyle),
              ],
            }),
            // Right column: creator + paradigm
            new Column({
              mainAxisSize: 'min',
              children: [
                styledText(lang.creator),
                styledText(lang.paradigm, dimStyle),
              ],
            }),
          ],
        }),
        new Divider(),
        styledText(`${LANGUAGES.length} languages listed`, dimStyle),
      ],
    });
  }
}

// ---------------------------------------------------------------------------
// Exports for testing and usage
// ---------------------------------------------------------------------------

export { LANGUAGES, styledText };
export type { Language };
