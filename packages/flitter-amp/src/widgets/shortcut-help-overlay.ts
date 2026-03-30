// Shortcut help overlay -- "?" overlay with grouped keyboard shortcut reference
// Displayed when user presses "?" from the idle input state.
// Follows the same overlay pattern as CommandPalette and PermissionDialog.
// Gap 30: Updated to optionally accept a ShortcutRegistry as the source of truth.

import { StatelessWidget, Widget, type BuildContext } from 'flitter-core/src/framework/widget';
import { Column, Row } from 'flitter-core/src/widgets/flex';
import { Container } from 'flitter-core/src/widgets/container';
import { Text } from 'flitter-core/src/widgets/text';
import { TextSpan } from 'flitter-core/src/core/text-span';
import { TextStyle } from 'flitter-core/src/core/text-style';
import { Color } from 'flitter-core/src/core/color';
import { FocusScope } from 'flitter-core/src/widgets/focus-scope';
import { BoxDecoration, Border, BorderSide } from 'flitter-core/src/layout/render-decorated';
import { EdgeInsets } from 'flitter-core/src/layout/edge-insets';
import { SizedBox } from 'flitter-core/src/widgets/sized-box';
import { BoxConstraints } from 'flitter-core/src/core/box-constraints';
import { Stack, Positioned } from 'flitter-core/src/widgets/stack';
import { AmpThemeProvider } from '../themes';
import type { KeyEvent, KeyEventResult } from 'flitter-core/src/input/events';
import type { ShortcutRegistry, ShortcutCategory } from '../shortcuts/registry';

/**
 * A single shortcut entry for display in the help overlay.
 */
interface ShortcutDisplayEntry {
  key: string;        // e.g. "Ctrl+O", "Escape", "?"
  description: string; // e.g. "Open command palette"
}

/**
 * A group of related shortcuts under a heading.
 */
interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutDisplayEntry[];
}

/**
 * Mapping from ShortcutCategory to display title.
 */
const CATEGORY_TITLES: Record<ShortcutCategory, string> = {
  general: 'General',
  display: 'Display',
  navigation: 'Navigation',
  input: 'Input',
};

/**
 * Static shortcut entries for the Input category.
 * These are not registered in the ShortcutRegistry because they are
 * widget-level behaviors (TextField/InputArea) rather than global shortcuts.
 */
const INPUT_SHORTCUTS: ShortcutDisplayEntry[] = [
  { key: 'Enter',     description: 'Submit prompt' },
  { key: '@',          description: 'Trigger file autocomplete' },
  { key: '$ ...',      description: 'Shell mode (run command)' },
  { key: '$$ ...',     description: 'Background shell mode' },
];

/**
 * Fallback groups used when no registry is provided.
 * Kept for backward compatibility.
 */
const FALLBACK_SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'General',
    shortcuts: [
      { key: '?',       description: 'Toggle this help overlay' },
      { key: 'Ctrl+O',  description: 'Open command palette' },
      { key: 'Ctrl+C',  description: 'Cancel current operation' },
      { key: 'Ctrl+L',  description: 'Clear conversation' },
      { key: 'Escape',  description: 'Dismiss overlay / cancel' },
    ],
  },
  {
    title: 'Display',
    shortcuts: [
      { key: 'Alt+T',   description: 'Toggle tool call expansion' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { key: 'Ctrl+R',  description: 'Search prompt history' },
      { key: 'Ctrl+G',  description: 'Open prompt in $EDITOR' },
    ],
  },
  {
    title: 'Input',
    shortcuts: INPUT_SHORTCUTS,
  },
];

/**
 * Build shortcut groups from a ShortcutRegistry.
 * Derives groups from the registry's entries, supplemented with
 * static Input shortcuts.
 */
function groupsFromRegistry(registry: ShortcutRegistry): ShortcutGroup[] {
  const grouped = registry.getGroupedEntries();
  const result: ShortcutGroup[] = [];

  for (const [category, entries] of grouped) {
    const shortcuts: ShortcutDisplayEntry[] = entries.map(e => ({
      key: e.displayKey,
      description: e.description,
    }));

    // Append static input shortcuts to the 'input' category
    if (category === 'input') {
      shortcuts.push(...INPUT_SHORTCUTS);
    }

    // Only include non-empty groups
    if (shortcuts.length > 0) {
      result.push({
        title: CATEGORY_TITLES[category],
        shortcuts,
      });
    }
  }

  // If registry had no 'input' entries, still show input shortcuts
  const hasInput = result.some(g => g.title === 'Input');
  if (!hasInput) {
    result.push({
      title: 'Input',
      shortcuts: INPUT_SHORTCUTS,
    });
  }

  return result;
}

