import { StatefulWidget, State, Widget, type BuildContext } from 'flitter-core/src/framework/widget';
import { EdgeInsets } from 'flitter-core/src/layout/edge-insets';
import { Column } from 'flitter-core/src/widgets/flex';
import { Text } from 'flitter-core/src/widgets/text';
import { TextStyle } from 'flitter-core/src/core/text-style';
import { TextSpan } from 'flitter-core/src/core/text-span';
import { Color } from 'flitter-core/src/core/color';
import { TextField, TextEditingController } from 'flitter-core/src/widgets/text-field';
import { Container } from 'flitter-core/src/widgets/container';
import { Border, BorderSide, BoxDecoration } from 'flitter-core/src/layout/render-decorated';
import { Stack, Positioned } from 'flitter-core/src/widgets/stack';
import { Autocomplete } from 'flitter-core/src/widgets/autocomplete';
import type { AutocompleteTrigger, AutocompleteOption } from 'flitter-core/src/widgets/autocomplete';
import { MouseRegion } from 'flitter-core/src/widgets/mouse-region';
import { SizedBox } from 'flitter-core/src/widgets/sized-box';
import { AmpThemeProvider, agentModeColor } from '../themes/index';
import { icon } from '../ui/icons/icon-registry';

export interface BorderOverlayText {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  child: Widget;
}

interface InputAreaProps {
  onSubmit: (text: string) => void;
  isProcessing: boolean;
  mode: string | null;
  submitWithMeta?: boolean;
  topWidget?: Widget;
  autocompleteTriggers?: AutocompleteTrigger[];
  imageAttachments?: number;
  skillCount?: number;
  overlayTexts?: BorderOverlayText[];
  controller?: TextEditingController;
  /** Callback fired when the @ file trigger is activated. Receives the query text after @. */
  onFileTrigger?: (query: string) => void;
  /** Callback fired when the @@ special command trigger is activated. */
  onSpecialCommandTrigger?: (query: string) => void;
  /** Callback fired when the @: commit mode trigger is activated. */
  onCommitTrigger?: (query: string) => void;
  /** Maximum number of lines before the input area stops expanding. Default 10. */
  maxExpandLines?: number;
  /** Minimum number of auto-visible content lines before user input expands further. */
  minAutoContentLines?: number;
}

type ShellMode = 'shell' | 'background' | null;

/**
 * Multi-line input area widget with auto-expanding height and drag-resize.
 *
 * Auto-expand: height grows with content line count up to maxExpandLines.
 * Drag-resize: user can drag the top border to manually set height,
 * clamped between MIN_HEIGHT (3) and half-screen.
 */
export class InputArea extends StatefulWidget {
  readonly onSubmit: (text: string) => void;
  readonly isProcessing: boolean;
  readonly mode: string | null;
  readonly submitWithMeta: boolean;
  readonly topWidget?: Widget;
  readonly autocompleteTriggers?: AutocompleteTrigger[];
  readonly imageAttachments: number;
  readonly skillCount: number;
  readonly overlayTexts: BorderOverlayText[];
  readonly externalController?: TextEditingController;
  readonly onFileTrigger?: (query: string) => void;
  readonly onSpecialCommandTrigger?: (query: string) => void;
  readonly onCommitTrigger?: (query: string) => void;
  readonly maxExpandLines: number;
  readonly minAutoContentLines: number;

  constructor(props: InputAreaProps) {
    super({});
    this.onSubmit = props.onSubmit;
    this.isProcessing = props.isProcessing;
    this.mode = props.mode;
    this.submitWithMeta = props.submitWithMeta ?? false;
    this.topWidget = props.topWidget;
    this.autocompleteTriggers = props.autocompleteTriggers;
    this.imageAttachments = props.imageAttachments ?? 0;
    this.skillCount = props.skillCount ?? 0;
    this.overlayTexts = props.overlayTexts ?? [];
    this.externalController = props.controller;
    this.onFileTrigger = props.onFileTrigger;
    this.onSpecialCommandTrigger = props.onSpecialCommandTrigger;
    this.onCommitTrigger = props.onCommitTrigger;
    this.maxExpandLines = props.maxExpandLines ?? 10;
    this.minAutoContentLines = props.minAutoContentLines ?? 1;
  }

  createState(): InputAreaState {
    return new InputAreaState();
  }
}

/** Minimum container height: 1 content line + 2 border rows. */
const MIN_HEIGHT = 3;

class InputAreaState extends State<InputArea> {
  private controller!: TextEditingController;
  private ownsController = false;
  private currentText = '';
  /** User-overridden height via drag; null means auto-expand is active. */
  private dragHeight: number | null = null;
  private dragStartY: number | null = null;
  private dragStartHeight: number | null = null;

