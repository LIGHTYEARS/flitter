// Permission dialog — modal overlay for ACP agent permission requests
// Amp ref: permission dialog with SelectionList for allow/skip/always-allow

import { StatelessWidget, Widget } from 'flitter-core/src/framework/widget';
import { Column } from 'flitter-core/src/widgets/flex';
import { Container } from 'flitter-core/src/widgets/container';
import { Text } from 'flitter-core/src/widgets/text';
import { TextSpan } from 'flitter-core/src/core/text-span';
import { TextStyle } from 'flitter-core/src/core/text-style';
import { Color } from 'flitter-core/src/core/color';
import { SelectionList } from 'flitter-core/src/widgets/selection-list';
import type { SelectionItem } from 'flitter-core/src/widgets/selection-list';
import { FocusScope } from 'flitter-core/src/widgets/focus-scope';
import { BoxDecoration, Border, BorderSide } from 'flitter-core/src/layout/render-decorated';
import { EdgeInsets } from 'flitter-core/src/layout/edge-insets';
import { SizedBox } from 'flitter-core/src/widgets/sized-box';
import { BoxConstraints } from 'flitter-core/src/core/box-constraints';
import type { PermissionRequest } from '../acp/client';

interface PermissionDialogProps {
  request: PermissionRequest;
  onSelect: (optionId: string) => void;
  onCancel: () => void;
}

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

  build(): Widget {
    const { toolCall, options } = this.request;

    // Map ACP PermissionOption[] to SelectionItem[]
    const items: SelectionItem[] = options.map((opt) => ({
      label: opt.name,
      value: opt.optionId,
      description: opt.kind.replace(/_/g, ' '),
    }));

    const side = new BorderSide({
      color: Color.brightYellow,
      width: 1,
      style: 'rounded' as any,
    });

    return new FocusScope({
      autofocus: true,
      child: new Column({
        mainAxisAlignment: 'center',
        crossAxisAlignment: 'center',
        children: [
          new Container({
            decoration: new BoxDecoration({ border: Border.all(side) }),
            padding: EdgeInsets.symmetric({ horizontal: 2, vertical: 1 }),
            constraints: new BoxConstraints({ maxWidth: 60 }),
            child: new Column({
              mainAxisSize: 'min',
              crossAxisAlignment: 'start',
              children: [
                // Title
                new Text({
                  text: new TextSpan({
                    text: 'Permission Required',
                    style: new TextStyle({
                      foreground: Color.brightYellow,
                      bold: true,
                    }),
                  }),
                }),
                // Tool call info
                new Text({
                  text: new TextSpan({
                    text: `${toolCall.title} (${toolCall.kind})`,
                    style: new TextStyle({
                      foreground: Color.white,
                    }),
                  }),
                }),
                new SizedBox({ height: 1 }),
                // Selection list with options
                new SelectionList({
                  items,
                  onSelect: this.onSelect,
                  onCancel: this.onCancel,
                  showDescription: true,
                }),
              ],
            }),
          }),
        ],
      }),
    });
  }
}