interface ShortcutHelpOverlayProps {
  onDismiss: () => void;
  registry?: ShortcutRegistry;
}

export class ShortcutHelpOverlay extends StatelessWidget {
  private readonly onDismiss: () => void;
  private readonly registry?: ShortcutRegistry;

  constructor(props: ShortcutHelpOverlayProps) {
    super({});
    this.onDismiss = props.onDismiss;
    this.registry = props.registry;
  }

  build(context: BuildContext): Widget {
    const theme = AmpThemeProvider.maybeOf(context);
    const infoColor = theme?.base.info ?? Color.cyan;
    const fgColor = theme?.base.foreground ?? Color.white;
    const mutedColor = theme?.base.mutedForeground ?? Color.brightBlack;
    const keybindColor = theme?.app.keybind ?? Color.blue;

    const side = new BorderSide({
      color: infoColor,
      width: 1,
      style: 'rounded' as any,
    });

    // Derive groups from registry or use fallback
    const shortcutGroups = this.registry
      ? groupsFromRegistry(this.registry)
      : FALLBACK_SHORTCUT_GROUPS;

    // Build the shortcut rows from groups
    const contentChildren: Widget[] = [
      // Title
      new Text({
        text: new TextSpan({
          text: 'Keyboard Shortcuts',
          style: new TextStyle({ foreground: infoColor, bold: true }),
        }),
      }),
      new SizedBox({ height: 1 }),
    ];

    for (let gi = 0; gi < shortcutGroups.length; gi++) {
      const group = shortcutGroups[gi]!;

      // Group heading
      contentChildren.push(
        new Text({
          text: new TextSpan({
            text: group.title,
            style: new TextStyle({ foreground: fgColor, bold: true }),
          }),
        }),
      );

      // Shortcut rows
      for (const shortcut of group.shortcuts) {
        contentChildren.push(
          new Row({
            children: [
              // Fixed-width key column (padded to 14 chars for alignment)
              new SizedBox({
                width: 14,
                child: new Text({
                  text: new TextSpan({
                    text: shortcut.key,
                    style: new TextStyle({ foreground: keybindColor }),
                  }),
                }),
              }),
              new Text({
                text: new TextSpan({
                  text: shortcut.description,
                  style: new TextStyle({ foreground: mutedColor }),
                }),
              }),
            ],
          }),
        );
      }

      // Spacer between groups (except after the last one)
      if (gi < shortcutGroups.length - 1) {
        contentChildren.push(new SizedBox({ height: 1 }));
      }
    }

    // Footer hint
    contentChildren.push(new SizedBox({ height: 1 }));
    contentChildren.push(
      new Text({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: 'Press ',
              style: new TextStyle({ foreground: mutedColor, dim: true }),
            }),
            new TextSpan({
              text: '?',
              style: new TextStyle({ foreground: keybindColor }),
            }),
            new TextSpan({
              text: ' or ',
              style: new TextStyle({ foreground: mutedColor, dim: true }),
            }),
            new TextSpan({
              text: 'Esc',
              style: new TextStyle({ foreground: keybindColor }),
            }),
            new TextSpan({
              text: ' to close',
              style: new TextStyle({ foreground: mutedColor, dim: true }),
            }),
          ],
        }),
      }),
    );

    return new Stack({
      fit: 'expand',
      children: [
        // Semi-transparent background mask (same as PermissionDialog)
        new Positioned({
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          child: new Container({
            color: Color.rgba(0, 0, 0, 0.6),
          }),
        }),
        // Centered overlay
        new FocusScope({
          autofocus: true,
          onKey: (event: KeyEvent): KeyEventResult => {
            // Dismiss on Escape or pressing "?" again (toggle behavior)
            if (event.key === 'Escape' || event.key === '?') {
              this.onDismiss();
              return 'handled';
            }
            // Absorb all other keys while overlay is shown
            return 'handled';
          },
          child: new Column({
            mainAxisAlignment: 'center',
            crossAxisAlignment: 'center',
            children: [
              new Container({
                decoration: new BoxDecoration({ border: Border.all(side) }),
                padding: EdgeInsets.symmetric({ horizontal: 2, vertical: 1 }),
                constraints: new BoxConstraints({ maxWidth: 55 }),
                child: new Column({
                  mainAxisSize: 'min',
                  crossAxisAlignment: 'start',
                  children: contentChildren,
                }),
              }),
            ],
          }),
        }),
      ],
    });
  }
}

// Re-export for backward compatibility
export const SHORTCUT_GROUPS = FALLBACK_SHORTCUT_GROUPS;
