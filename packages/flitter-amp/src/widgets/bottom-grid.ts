import { StatefulWidget, State, Widget } from 'flitter-core/src/framework/widget';
import { Text } from 'flitter-core/src/widgets/text';
import { TextStyle } from 'flitter-core/src/core/text-style';
import { TextSpan } from 'flitter-core/src/core/text-span';
import { Color } from 'flitter-core/src/core/color';
import { Padding } from 'flitter-core/src/widgets/padding';
import { EdgeInsets } from 'flitter-core/src/layout/edge-insets';
import { SizedBox } from 'flitter-core/src/widgets/sized-box';
import { Column } from 'flitter-core/src/widgets/flex';
import { TextEditingController } from 'flitter-core/src/widgets/text-field';
import { AmpThemeProvider } from '../themes/index';
import type { UsageInfo } from '../acp/types';
import { InputArea, type BorderOverlayText } from './input-area';
import type { AutocompleteTrigger } from 'flitter-core/src/widgets/autocomplete';

interface BottomGridProps {
  onSubmit: (text: string) => void;
  isProcessing: boolean;
  currentMode: string;
  agentName?: string;
  cwd: string;
  gitBranch?: string;
  tokenUsage?: UsageInfo;
  hintText?: string;
  submitWithMeta?: boolean;
  topWidget?: Widget;
  autocompleteTriggers?: AutocompleteTrigger[];
  imageAttachments?: number;
  skillCount?: number;
  controller?: TextEditingController;
  searchState?: { query: string; isFailing: boolean } | null;
}

export class BottomGrid extends StatefulWidget {
  readonly onSubmit: (text: string) => void;
  readonly isProcessing: boolean;
  readonly currentMode: string;
  readonly agentName: string | undefined;
  readonly cwd: string;
  readonly gitBranch: string | undefined;
  readonly tokenUsage: UsageInfo | undefined;
  readonly hintText: string | undefined;
  readonly submitWithMeta: boolean;
  readonly topWidget: Widget | undefined;
  readonly autocompleteTriggers: AutocompleteTrigger[] | undefined;
  readonly imageAttachments: number;
  readonly skillCount: number;
  readonly controller: TextEditingController | undefined;
  readonly searchState: { query: string; isFailing: boolean } | null;

  constructor(props: BottomGridProps) {
    super({});
    this.onSubmit = props.onSubmit;
    this.isProcessing = props.isProcessing;
    this.currentMode = props.currentMode;
    this.agentName = props.agentName;
    this.cwd = props.cwd;
    this.gitBranch = props.gitBranch;
    this.tokenUsage = props.tokenUsage;
    this.hintText = props.hintText;
    this.submitWithMeta = props.submitWithMeta ?? true;
    this.topWidget = props.topWidget;
    this.autocompleteTriggers = props.autocompleteTriggers;
    this.imageAttachments = props.imageAttachments ?? 0;
    this.skillCount = props.skillCount ?? 0;
    this.controller = props.controller;
    this.searchState = props.searchState ?? null;
  }

  createState(): BottomGridState {
    return new BottomGridState();
  }
}

