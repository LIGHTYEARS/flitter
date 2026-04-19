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
  /** Ref to the underlying RenderTextField for hit-testing */
  private _renderFieldRef: RenderTextField | null = null;

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

    if (this.widget.props.focusNode) {
      this._focusNode = this.widget.props.focusNode;
      this._ownsFocusNode = false;
    } else {
      this._focusNode = new FocusNode({ debugLabel: "TextField" });
      this._ownsFocusNode = true;
    }
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
      if (this._ownsFocusNode) this._focusNode.dispose?.();
      if (this.widget.props.focusNode) {
        this._focusNode = this.widget.props.focusNode;
        this._ownsFocusNode = false;
      } else {
        this._focusNode = new FocusNode({ debugLabel: "TextField" });
        this._ownsFocusNode = true;
      }
    }
  }

  override dispose(): void {
    this._controller.removeListener(this._listener);
    if (this._ownsController) this._controller.dispose();
    if (this._ownsFocusNode) this._focusNode.dispose?.();
    super.dispose();
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
    // No-op: selection finalized by drag
  };

  // ─── Build ─────────────────────────────────────────

  override build(_context: BuildContext): Widget {
    const props = this.widget.props;
    const hasFocus = this._focusNode.hasFocus;

    const renderWidget = new TextFieldRenderWidget({
      controller: this._controller,
      focused: hasFocus,
      enabled: props.enabled ?? true,
      readOnly: props.readOnly ?? false,
      minLines: props.minLines ?? 1,
      maxLines: props.maxLines ?? null,
      textStyle: props.textStyle,
      cursorColor: props.cursorColor,
      selectionColor: props.selectionColor,
      backgroundColor: props.backgroundColor,
      placeholder: props.placeholder,
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
