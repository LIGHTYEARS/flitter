// Permission dialog — modal overlay for ACP agent permission requests
// Refactored to use Dialog data class + DialogOverlay (Gap 26)
// Amp ref: permission dialog with SelectionList for allow/skip/always-allow

import { StatelessWidget, Widget, type BuildContext } from 'flitter-core/src/framework/widget';
import { Dialog } from 'flitter-core/src/widgets/dialog';
import { DialogOverlay } from 'flitter-core/src/widgets/dialog-overlay';
import { SelectionList } from 'flitter-core/src/widgets/selection-list';
import type { SelectionItem } from 'flitter-core/src/widgets/selection-list';
import { Color } from 'flitter-core/src/core/color';
import { TextStyle } from 'flitter-core/src/core/text-style';
import type { RequestPermissionRequest } from '@agentclientprotocol/sdk';
import { AmpThemeProvider } from '../themes';

interface PermissionDialogProps {
  request: RequestPermissionRequest;
  onSelect: (optionId: string) => void;
  onCancel: () => void;
}

export class PermissionDialog extends StatelessWidget {
  private readonly request: RequestPermissionRequest;
  private readonly onSelect: (optionId: string) => void;
  private readonly onCancel: () => void;

  constructor(props: PermissionDialogProps) {
    super({});
    this.request = props.request;
    this.onSelect = props.onSelect;
    this.onCancel = props.onCancel;
  }

  build(context: BuildContext): Widget {
    const { toolCall, options } = this.request;
    const theme = AmpThemeProvider.maybeOf(context);

    const items: SelectionItem[] = options.map((opt) => ({
      label: opt.name,
      value: opt.optionId,
      description: opt.kind.replace(/_/g, ' '),
    }));

    const warningColor = theme?.base.warning ?? Color.brightYellow;

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
        subtitleStyle: new TextStyle({
          foreground: theme?.base.foreground ?? Color.white,
        }),
      },
    });
  }
}