  override initState(): void {
    super.initState();
    if (this.widget.externalController) {
      this.controller = this.widget.externalController;
      this.ownsController = false;
    } else {
      this.controller = new TextEditingController();
      this.ownsController = true;
    }
    this.controller.addListener(this._onTextChanged);
  }

  override didUpdateWidget(oldWidget: InputArea): void {
    const oldCtrl = oldWidget.externalController;
    const newCtrl = this.widget.externalController;

    if (oldCtrl !== newCtrl) {
      this.controller.removeListener(this._onTextChanged);

      if (this.ownsController) {
        this.controller.dispose();
      }

      if (newCtrl) {
        this.controller = newCtrl;
        this.ownsController = false;
      } else {
        this.controller = new TextEditingController();
        this.ownsController = true;
      }

      this.controller.addListener(this._onTextChanged);
    }
  }

  override dispose(): void {
    this.controller.removeListener(this._onTextChanged);
    if (this.ownsController) {
      this.controller.dispose();
    }
    super.dispose();
  }

  /**
   * Compute the number of content lines (at least 1).
   */
  private _lineCount(): number {
    const text = this.controller.text;
    if (text.length === 0) return 1;
    return text.split('\n').length;
  }

  /**
   * Compute the container height: 2 (border rows) + visible content lines.
   * When dragHeight is set the user's manual resize wins; otherwise
   * auto-expand kicks in, clamped to [MIN_HEIGHT, maxExpandLines + 2].
   */
  private _computeHeight(): number {
    if (this.dragHeight !== null) {
      return this.dragHeight;
    }
    const contentLines = Math.max(this._lineCount(), this.widget.minAutoContentLines);
    const visibleLines = Math.min(contentLines, this.widget.maxExpandLines);
    return visibleLines + 2;
  }

  private _onTextChanged = (): void => {
    const newText = this.controller.text;
    if (newText !== this.currentText) {
      const oldShell = detectShellMode(this.currentText);
      const newShell = detectShellMode(newText);
      const oldLineCount = this.currentText.split('\n').length;
      const newLineCount = newText.split('\n').length;
      this.currentText = newText;
      if (oldShell !== newShell || oldLineCount !== newLineCount) {
        this.setState(() => { });
      }
    }
  };

  private _handleSubmit = (text: string): void => {
    if (text.trim().length > 0 && !this.widget.isProcessing) {
      this.widget.onSubmit(text.trim());
      this.controller.clear();
      this.dragHeight = null;
    }
  };

  /**
   * Handle mouse events on the top border for drag-resize.
   * action: 'press' | 'drag' | 'release'
   */
  handleMouseEvent(action: string, _x: number, y: number): void {
    switch (action) {
      case 'press': {
        this.dragStartY = y;
        this.dragStartHeight = this._computeHeight();
        break;
      }
      case 'drag':
      case 'move': {
        if (this.dragStartY !== null && this.dragStartHeight !== null) {
          const delta = this.dragStartY - y;
          const maxHeight = Math.max(MIN_HEIGHT, Math.floor(50 / 2));
          const newHeight = Math.max(MIN_HEIGHT, Math.min(this.dragStartHeight + delta, maxHeight));
          if (newHeight !== this.dragHeight) {
            this.dragHeight = newHeight;
            this.setState(() => { });
          }
        }
        break;
      }
      case 'release': {
        this.dragStartY = null;
        this.dragStartHeight = null;
        break;
      }
    }
  }

  private _getSpecialCommandCompletions(_query: string): AutocompleteOption[] {
    return [];
  }

  private _getCommitCompletions(_query: string): AutocompleteOption[] {
    return [];
  }

