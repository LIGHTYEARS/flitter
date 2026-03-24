// kanban-board.ts — Kanban board layout with three columns.
//
// Run with: bun run examples/kanban-board.ts
//
// This example demonstrates:
// - 3-column layout: TODO, In Progress, Done
// - Each column has bordered cards inside
// - Cards have title, description, and priority tag
// - Different border/header colors per column
// - Static layout demonstrating complex widget composition
// - Row + Expanded for column sizing
// - Nested Container/Column for card structure

import { runApp, WidgetsBinding } from '../src/framework/binding';
import { Column, Row } from '../src/widgets/flex';
import { Expanded } from '../src/widgets/flexible';
import { Text } from '../src/widgets/text';
import { SizedBox } from '../src/widgets/sized-box';
import { Padding } from '../src/widgets/padding';
import { Container } from '../src/widgets/container';
import { Center } from '../src/widgets/center';
import { Divider } from '../src/widgets/divider';
import { TextSpan } from '../src/core/text-span';
import { TextStyle } from '../src/core/text-style';
import { Color } from '../src/core/color';
import { EdgeInsets } from '../src/layout/edge-insets';
import { BoxDecoration, Border, BorderSide } from '../src/layout/render-decorated';
import type { Widget } from '../src/framework/widget';

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

type Priority = 'high' | 'medium' | 'low';

interface KanbanCard {
  title: string;
  description: string;
  priority: Priority;
  assignee?: string;
}

interface KanbanColumn {
  title: string;
  color: Color;
  cards: KanbanCard[];
}

// ---------------------------------------------------------------------------
// Board data
// ---------------------------------------------------------------------------