class BottomGridState extends State<BottomGrid> {
  build(): Widget {
    const w = this.widget;
    const theme = AmpThemeProvider.maybeOf(this.context);

    const mutedColor = theme?.base.mutedForeground ?? Color.brightBlack;
    const fgColor = theme?.base.foreground ?? Color.defaultColor;
    const keybindColor = theme?.app.keybind ?? Color.blue;

    const overlayTexts: BorderOverlayText[] = [];

    const cwdWidget = this.buildBottomRight(w, mutedColor);
    if (cwdWidget) {
      overlayTexts.push({
        position: 'bottom-right',
        child: cwdWidget,
      });
    }

    const topLeft = this.buildTopLeft(w, mutedColor, fgColor);

    const inputArea = new InputArea({
      onSubmit: w.onSubmit,
      isProcessing: w.isProcessing,
      mode: w.currentMode,
      submitWithMeta: w.submitWithMeta,
      topWidget: w.topWidget,
      autocompleteTriggers: w.autocompleteTriggers,
      imageAttachments: w.imageAttachments,
      skillCount: w.skillCount,
      overlayTexts,
      controller: w.controller,
    });

    const children: Widget[] = [];

    if (w.isProcessing) {
      children.push(
        new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 1 }),
          child: topLeft,
        }),
      );
    }

    children.push(inputArea);

    children.push(
      new Padding({
        padding: EdgeInsets.only({ left: 1 }),
        child: this.buildBottomLeft(w, mutedColor, keybindColor),
      }),
    );

    return new Column({
      mainAxisSize: 'min',
      crossAxisAlignment: 'stretch',
      children,
    });
  }

  private buildTopLeft(w: BottomGrid, mutedColor: Color, _fgColor: Color): Widget {
    if (w.isProcessing) {
      if (w.tokenUsage) {
        const used = this.formatTokenCount(w.tokenUsage.used);
        const size = this.formatTokenCount(w.tokenUsage.size);
        let display = `${used} / ${size}`;
        if (w.tokenUsage.cost) {
          display += ` · ${w.tokenUsage.cost.currency}${w.tokenUsage.cost.amount.toFixed(4)}`;
        }
        return new Text({
          text: new TextSpan({
            text: display,
            style: new TextStyle({ foreground: mutedColor, dim: true }),
          }),
        });
      }
      return new Text({
        text: new TextSpan({
          text: 'Streaming...',
          style: new TextStyle({ foreground: mutedColor, dim: true }),
        }),
      });
    }
    return SizedBox.shrink();
  }

  private buildBottomLeft(w: BottomGrid, mutedColor: Color, keybindColor: Color): Widget {
    // Gap 64: Search mode indicator takes priority
    if (w.searchState) {
      const prefix = w.searchState.isFailing
        ? '(failing reverse-i-search)'
        : '(reverse-i-search)';
      const errorColor = Color.red;
      const infoColor = Color.cyan;

      return new Text({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: prefix,
              style: new TextStyle({
                foreground: w.searchState.isFailing ? errorColor : infoColor,
              }),
            }),
            new TextSpan({
              text: `'${w.searchState.query}'`,
              style: new TextStyle({
                foreground: keybindColor,
                bold: true,
              }),
            }),
            new TextSpan({
              text: ': ',
              style: new TextStyle({ foreground: mutedColor }),
            }),
          ],
        }),
      });
    }

    if (w.hintText) {
      return new Text({
        text: new TextSpan({
          text: w.hintText,
          style: new TextStyle({ foreground: mutedColor, dim: true }),
        }),
      });
    }

    if (w.isProcessing) {
      return new Text({
        text: new TextSpan({
          children: [
            new TextSpan({
              text: 'Esc',
              style: new TextStyle({ foreground: keybindColor }),
            }),
            new TextSpan({
              text: ' to cancel',
              style: new TextStyle({ foreground: mutedColor, dim: true }),
            }),
          ],
        }),
      });
    }

    return new Text({
      text: new TextSpan({
        children: [
          new TextSpan({
            text: '?',
            style: new TextStyle({ foreground: keybindColor }),
          }),
          new TextSpan({
            text: ' for shortcuts',
            style: new TextStyle({ foreground: mutedColor, dim: true }),
          }),
        ],
      }),
    });
  }

  private buildBottomRight(w: BottomGrid, mutedColor: Color): Widget | null {
    const shortCwd = this.shortenPath(w.cwd);
    if (!shortCwd) return null;

    let cwdBranch = shortCwd;
    if (w.gitBranch) {
      cwdBranch += ` (${w.gitBranch})`;
    }
    if (w.agentName) {
      cwdBranch += ` · ${w.agentName}`;
    }

    return new Text({
      text: new TextSpan({
        text: `─${cwdBranch}─`,
        style: new TextStyle({ foreground: mutedColor, dim: true }),
      }),
    });
  }

  private shortenPath(fullPath: string): string {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    if (home && fullPath.startsWith(home)) {
      return '~' + fullPath.slice(home.length);
    }
    return fullPath;
  }

  private formatTokenCount(count: number): string {
    if (count >= 1_000_000) {
      return `${(count / 1_000_000).toFixed(1)}M`;
    }
    if (count >= 1_000) {
      return `${(count / 1_000).toFixed(1)}k`;
    }
    return `${count}`;
  }
}
