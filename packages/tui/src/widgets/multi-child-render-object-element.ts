/**
 * 多子节点渲染对象元素。
 *
 * {@link MultiChildRenderObjectElement} 继承 {@link RenderObjectElement}，
 * 管理一组子元素，并将对应的渲染对象同步到父渲染对象的子节点列表中。
 * Row / Column / Stack 等多子节点 Widget 共用此元素类型。
 *
 * 逆向: chunk-005.js:164140-164086 (QO class)
 *
 * @module
 */

import type { Element, Widget } from "../tree/element.js";
import { RenderObjectElement, type RenderObjectWidget } from "../tree/render-object-element.js";

// ════════════════════════════════════════════════════
//  MultiChildRenderObjectWidget 接口
// ════════════════════════════════════════════════════

/**
 * 多子节点 Widget 接口。
 *
 * 继承 {@link RenderObjectWidget}，额外要求提供子 Widget 列表。
 */
export interface MultiChildRenderObjectWidget extends RenderObjectWidget {
  /** 子 Widget 列表。 */
  readonly children: Widget[];
}

// ════════════════════════════════════════════════════
//  ParentDataWidget 接口
// ════════════════════════════════════════════════════

/**
 * 父数据 Widget 接口。
 *
 * 实现此接口的 Widget（如 Flexible）可以在子渲染对象被收养后
 * 将自身携带的数据（flex、fit 等）写入子渲染对象的 parentData。
 */
export interface ParentDataWidgetLike {
  /** 将父数据应用到子渲染对象的 parentData 上。 */
  applyParentData(childRenderObject: import("../tree/render-object.js").RenderObject): void;
  /** 被包裹的子 Widget。 */
  readonly child: Widget;
}

/**
 * 判断一个 Widget 是否实现了 ParentDataWidgetLike 接口。
 *
 * @param widget - 待检查的 Widget
 * @returns 如果实现了 ParentDataWidgetLike 接口则返回 true
 */
function isParentDataWidget(widget: unknown): widget is ParentDataWidgetLike {
  return (
    widget !== null &&
    typeof widget === "object" &&
    "applyParentData" in widget &&
    "child" in widget &&
    typeof (widget as ParentDataWidgetLike).applyParentData === "function"
  );
}

// ════════════════════════════════════════════════════
//  MultiChildRenderObjectElement
// ════════════════════════════════════════════════════

/**
 * 多子节点渲染对象元素。
 *
 * 逆向: QO class in chunk-005.js:164140-164086
 *
 * 管理一组子元素，并将对应的渲染对象同步到父渲染对象的子节点列表中。
 * 在挂载时为每个子 Widget 创建元素并收养其渲染对象；
 * 在更新时使用 {@link updateChildren} 协调算法复用现有元素。
 */
export class MultiChildRenderObjectElement extends RenderObjectElement {
  /** 子元素列表。 */
  protected _childElements: Element[] = [];

  // ════════════════════════════════════════════════════
  //  生命周期
  // ════════════════════════════════════════════════════

  /**
   * 挂载到元素树。
   *
   * 逆向: QO.mount
   *
   * 1. 调用父类 mount 创建渲染对象
   * 2. 为每个子 Widget 创建元素、挂载并收养其渲染对象
   * 3. 对 ParentDataWidget 子节点应用父数据
   *
   * @param parent - 父元素，根节点为 undefined
   */
  override mount(parent?: Element): void {
    super.mount(parent);
    const widget = this.widget as unknown as MultiChildRenderObjectWidget;
    this._mountChildren(widget.children);
  }

  /**
   * 用新 Widget 更新当前元素。
   *
   * 逆向: QO.update in chunk-005.js:164157-164161
   *
   * 使用 {@link updateChildren} 协调算法进行差分更新，
   * 复用 canUpdate 匹配的现有元素及其渲染对象。
   *
   * @param newWidget - 新的 Widget 实例
   */
  override update(newWidget: Widget): void {
    super.update(newWidget);
    const widget = this.widget as unknown as MultiChildRenderObjectWidget;
    this.updateChildren(this._childElements, [...widget.children]);
  }

  /**
   * 从元素树卸载。
   *
   * 先移除所有子节点，然后调用父类 unmount。
   */
  override unmount(): void {
    this._unmountChildren();
    super.unmount();
  }

  // ════════════════════════════════════════════════════
  //  updateChildren — 核心协调算法
  // ════════════════════════════════════════════════════

