// file-browser.ts — Simulated file browser UI with tree display.
//
// Run with: bun run examples/file-browser.ts
//
// This example demonstrates:
// - Static tree-like display of a fake filesystem
// - Tree characters (pipe, tee, elbow, dash) for structure
// - Different colors for directories (blue), files (white), executables (green)
// - File sizes and modification dates
// - SingleChildScrollView with many entries
// - Expanded for filling available space
// - Complex text composition with TextSpan children

import { runApp, WidgetsBinding } from '../src/framework/binding';
import { Column, Row } from '../src/widgets/flex';
import { Expanded } from '../src/widgets/flexible';
import { Text } from '../src/widgets/text';
import { SizedBox } from '../src/widgets/sized-box';
import { Padding } from '../src/widgets/padding';
import { Container } from '../src/widgets/container';
import { Divider } from '../src/widgets/divider';
import { SingleChildScrollView } from '../src/widgets/scroll-view';
import { TextSpan } from '../src/core/text-span';
import { TextStyle } from '../src/core/text-style';
import { Color } from '../src/core/color';
import { EdgeInsets } from '../src/layout/edge-insets';
import { BoxDecoration, Border, BorderSide } from '../src/layout/render-decorated';
import type { Widget } from '../src/framework/widget';

// ---------------------------------------------------------------------------
// Data model: fake filesystem
// ---------------------------------------------------------------------------

interface FileEntry {
  name: string;
  type: 'dir' | 'file' | 'exec';
  size?: string;
  date?: string;
  children?: FileEntry[];
}

