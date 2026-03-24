// Table Demo — Demonstrates the Table widget with structured data display.
//
// Shows a list of programming languages in a two-column table format.
// Each row shows the language name+year on the left and creator+paradigm on the right.
//
// This example demonstrates:
// - Table widget for structured two-column data display
// - Column/Row layout for complex cell content
// - Container with BoxDecoration for header styling
// - TextStyle for visual differentiation (bold, dim, colors)
//
// Run with: bun run examples/table-demo.ts

import { StatelessWidget, Widget, type BuildContext } from '../src/framework/widget';
import { runApp } from '../src/framework/binding';
import { Text } from '../src/widgets/text';
import { Column, Row } from '../src/widgets/flex';
import { Container } from '../src/widgets/container';
import { Table } from '../src/widgets/table';
import { Divider } from '../src/widgets/divider';
import { SizedBox } from '../src/widgets/sized-box';
import { Expanded } from '../src/widgets/flexible';
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
const nameStyle = new TextStyle({ bold: true, foreground: Color.green });
const yearStyle = new TextStyle({ foreground: Color.yellow });
const headerStyle = new TextStyle({ bold: true, foreground: Color.defaultColor });
const headerBg = Color.brightBlack;

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
        new SizedBox({ height: 1 }),
        // Column headers
        new Container({
          decoration: new BoxDecoration({ color: headerBg }),
          child: new Row({
            children: [
              new Expanded({ child: styledText(' Language / Year', headerStyle) }),
              new Expanded({ child: styledText(' Creator / Paradigm', headerStyle) }),
            ],
          }),
        }),
        // Language table
        new Table<Language>({
          items: LANGUAGES,
          showDividers: true,
          renderRow: (lang: Language): [Widget, Widget] => [
            // Left column: name + year
            new Row({
              children: [
                styledText(' '),
                styledText(lang.name, nameStyle),
                styledText(' '),
                styledText(`(${lang.year})`, yearStyle),
              ],
            }),
            // Right column: creator + paradigm
            new Row({
              children: [
                styledText(' '),
                styledText(lang.creator),
                styledText(' - ', dimStyle),
                styledText(lang.paradigm, dimStyle),
              ],
            }),
          ],
        }),
        new SizedBox({ height: 1 }),
        styledText(` ${LANGUAGES.length} languages listed`, dimStyle),
      ],
    });
  }
}

// ---------------------------------------------------------------------------
// Exports for testing and usage
// ---------------------------------------------------------------------------

export { LANGUAGES, styledText };
export type { Language };

// Only run the app when executed directly
if (import.meta.main) {
  runApp(new TableDemo(), { output: process.stdout });
}