  /**
   * 协调子元素列表。
   *
   * 逆向: QO.updateChildren in chunk-005.js:164162-164077
   *
   * 使用 Flutter 风格的两端扫描 + 中间 key-matching 算法：
   * 1. 从头部扫描，匹配 canUpdate → 复用 Element（及其 RenderObject）
   * 2. 从尾部扫描，同理
   * 3. 中间部分：
   *    a. 旧列表已耗尽 → 插入新元素
   *    b. 新列表已耗尽 → 移除旧元素
   *    c. 否则 → key-matching 或 keyless 线性扫描
   * 4. 同步渲染对象子节点顺序
   *
   * @param oldElements - 当前子元素列表（会被修改）
   * @param newWidgets - 新的子 Widget 列表
   */
  private updateChildren(oldElements: Element[], newWidgets: Widget[]): void {
    // 展开 ParentDataWidget，得到实际 Widget
    const resolvedNewWidgets: Widget[] = [];
    const parentDataWidgets: (ParentDataWidgetLike | undefined)[] = [];
    for (const w of newWidgets) {
      if (isParentDataWidget(w)) {
        parentDataWidgets.push(w);
        resolvedNewWidgets.push(w.child);
      } else {
        parentDataWidgets.push(undefined);
        resolvedNewWidgets.push(w);
      }
    }

    const result: Element[] = [];
    let oldStart = 0;
    let newStart = 0;
    let oldEnd = oldElements.length - 1;
    let newEnd = resolvedNewWidgets.length - 1;

    // ── 阶段 1: 从头部扫描，canUpdate 匹配则复用 ──
    while (oldStart <= oldEnd && newStart <= newEnd) {
      const oldElem = oldElements[oldStart];
      const newWidget = resolvedNewWidgets[newStart];
      if (!oldElem || !newWidget || !oldElem.widget.canUpdate(newWidget)) break;
      if (oldElem.widget !== newWidget) oldElem.update(newWidget);
      result.push(oldElem);
      oldStart++;
      newStart++;
    }

    // ── 阶段 2: 从尾部扫描，canUpdate 匹配则复用 ──
    const tail: Element[] = [];
    while (oldStart <= oldEnd && newStart <= newEnd) {
      const oldElem = oldElements[oldEnd];
      const newWidget = resolvedNewWidgets[newEnd];
      if (!oldElem || !newWidget || !oldElem.widget.canUpdate(newWidget)) break;
      if (oldElem.widget !== newWidget) oldElem.update(newWidget);
      tail.unshift(oldElem);
      oldEnd--;
      newEnd--;
    }

    // ── 阶段 3: 处理中间部分 ──
    if (oldStart > oldEnd) {
      // 3a: 旧列表已耗尽 → 插入新元素
      for (let i = newStart; i <= newEnd; i++) {
        const w = resolvedNewWidgets[i];
        if (w) {
          const elem = this._createChildElement(w);
          result.push(elem);
        }
      }
    } else if (newStart > newEnd) {
      // 3b: 新列表已耗尽 → 移除旧元素
      for (let i = oldStart; i <= oldEnd; i++) {
        const elem = oldElements[i];
        if (elem) this._deactivateChild(elem);
      }
    } else {
      // 3c: 中间段 — key-matching + keyless 线性扫描
      // 逆向: chunk-005.js:158026-158069

      // 建立 key → element 索引
      const keyedOldElements = new Map<string, Element>();
      const keyedOldIndices = new Map<string, number>();
      for (let i = oldStart; i <= oldEnd; i++) {
        const elem = oldElements[i];
        if (elem?.widget.key) {
          const keyStr = elem.widget.key.toString();
          keyedOldElements.set(keyStr, elem);
          keyedOldIndices.set(keyStr, i);
        }
      }

      for (let i = newStart; i <= newEnd; i++) {
        const newWidget = resolvedNewWidgets[i];
        if (!newWidget) continue;

        let matched: Element | undefined;

        if (newWidget.key) {
          // key-based matching
          const keyStr = newWidget.key.toString();
          matched = keyedOldElements.get(keyStr);
          if (matched) {
            keyedOldElements.delete(keyStr);
            const idx = keyedOldIndices.get(keyStr);
            if (idx !== undefined) (oldElements as any)[idx] = null;

            if (matched.widget === newWidget) {
              // same widget instance, no update needed
            } else if (matched.widget.canUpdate(newWidget)) {
              matched.update(newWidget);
            } else {
              this._deactivateChild(matched);
              matched = this._createChildElement(newWidget);
            }
          } else {
            matched = this._createChildElement(newWidget);
          }
        } else {
          // keyless — linear scan for canUpdate match
          let found = false;
          for (let j = oldStart; j <= oldEnd; j++) {
            const candidate = oldElements[j];
            if (candidate && !candidate.widget.key) {
              if (candidate.widget === newWidget) {
                matched = candidate;
                (oldElements as any)[j] = null;
                found = true;
                break;
              } else if (candidate.widget.canUpdate(newWidget)) {
                matched = candidate;
                (oldElements as any)[j] = null;
                matched.update(newWidget);
                found = true;
                break;
              }
            }
          }
          if (!found) {
            matched = this._createChildElement(newWidget);
          }
        }

        if (matched) result.push(matched);
      }

      // Deactivate remaining unmatched old elements
      for (let i = oldStart; i <= oldEnd; i++) {
        const elem = oldElements[i];
        if (elem) this._deactivateChild(elem);
      }
      for (const elem of keyedOldElements.values()) {
        this._deactivateChild(elem);
      }
    }

    // 合并尾部
    result.push(...tail);

    // ── 阶段 4: 同步渲染对象子节点顺序 ──
    // 逆向: chunk-005.js:158071-158076
    this._childElements = result;
    if (this._renderObject) {
      const newRenderChildren: import("../tree/render-object.js").RenderObject[] = [];
      for (const elem of result) {
        const ro = elem.findRenderObject();
        if (ro) newRenderChildren.push(ro);
      }

      const oldRenderChildren = this._renderObject.children;
      if (
        oldRenderChildren.length !== newRenderChildren.length ||
        oldRenderChildren.some((ro, idx) => ro !== newRenderChildren[idx])
      ) {
        this._renderObject.replaceChildren(newRenderChildren);
      }
    }

    // ── 阶段 5: 应用 ParentData ──
    for (let i = 0; i < result.length; i++) {
      const pdw = parentDataWidgets[i];
      if (pdw) {
        const childRO = result[i]?.findRenderObject();
        if (childRO) pdw.applyParentData(childRO);
      }
    }
  }

