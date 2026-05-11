/**
 * TextField Widget — 完整实现。
 *
 * 4-layer stack:
 *   TextField (StatefulWidget)
 *   └── TextFieldState (focus + key dispatch + mouse)
 *         └── TextFieldRenderWidget (RenderObjectWidget)
 *               └── RenderTextField (RenderBox)
 *
 * 逆向: sP (TextFieldState) + Gm (TextField) in actions_intents.js:697-900
 *
 * @module text-field
 */

import type { KeyEventResult } from "../focus/focus-node.js";
import { FocusNode } from "../focus/focus-node.js";
import type { Color } from "../screen/color.js";
import type { TextStyle } from "../screen/text-style.js";
import { State, StatefulWidget } from "../tree/stateful-widget.js";
import type { BuildContext } from "../tree/stateless-widget.js";
import type { Widget } from "../tree/widget.js";
import type { KeyEvent } from "../vt/types.js";
import { Focus } from "../widgets/focus.js";
import type { MouseEvent } from "../widgets/mouse-region.js";
import { MouseRegion } from "../widgets/mouse-region.js";
import { type RenderTextField, TextFieldRenderWidget } from "./render-text-field.js";
import type { PromptRule } from "./text-editing-controller.js";
import { TextEditingController } from "./text-editing-controller.js";

// ════════════════════════════════════════════════════
//  Props
// ════════════════════════════════════════════════════

export interface SubmitKeyConfig {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  meta?: boolean;
  shift?: boolean;
}

export interface TextFieldProps {
  controller?: TextEditingController;
  placeholder?: string;
  readOnly?: boolean;
  enabled?: boolean;
  autofocus?: boolean;
  minLines?: number;
  maxLines?: number | null;
  textStyle?: TextStyle;
  cursorColor?: Color;
  selectionColor?: Color;
  backgroundColor?: Color;
  onSubmitted?: (text: string) => void;
  submitKey?: SubmitKeyConfig;
  focusNode?: FocusNode;
  onBackspaceWhenEmpty?: () => void;
  // ── New props (GAP-TUI-26) — 还原自逆向代码 Gm constructor (chunk-006.js:4295-4337) ──
  /** Word-wrap mode. When true, text wraps at word boundaries. Default false. */
  wrap?: boolean;
  /** When true, field expands unbounded (no maxLines cap). Default false. */
  expands?: boolean;
  /** Maximum width constraint for the field. */
  maxWidth?: number;
  /** Prompt rules applied to the controller. Amp: Gm.prompts → controller.setPromptRules() */
  prompts?: PromptRule[];
  /** Fire on every text change. */
  onChanged?: (text: string) => void;
  /** When true, auto-copy selection to clipboard after drag. Default false. */
  copyOnSelectionEnabled?: boolean;
  /** Callback after auto-copy completes. */
  onCopy?: (text: string, success: boolean) => void;
  /** Called to open current text in external editor. */
  onOpenInEditor?: () => void;
  /** When true with expands + multiline, scrolls to make cursor visible. Default false. */
  ensureVisible?: boolean;
}

// ════════════════════════════════════════════════════
//  TextField widget
// ════════════════════════════════════════════════════

/**
 * 多行文本输入 Widget (完整实现).
 *
 * 逆向: Gm in actions_intents.js:697-730
 */
export class TextField extends StatefulWidget {
  readonly props: TextFieldProps;

  constructor(props: TextFieldProps = {}) {
    super();
    this.props = props;
  }

  createState(): State<TextField> {
    return new TextFieldState();
  }
}

// ════════════════════════════════════════════════════
//  TextFieldState
// ════════════════════════════════════════════════════

/**
 * TextField 的状态管理.
 *
 * 逆向: sP in actions_intents.js:731-900
 */
class TextFieldState extends State<TextField> {
  private _controller!: TextEditingController;
  private _ownsController: boolean = false;
  private _focusNode!: FocusNode;
  private _ownsFocusNode: boolean = false;
  private _listener!: () => void;
  /** Focus change listener — triggers rebuild so `focused` prop updates.
   * 逆向: sP._focusChangeListener (actions_intents.js:819-821) */
  private _focusChangeListener!: (node: FocusNode) => void;
  /** Ref to the underlying RenderTextField for hit-testing */
  private _renderFieldRef: RenderTextField | null = null;
  // ── New state for GAP-TUI-26 ──
  /** Auto-copy timer handle (500ms delay after drag selection) */
  private _autoCopyTimer: ReturnType<typeof setTimeout> | undefined = undefined;
  /** Copy-highlight timer handle */
  private _copyHighlightTimer: ReturnType<typeof setTimeout> | undefined = undefined;
  /** 复制高亮是否激活 */
  private _copyHighlightActive: boolean = false;

