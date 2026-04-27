/**
 * SelectionArea Widget 层封装。
 *
 * 包含 {@link InheritedSelectionArea} 用于向下传递 SelectionArea 控制器，
 * 以及 {@link SelectionAreaWidget} 用于包裹可选内容区域。
 *
 * 逆向: amp chunk-006.js:3486-3514 (SelectionAreaState / b1T)
 *       amp chunk-006.js:490-518 (InheritedSelectionArea / Yb)
 *       amp chunk-006.js:3421-3452 (SelectionArea widget / ro)
 *
 * @module
 */

import type { Element, Key, Widget } from "../tree/element.js";
import { InheritedWidget } from "../tree/inherited-widget.js";
import { State, StatefulWidget } from "../tree/stateful-widget.js";
import type { BuildContext } from "../tree/stateless-widget.js";
import type { Widget as WidgetBase } from "../tree/widget.js";
import { type MouseEvent, MouseRegion } from "../widgets/mouse-region.js";
import { SelectionArea, type SelectionPosition } from "./selection-area.js";

// ════════════════════════════════════════════════════
//  InheritedSelectionArea
// ════════════════════════════════════════════════════

/**
 * 向下传递 SelectionArea 控制器的 InheritedWidget。
 *
 * 逆向: amp Yb (chunk-006.js:490-518)
 *
 * 消费侧通过 `InheritedSelectionArea.of(context)` 获取控制器，
 * 或 `InheritedSelectionArea.maybeOf(context)` 进行可空查找。
 */
export class InheritedSelectionArea extends InheritedWidget {
  readonly selectionArea: SelectionArea;

  constructor(args: { selectionArea: SelectionArea; child: Widget; key?: Key }) {
    super({ child: args.child, key: args.key });
    this.selectionArea = args.selectionArea;
  }

  /**
   * 从祖先树中获取 SelectionArea 控制器。
   *
   * @throws 未找到时抛出错误
   */
  static of(context: Element): SelectionArea {
    const element = context.dependOnInheritedWidgetOfExactType(InheritedSelectionArea);
    if (!element) {
      throw new Error("InheritedSelectionArea not found in ancestor tree");
    }
    return (element.widget as InheritedSelectionArea).selectionArea;
  }

  /**
   * 从祖先树中查找 SelectionArea 控制器（可空）。
   */
  static maybeOf(context: Element): SelectionArea | null {
    const element = context.dependOnInheritedWidgetOfExactType(InheritedSelectionArea);
    if (!element) return null;
    return (element.widget as InheritedSelectionArea).selectionArea;
  }

  updateShouldNotify(oldWidget: InheritedWidget): boolean {
    return this.selectionArea !== (oldWidget as InheritedSelectionArea).selectionArea;
  }
}

// ════════════════════════════════════════════════════
//  SelectionAreaWidget (StatefulWidget)
// ════════════════════════════════════════════════════

/** SelectionAreaWidget 构造参数。 */
interface SelectionAreaWidgetArgs {
  key?: Key;
  child: Widget;
  /** 是否启用选择功能，默认 true */
  enabled?: boolean;
}

/**
 * 选区管理 Widget。
 *
 * 逆向: amp ro (chunk-006.js:3421-3452)
 *
 * 包裹子 Widget 区域以启用文本选择功能。
 * 内部创建 SelectionArea 控制器，通过 InheritedSelectionArea 向下传递，
 * 并通过 MouseRegion 拦截鼠标事件以驱动选区操作。
 *
 * - 单击: 开始字符级拖选
 * - 双击: 词选（beginWordDrag）
 * - 三击: 行选（selectLineAt）
 * - 拖拽: 更新选区
 *
 * @example
 * ```ts
 * new SelectionAreaWidget({
 *   child: new Column({
 *     children: [
 *       new RichText({ text: mySpan, selectable: true }),
 *     ],
 *   }),
 * })
 * ```
 */
export class SelectionAreaWidget extends StatefulWidget {
  readonly child: Widget;
  readonly enabled: boolean;

  constructor(args: SelectionAreaWidgetArgs) {
    super({ key: args.key });
    this.child = args.child;
    this.enabled = args.enabled ?? true;
  }

  override createState(): SelectionAreaWidgetState {
    return new SelectionAreaWidgetState();
  }
}

/**
 * SelectionAreaWidget 的 State。
 *
 * 逆向: amp b1T (chunk-006.js:3454-3851)
 *
 * 管理 SelectionArea 控制器的生命周期和鼠标事件分派。
 */