  // ════════════════════════════════════════════════════
  //  内部方法
  // ════════════════════════════════════════════════════

  /**
   * 挂载子 Widget 列表（首次 mount 使用）。
   *
   * @param childWidgets - 子 Widget 列表
   */
  private _mountChildren(childWidgets: Widget[]): void {
    for (const childWidget of childWidgets) {
      let actualWidget: Widget;
      let parentDataWidget: ParentDataWidgetLike | undefined;

      if (isParentDataWidget(childWidget)) {
        parentDataWidget = childWidget;
        actualWidget = childWidget.child;
      } else {
        actualWidget = childWidget;
      }

      const childElement = actualWidget.createElement();
      childElement.mount(this);
      this.addChild(childElement);

      if (parentDataWidget) {
        const childRO = childElement.findRenderObject();
        if (childRO) {
          parentDataWidget.applyParentData(childRO);
        }
      }
      this._childElements.push(childElement);
    }
  }

  /**
   * 卸载所有子元素。
   */
  private _unmountChildren(): void {
    for (const childElem of this._childElements) {
      childElem.unmount();
      this.removeChild(childElem);
    }
    this._childElements = [];
  }

  /**
   * 创建子元素并挂载。
   *
   * 逆向: QO.createChildElement in chunk-005.js:158078-158081
   */
  private _createChildElement(widget: Widget): Element {
    const elem = widget.createElement();
    this.addChild(elem);
    elem.mount(this);
    return elem;
  }

  /**
   * 停用并卸载子元素。
   *
   * 逆向: QO.deactivateChild in chunk-005.js:158082-158084
   */
  private _deactivateChild(elem: Element): void {
    elem.unmount();
    this.removeChild(elem);
  }

  /**
   * 覆盖基类的 insertRenderObjectChild，
   * 多子节点元素自行管理子渲染对象的收养，不需要基类的自动收养逻辑。
   */
  override insertRenderObjectChild(): void {
    const ancestor = this.findAncestorRenderObjectElement();
    if (
      ancestor !== null &&
      ancestor.renderObject !== undefined &&
      this._renderObject !== undefined
    ) {
      ancestor.renderObject.adoptChild(this._renderObject);
    }
  }
}