  static readonly AUTO_COPY_DELAY_MS = 500;
  static readonly AUTO_COPY_HIGHLIGHT_DURATION_MS = 300;

  // ─── Lifecycle ────────────────────────────────────

  override initState(): void {
    super.initState();
    this._listener = () => {
      if (this.mounted) this.setState();
    };

    if (this.widget.props.controller) {
      this._controller = this.widget.props.controller;
      this._ownsController = false;
    } else {
      this._controller = new TextEditingController();
      this._ownsController = true;
    }
    this._controller.addListener(this._listener);

    // Wire onChanged: called on every text change
    // 逆向: sP.initState — _textChangeListener calls widget.onChanged (chunk-006.js:4390)
    if (this.widget.props.onChanged) {
      const onChangedListener = () => {
        if (this.mounted) this.widget.props.onChanged?.(this._controller.text);
      };
      this._controller.addListener(onChangedListener);
    }

    // Apply prompt rules if provided
    // 逆向: sP.initState — if (this.widget.prompts.length > 0) controller.setPromptRules (chunk-006.js:4372)
    const prompts = this.widget.props.prompts;
    if (prompts && prompts.length > 0) {
      this._controller.setPromptRules(prompts);
    }

    if (this.widget.props.focusNode) {
      this._focusNode = this.widget.props.focusNode;
      this._ownsFocusNode = false;
    } else {
      this._focusNode = new FocusNode({ debugLabel: "TextField" });
      this._ownsFocusNode = true;
    }

    // 逆向: sP.initState — _focusChangeListener = T => { ... this.setState(() => {}) }
    // (actions_intents.js:819-821)
    // Focus change triggers rebuild so `focused` prop on RenderTextField updates,
    // which controls cursor visibility. Without this, autofocus on FuzzyPicker's
    // TextField wouldn't show the cursor until the next text-change rebuild.
    this._focusChangeListener = (_node: FocusNode) => {
      if (this.mounted) this.setState();
    };
    this._focusNode.addListener(this._focusChangeListener);
  }

  override didUpdateWidget(oldWidget: TextField): void {
    super.didUpdateWidget(oldWidget);
    if (this.widget.props.controller !== oldWidget.props.controller) {
      this._controller.removeListener(this._listener);
      if (this._ownsController) this._controller.dispose();
      if (this.widget.props.controller) {
        this._controller = this.widget.props.controller;
        this._ownsController = false;
      } else {
        this._controller = new TextEditingController();
        this._ownsController = true;
      }
      this._controller.addListener(this._listener);
    }
    if (this.widget.props.focusNode !== oldWidget.props.focusNode) {
      this._focusNode.removeListener(this._focusChangeListener);
      if (this._ownsFocusNode) this._focusNode.dispose?.();
      if (this.widget.props.focusNode) {
        this._focusNode = this.widget.props.focusNode;
        this._ownsFocusNode = false;
      } else {
        this._focusNode = new FocusNode({ debugLabel: "TextField" });
        this._ownsFocusNode = true;
      }
      this._focusNode.addListener(this._focusChangeListener);
    }
    // Update prompt rules when they change
    // 逆向: sP.didUpdateWidget — if (this.widget.prompts !== T.prompts) ... (chunk-006.js:4399)
    if (this.widget.props.prompts !== oldWidget.props.prompts) {
      this._controller.setPromptRules(this.widget.props.prompts ?? []);
    }
  }

  override dispose(): void {
    this._clearAutoCopyTimer();
    this._clearCopyHighlightTimer();
    this._controller.removeListener(this._listener);
    this._focusNode.removeListener(this._focusChangeListener);
    if (this._ownsController) this._controller.dispose();
    if (this._ownsFocusNode) this._focusNode.dispose?.();
    super.dispose();
  }

  // ─── Auto-copy helpers (逆向: sP._scheduleAutoCopy, chunk-006.js:4450-4468) ──

  private _scheduleAutoCopy(): void {
    this._clearAutoCopyTimer();
    this._autoCopyTimer = setTimeout(() => {
      void this._autoCopySelection();
      this._autoCopyTimer = undefined;
    }, TextFieldState.AUTO_COPY_DELAY_MS);
  }