  build(context: BuildContext): Widget {
    const isProcessing = this.widget.isProcessing;
    const theme = AmpThemeProvider.maybeOf(context);

    const shellMode = detectShellMode(this.controller.text);

    const borderColor = shellMode
      ? (theme?.app.shellMode ?? Color.cyan)
      : (theme?.base.border ?? Color.brightBlack);

    const border = Border.all(
      new BorderSide({ color: borderColor, width: 1, style: 'rounded' }),
    );

    const textField = new TextField({
      controller: this.controller,
      autofocus: true,
      style: new TextStyle({ foreground: theme?.base.foreground }),
      cursorChar: '\u2588',
      submitOnEnter: true,
      onSubmit: this._handleSubmit,
    });

    const onFileTrigger = this.widget.onFileTrigger;
    const onSpecialCommandTrigger = this.widget.onSpecialCommandTrigger;
    const onCommitTrigger = this.widget.onCommitTrigger;

    const specialCommandTrigger: AutocompleteTrigger = {
      triggerCharacter: '@@',
      optionsBuilder: (query: string) => {
        if (onSpecialCommandTrigger) {
          onSpecialCommandTrigger(query);
        }
        return this._getSpecialCommandCompletions(query);
      },
    };

    const commitTrigger: AutocompleteTrigger = {
      triggerCharacter: '@:',
      optionsBuilder: (query: string) => {
        if (onCommitTrigger) {
          onCommitTrigger(query);
        }
        return this._getCommitCompletions(query);
      },
    };

    const defaultFileTrigger: AutocompleteTrigger = {
      triggerCharacter: '@',
      optionsBuilder: (query: string) => {
        if (onFileTrigger) {
          onFileTrigger(query);
        }
        return [];
      },
    };

    const triggers: AutocompleteTrigger[] = [
      specialCommandTrigger,
      commitTrigger,
      defaultFileTrigger,
      ...(this.widget.autocompleteTriggers ?? []),
    ];

    const autocompleteWrapped = new Autocomplete({
      child: textField,
      controller: this.controller,
      triggers,
    });

    const borderedInput = new Container({
      decoration: new BoxDecoration({ border }),
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      height: this._computeHeight(),
      child: autocompleteWrapped,
    });

    const mode = this.widget.mode;
    const shellLabel = shellMode === 'background' ? 'Background shell' : shellMode === 'shell' ? 'Shell mode' : null;
    const effectiveLabel = shellLabel ?? mode;

    const overlays: Widget[] = [];

    if (effectiveLabel) {
      const labelColor = shellLabel
        ? (theme?.app.shellMode ?? Color.cyan)
        : theme
          ? agentModeColor(effectiveLabel, theme)
          : Color.green;

      const labelText = isProcessing && !shellLabel
        ? ` ${icon('status.processing')} ${effectiveLabel} `
        : ` ${effectiveLabel} `;
      const labelSpan = new TextSpan({
        text: labelText,
        style: new TextStyle({
          foreground: labelColor,
          dim: isProcessing && !shellLabel,
        }),
      });

      const skillCount = this.widget.skillCount;
      const badgeChildren: TextSpan[] = [labelSpan];

      if (skillCount > 0) {
        const mutedColor = theme?.base.mutedForeground ?? Color.brightBlack;
        const warningColor = theme?.base.warning ?? Color.yellow;
        badgeChildren.push(
          new TextSpan({ text: '──', style: new TextStyle({ foreground: mutedColor }) }),
          new TextSpan({ text: icon('status.warning'), style: new TextStyle({ foreground: warningColor }) }),
          new TextSpan({ text: '─', style: new TextStyle({ foreground: mutedColor }) }),
          new TextSpan({ text: `${skillCount}`, style: new TextStyle({ foreground: mutedColor }) }),
          new TextSpan({ text: '─', style: new TextStyle({ foreground: mutedColor }) }),
          new TextSpan({ text: 'skills', style: new TextStyle({ foreground: mutedColor }) }),
        );
      }

      overlays.push(
        new Positioned({
          top: 0,
          right: 1,
          child: new Text({
            text: new TextSpan({ children: badgeChildren }),
          }),
        }),
      );
    }

    if (this.widget.imageAttachments > 0) {
      const badgeColor = theme?.base.info ?? Color.blue;
      overlays.push(
        new Positioned({
          bottom: 0,
          left: 1,
          child: new Text({
            text: new TextSpan({
              text: ` [${this.widget.imageAttachments} image${this.widget.imageAttachments > 1 ? 's' : ''}] `,
              style: new TextStyle({ foreground: badgeColor }),
            }),
          }),
        }),
      );
    }

    for (const overlay of this.widget.overlayTexts) {
      const pos: Record<string, number> = {};
      if (overlay.position.startsWith('top')) pos.top = 0;
      if (overlay.position.startsWith('bottom')) pos.bottom = 0;
      if (overlay.position.endsWith('left')) pos.left = 1;
      if (overlay.position.endsWith('right')) pos.right = 1;

      overlays.push(
        new Positioned({
          ...pos,
          child: overlay.child,
        }),
      );
    }

    overlays.push(
      new Positioned({
        top: 0,
        left: 0,
        right: 0,
        child: new MouseRegion({
          cursor: 'ns-resize',
          onClick: (e) => this.handleMouseEvent('press', e.x, e.y),
          onDrag: (e) => this.handleMouseEvent('drag', e.x, e.y),
          onRelease: (e) => this.handleMouseEvent('release', e.x, e.y),
          child: new SizedBox({ height: 1 }),
        }),
      }),
    );

    const inputWidget: Widget = new Stack({
      fit: 'passthrough',
      children: [borderedInput, ...overlays],
    });

    if (this.widget.topWidget) {
      return new Column({
        mainAxisSize: 'min',
        crossAxisAlignment: 'stretch',
        children: [this.widget.topWidget, inputWidget],
      });
    }

    return inputWidget;
  }
}

function detectShellMode(text: string): ShellMode {
  if (text.startsWith('$$')) return 'background';
  if (text.startsWith('$')) return 'shell';
  return null;
}