const BOARD: KanbanColumn[] = [
  {
    title: 'TODO',
    color: Color.red,
    cards: [
      {
        title: 'Add authentication',
        description: 'Implement JWT-based auth flow',
        priority: 'high',
        assignee: 'Alice',
      },
      {
        title: 'Write API docs',
        description: 'Document all REST endpoints',
        priority: 'medium',
        assignee: 'Bob',
      },
      {
        title: 'Setup CI pipeline',
        description: 'GitHub Actions for test + deploy',
        priority: 'low',
      },
      {
        title: 'Add rate limiting',
        description: 'Prevent API abuse',
        priority: 'medium',
        assignee: 'Carol',
      },
    ],
  },
  {
    title: 'IN PROGRESS',
    color: Color.yellow,
    cards: [
      {
        title: 'Refactor database layer',
        description: 'Migrate to connection pooling',
        priority: 'high',
        assignee: 'Dave',
      },
      {
        title: 'Add search feature',
        description: 'Full-text search with filters',
        priority: 'medium',
        assignee: 'Alice',
      },
    ],
  },
  {
    title: 'DONE',
    color: Color.green,
    cards: [
      {
        title: 'Initial project setup',
        description: 'Scaffolded project structure',
        priority: 'low',
        assignee: 'Dave',
      },
      {
        title: 'Design database schema',
        description: 'Users, posts, comments tables',
        priority: 'high',
        assignee: 'Bob',
      },
      {
        title: 'Setup dev environment',
        description: 'Docker compose + hot reload',
        priority: 'medium',
        assignee: 'Carol',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function label(content: string, style?: TextStyle): Text {
  return new Text({
    text: new TextSpan({
      text: content,
      style: style ?? new TextStyle(),
    }),
  });
}

// ---------------------------------------------------------------------------
// Priority styling
// ---------------------------------------------------------------------------

function priorityColor(priority: Priority): Color {
  switch (priority) {
    case 'high': return Color.red;
    case 'medium': return Color.yellow;
    case 'low': return Color.green;
  }
}

function priorityLabel(priority: Priority): string {
  switch (priority) {
    case 'high': return ' HIGH ';
    case 'medium': return ' MED  ';
    case 'low': return ' LOW  ';
  }
}

// ---------------------------------------------------------------------------
// Card builder
// ---------------------------------------------------------------------------

function buildCard(card: KanbanCard, columnColor: Color): Widget {
  const pColor = priorityColor(card.priority);

  return new Container({
    decoration: new BoxDecoration({
      border: Border.all(new BorderSide({ color: columnColor, style: 'rounded' })),
    }),
    child: new Padding({
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      child: new Column({
        mainAxisSize: 'min',
        crossAxisAlignment: 'start',
        children: [
          // Card header: title + priority badge
          new Row({
            children: [
              new Expanded({
                child: label(card.title, new TextStyle({ bold: true, foreground: Color.white })),
              }),
              new Container({
                decoration: new BoxDecoration({ color: pColor }),
                child: label(priorityLabel(card.priority), new TextStyle({ bold: true })),
              }),
            ],
          }),
          // Description
          label(card.description, new TextStyle({ dim: true })),
          // Assignee (if present)
          ...(card.assignee
            ? [
                new Text({
                  text: new TextSpan({
                    children: [
                      new TextSpan({ text: '@', style: new TextStyle({ foreground: Color.cyan }) }),
                      new TextSpan({ text: card.assignee, style: new TextStyle({ foreground: Color.cyan, dim: true }) }),
                    ],
                  }),
                }),
              ]
            : []),
        ],
      }),
    }),
  });
}

// ---------------------------------------------------------------------------
// Column builder
// ---------------------------------------------------------------------------

function buildKanbanColumn(column: KanbanColumn): Widget {
  // Build cards with spacing
  const cardWidgets: Widget[] = [];
  column.cards.forEach((card, i) => {
    cardWidgets.push(buildCard(card, column.color));
    if (i < column.cards.length - 1) {
      cardWidgets.push(new SizedBox({ height: 1 }));
    }
  });

  return new Container({
    decoration: new BoxDecoration({
      border: Border.all(new BorderSide({ color: column.color, style: 'solid' })),
    }),
    child: new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'stretch',
      children: [
        // Column header
        new Container({
          decoration: new BoxDecoration({ color: column.color }),
          child: new Center({
            child: new Text({
              text: new TextSpan({
                children: [
                  new TextSpan({
                    text: ` ${column.title} `,
                    style: new TextStyle({ bold: true }),
                  }),
                  new TextSpan({
                    text: `(${column.cards.length})`,
                    style: new TextStyle({ dim: true }),
                  }),
                ],
              }),
            }),
          }),
        }),
        // Cards
        new Padding({
          padding: EdgeInsets.all(1),
          child: new Column({
            mainAxisSize: 'min',
            crossAxisAlignment: 'stretch',
            children: cardWidgets,
          }),
        }),
      ],
    }),
  });
}

// ---------------------------------------------------------------------------
// Build the full kanban board layout
// ---------------------------------------------------------------------------

export function buildKanbanBoard() {
  const totalCards = BOARD.reduce((sum, col) => sum + col.cards.length, 0);

  return new Column({
    mainAxisAlignment: 'start',
    crossAxisAlignment: 'stretch',
    children: [
      // Header
      new Container({
        decoration: new BoxDecoration({
          border: Border.all(new BorderSide({ color: Color.brightBlack, style: 'rounded' })),
        }),
        child: new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 1 }),
          child: Row.spaceBetween([
            label(' Kanban Board ', new TextStyle({ bold: true, foreground: Color.cyan })),
            label(`${totalCards} cards total`, new TextStyle({ dim: true })),
          ]),
        }),
      }),

      // Board columns
      new Expanded({
        child: new Padding({
          padding: EdgeInsets.all(1),
          child: new Row({
            crossAxisAlignment: 'start',
            children: [
              // TODO column
              new Expanded({
                flex: 1,
                child: buildKanbanColumn(BOARD[0]!),
              }),
              new SizedBox({ width: 1 }),
              // IN PROGRESS column
              new Expanded({
                flex: 1,
                child: buildKanbanColumn(BOARD[1]!),
              }),
              new SizedBox({ width: 1 }),
              // DONE column
              new Expanded({
                flex: 1,
                child: buildKanbanColumn(BOARD[2]!),
              }),
            ],
          }),
        }),
      }),

      // Footer: legend
      new Container({
        decoration: new BoxDecoration({
          border: Border.all(new BorderSide({ color: Color.brightBlack, style: 'solid' })),
        }),
        child: new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 1 }),
          child: new Text({
            text: new TextSpan({
              children: [
                new TextSpan({ text: 'Priority: ', style: new TextStyle({ dim: true }) }),
                new TextSpan({ text: 'HIGH', style: new TextStyle({ foreground: Color.red, bold: true }) }),
                new TextSpan({ text: '  ', style: new TextStyle() }),
                new TextSpan({ text: 'MED', style: new TextStyle({ foreground: Color.yellow, bold: true }) }),
                new TextSpan({ text: '  ', style: new TextStyle() }),
                new TextSpan({ text: 'LOW', style: new TextStyle({ foreground: Color.green, bold: true }) }),
              ],
            }),
          }),
        }),
      }),
    ],
  });
}

// Export for testing
export const app = buildKanbanBoard();
export { BOARD };
export type { KanbanCard, KanbanColumn, Priority };

// Only run the app when executed directly
if (import.meta.main) {
  runApp(app, { output: process.stdout });
}