  private async _autoCopySelection(): Promise<void> {
    if (!this.widget.props.copyOnSelectionEnabled) return;
    const selectedText = this._controller.selectedText;
    if (!selectedText || selectedText.length === 0) return;
    // Attempt clipboard write — no native clipboard in terminal, so always report false
    // unless the consumer injects their own clipboard. Call onCopy with result.
    // 逆向: sP._autoCopySelection (chunk-006.js:4437-4448) — calls clipboard.writeText
    const success = false;
    this.widget.props.onCopy?.(selectedText, success);
  }

  private _clearAutoCopyTimer(): void {
    if (this._autoCopyTimer !== undefined) {
      clearTimeout(this._autoCopyTimer);
      this._autoCopyTimer = undefined;
    }
  }

  private _clearCopyHighlightTimer(): void {
    if (this._copyHighlightTimer !== undefined) {
      clearTimeout(this._copyHighlightTimer);
      this._copyHighlightTimer = undefined;
    }
    this._copyHighlightActive = false;
  }

  // ─── Key dispatch (逆向: sP r function) ──────────

  private _handleKey = (event: KeyEvent): KeyEventResult => {
    const props = this.widget.props;
    const ctrl = this._controller;
    const readOnly = props.readOnly ?? false;
    const isMultiline = (props.maxLines ?? null) !== 1;
    const submitKey: SubmitKeyConfig = props.submitKey ?? { key: "Enter" };

    const { key, modifiers } = event;
    const { ctrl: isCtrl, alt: isAlt, shift: isShift, meta: isMeta } = modifiers;

    // Submit key check
    // 逆向: sP — check backslash escape then call onSubmitted
    const matchesSubmit =
      key === submitKey.key &&
      !!isCtrl === !!submitKey.ctrl &&
      !!isAlt === !!submitKey.alt &&
      !!isShift === !!submitKey.shift &&
      !!isMeta === !!submitKey.meta;

    if (!readOnly && matchesSubmit) {
      // 逆向: sP r — backslash escape: if prev char is \, delete it and insert literal newline
      if (key === "Enter") {
        const graphemes = ctrl.graphemes;
        const pos = ctrl.cursorPosition;
        if (pos > 0 && graphemes[pos - 1] === "\\") {
          ctrl.deleteText(1);
          ctrl.insertText("\n");
          return "handled";
        }
      }
      props.onSubmitted?.(ctrl.text);
      return "handled";
    }

    // Multiline Enter
    if (isMultiline && !readOnly && key === "Enter" && !matchesSubmit) {
      ctrl.insertText("\n");
      return "handled";
    }

    // Backspace
    if (key === "Backspace") {
      if (!readOnly) {
        // 逆向: sP r — position-0 check FIRST, then Alt (matches amp lines 1042-1049)
        if (ctrl.cursorPosition === 0 && !ctrl.hasSelection) {
          props.onBackspaceWhenEmpty?.();
        } else if (isAlt) {
          ctrl.deleteWordLeft();
        } else {
          ctrl.deleteSelectedOrText(1);
        }
      }
      return "handled";
    }

    // Delete
    if (key === "Delete") {
      if (!readOnly) {
        if (ctrl.hasSelection) ctrl.deleteSelectedText();
        else ctrl.deleteForward(1);
      }
      return "handled";
    }

    // Ctrl bindings (Emacs)
    // 逆向: sP — matching amp's exact Ctrl key map
    if (isCtrl && !isAlt) {
      switch (key.toLowerCase()) {
        case "a":
          ctrl.moveCursorToLineStart({ extend: isShift });
          return "handled";
        case "e":
          ctrl.moveCursorToLineEnd({ extend: isShift });
          return "handled";
        case "k":
          if (!readOnly) ctrl.deleteToLineEnd();
          return "handled";
        case "u":
          if (!readOnly) ctrl.deleteToLineStart();
          return "handled";
        case "f":
          ctrl.moveCursorRight({ extend: isShift });
          return "handled";
        case "b":
          ctrl.moveCursorLeft({ extend: isShift });
          return "handled";
        case "n":
          ctrl.moveCursorDown({ extend: isShift });
          return "handled";
        case "p":
          ctrl.moveCursorUp({ extend: isShift });
          return "handled";
        case "d":
          if (!readOnly) ctrl.deleteForward(1);
          return "handled";
        case "h":
          if (!readOnly) ctrl.deleteSelectedOrText(1);
          return "handled";
        case "w":
          if (!readOnly) ctrl.deleteWordLeft();
          return "handled";
        case "y":
          if (!readOnly) ctrl.yankText();
          return "handled";
        case "j":
          if (!readOnly && isMultiline) ctrl.insertText("\n");
          return "handled";
      }
    }

    // Alt bindings
    if (isAlt && !isCtrl) {
      switch (key) {
        case "ArrowLeft":
        case "b":
          ctrl.moveCursorWordBoundary("left", { extend: isShift });
          return "handled";
        case "ArrowRight":
        case "f":
          ctrl.moveCursorWordBoundary("right", { extend: isShift });
          return "handled";
        case "d":
          if (!readOnly) ctrl.deleteWordRight();
          return "handled";
      }
    }

    // Arrow keys
    switch (key) {
      case "ArrowLeft":
        ctrl.moveCursorLeft({ extend: isShift });
        return "handled";
      case "ArrowRight":
        ctrl.moveCursorRight({ extend: isShift });
        return "handled";
      case "ArrowUp":
        ctrl.moveCursorUp({ extend: isShift });
        return "handled";
      case "ArrowDown":
        ctrl.moveCursorDown({ extend: isShift });
        return "handled";
      case "Home":
        ctrl.moveCursorToLineStart({ extend: isShift });
        return "handled";
      case "End":
        ctrl.moveCursorToLineEnd({ extend: isShift });
        return "handled";
    }

    // Printable character insertion
    if (!readOnly && key.length === 1 && !isCtrl) {
      ctrl.insertText(key);
      return "handled";
    }

    return "ignored";
  };