const FILESYSTEM: FileEntry = {
  name: 'project',
  type: 'dir',
  children: [
    {
      name: 'src',
      type: 'dir',
      children: [
        {
          name: 'core',
          type: 'dir',
          children: [
            { name: 'color.ts', type: 'file', size: '4.2K', date: '2024-03-15' },
            { name: 'text-span.ts', type: 'file', size: '3.8K', date: '2024-03-15' },
            { name: 'text-style.ts', type: 'file', size: '2.1K', date: '2024-03-14' },
          ],
        },
        {
          name: 'widgets',
          type: 'dir',
          children: [
            { name: 'button.ts', type: 'file', size: '1.9K', date: '2024-03-16' },
            { name: 'container.ts', type: 'file', size: '5.4K', date: '2024-03-16' },
            { name: 'flex.ts', type: 'file', size: '8.7K', date: '2024-03-15' },
            { name: 'text.ts', type: 'file', size: '3.2K', date: '2024-03-15' },
            { name: 'scroll-view.ts', type: 'file', size: '6.1K', date: '2024-03-14' },
          ],
        },
        {
          name: 'framework',
          type: 'dir',
          children: [
            { name: 'binding.ts', type: 'file', size: '7.3K', date: '2024-03-16' },
            { name: 'widget.ts', type: 'file', size: '9.8K', date: '2024-03-16' },
            { name: 'element.ts', type: 'file', size: '12.4K', date: '2024-03-15' },
          ],
        },
        { name: 'index.ts', type: 'file', size: '0.5K', date: '2024-03-16' },
      ],
    },
    {
      name: 'tests',
      type: 'dir',
      children: [
        { name: 'widget.test.ts', type: 'file', size: '6.2K', date: '2024-03-16' },
        { name: 'layout.test.ts', type: 'file', size: '4.8K', date: '2024-03-15' },
        { name: 'render.test.ts', type: 'file', size: '5.1K', date: '2024-03-14' },
      ],
    },
    {
      name: 'scripts',
      type: 'dir',
      children: [
        { name: 'build.sh', type: 'exec', size: '0.8K', date: '2024-03-10' },
        { name: 'test.sh', type: 'exec', size: '0.3K', date: '2024-03-10' },
        { name: 'deploy.sh', type: 'exec', size: '1.2K', date: '2024-03-12' },
      ],
    },
    { name: 'package.json', type: 'file', size: '1.1K', date: '2024-03-16' },
    { name: 'tsconfig.json', type: 'file', size: '0.4K', date: '2024-03-10' },
    { name: 'README.md', type: 'file', size: '2.8K', date: '2024-03-16' },
    { name: '.gitignore', type: 'file', size: '0.1K', date: '2024-03-10' },
  ],
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const dirStyle = new TextStyle({ bold: true, foreground: Color.brightBlue });
const fileStyle = new TextStyle({ foreground: Color.white });
const execStyle = new TextStyle({ bold: true, foreground: Color.brightGreen });
const treeStyle = new TextStyle({ foreground: Color.brightBlack });
const sizeStyle = new TextStyle({ foreground: Color.yellow, dim: true });
const dateStyle = new TextStyle({ foreground: Color.cyan, dim: true });

// ---------------------------------------------------------------------------
// Tree rendering
// ---------------------------------------------------------------------------

function getFileStyle(entry: FileEntry): TextStyle {
  switch (entry.type) {
    case 'dir': return dirStyle;
    case 'exec': return execStyle;
    default: return fileStyle;
  }
}

function getFileIcon(entry: FileEntry): string {
  switch (entry.type) {
    case 'dir': return '/';
    case 'exec': return '*';
    default: return '';
  }
}

/**
 * Recursively build tree lines from a FileEntry.
 * prefix: the inherited indentation string (e.g. "    " or "  |   ")
 * isLast: whether this entry is the last sibling in its parent
 */
function buildTreeLines(
  entry: FileEntry,
  prefix: string,
  isLast: boolean,
  isRoot: boolean,
): Widget[] {
  const widgets: Widget[] = [];

  // Determine connector character
  const connector = isRoot ? '' : isLast ? '\\-- ' : '+-- ';

  // Build the line for this entry
  const nameDisplay = `${entry.name}${getFileIcon(entry)}`;
  const metaDisplay = entry.size
    ? `  ${entry.size?.padStart(6) ?? ''}  ${entry.date ?? ''}`
    : '';

  const lineWidget = new Text({
    text: new TextSpan({
      children: [
        new TextSpan({ text: prefix, style: treeStyle }),
        new TextSpan({ text: connector, style: treeStyle }),
        new TextSpan({ text: nameDisplay, style: getFileStyle(entry) }),
        new TextSpan({ text: metaDisplay, style: entry.size ? sizeStyle : new TextStyle() }),
      ],
    }),
  });

  widgets.push(lineWidget);

  // Recursively render children
  if (entry.children && entry.children.length > 0) {
    const childPrefix = isRoot ? '' : prefix + (isLast ? '    ' : '|   ');
    entry.children.forEach((child, index) => {
      const childIsLast = index === entry.children!.length - 1;
      const childWidgets = buildTreeLines(child, childPrefix, childIsLast, false);
      widgets.push(...childWidgets);
    });
  }

  return widgets;
}

// ---------------------------------------------------------------------------
// Build the file browser layout
// ---------------------------------------------------------------------------

export function buildFileBrowser() {
  // Generate the tree from the fake filesystem
  const treeWidgets = buildTreeLines(FILESYSTEM, '', true, true);

  return new Column({
    mainAxisAlignment: 'start',
    crossAxisAlignment: 'stretch',
    children: [
      // Header
      new Container({
        decoration: new BoxDecoration({
          color: Color.blue,
          border: Border.all(new BorderSide({ color: Color.brightBlue, style: 'solid' })),
        }),
        child: new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 1 }),
          child: new Text({
            text: new TextSpan({
              children: [
                new TextSpan({ text: ' File Browser ', style: new TextStyle({ bold: true, foreground: Color.brightWhite }) }),
                new TextSpan({ text: '  ~/project', style: new TextStyle({ dim: true }) }),
              ],
            }),
          }),
        }),
      }),

      // Legend
      new Padding({
        padding: EdgeInsets.symmetric({ horizontal: 1 }),
        child: new Text({
          text: new TextSpan({
            children: [
              new TextSpan({ text: 'dir/', style: dirStyle }),
              new TextSpan({ text: '  ', style: new TextStyle() }),
              new TextSpan({ text: 'file', style: fileStyle }),
              new TextSpan({ text: '  ', style: new TextStyle() }),
              new TextSpan({ text: 'exec*', style: execStyle }),
              new TextSpan({ text: '  ', style: new TextStyle() }),
              new TextSpan({ text: 'size', style: sizeStyle }),
              new TextSpan({ text: '  ', style: new TextStyle() }),
              new TextSpan({ text: 'date', style: dateStyle }),
            ],
          }),
        }),
      }),
      new Divider(),

      // Scrollable tree content
      new Expanded({
        child: new SingleChildScrollView({
          child: new Padding({
            padding: EdgeInsets.symmetric({ horizontal: 1 }),
            child: new Column({
              mainAxisSize: 'min',
              crossAxisAlignment: 'start',
              children: treeWidgets,
            }),
          }),
        }),
      }),

      // Footer
      new Divider(),
      new Padding({
        padding: EdgeInsets.symmetric({ horizontal: 1 }),
        child: new Text({
          text: new TextSpan({
            text: '4 directories, 16 files',
            style: new TextStyle({ dim: true }),
          }),
        }),
      }),
    ],
  });
}

// Export the widget tree for testing
export const app = buildFileBrowser();

// Only run the app when executed directly
if (typeof process !== 'undefined' && !process.env.BUN_TEST) {
  runApp(app).then(binding => binding.setOutput(process.stdout));
}
