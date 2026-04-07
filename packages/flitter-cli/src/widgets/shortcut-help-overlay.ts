// ShortcutHelpOverlay — "?" overlay with grouped keyboard shortcut reference
//
// Displays all keyboard shortcuts grouped by category. Invoked by pressing
// "?" when the input is empty and no overlays are active. Reads shortcut
// data exclusively from the ShortcutRegistry (Plan 17-01) so it cannot
// drift from actual bindings.
//
// Differences from flitter-amp/src/widgets/shortcut-help-overlay.ts:
// - No fallback list: registry prop is required (not optional).
// - No internal Stack with modal mask: OverlayManager handles modal mask
//   when `modal: true` is set on the overlay entry.
// - No AmpThemeProvider: colors are hardcoded (cyan info, blue keybind,
//   brightBlack muted, white foreground). Phase 20 adds theme support.
//
// The overlay is modal and absorbs all key events via FocusScope.onKey.
// Escape or "?" dismisses it (toggle behavior).

import { StatelessWidget, Widget, type BuildContext } from '../../../flitter-core/src/framework/widget';
import { Column, Row } from '../../../flitter-core/src/widgets/flex';
import { Container } from '../../../flitter-core/src/widgets/container';
import { Text } from '../../../flitter-core/src/widgets/text';
import { TextSpan } from '../../../flitter-core/src/core/text-span';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import { Color } from '../../../flitter-core/src/core/color';
import { FocusScope } from '../../../flitter-core/src/widgets/focus-scope';
import { BoxDecoration, Border, BorderSide } from '../../../flitter-core/src/layout/render-decorated';
import { EdgeInsets } from '../../../flitter-core/src/layout/edge-insets';
import { SizedBox } from '../../../flitter-core/src/widgets/sized-box';
import { BoxConstraints } from '../../../flitter-core/src/core/box-constraints';
import type { KeyEvent, KeyEventResult } from '../../../flitter-core/src/input/events';
import type { ShortcutRegistry, ShortcutCategory } from '../shortcuts/registry';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A single shortcut entry for display in the help overlay.
 */
interface ShortcutDisplayEntry {
  key: string;         // e.g. "Ctrl+O", "Escape", "?"
  description: string; // e.g. "Open command palette"
}

/**
 * A group of related shortcuts under a heading.
 */
interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutDisplayEntry[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Category display titles.
 */
const CATEGORY_TITLES: Record<ShortcutCategory, string> = {
  general: 'General',
  display: 'Display',
  navigation: 'Navigation',
  input: 'Input',
};

/**
 * Static input shortcuts not in the registry (widget-level behaviors).
 * These are maintained as a constant because they are TextField/InputArea
 * behaviors, not global shortcuts that can be registered.
 */
const INPUT_SHORTCUTS: ShortcutDisplayEntry[] = [
  { key: 'Enter',    description: 'Submit prompt' },
  { key: '@',         description: 'Trigger file autocomplete' },
  { key: '$ ...',     description: 'Shell mode (run command)' },
  { key: '$$ ...',    description: 'Background shell mode' },
];

// ---------------------------------------------------------------------------
// Hardcoded colors (Phase 20 adds theme support)
// ---------------------------------------------------------------------------

const INFO_COLOR = Color.cyan;
const FG_COLOR = Color.white;
const MUTED_COLOR = Color.brightBlack;
const KEYBIND_COLOR = Color.blue;

// ---------------------------------------------------------------------------
// Helper: derive groups from ShortcutRegistry
// ---------------------------------------------------------------------------

/**
 * Build display groups from the ShortcutRegistry.
 * Appends static Input shortcuts to the 'input' category.
 * Only includes non-empty groups.
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

  // Ensure Input section always appears even if no input-category shortcuts
  const hasInput = result.some(g => g.title === 'Input');
  if (!hasInput) {
    result.push({
      title: 'Input',
      shortcuts: INPUT_SHORTCUTS,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// ShortcutHelpOverlay widget
// ---------------------------------------------------------------------------

/**
 * Props for the ShortcutHelpOverlay.
 */
interface ShortcutHelpOverlayProps {
  onDismiss: () => void;
  registry: ShortcutRegistry;
}

/**
 * @deprecated Replaced by ShortcutHelpInline (Phase 32, Plan 32-01).
 * ShortcutHelpOverlay was a standalone modal overlay. AMP embeds shortcut
 * help directly inside InputArea as a topWidget, not as a separate overlay.
 * Retained for backward compatibility; do not use for new features.
 *
 * ShortcutHelpOverlay — StatelessWidget displaying all keyboard shortcuts
 * grouped by category inside a bordered, centered overlay card.
 *
 * The overlay is shown via OverlayManager with `modal: true`, so the
 * OverlayManager handles the semi-transparent background mask. This widget
 * only builds the card content and a FocusScope for key absorption.
 *
 * Layout:
 *   FocusScope (autofocus, absorbs all keys, Escape/? -> dismiss)
 *     Column (center vertically and horizontally)
 *       Container (bordered cyan, padded, maxWidth: 55)
 *         Column (min height, left-aligned)
 *           Title "Keyboard Shortcuts"
 *           [For each group]: heading + shortcut rows + spacer
 *           [Static Input section]
 *           Footer "Press ? or Esc to close"
 */
export class ShortcutHelpOverlay extends StatelessWidget {
  private readonly onDismiss: () => void;
  private readonly registry: ShortcutRegistry;

  constructor(props: ShortcutHelpOverlayProps) {
    super({});
    this.onDismiss = props.onDismiss;
    this.registry = props.registry;
  }

  build(_context: BuildContext): Widget {
    const side = new BorderSide({
      color: INFO_COLOR,
      width: 1,
      style: 'rounded',
    });

    // Derive groups from registry (single source of truth)
    const shortcutGroups = groupsFromRegistry(this.registry);

    // Build content children: title, groups, footer
    const contentChildren: Widget[] = [
      // Title
      new Text({
        text: new TextSpan({
          text: 'Keyboard Shortcuts',
          style: new TextStyle({ foreground: INFO_COLOR, bold: true }),
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
            style: new TextStyle({ foreground: FG_COLOR, bold: true }),
          }),
        }),
      );

      // Shortcut rows: fixed-width key column (14 chars) + description
      for (const shortcut of group.shortcuts) {
        contentChildren.push(
          new Row({
            children: [
              new SizedBox({
                width: 14,
                child: new Text({
                  text: new TextSpan({
                    text: shortcut.key,
                    style: new TextStyle({ foreground: KEYBIND_COLOR }),
                  }),
                }),
              }),
              new Text({
                text: new TextSpan({
                  text: shortcut.description,
                  style: new TextStyle({ foreground: MUTED_COLOR }),
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
              style: new TextStyle({ foreground: MUTED_COLOR, dim: true }),
            }),
            new TextSpan({
              text: '?',
              style: new TextStyle({ foreground: KEYBIND_COLOR }),
            }),
            new TextSpan({
              text: ' or ',
              style: new TextStyle({ foreground: MUTED_COLOR, dim: true }),
            }),
            new TextSpan({
              text: 'Esc',
              style: new TextStyle({ foreground: KEYBIND_COLOR }),
            }),
            new TextSpan({
              text: ' to close',
              style: new TextStyle({ foreground: MUTED_COLOR, dim: true }),
            }),
          ],
        }),
      }),
    );

    // FocusScope absorbs all keys; Escape and ? dismiss the overlay
    return new FocusScope({
      autofocus: true,
      onKey: (event: KeyEvent): KeyEventResult => {
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
    });
  }
}