  // ─── Mouse handling ────────────────────────────────

  private _handleClick = (event: MouseEvent): void => {
    if (!this._renderFieldRef) return;
    const clickCount = (event as MouseEvent & { clickCount?: number }).clickCount ?? 1;
    const offset = this._renderFieldRef.hitTestPosition(event.x ?? 0, event.y ?? 0);
    if (clickCount === 3) {
      this._controller.selectLineAt(offset);
    } else if (clickCount === 2) {
      this._controller.selectWordAt(offset);
    } else {
      this._controller.cursorPosition = offset;
    }
    this._focusNode.requestFocus();
  };

  private _handleDrag = (event: MouseEvent): void => {
    if (!this._renderFieldRef) return;
    const offset = this._renderFieldRef.hitTestPosition(event.x ?? 0, event.y ?? 0);
    this._controller.setSelectionRange(this._controller.selectionRange?.start ?? offset, offset);
  };

  private _handleRelease = (_event: MouseEvent): void => {
    // Schedule auto-copy after drag selection if copyOnSelectionEnabled
    // 逆向: sP._endDrag — calls _scheduleAutoCopy() (chunk-006.js:4432-4436)
    if (this.widget.props.copyOnSelectionEnabled) {
      this._scheduleAutoCopy();
    }
  };

  // ─── Build ─────────────────────────────────────────

  override build(_context: BuildContext): Widget {
    const props = this.widget.props;
    const hasFocus = this._focusNode.hasFocus;
    const isExpands = props.expands ?? false;
    const isMultiline = (props.maxLines ?? null) !== 1 || (props.minLines ?? 1) > 1;

    const renderWidget = new TextFieldRenderWidget({
      controller: this._controller,
      focused: hasFocus,
      enabled: props.enabled ?? true,
      readOnly: props.readOnly ?? false,
      minLines: props.minLines ?? 1,
      // expands removes maxLines cap when true + multiline
      // 逆向: sP._updateVerticalScrollOffset — if expands, c = r (uncapped) (chunk-006.js:4551)
      maxLines: isExpands && isMultiline ? null : (props.maxLines ?? null),
      textStyle: props.textStyle,
      cursorColor: props.cursorColor,
      selectionColor: props.selectionColor,
      backgroundColor: props.backgroundColor,
      placeholder: props.placeholder,
      wrap: props.wrap ?? false,
      maxWidth: props.maxWidth,
    });

    return new Focus({
      focusNode: this._focusNode,
      autofocus: props.autofocus ?? false,
      onKey: this._handleKey,
      child: new MouseRegion({
        onClick: this._handleClick,
        onDrag: this._handleDrag,
        onRelease: this._handleRelease,
        child: renderWidget,
      }),
    });
  }

  get controller(): TextEditingController {
    return this._controller;
  }
}
