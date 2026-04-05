// PermissionDialog — modal overlay for tool permission requests in flitter-cli
//
// Ported from flitter-amp/src/widgets/permission-dialog.ts.
// Replaces ACP SDK types with native PermissionRequest from permission-types.ts.
// Uses hardcoded Color values instead of AmpThemeProvider (Phase 20 adds theme support).
//
// Widget structure:
//   DialogOverlay (borderColor: brightYellow, style: warning)
//     Dialog (title: 'Permission Required', type: 'warning')
//       subtitle: "{toolCall.title} ({toolCall.kind})"
//       body: SelectionList
//         items: request.options mapped to SelectionItem[]
//         onSelect: props.onSelect
//         onCancel: props.onCancel
//         showDescription: true

import { StatelessWidget, Widget, type BuildContext } from '../../../flitter-core/src/framework/widget';
import { Dialog } from '../../../flitter-core/src/widgets/dialog';
import { DialogOverlay } from '../../../flitter-core/src/widgets/dialog-overlay';
import { SelectionList } from '../../../flitter-core/src/widgets/selection-list';
import type { SelectionItem } from '../../../flitter-core/src/widgets/selection-list';
import { Color } from '../../../flitter-core/src/core/color';
import { TextStyle } from '../../../flitter-core/src/core/text-style';
import type { PermissionRequest } from '../state/permission-types';

/**
 * Props for the PermissionDialog widget.
 */
interface PermissionDialogProps {
  /** The permission request to display. */
  request: PermissionRequest;
  /** Callback when the user selects an option (receives the optionId). */
  onSelect: (optionId: string) => void;
  /** Callback when the user cancels (Escape or explicit cancel). */
  onCancel: () => void;
}

/**
 * A modal dialog widget for tool permission requests.
 *
 * Displays a warning-styled DialogOverlay with the tool call title/kind
 * and a SelectionList of available permission options (allow, always-allow,
 * deny, etc.). Keyboard navigation and Escape dismissal are handled by
 * the embedded SelectionList and FocusScope.
 *
 * Colors are hardcoded (brightYellow for warning, white for subtitle).
 * Phase 20 will wire the theme system for dynamic styling.
 */
export class PermissionDialog extends StatelessWidget {
  private readonly request: PermissionRequest;
  private readonly onSelect: (optionId: string) => void;
  private readonly onCancel: () => void;

  constructor(props: PermissionDialogProps) {
    super({});
    this.request = props.request;
    this.onSelect = props.onSelect;
    this.onCancel = props.onCancel;
  }

  build(_context: BuildContext): Widget {
    const { toolCall, options } = this.request;

    // Map permission options to SelectionList items
    const items: SelectionItem[] = options.map((opt) => ({
      label: opt.name,
      value: opt.optionId,
      description: opt.kind.replace(/_/g, ' '),
    }));

    // Warning color — hardcoded until Phase 20 theme integration
    const warningColor = Color.brightYellow;

    const dialog = new Dialog({
      title: 'Permission Required',
      type: 'warning',
      subtitle: `${toolCall.title} (${toolCall.kind})`,
      body: new SelectionList({
        items,
        onSelect: this.onSelect,
        onCancel: this.onCancel,
        showDescription: true,
      }),
      border: true,
    });

    return new DialogOverlay({
      dialog,
      style: {
        borderColor: warningColor,
        titleStyle: new TextStyle({ foreground: warningColor, bold: true }),
        subtitleStyle: new TextStyle({ foreground: Color.white }),
      },
    });
  }
}