export class SelectionAreaWidgetState extends State<SelectionAreaWidget> {
  private _selectionArea!: SelectionArea;

  override initState(): void {
    super.initState();
    this._selectionArea = new SelectionArea();
  }

  /**
   * 构建 Widget 树。
   *
   * 逆向: amp b1T.build (chunk-006.js:3487-3513)
   * — MouseRegion (G0) 包裹 InheritedSelectionArea (Yb) 包裹 child
   *
   * amp 的结构是: FocusScope → InheritedSelectionArea → MouseRegion → child
   * 我们简化为: MouseRegion → InheritedSelectionArea → child
   */
  override build(_context: BuildContext): Widget {
    if (!this.widget.enabled) {
      return this.widget.child as unknown as WidgetBase;
    }

    return new MouseRegion({
      onClick: (event: MouseEvent) => this._handleClick(event),
      onDrag: (event: MouseEvent) => this._handleDrag(event),
      onRelease: (_event: MouseEvent) => this._handleRelease(),
      opaque: false,
      child: new InheritedSelectionArea({
        selectionArea: this._selectionArea,
        child: this.widget.child,
      }),
    }) as unknown as WidgetBase;
  }

  /**
   * 处理点击事件。
   *
   * 逆向: amp b1T._handleMouseClick (chunk-006.js:3515-3535)
   * → _startDragAtSelectable (chunk-006.js:3536-3606)
   *
   * 根据 clickCount 分派:
   * - 1: 开始字符级拖选 (beginDrag)
   * - 2: 词选 (beginWordDrag)
   * - 3: 行选 (selectLineAt)
   */
  private _handleClick(event: MouseEvent): void {
    const pos = event.localPosition;
    const clickCount = this._selectionArea.recordClick(pos.x, pos.y);
    const selPos = this._toSelectionPos(pos);
    if (!selPos) return;

    switch (clickCount) {
      case 2:
        // 逆向: amp b1T._startDragAtSelectable e===2 (chunk-006.js:3555-3575)
        this._selectionArea.beginWordDrag(selPos.selectableId, selPos.offset);
        break;
      case 3:
        // 逆向: amp b1T._startDragAtSelectable e===3 (chunk-006.js:3576-3595)
        this._selectionArea.selectLineAt(selPos.selectableId, selPos.offset);
        this._selectionArea.resetClickCount();
        break;
      default:
        // 逆向: amp b1T._startDragAtSelectable else (chunk-006.js:3596-3606)
        this._selectionArea.clear();
        this._selectionArea.beginDrag(selPos);
        break;
    }
  }

  /**
   * 处理拖拽事件。
   *
   * 逆向: amp b1T._handleMouseDrag → _continueSelectionAtPoint
   * (chunk-006.js:3607-3795)
   */
  private _handleDrag(event: MouseEvent): void {
    const pos = event.localPosition;
    const selPos = this._toSelectionPos(pos);
    if (!selPos) return;

    if (this._selectionArea.isWordDragging()) {
      this._selectionArea.updateWordDrag(selPos.selectableId, selPos.offset);
    } else if (this._selectionArea.isDragging()) {
      this._selectionArea.updateDrag(selPos);
    }
  }

  /**
   * 处理释放事件。
   *
   * 逆向: amp b1T._handleGlobalMouseRelease (chunk-006.js:3713-3726)
   */
  private _handleRelease(): void {
    if (this._selectionArea.isWordDragging()) {
      void this._selectionArea.endWordDrag();
    } else if (this._selectionArea.isDragging()) {
      void this._selectionArea.endDrag();
    }
  }

  /**
   * 将鼠标位置转换为 SelectionPosition。
   *
   * 逆向: amp _startDragAtSelectable (chunk-006.js:3538-3539)
   * — T.globalToLocal(R) → T.hitTestSelection(t) ?? T.nearestCaretPosition(t)
   *
   * 遍历已注册的 selectable，找到命中的那个，
   * 然后用 getOffsetForPosition 计算字符偏移。
   */
  private _toSelectionPos(pos: { x: number; y: number }): SelectionPosition | null {
    // Access the internal selectables from SelectionArea.
    // We iterate registered selectables and hit-test against their bounds.
    const area = this._selectionArea;
    const _selection = area.getSelection();

    // Use SelectionArea's registered selectables to find which one contains this point.
    // We need to access them — SelectionArea exposes getSelectableCount() but not the list.
    // We'll use a method on SelectionArea to find the selectable at a position.
    return area.findSelectableAtPosition(pos.x, pos.y);
  }

  override dispose(): void {
    this._selectionArea.dispose();
    super.dispose();
  }
}
